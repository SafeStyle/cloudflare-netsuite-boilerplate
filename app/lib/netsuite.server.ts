import { env } from "cloudflare:workers";
import { importPKCS8, SignJWT } from "jose";

import {
  describePrivateKey,
  netsuiteSettingsStatus,
  normalisePem,
  type SigningAlgorithm,
} from "./netsuite-credentials.server";

/**
 * A small NetSuite REST client for the demo.
 *
 *   1. Signs a short JWT with the private key (OAuth 2.0 client credentials, M2M).
 *   2. Swaps it for an access token at NetSuite's token endpoint.
 *   3. Keeps the token in Workers KV and reuses it until shortly before it expires.
 *   4. If NetSuite still answers 401, throws the token away, gets a new one and
 *      retries the call once.
 *
 * It deliberately does no more than that: no retries, back-off or request queueing.
 * Every failure becomes a `NetsuiteProblem` the pages can show. Secret values (the
 * settings and the access token) are never returned from here or logged.
 * See docs/netsuite-client.md.
 */

export type NetsuiteProblemKind =
  | "not-configured"
  | "invalid-key"
  | "token-rejected"
  | "unauthorized"
  | "forbidden"
  | "bad-request"
  | "rate-limited"
  | "unreachable"
  | "netsuite-error"
  | "unexpected";

/** Something that stopped a NetSuite call, in words a person can act on. */
export interface NetsuiteProblem {
  kind: NetsuiteProblemKind;
  /** One line: what went wrong. */
  title: string;
  /** What that means. */
  detail: string;
  /** What to do about it. */
  fix: string;
  /** The HTTP status NetSuite answered with, if it answered. */
  status?: number;
  /** NetSuite's own error code, such as INVALID_LOGIN or invalid_request. */
  code?: string;
  /** Names of the settings that are missing or unusable. Never their values. */
  settings?: string[];
}

export class NetsuiteError extends Error {
  constructor(readonly problem: NetsuiteProblem) {
    super(problem.title);
    this.name = "NetsuiteError";
  }
}

/** Turns anything thrown by this module into a problem a page can show. */
export function toProblem(error: unknown): NetsuiteProblem {
  if (error instanceof NetsuiteError) return error.problem;
  console.error("Unexpected error in the NetSuite client:", error);
  return {
    kind: "unexpected",
    title: "Something went wrong talking to NetSuite",
    detail: "The app hit an error it did not expect.",
    fix: "Try again. If it keeps happening, look at the dev server's terminal, or the Worker's logs when deployed.",
  };
}

export type AccountKind = "sandbox" | "release-preview" | "test" | "production";

/** Works out the kind of account from the shape of its ID, e.g. `1234567_SB1`. */
export function accountKind(accountId: string): AccountKind {
  const id = accountId.trim().toUpperCase().replace(/-/g, "_");
  if (/_SB\d+$/.test(id)) return "sandbox";
  if (/_RP\d*$/.test(id)) return "release-preview";
  if (/^(TD|TSTDRV)/.test(id)) return "test";
  return "production";
}

/** Where settings are stored for the environment the app is running in. */
export const settingsLocation = import.meta.env.DEV
  ? "Add them to .dev.vars in the project folder, then stop and restart npm run dev."
  : "Set them as Worker secrets with npx wrangler secret put <NAME>.";

const REQUEST_TIMEOUT_MS = 15_000;
/** Ask for a new token this long before the old one expires. */
const REFRESH_MARGIN_MS = 2 * 60_000;
const TOKEN_REQUEST_FIX =
  "In NetSuite, open Setup > Users/Roles > User Management > View Login Audit Trail, add the Detail column and read the newest failed row. " +
  "The usual causes: the Certificate ID or Client ID is wrong; the private key does not belong to the certificate that was uploaded; " +
  "the certificate has expired or been revoked; or the integration record does not have Client Credentials (Machine to Machine) Grant ticked.";

interface Config {
  clientId: string;
  certificateId: string;
  privateKeyPem: string;
  alg: SigningAlgorithm;
  /** e.g. https://1234567-sb1.suitetalk.api.netsuite.com */
  origin: string;
  tokenUrl: string;
  /** KV key for this exact set of credentials. Changing a setting changes the key. */
  tokenKey: string;
}

async function loadConfig(): Promise<Config> {
  const unusable = (await netsuiteSettingsStatus()).filter((setting) => !setting.ok);
  if (unusable.length > 0) {
    const names = unusable.map((setting) => setting.name);
    const onlyKey = unusable.every((setting) => setting.detail !== "Not set");
    throw new NetsuiteError(
      onlyKey
        ? {
            kind: "invalid-key",
            title: "The private key cannot be used",
            detail: `NETSUITE_PRIVATE_KEY is set, but: ${unusable[0]?.detail ?? "it is not valid"}.`,
            fix: "Paste the whole key as one line with \\n between the PEM lines. The NetSuite certificate page shows the exact line for a key it generates.",
            settings: names,
          }
        : {
            kind: "not-configured",
            title: "NetSuite is not connected yet",
            detail: `${names.length === 1 ? "One setting is" : `${names.length} settings are`} missing or not usable: ${names.join(", ")}.`,
            fix: settingsLocation,
            settings: names,
          },
    );
  }

  const accountId = env.NETSUITE_ACCOUNT_ID.trim();
  const subdomain = accountId.toLowerCase().replace(/_/g, "-");
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(subdomain)) {
    throw new NetsuiteError({
      kind: "not-configured",
      title: "The account ID does not look right",
      detail: "NETSUITE_ACCOUNT_ID should be letters and numbers only, such as 1234567 or 1234567_SB1.",
      fix: "Copy it from Setup > Company > Company Information in NetSuite. " + settingsLocation,
      settings: ["NETSUITE_ACCOUNT_ID"],
    });
  }

  const privateKeyPem = normalisePem(env.NETSUITE_PRIVATE_KEY);
  const { alg } = await describePrivateKey(privateKeyPem);
  const clientId = env.NETSUITE_CLIENT_ID.trim();
  const certificateId = env.NETSUITE_CERTIFICATE_ID.trim();
  const origin = `https://${subdomain}.suitetalk.api.netsuite.com`;

  return {
    clientId,
    certificateId,
    privateKeyPem,
    alg: alg ?? "ES256",
    origin,
    tokenUrl: `${origin}/services/rest/auth/oauth2/v1/token`,
    tokenKey: `netsuite-token:${await fingerprint(`${origin}|${clientId}|${certificateId}`)}`,
  };
}

async function fingerprint(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest).slice(0, 16), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** fetch() with a timeout, turning network failures into a problem. */
async function send(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    throw new NetsuiteError({
      kind: "unreachable",
      title: timedOut ? "NetSuite did not answer in time" : "Could not reach NetSuite",
      detail: timedOut
        ? `There was no answer within ${REQUEST_TIMEOUT_MS / 1000} seconds.`
        : "The request did not get as far as NetSuite.",
      fix: "Check the internet connection and that NETSUITE_ACCOUNT_ID is right (sandbox IDs end in _SB1). Then try again.",
    });
  }
}

// ---------------------------------------------------------------------------
// Access tokens
// ---------------------------------------------------------------------------

interface StoredToken {
  accessToken: string;
  /** Milliseconds since 1970. */
  expiresAt: number;
}

export type TokenSource = "cache" | "new";

export interface TokenInfo {
  source: TokenSource;
  expiresAt: number;
  /** False when there is no KV binding, so the token could not be kept. */
  stored: boolean;
}

/** The KV namespace, or undefined if the binding is missing from this environment. */
function tokenStore(): KVNamespace | undefined {
  return (env as Partial<Env>).NETSUITE_TOKENS;
}

async function readStoredToken(config: Config): Promise<StoredToken | null> {
  try {
    const stored = await tokenStore()?.get<StoredToken>(config.tokenKey, "json");
    return stored && typeof stored.accessToken === "string" && typeof stored.expiresAt === "number" ? stored : null;
  } catch (error) {
    console.error("Could not read the NetSuite token from KV:", error);
    return null;
  }
}

async function requestToken(config: Config): Promise<StoredToken> {
  let assertion: string;
  try {
    const key = await importPKCS8(config.privateKeyPem, config.alg);
    assertion = await new SignJWT({
      iss: config.clientId,
      scope: ["rest_webservices"],
      aud: config.tokenUrl,
    })
      .setProtectedHeader({ alg: config.alg, typ: "JWT", kid: config.certificateId })
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(key);
  } catch {
    throw new NetsuiteError({
      kind: "invalid-key",
      title: "The private key cannot be used",
      detail: "The app could not sign the token request with NETSUITE_PRIVATE_KEY.",
      fix: "Generate a new certificate on the NetSuite certificate page, upload it to NetSuite and store the new key.",
      settings: ["NETSUITE_PRIVATE_KEY"],
    });
  }

  const requestedAt = Date.now();
  const response = await send(config.tokenUrl, {
    method: "POST",
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
      client_assertion: assertion,
    }),
  });

  const body = (await response.json().catch(() => null)) as
    | { access_token?: unknown; expires_in?: unknown; error?: unknown }
    | null;

  if (!response.ok || typeof body?.access_token !== "string") {
    const code = typeof body?.error === "string" ? body.error : undefined;
    throw new NetsuiteError({
      kind: "token-rejected",
      title: "NetSuite refused to issue an access token",
      detail: `The token request was answered with ${response.status}${code ? ` (${code})` : ""} instead of a token. NetSuite does not put the reason in its answer.`,
      fix: TOKEN_REQUEST_FIX,
      status: response.status,
      code,
    });
  }

  const lifetimeSeconds = Number(body.expires_in) > 0 ? Number(body.expires_in) : 3600;
  return { accessToken: body.access_token, expiresAt: requestedAt + lifetimeSeconds * 1000 };
}

async function accessToken(config: Config, forceNew: boolean): Promise<TokenInfo & { accessToken: string }> {
  if (!forceNew) {
    const stored = await readStoredToken(config);
    if (stored && stored.expiresAt - Date.now() > REFRESH_MARGIN_MS) {
      return { accessToken: stored.accessToken, source: "cache", expiresAt: stored.expiresAt, stored: true };
    }
  }

  const token = await requestToken(config);
  let stored = false;
  const store = tokenStore();
  if (store) {
    try {
      // KV deletes the entry itself once the token has expired (minimum TTL 60 s).
      const ttl = Math.max(60, Math.floor((token.expiresAt - Date.now()) / 1000));
      await store.put(config.tokenKey, JSON.stringify(token), { expirationTtl: ttl });
      stored = true;
    } catch (error) {
      console.error("Could not store the NetSuite token in KV:", error);
    }
  }
  return { accessToken: token.accessToken, source: "new", expiresAt: token.expiresAt, stored };
}

/**
 * Makes sure there is a usable access token and says where it came from. The token
 * itself stays inside this module.
 */
export async function ensureAccessToken(options: { forceNew?: boolean } = {}): Promise<TokenInfo> {
  const config = await loadConfig();
  const { source, expiresAt, stored } = await accessToken(config, options.forceNew ?? false);
  return { source, expiresAt, stored };
}

export interface TokenStoreState {
  /** Whether the KV binding exists in this environment. */
  available: boolean;
  /** When the stored token expires, or null if none is stored. */
  expiresAt: number | null;
}

/** What is in the token store right now, without contacting NetSuite. */
export async function tokenStoreState(): Promise<TokenStoreState> {
  if (!tokenStore()) return { available: false, expiresAt: null };
  try {
    const stored = await readStoredToken(await loadConfig());
    return { available: true, expiresAt: stored?.expiresAt ?? null };
  } catch {
    // Settings are incomplete, so there is no key to look under yet.
    return { available: true, expiresAt: null };
  }
}

/** Removes the stored token, so the next call has to ask NetSuite for a new one. */
export async function forgetAccessToken(): Promise<void> {
  const config = await loadConfig();
  await tokenStore()?.delete(config.tokenKey);
}

// ---------------------------------------------------------------------------
// REST requests
// ---------------------------------------------------------------------------

export interface NetsuiteResult<T> {
  data: T;
  /** Where the access token came from: KV, or a new request to NetSuite. */
  token: TokenInfo;
  /** True if NetSuite rejected the stored token and the call was retried with a new one. */
  tokenReplaced: boolean;
  durationMs: number;
}

interface RequestOptions {
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: unknown;
}

async function restProblem(response: Response): Promise<NetsuiteProblem> {
  const body = (await response.json().catch(() => null)) as
    | { title?: unknown; "o:errorDetails"?: { detail?: unknown; "o:errorCode"?: unknown }[] }
    | null;
  const first = body?.["o:errorDetails"]?.[0];
  const code = typeof first?.["o:errorCode"] === "string" ? first["o:errorCode"] : undefined;
  const said = typeof first?.detail === "string" ? first.detail : typeof body?.title === "string" ? body.title : "";
  const message = said ? `NetSuite said: "${said.slice(0, 400)}"` : "NetSuite gave no further detail.";
  const common = { status: response.status, code };

  switch (response.status) {
    case 401:
      return {
        ...common,
        kind: "unauthorized",
        title: "NetSuite did not accept the access token",
        detail: `It answered 401 even after the app asked for a fresh token. ${message}`,
        fix: "Check the role in the mapping has Log in using OAuth 2.0 Access Tokens and REST Web Services, and that the user still has that role. The Login Audit Trail in NetSuite shows the reason.",
      };
    case 403:
      return {
        ...common,
        kind: "forbidden",
        title: "The role is not allowed to do this",
        detail: message,
        fix: "Add the missing permission to the integration role in NetSuite. For this page it needs Lists > Customers at View and Reports > SuiteAnalytics Workbook.",
      };
    case 429:
      return {
        ...common,
        kind: "rate-limited",
        title: "NetSuite is busy",
        detail: `The integration's concurrency limit was reached, so NetSuite blocked the request. ${message}`,
        fix: "Wait a few seconds and reload. This demo does not retry on its own; a real integration should wait and retry.",
      };
    case 400:
      return {
        ...common,
        kind: "bad-request",
        title: "NetSuite rejected the request",
        detail: message,
        fix: "If the message says a record \"was not found\", the role cannot see that record type: add Lists > Customers at View, and Reports > SuiteAnalytics Workbook, to the integration role.",
      };
    default:
      return {
        ...common,
        kind: "netsuite-error",
        title: response.status >= 500 ? "NetSuite had a problem" : "NetSuite answered with an error",
        detail: `It answered ${response.status}. ${message}`,
        fix: "Try again in a moment. If it keeps happening, check NetSuite's status page and the integration's Execution Log.",
      };
  }
}

/**
 * Calls NetSuite's REST API with an access token and returns the JSON answer.
 * `path` starts with `/services/rest/`. Throws `NetsuiteError` on any failure.
 */
export async function netsuiteRequest<T>(path: string, options: RequestOptions = {}): Promise<NetsuiteResult<T>> {
  const startedAt = Date.now();
  const config = await loadConfig();

  const call = (token: string) =>
    send(config.origin + path, {
      method: options.method ?? "GET",
      headers: {
        Accept: "application/json",
        ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });

  let token = await accessToken(config, false);
  let response = await call(token.accessToken);
  let tokenReplaced = false;

  // A stored token can be rejected early (revoked, or the clock was off). Throw it
  // away, ask for a new one and try once more. A token that was only just issued is
  // not worth replacing.
  if (response.status === 401 && token.source === "cache") {
    token = await accessToken(config, true);
    response = await call(token.accessToken);
    tokenReplaced = true;
  }

  if (!response.ok) throw new NetsuiteError(await restProblem(response));

  const data = (await response.json().catch(() => null)) as T | null;
  if (data === null) {
    throw new NetsuiteError({
      kind: "netsuite-error",
      title: "NetSuite's answer could not be read",
      detail: `It answered ${response.status}, but not with JSON.`,
      fix: "Try again in a moment.",
      status: response.status,
    });
  }

  return {
    data,
    token: { source: token.source, expiresAt: token.expiresAt, stored: token.stored },
    tokenReplaced,
    durationMs: Date.now() - startedAt,
  };
}

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

export interface Customer {
  id: string;
  /** The customer's ID or name as NetSuite shows it in lists. */
  entityId: string;
  name: string;
  email: string;
  phone: string;
}

export interface CustomerPage {
  customers: Customer[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
}

interface SuiteQLResponse {
  items?: Record<string, unknown>[];
  totalResults?: number;
}

const CUSTOMER_QUERY =
  "SELECT id, entityid, companyname, firstname, lastname, email, phone FROM customer WHERE isinactive = 'F' ORDER BY entityid";

const text = (value: unknown) => (typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "");

/**
 * One page of active customers, read with SuiteQL: one request returns the rows and
 * the total. The mapped role needs Lists > Customers (View) and SuiteAnalytics Workbook.
 */
export async function listCustomers(page: number, pageSize = 20): Promise<NetsuiteResult<CustomerPage>> {
  const offset = (page - 1) * pageSize;
  const result = await netsuiteRequest<SuiteQLResponse>(
    `/services/rest/query/v1/suiteql?limit=${pageSize}&offset=${offset}`,
    { method: "POST", headers: { Prefer: "transient" }, body: { q: CUSTOMER_QUERY } },
  );

  const customers = (result.data.items ?? []).map((row): Customer => {
    const entityId = text(row.entityid);
    const person = [text(row.firstname), text(row.lastname)].filter(Boolean).join(" ");
    return {
      id: text(row.id),
      entityId,
      name: text(row.companyname) || person || entityId,
      email: text(row.email),
      phone: text(row.phone),
    };
  });
  const total = typeof result.data.totalResults === "number" ? result.data.totalResults : offset + customers.length;

  return {
    ...result,
    data: { customers, page, pageSize, total, pageCount: Math.max(1, Math.ceil(total / pageSize)) },
  };
}
