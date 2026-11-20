# NetSuite setup

Set up NetSuite so the demo can call its REST API as a machine-to-machine (M2M)
integration: an integration record, OAuth 2.0 client credentials with a certificate,
and a concurrency limit so the demo cannot crowd out your other integrations.

Start with [How certificates, roles and tokens work](00-certificates-roles-and-tokens.md):
an animated diagram of how the pieces fit together, with nothing to set up. Then work
through the other guides in order. You need a NetSuite Administrator role, or a role
that can enable features, manage roles and integrations, and create OAuth 2.0
client credentials mappings.

Try it in a sandbox account first. The OAuth 2.0 client credentials mapping is not
copied between accounts, and refreshing a sandbox clears it, so you set it up
separately in each account you use.

When you finish, you will have four values for the Cloudflare side of the demo:

| Value | Setting name | Example | From |
|-------|--------------|---------|------|
| Account ID | `NETSUITE_ACCOUNT_ID` | `1234567` or `1234567_SB1` | Integration record guide, step 1 |
| Client ID | `NETSUITE_CLIENT_ID` | a long random string | Integration record guide, step 4 |
| Certificate ID | `NETSUITE_CERTIFICATE_ID` | a random string | Client credentials guide, step 4 |
| Private key | `NETSUITE_PRIVATE_KEY` | `private.pem` | Client credentials guide, step 3; the app's **NetSuite certificate** page makes it for you |

They are stored in `.dev.vars` on your computer and as Cloudflare Worker secrets on a
deployed Worker; the client credentials guide, step 5, shows how. Treat the client ID,
certificate ID and especially the private key like passwords. Never commit them to Git
or paste them into chat. [Security and key rotation](04-security-and-key-rotation.md)
covers where keys belong and how to replace a certificate.

When the values are stored, open **Status** in the app's menu. It checks each step,
from the settings to a real request, and says what to fix. Then **Customers** shows
your customers, read live from NetSuite.
