import { createRemoteJWKSet, jwtVerify } from "jose";

import type { Identity } from "../app/lib/identity";

/**
 * Zero Trust gate. Every request to a deployed instance must carry a valid
 * Cloudflare Access JWT for a user, and that user must be on this Worker's own
 * allow-list, or it is refused. The only exception is the local dev server.
 * See docs/zero-trust.md.
 */

export type AuthResult =
  | { ok: true; identity: Identity }
  | { ok: false; response: Response };

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * Headers a proxy or tunnel adds. A request that carries one did not come straight
 * from a browser on this computer, so it does not get the local exception, even if
 * its Host header says localhost.
 */
const FORWARDING_HEADERS = new Set(["forwarded", "via", "x-real-ip", "true-client-ip", "cf-ray", "cdn-loop"]);
const LOOPBACK_ADDRESSES = new Set(["127.0.0.1", "::1"]);

function forwardingHeader(headers: Headers): string | null {
  for (const [name, value] of headers) {
    // The local runtime adds these two to every request itself: x-forwarded-host
    // (a copy of Host) and cf-connecting-ip (127.0.0.1 unless a proxy already set it).
    if (name === "x-forwarded-host") continue;
    if (name === "cf-connecting-ip") {
      if (!LOOPBACK_ADDRESSES.has(value.trim())) return name;
      continue;
    }
    if (name.startsWith("x-forwarded-") || FORWARDING_HEADERS.has(name)) return name;
  }
  return null;
}

/**
 * Only exists in a development build. scripts/check-build.mjs looks for this text
 * and refuses to deploy a build that contains it.
 */
const LOCAL_EXCEPTION = "Zero Trust local-dev exception";

const EMAIL_ADDRESS = /^[^\s@*]+@[^\s@*]+\.[^\s@*]+$/;

/**
 * ACCESS_ALLOWED_EMAILS: full email addresses separated by commas, spaces or new
 * lines. No wildcards and no whole domains, so a careless entry cannot let in
 * everyone. Returns null if it is empty or any entry is not a full address.
 */
function parseAllowedEmails(value: string): Set<string> | null {
  const entries = value
    .split(/[\s,;]+/)
    .filter(Boolean)
    .map((entry) => entry.toLowerCase());
  if (entries.length === 0 || !entries.every((entry) => EMAIL_ADDRESS.test(entry))) return null;
  return new Set(entries);
}

// Key sets are cached per team domain for the life of the isolate. jose refetches
// them when it sees an unknown key ID, which covers Access key rotation.
const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function keySetFor(teamDomain: string) {
  let keySet = keySets.get(teamDomain);
  if (!keySet) {
    keySet = createRemoteJWKSet(new URL("/cdn-cgi/access/certs", teamDomain));
    keySets.set(teamDomain, keySet);
  }
  return keySet;
}

/** Accepts "team.cloudflareaccess.com" or "https://team.cloudflareaccess.com/". */
function normaliseTeamDomain(value: string): string | null {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    return url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}

function forbidden(): AuthResult {
  return {
    ok: false,
    response: new Response(
      "Forbidden: this application only serves users signed in through Cloudflare Zero Trust.",
      { status: 403, headers: { "content-type": "text/plain; charset=utf-8" } },
    ),
  };
}

function notOnAllowList(): AuthResult {
  return {
    ok: false,
    response: new Response(
      "Forbidden: you are signed in, but your account is not on this application's allow-list.",
      { status: 403, headers: { "content-type": "text/plain; charset=utf-8" } },
    ),
  };
}

function misconfigured(detail: string): AuthResult {
  console.error(`Zero Trust check misconfigured: ${detail}`);
  return {
    ok: false,
    response: new Response("Server misconfigured.", {
      status: 500,
      headers: { "content-type": "text/plain; charset=utf-8" },
    }),
  };
}

export async function authenticate(request: Request, env: Env): Promise<AuthResult> {
  // Local dev server only. Production builds compile `import.meta.env.DEV` to
  // false, so this branch does not exist in deployed code, and `npm run deploy`
  // refuses to ship a build that still has it. The hostname check is a second
  // guard: on Cloudflare's network a request's hostname is never loopback.
  if (import.meta.env.DEV && LOOPBACK_HOSTS.has(new URL(request.url).hostname)) {
    // A tunnel or proxy can make a request from anywhere look like localhost by
    // rewriting its Host header. Those requests get the full check below.
    const forwarded = forwardingHeader(request.headers);
    if (!forwarded) return { ok: true, identity: { source: "local-dev" } };
    console.warn(
      `${LOCAL_EXCEPTION} not applied: the request came through a proxy or tunnel (it has a "${forwarded}" header).`,
    );
  }

  const teamDomain = normaliseTeamDomain(env.ACCESS_TEAM_DOMAIN ?? "");
  const audience = (env.ACCESS_AUD ?? "").trim();
  const allowedEmails = parseAllowedEmails(env.ACCESS_ALLOWED_EMAILS ?? "");
  if (!teamDomain) return misconfigured("ACCESS_TEAM_DOMAIN is missing or invalid");
  if (!audience) return misconfigured("ACCESS_AUD is missing");
  if (!allowedEmails) {
    return misconfigured("ACCESS_ALLOWED_EMAILS is missing, or has an entry that is not a full email address");
  }

  const token = request.headers.get("cf-access-jwt-assertion");
  if (!token) return forbidden();

  try {
    const { payload } = await jwtVerify(token, keySetFor(teamDomain), {
      issuer: teamDomain,
      audience,
      // Access signs with RS256 and always sets an expiry. Accept nothing else.
      algorithms: ["RS256"],
      requiredClaims: ["exp"],
    });
    // Users only: service-token JWTs carry no email and are refused by design.
    const email = typeof payload.email === "string" ? payload.email : "";
    if (!email) return forbidden();
    // Access decided this person may sign in. The allow-list is this Worker's own
    // decision, so a too-generous Access policy cannot let a stranger through.
    if (!allowedEmails.has(email.toLowerCase())) return notOnAllowList();
    return { ok: true, identity: { source: "cloudflare-access", email } };
  } catch {
    return forbidden();
  }
}
