# OAuth 2.0 client credentials (M2M) setup

Create the role and user the demo acts as, generate a certificate, and map them to the
integration record so the demo can get access tokens without anyone signing in.

## What machine-to-machine means

With the OAuth 2.0 client credentials grant, no person signs in. Instead:

1. You give NetSuite the **public** half of a certificate and tie it to an integration
   record, a user (NetSuite calls it the entity) and a role. This is the mapping.
2. The application keeps the **private** half. When it needs access, it signs a short
   token with the private key and sends it to NetSuite.
3. NetSuite checks the signature against the public certificate and returns an access
   token valid for 60 minutes. Every API call the application makes runs as the
   mapped user with the mapped role.

Because the role decides what the application can do, give it only the permissions
the demo needs.

[How certificates, roles and tokens work](00-certificates-roles-and-tokens.md) shows
all of this as an animated diagram, including what happens when a certificate or
token expires.

## 1. Create a role for the integration

Go to **Setup > Users/Roles > Manage Roles > New** (some Oracle pages write this as
**Setup > Users/Roles > User Management > Manage Roles**).

Give it a clear name, such as `Cloudflare demo integration`. Then on the
**Permissions** subtab, add:

| Subtab | Permission | Level |
|--------|------------|-------|
| **Setup** | **Log in using OAuth 2.0 Access Tokens** | (Oracle does not specify) |
| **Setup** | **REST Web Services** | **Full** |
| **Reports** | **SuiteAnalytics Workbook** | **Edit** |
| **Lists** | **Customers** | **View** |

The first three let the application sign in and run queries. **Customers** at
**View** is what the demo's **Customers** page reads. That is all the demo needs: it
cannot create, change or delete anything.

If you extend the demo, add a permission for each kind of record it will read or
change, at the lowest level that works. For example, to read customers, add **Customers** on the
**Lists** subtab at **View**. That is how NetSuite roles work generally; Oracle's
OAuth pages do not list record permissions.

Things to avoid:

- **The Administrator role.** Oracle does not recommend it for web services
  integrations, for security reasons.
- **OAuth 2.0 Authorized Applications Management.** This permission is for the
  administrator who creates the mapping in step 4, and it requires two-factor
  authentication. A role with it cannot use OAuth 2.0 to access REST web services,
  so do not add it to the integration role.
- **Log in using Access Tokens.** That is the permission for token-based
  authentication (TBA), not OAuth 2.0.

Two-factor authentication (2FA) is not a problem here. Oracle recommends OAuth 2.0 for
web services with 2FA-required roles, and has said NetSuite 2027.1 will turn on
**Require 2FA for All Roles** automatically.

## 2. Choose the user and give it the role

The mapping needs an entity: the user the demo acts as. OAuth 2.0 works with
employees, customers, partners, contacts and vendors. A dedicated employee record for
the integration is easier to audit and to switch off than a real person's login.
To try the demo in a sandbox, using your own user is quickest. See
[Security and key rotation](04-security-and-key-rotation.md) before doing that anywhere
else.

On that entity record, select **Edit**, open the **Access** subtab, then the
**Roles** subtab. Choose the role from step 1 in the **Role** field, select **Add**,
then **Save**.

## 3. Generate a certificate

The certificate is a key pair: a public certificate you upload to NetSuite and a
private key the demo keeps secret. NetSuite accepts:

- an x.509 certificate in a `.cer`, `.pem` or `.crt` file
- an RSA key of 3072 or 4096 bits, or an EC key of 256, 384 or 521 bits
- a validity of up to two years; NetSuite shortens anything longer to two years

There are two ways to make one.

### Option A: the app's NetSuite certificate page (easiest)

Open **NetSuite certificate** in the app's menu, enter a common name, choose how many
days it should be valid, and select **Generate**. Then download `public.pem` and
`private.pem`.

The page creates the key in your browser; it is never sent to the app's server,
Cloudflare or NetSuite. It makes an EC P-256 key for ES256, the same as the first
`openssl` command below. The page also shows exactly how to store the key, which is
step 5 of this guide.

### Option B: OpenSSL

Create the files in a folder **outside** this project, so the private key cannot end
up in Git. Run one of these commands. They are Oracle's, with `-subj` added so OpenSSL
does not prompt for certificate details:

EC key, for signing with ES256 (recommended: small and fast):

```bash
openssl req -new -x509 -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -pkeyopt ec_param_enc:named_curve -nodes -days 365 -subj "/CN=cloudflare-netsuite-demo" -out public.pem -keyout private.pem
```

RSA key, for signing with PS256:

```bash
openssl req -new -x509 -newkey rsa:4096 -keyout private.pem -sigopt rsa_padding_mode:pss -sha256 -sigopt rsa_pss_saltlen:64 -subj "/CN=cloudflare-netsuite-demo" -out public.pem -nodes -days 365
```

You get two files:

- `public.pem`: the certificate you upload in step 4.
- `private.pem`: the private key. Store it in a password manager or secrets vault.
  Anyone with it can act as the integration.

Where to run `openssl`:

- **Windows**: in **Git Bash**, which comes with Git for Windows.
- **Linux**: OpenSSL is usually installed already.
- **macOS**: the built-in `openssl` is LibreSSL. If a command fails, install OpenSSL
  with `brew install openssl` and run it from there.

`-days 365` makes the certificate valid for a year. Note the expiry date: the mapping
stops working when the certificate expires.

## 4. Create the client credentials mapping

Sign in with an Administrator role, or a role with **OAuth 2.0 Authorized
Applications Management**.

1. Go to **Setup > Integration > Manage Authentication > OAuth 2.0 Client
   Credentials (M2M) Setup**.
2. Select **Create New**.
3. Choose the **entity** from step 2, the **role** from step 1, and the
   **application**: the integration record from the previous guide. The application
   only appears if its **Client Credentials (Machine to Machine) Grant** box is checked.
4. Upload `public.pem`.
5. Select **Save**.

A new row appears with a **Certificate ID**. Copy it; the demo sends it with every
token request so NetSuite knows which certificate to check.

### Rules for certificates

- One certificate can be used for only one combination of integration record, entity
  and role.
- Each combination can have up to five active certificates. Revoked and expired ones
  do not count, so you can add a new certificate before the old one expires and switch
  over without downtime.
- Revoke a certificate with the **Revoke** button in the **Revoked** column. A revoked
  or expired certificate cannot be used again; create a new mapping with a new
  certificate.
- NetSuite emails administrators two months, one month and 14 days before a
  certificate expires.
- The mapping is not copied to sandbox, Release Preview or other accounts, and a
  sandbox refresh clears it.

## 5. Store the private key and certificate ID

The app reads four settings: `NETSUITE_ACCOUNT_ID`, `NETSUITE_CLIENT_ID`,
`NETSUITE_CERTIFICATE_ID` and `NETSUITE_PRIVATE_KEY`. Where you store them depends on
where the app runs:

- **On your computer** (`npm run dev`): in the `.dev.vars` file in the project folder.
  Copy `.dev.vars.example` to `.dev.vars` if you have not already. Git ignores this
  file, so it is never committed or deployed. Restart `npm run dev` after editing it.
- **On a deployed Worker**: as Cloudflare Worker secrets, one command per setting, for
  example `npx wrangler secret put NETSUITE_CERTIFICATE_ID`. Wrangler asks for the value;
  Cloudflare stores it encrypted and never shows it again.

The private key is stored as one line, with `\n` where the line breaks go:

```
NETSUITE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIGHAgEAMBMG...\n-----END PRIVATE KEY-----"
```

If you used the app's certificate page, it shows this line, ready to copy, for your
key. If you used OpenSSL, you can send the file to Wrangler instead:
`npx wrangler secret put NETSUITE_PRIVATE_KEY < private.pem` on macOS and Linux, or
`Get-Content -Raw private.pem | npx wrangler secret put NETSUITE_PRIVATE_KEY` in
Windows PowerShell.

To check what the app can see, open **NetSuite certificate** in the app's menu and
look at **This environment** at the bottom. It shows whether each setting is set and
whether the key is valid, never the values themselves.

## 6. How the demo gets access tokens

You do not need to do anything for this step. It explains what the Cloudflare side of
the demo does with the values you collected. Once they are stored, open **Status** in
the app's menu to see whether it worked, then **Customers**.

The demo builds a JSON Web Token (JWT), signs it with the private key, and posts it to
NetSuite's token endpoint:

```
POST https://<account-id>.suitetalk.api.netsuite.com/services/rest/auth/oauth2/v1/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
&client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer
&client_assertion=<signed JWT>
```

Use the account ID in its web-address form, such as `1234567-sb1` for a sandbox.

The JWT contains:

| Part | Field | Value |
|------|-------|-------|
| Header | `typ` | `JWT` |
| Header | `alg` | `ES256` for the EC key, or `PS256` for the RSA key (`PS384`, `PS512`, `ES384` and `ES512` are also accepted) |
| Header | `kid` | the Certificate ID |
| Payload | `iss` | the Client ID |
| Payload | `scope` | `rest_webservices` (add `restlets` if needed) |
| Payload | `aud` | the token endpoint URL above |
| Payload | `iat` | the current time, in seconds since 1970 |
| Payload | `exp` | an expiry less than 60 minutes after `iat`; a few minutes is plenty |

Oracle's field table describes `scope` as comma-separated values, but its own sample
token uses a JSON array (`["restlets", "rest_webservices"]`).

RS256 is not in the accepted list: NetSuite no longer accepts the older RSA PKCS#1
v1.5 signature scheme for this flow, which is why the RSA command above uses RSA-PSS.

NetSuite replies with an `access_token` that lasts 60 minutes (`expires_in` is
`3600`). API calls send the token as `Authorization: Bearer <access_token>`.

There is no refresh token. An API call made with an expired token gets
`401 Unauthorized` with `error="invalid_token"`, and the application signs a new JWT
to get a fresh token. In practice it gets the new token shortly before the old one
expires. See
[what happens when something expires](00-certificates-roles-and-tokens.md#5-expired-or-invalid-netsuite-answers-with-an-error-not-200).

The demo keeps the token in Workers KV and reuses it until shortly before it expires.

## Next

[Allocate a concurrency limit](03-concurrency-limit.md).

## Sources

All from Oracle's NetSuite Help Center:

- [Set Up OAuth 2.0 Roles](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_157771510070.html)
- [Assign Users to OAuth 2.0 Roles](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_157771650112.html)
- [OAuth 2.0 Client Credentials Setup](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_162686838198.html)
- [Certificate Conditions](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/subsect_162755332391.html)
- [POST Request to the Token Endpoint and the Access Token Response](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_162755359851.html)
- [The answer to a request with an expired or invalid access token](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/subsect_158521885412.html)
- [The Request Token Structure](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_162790605110.html)
- [Prerequisites and Setup for REST Web Services](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/article_5085602973.html)
- [Two-Factor Authentication (2FA)](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_N327688.html)
