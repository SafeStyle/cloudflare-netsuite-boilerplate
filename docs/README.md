# Documentation

This app is an example for the Perth NetSuite User Group of how Cloudflare can be used
to integrate with NetSuite's REST API. It is hosted under SafeStyle's GitHub but is
not a SafeStyle application.

## Developer docs

| Doc | Covers |
|-----|--------|
| [architecture.md](architecture.md) | How a request moves through the Worker and React Router, what each file does, build output |
| [zero-trust.md](zero-trust.md) | Why every deployed request needs a Zero Trust user, how the Worker checks it, deployment setup |
| [development.md](development.md) | npm scripts, generated types, secrets, deploying |
| [routing.md](routing.md) | Adding pages, menu items and API routes; loaders and actions; reading bindings and the signed-in user |
| [in-app-documentation.md](in-app-documentation.md) | How the app's Documentation section works and how to add a guide or area |
| [walkthrough.md](walkthrough.md) | The simulated setup walkthrough in `public/walkthrough/`: viewing it, how steps are written, keeping it in step with the app |
| [netsuite-client.md](netsuite-client.md) | The NetSuite REST client: token requests, the token store in Workers KV, error handling, and the Customers and Status pages |
| [netsuite-credentials.md](netsuite-credentials.md) | The NetSuite settings, where they are stored (`.dev.vars`, Worker secrets), the certificate generator page, rotating certificates |

## Guides (shown in the app under Documentation)

**[Cloudflare setup](guides/01-cloudflare/README.md)**

| Guide | Covers |
|-------|--------|
| [Cloudflare account sign up process](guides/01-cloudflare/01-account-sign-up.md) | Creating and securing a Cloudflare account, setting up Zero Trust, connecting Wrangler |

**[NetSuite setup](guides/02-netsuite/README.md)**

| Guide | Covers |
|-------|--------|
| [How certificates, roles and tokens work](guides/02-netsuite/00-certificates-roles-and-tokens.md) | Animated diagram: the key pair and its expiry, the mapping to an integration, user and role, requesting and caching tokens, error responses, several certificates for several roles, audit attribution |
| [Create the integration record](guides/02-netsuite/01-integration-record.md) | Account ID, enabling REST Web Services and OAuth 2.0, the integration record and client ID |
| [OAuth 2.0 client credentials (M2M) setup](guides/02-netsuite/02-oauth-2-client-credentials.md) | Integration role and user, certificate (in-app generator or OpenSSL), M2M mapping, storing the key and certificate ID, how access tokens are requested |
| [Allocate a concurrency limit](guides/02-netsuite/03-concurrency-limit.md) | What concurrency means, account limits, allocating a limit to the demo, handling `429` errors |
| [Security and key rotation](guides/02-netsuite/04-security-and-key-rotation.md) | Where private keys belong, limiting what a key can do, watching for misuse, replacing a certificate, what to do after a leak |

These docs are kept current with the code. Any change to code, config, routes,
bindings, scripts or deployment updates the matching doc in the same commit. If no
doc covers the change, add one and link it here.
