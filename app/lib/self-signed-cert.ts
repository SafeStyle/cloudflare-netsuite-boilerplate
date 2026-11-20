/**
 * Self-signed X.509 certificate and EC P-256 private key for NetSuite OAuth 2.0
 * client credentials (M2M), generated with Web Crypto. Same result as Oracle's
 * ES256 command:
 *
 *   openssl req -new -x509 -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 \
 *     -pkeyopt ec_param_enc:named_curve -nodes -days 365 \
 *     -out public.pem -keyout private.pem
 *
 * The certificate is X.509 v3, signed with ecdsa-with-SHA256, with the extensions
 * OpenSSL's v3_ca section adds. The private key is unencrypted PKCS#8.
 *
 * Call this only in the browser: the private key must never reach the server.
 * See docs/netsuite-credentials.md.
 */

type Bytes = Uint8Array<ArrayBuffer>;

const OID = {
  ecdsaWithSha256: "1.2.840.10045.4.3.2",
  country: "2.5.4.6",
  state: "2.5.4.8",
  locality: "2.5.4.7",
  organisation: "2.5.4.10",
  organisationalUnit: "2.5.4.11",
  commonName: "2.5.4.3",
  email: "1.2.840.113549.1.9.1",
  subjectKeyIdentifier: "2.5.29.14",
  authorityKeyIdentifier: "2.5.29.35",
  basicConstraints: "2.5.29.19",
} as const;

export type SubjectField =
  | "country"
  | "state"
  | "locality"
  | "organisation"
  | "organisationalUnit"
  | "commonName"
  | "email";

export type Subject = Partial<Record<SubjectField, string>>;

/** In the order `openssl req` asks for them. Blank fields are left out. */
export const SUBJECT_FIELDS: { key: SubjectField; label: string }[] = [
  { key: "country", label: "Country (2 letters)" },
  { key: "state", label: "State" },
  { key: "locality", label: "City" },
  { key: "organisation", label: "Organisation" },
  { key: "organisationalUnit", label: "Organisational unit" },
  { key: "commonName", label: "Common name" },
  { key: "email", label: "Email" },
];

/* ---------- DER encoding ---------- */

const concat = (...parts: Bytes[]): Bytes => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
};

const encodeLength = (length: number): Bytes => {
  if (length < 0x80) return Uint8Array.of(length);
  const bytes: number[] = [];
  while (length > 0) {
    bytes.unshift(length & 0xff);
    length >>= 8;
  }
  return Uint8Array.of(0x80 | bytes.length, ...bytes);
};

const tlv = (tag: number, value: Bytes): Bytes =>
  concat(Uint8Array.of(tag), encodeLength(value.length), value);

const sequence = (...items: Bytes[]) => tlv(0x30, concat(...items));
const set = (...items: Bytes[]) => tlv(0x31, concat(...items));
const octetString = (bytes: Bytes) => tlv(0x04, bytes);
const bitString = (bytes: Bytes) => tlv(0x03, concat(Uint8Array.of(0), bytes));
const booleanTrue = () => tlv(0x01, Uint8Array.of(0xff));
const text = (value: string): Bytes => new TextEncoder().encode(value) as Bytes;
const utf8String = (value: string) => tlv(0x0c, text(value));
const printableString = (value: string) => tlv(0x13, text(value));
const ia5String = (value: string) => tlv(0x16, text(value));

/** Unsigned big-endian bytes to a minimal, positive DER INTEGER. */
const integer = (bytes: Bytes): Bytes => {
  let start = 0;
  while (start < bytes.length - 1 && bytes[start] === 0) start++;
  let value = bytes.slice(start);
  if ((value[0] ?? 0) & 0x80) value = concat(Uint8Array.of(0), value);
  return tlv(0x02, value);
};

const oid = (dotted: string): Bytes => {
  const [first = 0, second = 0, ...rest] = dotted.split(".").map(Number);
  const bytes = [first * 40 + second];
  for (const part of rest) {
    const chunk = [part & 0x7f];
    let remaining = part >> 7;
    while (remaining > 0) {
      chunk.unshift((remaining & 0x7f) | 0x80);
      remaining >>= 7;
    }
    bytes.push(...chunk);
  }
  return tlv(0x06, Uint8Array.from(bytes));
};

/** RFC 5280: UTCTime up to 2049, GeneralizedTime from 2050. */
const time = (date: Date): Bytes => {
  const stamp = date.toISOString().replace(/[-:T]/g, "").slice(0, 14) + "Z";
  return date.getUTCFullYear() < 2050
    ? tlv(0x17, text(stamp.slice(2)))
    : tlv(0x18, text(stamp));
};

const encodeName = (subject: Subject): Bytes =>
  sequence(
    ...SUBJECT_FIELDS.flatMap(({ key }) => {
      const value = subject[key];
      if (!value) return [];
      const encoded =
        key === "country"
          ? printableString(value)
          : key === "email"
            ? ia5String(value)
            : utf8String(value);
      return [set(sequence(oid(OID[key]), encoded))];
    }),
  );

const extension = (oidText: string, value: Bytes, critical = false) =>
  sequence(oid(oidText), ...(critical ? [booleanTrue()] : []), octetString(value));

/** Web Crypto signs ECDSA as raw r||s; X.509 wants SEQUENCE { r, s }. */
const rawSignatureToDer = (raw: Bytes): Bytes => {
  const half = raw.length / 2;
  return sequence(integer(raw.slice(0, half)), integer(raw.slice(half)));
};

/* ---------- PEM ---------- */

const toBase64 = (bytes: Bytes): string => {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
};

const toPem = (label: string, bytes: Bytes): string => {
  const lines = toBase64(bytes).match(/.{1,64}/g)?.join("\n") ?? "";
  return `-----BEGIN ${label}-----\n${lines}\n-----END ${label}-----\n`;
};

const toHex = (bytes: Bytes): string =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0").toUpperCase()).join(":");

/**
 * A PEM file as one line with literal `\n` between lines. This is the form to put
 * in .dev.vars or paste into `wrangler secret put`; the Worker turns `\n` back into
 * line breaks when it reads the key.
 */
export const pemToSingleLine = (pem: string): string => pem.trim().replace(/\r?\n/g, "\\n");

/* ---------- Public API ---------- */

export interface GeneratedCertificate {
  certificatePem: string;
  privateKeyPem: string;
  notBefore: Date;
  notAfter: Date;
  sha256Fingerprint: string;
}

export async function generateSelfSignedCertificate({
  subject,
  days = 365,
}: {
  subject: Subject;
  days?: number;
}): Promise<GeneratedCertificate> {
  const subtle = globalThis.crypto.subtle;

  const keyPair = await subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
    "sign",
    "verify",
  ]);

  const spki = new Uint8Array(await subtle.exportKey("spki", keyPair.publicKey));
  const pkcs8 = new Uint8Array(await subtle.exportKey("pkcs8", keyPair.privateKey));
  const publicPoint = new Uint8Array(await subtle.exportKey("raw", keyPair.publicKey));

  // Same as OpenSSL's subjectKeyIdentifier=hash: SHA-1 of the public key bits.
  const keyId = new Uint8Array(await subtle.digest("SHA-1", publicPoint));

  // 20 random bytes with the top bit cleared so it stays positive, as OpenSSL does.
  const serial = globalThis.crypto.getRandomValues(new Uint8Array(20));
  serial[0] = ((serial[0] ?? 0) & 0x7f) | 0x01;

  const notBefore = new Date();
  notBefore.setUTCMilliseconds(0);
  const notAfter = new Date(notBefore.getTime() + days * 24 * 60 * 60 * 1000);

  const name = encodeName(subject);
  const signatureAlgorithm = sequence(oid(OID.ecdsaWithSha256));

  const tbsCertificate = sequence(
    tlv(0xa0, integer(Uint8Array.of(2))), // version 3
    integer(serial),
    signatureAlgorithm,
    name, // issuer = subject (self-signed)
    sequence(time(notBefore), time(notAfter)),
    name,
    spki,
    tlv(
      0xa3,
      sequence(
        extension(OID.subjectKeyIdentifier, octetString(keyId)),
        extension(OID.authorityKeyIdentifier, sequence(tlv(0x80, keyId))),
        extension(OID.basicConstraints, sequence(booleanTrue()), true),
      ),
    ),
  );

  const rawSignature = new Uint8Array(
    await subtle.sign({ name: "ECDSA", hash: "SHA-256" }, keyPair.privateKey, tbsCertificate),
  );

  const certificate = sequence(
    tbsCertificate,
    signatureAlgorithm,
    bitString(rawSignatureToDer(rawSignature)),
  );

  const fingerprint = new Uint8Array(await subtle.digest("SHA-256", certificate));

  return {
    certificatePem: toPem("CERTIFICATE", certificate),
    privateKeyPem: toPem("PRIVATE KEY", pkcs8),
    notBefore,
    notAfter,
    sha256Fingerprint: toHex(fingerprint),
  };
}
