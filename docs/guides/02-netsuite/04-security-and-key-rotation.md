# Security and key rotation

How to keep a certificate-based NetSuite integration safe: where private keys belong,
how to limit the damage if one leaks, and how to replace a certificate without
downtime. Read this before pointing the demo at anything but a sandbox.

## What you are protecting

The private key is the integration's password. Anyone who has it, plus the client ID
and Certificate ID stored beside it, can ask NetSuite for access tokens and do
everything the mapped role allows, from anywhere, until the certificate is revoked or
expires. NetSuite cannot tell them apart from your application.

So two questions decide how much a leak costs:

1. **How easy is the key to steal?** That depends on where it is stored.
2. **What can it do?** That depends on the account, the role and the user it is
   mapped to.

## Where private keys belong

| Place | Use it for | Why |
|-------|-----------|-----|
| `.dev.vars` on your computer | **Sandbox keys only** | It is a plain text file. Anyone who can read your disk can read it. |
| Cloudflare Worker secrets | **Production keys** | Encrypted, cannot be read back after they are set, and only the Worker can use them. |
| A password manager | A backup copy, if you want one | Encrypted and access is logged. |

**Never keep a production private key on a laptop.** A laptop can be lost or stolen,
and a disk without encryption gives up every file on it, `.dev.vars` included. A stolen
sandbox key is a nuisance. A stolen production key is access to your live customer and
financial data.

To set a production key without it ever being saved on your computer:

1. Open the deployed app's **NetSuite certificate** page and generate the certificate
   there. The key exists only in that browser tab.
2. Upload `public.pem` to NetSuite and copy the Certificate ID.
3. Copy the one-line key from the page and paste it straight into
   `npx wrangler secret put NETSUITE_PRIVATE_KEY`.
4. Close the tab. Do not download `private.pem`.

On any computer that holds a key, even a sandbox one:

- Turn on disk encryption: BitLocker or Device Encryption on Windows, FileVault on
  macOS, LUKS on Linux.
- Delete `private.pem` from your Downloads folder once the key is stored.
- Never commit a key, and never paste one into email, chat or a ticket. This project's
  `.gitignore` already excludes `.dev.vars` and `*.pem`.

## Limit what a key can do

- **Use a sandbox for development and demos.** Its data is a copy, and nothing done
  there reaches production.
- **One certificate per environment.** Sandbox and production get different key
  pairs. NetSuite does not copy mappings between accounts, so this is the default;
  do not work around it by reusing a key.
- **Give the role only what the job needs.** This demo only reads customers, so its
  role has Customers at View and the three permissions needed to sign in and query.
  It cannot create, edit or delete anything. Never use the Administrator role for an
  integration.
- **Use a dedicated user.** The demo walkthrough maps the certificate to your own
  user because that is quickest. For anything lasting, create a user just for the
  integration. Its work is then separate from yours in NetSuite's logs, and it keeps
  working when you change roles or leave.
- **One certificate per job.** If several agents or applications share an integration
  record, give each its own certificate, user and role. See
  [How certificates, roles and tokens work](00-certificates-roles-and-tokens.md#6-several-certificates-on-one-integration-one-role-per-job).
- **Choose a short validity.** A certificate valid for 90 days limits how long a
  stolen key is useful. The cost is rotating more often.
- **Give the integration its own concurrency limit**, so a runaway or abused
  integration cannot use up the whole account's capacity. See
  [Allocate a concurrency limit](03-concurrency-limit.md).

## Watch for misuse

- **Login Audit Trail** (**Setup > Users/Roles > User Management > View Login Audit
  Trail**): every token request, with its user, role and IP address. Add the
  **Detail** and **Token-based Application Name** columns. Requests from an address
  that is not Cloudflare's are a warning sign.
- **Execution Log** on the integration record, **REST Web Services** subtab: each
  request, its status and the user.
- **System Notes** on records: what the integration's user changed.

## Replace a certificate (rotation)

Rotate before a certificate expires, on a schedule, and whenever someone who had
access to the key leaves. NetSuite allows up to five active certificates for the same
integration record, user and role, so the old and new can overlap and nothing stops
working.

1. **Generate** a new key pair on the app's **NetSuite certificate** page.
2. **Upload** the new `public.pem`: **Setup > Integration > Manage Authentication >
   OAuth 2.0 Client Credentials (M2M) Setup > Create New**, with the same entity,
   role and application as before. Copy the new **Certificate ID**.
3. **Store** the new private key and the new Certificate ID together: in `.dev.vars`
   and restart, or with `npx wrangler secret put` for each. Always change them as a
   pair. A key with the wrong Certificate ID is refused.
4. **Check** the app's **Status** page. All four checks should pass. The app keeps
   tokens under a name that includes the Certificate ID, so it requests a new token
   with the new key by itself.
5. **Revoke** the old certificate: on the M2M setup page, select **Revoke** on its
   row. Do this last, once the new one is working.

NetSuite emails administrators two months, one month and 14 days before a certificate
expires. Put the date in a calendar as well. When a certificate expires, token
requests fail until it is replaced.

## If a key may have leaked

Act as if it has. Do these in order:

1. **Revoke the certificate now**, on the M2M setup page. The key stops working for
   new token requests immediately. The application stops too, until step 3.
2. **Remember tokens last up to 60 minutes.** A token already issued can still be
   used until it expires. If you cannot wait, disable the integration record
   (**State: Blocked**) or remove the role from the user until the hour has passed.
3. **Generate a new certificate**, upload it and store the new key and Certificate ID,
   as in the rotation steps above.
4. **Find out what was done.** Check the Login Audit Trail, the integration's Execution
   Log and System Notes for requests you do not recognise.
5. **Fix how it leaked** before issuing the new key to the same place.

## Checklist

- [ ] Development and demos use a sandbox account.
- [ ] Production private keys exist only in Cloudflare Worker secrets.
- [ ] Every computer holding a key has disk encryption turned on.
- [ ] The integration role has only the permissions the job needs, and is not Administrator.
- [ ] The integration has its own user, not a person's login.
- [ ] Each environment, and each agent or job, has its own certificate.
- [ ] The certificate's expiry date is in a calendar, with time to rotate before it.
- [ ] `private.pem` is deleted from Downloads; nothing secret is in Git, email or chat.
- [ ] Someone looks at the Login Audit Trail now and then.

## Sources

From Oracle's NetSuite Help Center:

- [Certificate Conditions](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/subsect_162755332391.html)
- [OAuth 2.0 Client Credentials Setup](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_162686838198.html)
- [Tracking OAuth 2.0 logins in the Login Audit Trail](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_158323851171.html)
- [The REST Web Services execution log](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_156570320384.html)

From Cloudflare:

- [Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
