# NetSuite credentials and the certificate generator

How the app stores the values it needs for NetSuite OAuth 2.0 client credentials
(M2M), and how the **NetSuite certificate** page creates the certificate and private
key. For the NetSuite side of the setup, see the in-app guides under
[NetSuite setup](guides/02-netsuite/README.md).

## The settings

| Name | What it is | Where it comes from |
|------|------------|---------------------|
| `NETSUITE_ACCOUNT_ID` | NetSuite account ID, such as `1234567` or `1234567_SB1` | **Setup > Company > Company Information** |
| `NETSUITE_CLIENT_ID` | The integration record's client ID; the JWT `iss` | Shown once when the integration record is first saved |
| `NETSUITE_CERTIFICATE_ID` | The certificate's ID in NetSuite; the JWT `kid` | The M2M setup page, after uploading `public.pem` |
| `NETSUITE_PRIVATE_KEY` | The private key that signs token requests, PKCS#8 PEM | The NetSuite certificate page, or Oracle's `openssl` command |

All four are declared in `secrets.required` in `wrangler.jsonc`, which types them in
`Env` and makes Wrangler warn when one is missing locally. That file holds the
**names only**. The NetSuite client reads them on every request; see
[netsuite-client.md](netsuite-client.md). The **Status** page shows whether each one is
set, and whether NetSuite accepts them.

## Where the values are stored

| Where the app runs | Store values in | How |
|--------------------|-----------------|-----|
| Local dev server (`npm run dev`) | `.dev.vars` in the project folder | Edit the file, then restart `npm run dev`. Git ignores it and it is never deployed. `.dev.vars.example` lists the names. |
| Deployed Worker | Cloudflare Worker secrets | `npx wrangler secret put <NAME>`. Values are encrypted; Cloudflare never shows them again. Each `secret put` deploys a new version immediately. |

Never put the values in `wrangler.jsonc`, in code, in Git, or in chat.

### The private key's format

A PEM key spans several lines, but `.dev.vars` entries and the `wrangler secret put`
prompt take one line. So the key is stored as **one line with literal `\n`** where the
line breaks go:

```
NETSUITE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIGHAgEAMBMG...\n-----END PRIVATE KEY-----"
```

- In `.dev.vars`, keep the double quotes.
- For `wrangler secret put NETSUITE_PRIVATE_KEY`, paste the value without the name or
  quotes. Or send the file itself: `npx wrangler secret put NETSUITE_PRIVATE_KEY <
  private.pem` on macOS and Linux, or `Get-Content -Raw private.pem | npx wrangler
  secret put NETSUITE_PRIVATE_KEY` in Windows PowerShell.

`normalisePem()` in `app/lib/netsuite-credentials.server.ts` turns `\n` back into line
breaks, so real line breaks and the one-line form both work. The certificate page
shows the exact line to paste for a key it generates.

## The NetSuite certificate page

`/netsuite-certificate` (menu: **NetSuite certificate**) generates an EC P-256 key pair
and a self-signed certificate: the same result as Oracle's ES256 `openssl` command. The
page also explains, step by step, how to upload the certificate to NetSuite and where to
store the key.

### The private key never reaches the server

- `app/lib/self-signed-cert.ts` runs in the **browser**, using Web Crypto. It builds the
  X.509 v3 certificate itself (DER encoding, ecdsa-with-SHA256 signature, and the
  subject key identifier, authority key identifier and basic constraints extensions
  OpenSSL adds) and exports the key as unencrypted PKCS#8.
- The form submits to a client-side handler, not to the server. The Generate button
  stays disabled until the page has loaded its JavaScript, so a submit cannot fall back
  to a server request.
- The key exists only in the page's memory until the user downloads or copies it. It is
  gone on reload.

Keep it that way: do not add a server action, API call, log line or analytics event that
receives the generated key.

### "This environment" status

The page's loader calls `netsuiteSettingsStatus()` in
`app/lib/netsuite-credentials.server.ts`. For each setting it reports only whether a
value is set. For `NETSUITE_PRIVATE_KEY` it also imports the key with Web Crypto and
reports its type:

| Result | Meaning |
|--------|---------|
| Valid EC P-256 / P-384 / P-521 key | Sign with ES256 / ES384 / ES512 |
| Valid RSA 3072 or 4096-bit key | Sign with PS256 |
| RSA key of another size | NetSuite needs 3072 or 4096 bits |
| Wrong format | `BEGIN EC PRIVATE KEY` or `BEGIN RSA PRIVATE KEY`: convert to PKCS#8 (`BEGIN PRIVATE KEY`) |
| Not a PEM private key, damaged key | Wrong value pasted, or the key was cut short |

Values are never sent to the browser or logged. On the dev server the status reflects
`.dev.vars`; on a deployed Worker it reflects the Worker's secrets. Like every page,
it is only reachable by signed-in Zero Trust users when deployed.

## Rotating the certificate

NetSuite allows up to five active certificates per integration, role and user, so you
can rotate without downtime:

1. Generate a new pair on the certificate page.
2. Upload the new `public.pem` in NetSuite's M2M setup and copy its Certificate ID.
3. Update `NETSUITE_PRIVATE_KEY` and `NETSUITE_CERTIFICATE_ID` together, in `.dev.vars`
   or with `npx wrangler secret put`.
4. Once the app works with the new pair, revoke the old certificate in NetSuite.

NetSuite emails administrators two months, one month and 14 days before a certificate
expires.
