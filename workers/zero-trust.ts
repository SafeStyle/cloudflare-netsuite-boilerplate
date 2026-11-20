import { createRemoteJWKSet, jwtVerify } from "jose";

import type { Identity } from "../app/lib/identity";

/**
 * Zero Trust gate. Every request to a deployed instance must carry a valid
 * Cloudflare Access JWT for a user, or it is refused. The only exception is the
 * local dev server. See docs/zero-trust.md.
 */

export type AuthResult =
  | { ok: true; identity: Identity }
  | { ok: false; response: Response };

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

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
  // false, so this branch does not exist in deployed code. The hostname check is a
  // second guard: on Cloudflare's network a request's hostname is never loopback.
  if (import.meta.env.DEV && LOOPBACK_HOSTS.has(new URL(request.url).hostname)) {
    return { ok: true, identity: { source: "local-dev" } };
  }

  const teamDomain = normaliseTeamDomain(env.ACCESS_TEAM_DOMAIN ?? "");
  const audience = (env.ACCESS_AUD ?? "").trim();
  if (!teamDomain) return misconfigured("ACCESS_TEAM_DOMAIN is missing or invalid");
  if (!audience) return misconfigured("ACCESS_AUD is missing");

  const token = request.headers.get("cf-access-jwt-assertion");
  if (!token) return forbidden();

  try {
    const { payload } = await jwtVerify(token, keySetFor(teamDomain), {
      issuer: teamDomain,
      audience,
    });
    // Users only: service-token JWTs carry no email and are refused by design.
    const email = typeof payload.email === "string" ? payload.email : "";
    if (!email) return forbidden();
    return { ok: true, identity: { source: "cloudflare-access", email } };
  } catch {
    return forbidden();
  }
}
