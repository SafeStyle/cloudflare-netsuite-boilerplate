import { env } from "cloudflare:workers";

/**
 * NetSuite OAuth 2.0 client credentials (M2M) settings.
 *
 * Names are declared in `secrets.required` in wrangler.jsonc. Values live in
 * .dev.vars on the local dev server and in Worker secrets when deployed
 * (`npx wrangler secret put <NAME>`). Never return or log the values.
 * See docs/netsuite-credentials.md.
 */
export const NETSUITE_SETTINGS = [
  { name: "NETSUITE_ACCOUNT_ID", label: "Account ID" },
  { name: "NETSUITE_CLIENT_ID", label: "Client ID" },
  { name: "NETSUITE_CERTIFICATE_ID", label: "Certificate ID" },
  { name: "NETSUITE_PRIVATE_KEY", label: "Private key" },
] as const;

export type NetsuiteSettingName = (typeof NETSUITE_SETTINGS)[number]["name"];

export interface SettingStatus {
  name: NetsuiteSettingName;
  label: string;
  ok: boolean;
  detail: string;
}

/**
 * Accepts a PEM with real line breaks or the single-line form with literal `\n`
 * (what .dev.vars and `wrangler secret put` hold).
 */
export function normalisePem(value: string): string {
  return value.replace(/\\n/g, "\n").trim();
}

/** The JWT signing algorithms NetSuite accepts that this app can produce. */
export type SigningAlgorithm = "ES256" | "ES384" | "ES512" | "PS256";

export interface PrivateKeyCheck {
  ok: boolean;
  detail: string;
  /** Set when the key is usable: the algorithm to sign token requests with. */
  alg?: SigningAlgorithm;
}

/** Checks the key is PKCS#8 and a type NetSuite accepts. Never exposes the key. */
export async function describePrivateKey(value: string): Promise<PrivateKeyCheck> {
  const pem = normalisePem(value);
  if (/-----BEGIN (EC|RSA) PRIVATE KEY-----/.test(pem)) {
    return { ok: false, detail: "Wrong format: needs a PKCS#8 key (BEGIN PRIVATE KEY)" };
  }
  const body = /-----BEGIN PRIVATE KEY-----([\s\S]+?)-----END PRIVATE KEY-----/.exec(pem)?.[1];
  if (!body) return { ok: false, detail: "Not a PEM private key" };

  let der: Uint8Array<ArrayBuffer>;
  try {
    der = Uint8Array.from(atob(body.replace(/\s+/g, "")), (c) => c.charCodeAt(0));
  } catch {
    return { ok: false, detail: "Damaged key: not valid base64" };
  }

  const curves = [
    ["P-256", "ES256"],
    ["P-384", "ES384"],
    ["P-521", "ES512"],
  ] as const;
  for (const [namedCurve, alg] of curves) {
    try {
      await crypto.subtle.importKey("pkcs8", der, { name: "ECDSA", namedCurve }, false, ["sign"]);
      return { ok: true, detail: `Valid EC ${namedCurve} key; sign with ${alg}`, alg };
    } catch {
      // Not this curve; try the next type.
    }
  }

  try {
    const key = await crypto.subtle.importKey(
      "pkcs8",
      der,
      { name: "RSA-PSS", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const bits = (key.algorithm as RsaHashedKeyAlgorithm).modulusLength;
    return bits === 3072 || bits === 4096
      ? { ok: true, detail: `Valid RSA ${bits}-bit key; sign with PS256`, alg: "PS256" }
      : { ok: false, detail: `RSA ${bits}-bit key; NetSuite needs 3072 or 4096 bits` };
  } catch {
    return { ok: false, detail: "Not a key type NetSuite accepts (EC or RSA)" };
  }
}

/** Whether each setting is present in this environment, and whether the key is usable. */
export async function netsuiteSettingsStatus(): Promise<SettingStatus[]> {
  return Promise.all(
    NETSUITE_SETTINGS.map(async ({ name, label }) => {
      const value = (env[name] ?? "").trim();
      if (!value) return { name, label, ok: false, detail: "Not set" };
      if (name === "NETSUITE_PRIVATE_KEY") {
        const { ok, detail } = await describePrivateKey(value);
        return { name, label, ok, detail };
      }
      return { name, label, ok: true, detail: "Set" };
    }),
  );
}
