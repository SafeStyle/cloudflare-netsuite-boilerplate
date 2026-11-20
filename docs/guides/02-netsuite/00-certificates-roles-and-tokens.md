# How certificates, roles and tokens work

A picture of how the demo gets into NetSuite without anyone signing in: what a
certificate is, what NetSuite ties it to, how access tokens are requested, kept and
replaced, and what happens when something expires. There is nothing to set up in this
guide. Read it first and the setup steps in the next guides will make sense.

![Animated diagram in seven panels. 1: generating a key pair gives a private key the application keeps and a certificate, with an expiry date, that is uploaded to NetSuite. 2: NetSuite ties the certificate to an integration record, a user and a role. 3: the application signs a request with the private key and NetSuite returns an access token. 4: the certificate lasts up to two years, each token 60 minutes. 5: expired certificates and expired tokens get error responses. 6: several certificates on one integration give several AI agents their own user and role. 7: NetSuite records the work under the mapped user.](certificates-roles-and-tokens.svg)

The numbered sections below explain each panel.

## 1. A certificate is a key pair with an expiry date

Generating a certificate makes two files that belong together:

- **`private.pem`, the private key.** The application keeps it and uses it to sign
  every request for an access token. Anyone who has it can act as the integration,
  so it is stored as a secret: in `.dev.vars` on your computer, and as a Cloudflare
  Worker secret on a deployed Worker.
- **`public.pem`, the certificate.** It contains the matching public key and the
  dates the certificate is valid between. It is not a secret. You upload it to
  NetSuite.

Something signed with the private key can be checked with the public key, but the
public key cannot be used to sign. That is why NetSuite only ever needs the
certificate.

**How long the certificate is valid is decided when it is generated**, and is written
into the certificate. It cannot be extended afterwards. The app's **NetSuite
certificate** page and the `openssl` command both ask for a number of days. NetSuite
accepts up to two years and shortens anything longer to two years.

## 2. NetSuite ties the certificate to an integration, a user and a role

Uploading the certificate creates a **mapping** on NetSuite's **OAuth 2.0 Client
Credentials (M2M) Setup** page. A mapping joins four things:

| Part | What it decides |
|------|-----------------|
| Integration record (NetSuite calls it the application) | Which application is connecting. It has the client ID. |
| Entity | The user the application acts as. |
| Role | What the application is allowed to do. |
| Certificate | How NetSuite checks that a request really came from the application. |

NetSuite gives the mapping a **Certificate ID**. The application sends it with every
token request so NetSuite knows which mapping, and so which certificate, user and
role, to use.

One certificate can be used for only one combination of integration record, entity and
role.

## 3. The application asks for an access token

No password is sent. Instead:

1. The application writes a short request called a JSON Web Token (JWT). It names the
   client ID (`iss`) and the Certificate ID (`kid`), and expires within minutes.
2. It signs the JWT with the private key and posts it to NetSuite's token endpoint.
3. NetSuite finds the mapping for the Certificate ID, checks the certificate is still
   valid, and checks the signature against the certificate's public key.
4. NetSuite answers `200` with an **access token**. Requests made with that token run
   as the mapped user with the mapped role.

The private key never leaves the application, and NetSuite never needs it.

## 4. Two clocks: a long-lived certificate, short-lived tokens

| | Certificate | Access token |
|-|-------------|--------------|
| Lasts | Up to two years; the date set when it was generated | 60 minutes (`expires_in` is always `3600`) |
| Kept by | NetSuite (certificate) and the application (private key) | The application |
| When it runs out | Generate a new one and create a new mapping | Ask for a new one |

A token is reused for every API call until it is about to expire. Asking for a new
token on every call would double the number of requests to NetSuite for no benefit.

**So the token has to be kept somewhere between requests.** A Cloudflare Worker does
not keep memory from one request to the next, so the demo keeps the current token
in [Workers KV](https://developers.cloudflare.com/kv/), Cloudflare's key-value store,
along with its expiry time. Each request reads the token from KV. The app's **Status**
page shows whether a token is stored and when it expires.

**There is no refresh token.** "Refreshing" means doing step 3 again: sign a new JWT
and get a new token. The application does that shortly before the old token expires,
and stores the new one in KV in its place. The demo does it two minutes before expiry.

## 5. Expired or invalid: NetSuite answers with an error, not 200

The application must check the status of every answer. Two failures matter here, and
they are fixed in different ways.

| What happened | NetSuite's answer | What to do |
|---------------|-------------------|------------|
| A **token request** was signed with a key whose certificate has expired, been revoked, or does not match | An error instead of `200`, with no `access_token` | Retrying will not help. Generate a new certificate, upload it, and store the new private key and Certificate ID. |
| An **API request** was sent with an expired or unknown token | `401 Unauthorized`. The `WWW-Authenticate` header says `error="invalid_token"` and the body has the error code `INVALID_LOGIN`. Nothing was read or changed. | Automatic: request a new token, store it, and retry the call once. The demo does this. |

Oracle does not publish a separate error for each way a token request can fail.
Expect a `4xx` status and a short OAuth error body such as
`{"error": "invalid_request"}`, and do not rely on its exact text. The reason is in
NetSuite, at **Setup > Users/Roles > User Management > View Login Audit Trail**: add
the **Detail** column to the results. For example, `MissingKey` means the Certificate
ID does not match any valid certificate, and `SignatureValidation` means the signature
is wrong. An API call with an expired token shows there as `AccessTokenExpired`.

NetSuite emails administrators two months, one month and 14 days before a certificate
expires, so you can replace it before requests start failing.

## 6. Several certificates on one integration: one role per job

An integration record can have many mappings. Each one needs its own certificate, and
each can name a different user and a different role. Oracle's rule is: "If you want to
use the same integration record for multiple entities or roles, you must use a
different certificate for each unique combination."

That lets one integration do several jobs, each with only the access that job needs.
For example, three AI agents:

| Agent | Its job | Mapped user | Mapped role |
|-------|---------|-------------|-------------|
| Orders agent | Creates sales orders | Orders Agent | Sales order entry |
| Billing agent | Reads overdue invoices | Billing Agent | Invoices: view only |
| Stock agent | Adjusts stock levels | Stock Agent | Inventory adjustment |

Each agent holds its own private key and Certificate ID. All three use the same client
ID. The Certificate ID in the token request selects the mapping, so the Billing agent
gets a token that can only view invoices, however it is asked to behave. If one
agent's key leaks, you revoke that one certificate and the others keep working.

Two things to know:

- The agents share one integration record, so they share its
  [concurrency limit](03-concurrency-limit.md).
- The same combination of integration record, entity and role can have up to five
  active certificates. That is for replacing a certificate without downtime, not for
  giving different access.

## 7. NetSuite records the work under the mapped user

A token acts as the entity and role in its mapping, so NetSuite's records show that
user, not the administrator who uploaded the certificate:

- **System Notes** on a record show the user in **Set by**. They can also show the
  **Role**: customise the System Notes view to add that column.
- The **Login Audit Trail** lists each OAuth 2.0 login with its **User** and **Role**.
  Add the **Token-based Application Name** column to see which integration it was.
- The integration record's **Execution Log** subtab has a **REST Web Services** list
  with each request, its status and the email address of the user who sent it.

The entity is chosen when the mapping is created. Give each agent its own user, as in the table above,
and you can always tell which agent did what. Map them all to one user and their work
is indistinguishable.

## Next

[Create the integration record](01-integration-record.md).

## Sources

All from Oracle's NetSuite Help Center:

- [OAuth 2.0 Client Credentials Setup](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_162686838198.html)
- [Certificate Conditions](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/subsect_162755332391.html)
- [POST Request to the Token Endpoint and the Access Token Response](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_162755359851.html)
- [The answer to a request with an expired or invalid access token](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/subsect_158521885412.html)
- [The REST web services error for an invalid login](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_156570709583.html)
- [Login Audit Trail details for OAuth 2.0](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/subsect_158324637123.html)
- [Tracking OAuth 2.0 logins in the Login Audit Trail](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_158323851171.html)
- [System Notes](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_N555355.html)
- [The REST Web Services execution log](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_156570320384.html)
