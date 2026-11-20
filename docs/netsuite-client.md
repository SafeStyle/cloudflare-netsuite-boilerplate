# The NetSuite client, Customers and Status

How the app talks to NetSuite's REST API: getting an access token, keeping it in
Workers KV, calling the API, and what the **Customers** and **Status** pages show when
something is wrong. For the settings it needs, see
[netsuite-credentials.md](netsuite-credentials.md). For the NetSuite side, see the
in-app guides under [NetSuite setup](guides/02-netsuite/README.md).

This is a basic client on purpose. It does not retry, back off, queue requests or
limit how many run at once. A real integration needs those; see
[Allocate a concurrency limit](guides/02-netsuite/03-concurrency-limit.md).

## Files

| File | What it does |
|------|--------------|
| `app/lib/netsuite.server.ts` | The client: settings, token request, token store, REST calls, `listCustomers()`, and turning failures into problems |
| `app/lib/netsuite-status.server.ts` | The four checks behind the Status page |
| `app/routes/customers.tsx` | `/customers`: the paginated table |
| `app/routes/status.tsx` | `/status`: configuration and connectivity checks, and **Request a new token** |
| `app/components/feedback.tsx` | Shared icons, callouts, buttons and the problem panel |

Both `.server.ts` files only run in the Worker. Nothing they hold reaches the browser
except what a loader returns.

## What happens on a request

`netsuiteRequest(path, options)` does this each time:

1. **Read the settings.** If any is missing, or the private key is not usable, it stops
   with a "not connected yet" problem that names the settings (never their values).
2. **Get an access token.** It looks in KV first. A stored token is used if it has more
   than two minutes left.
3. **Otherwise ask NetSuite for one.** It signs a JWT with the private key and posts it
   to `https://<account>.suitetalk.api.netsuite.com/services/rest/auth/oauth2/v1/token`.
   The JWT carries the client ID (`iss`), the Certificate ID (`kid`), the scope
   `rest_webservices`, and expires after five minutes. The signing algorithm follows
   the key: ES256, ES384 or ES512 for an EC key, PS256 for an RSA key.
4. **Store the new token in KV**, with an expiry so KV deletes it when the token dies.
5. **Call the API** with `Authorization: Bearer <token>`.
6. **If NetSuite answers `401` to a stored token**, ask for a new token and try the call
   once more. This covers a token that was revoked, or expired early.
7. **Return the JSON**, or throw a `NetsuiteError` describing the failure.

Every request to NetSuite has a 15 second timeout.

The account ID becomes the first part of the address: `1234567_SB1` becomes
`1234567-sb1`. Anything but letters, numbers and single dashes is rejected before a
request is made.

## The token store (Workers KV)

A Worker keeps nothing in memory between requests, so the token is kept in a
[Workers KV](https://developers.cloudflare.com/kv/) namespace bound as
`NETSUITE_TOKENS` in `wrangler.jsonc`.

- **Key:** `netsuite-token:` followed by a short hash of the account address, client ID
  and Certificate ID. Changing any of those settings changes the key, so a token from
  the old settings is never reused.
- **Value:** the access token and the time it expires.
- **Expiry:** set to the token's lifetime (60 minutes), so KV removes it by itself.
- **Refresh:** there is no refresh token. Two minutes before expiry the app treats the
  token as gone and requests a new one, which overwrites the old entry.

The binding has no `id` in `wrangler.jsonc`. Wrangler creates the namespace on the
first `npm run deploy`. On the dev server, KV is a local store in `.wrangler/state/`,
which Git ignores.

If the binding is missing, the app still works: it requests a new token on every call,
and the Status page says so.

A token is a credential for up to an hour. KV encrypts values at rest, and the token is
never sent to the browser or written to logs. On your own computer the local KV store
is a plain file, which is one more reason to
[use a sandbox locally](guides/02-netsuite/04-security-and-key-rotation.md).

## Problems

Every failure becomes a `NetsuiteProblem`: a title, what it means, what to do, and
NetSuite's HTTP status and error code when there is one. `toProblem(error)` converts
anything thrown. Pages show the problem instead of crashing.

| Kind | When | What the page says to do |
|------|------|--------------------------|
| `not-configured` | A setting is missing, or the account ID is malformed | Add the settings (`.dev.vars` locally, Worker secrets when deployed) |
| `invalid-key` | The private key is set but cannot be used | Paste the key as one line, or generate a new certificate |
| `token-rejected` | The token endpoint answered with an error instead of a token | Read the Login Audit Trail in NetSuite; lists the usual causes |
| `unauthorized` | `401` from the API, even with a fresh token | Check the role's OAuth and REST permissions |
| `forbidden` | `403` | Add the missing permission to the role |
| `bad-request` | `400`, such as SuiteQL's "Record 'customer' was not found" | Usually a missing permission on the role |
| `rate-limited` | `429`, the concurrency limit was reached | Wait and reload; the demo does not retry |
| `unreachable` | No answer: network failure or timeout | Check the connection and the account ID |
| `netsuite-error` | Any other error status, or an answer that is not JSON | Try again later |
| `unexpected` | A bug in the app | Logged with `console.error`; try again |

NetSuite does not say why it refused a token request. Its answer is a `4xx` with a
short body such as `{"error": "invalid_request"}`. The reason is in NetSuite's Login
Audit Trail, which is why the problem text points there.

## Customers

`/customers` shows active customers, 20 per page, with **Previous** and **Next** links
(`/customers?page=2`), so a page can be bookmarked.

`listCustomers(page)` makes one SuiteQL request:

```
POST /services/rest/query/v1/suiteql?limit=20&offset=20
Prefer: transient

{"q": "SELECT id, entityid, companyname, firstname, lastname, email, phone
       FROM customer WHERE isinactive = 'F' ORDER BY entityid"}
```

SuiteQL is used instead of the record API (`/record/v1/customer`) because the record
API's list only returns IDs, so a table would need one more request per row. SuiteQL
returns the rows and the total in a single request.

**The role in the M2M mapping needs:** Lists > **Customers** at View, Reports >
**SuiteAnalytics Workbook**, Setup > **REST Web Services** and Setup > **Log in using
OAuth 2.0 Access Tokens**. Nothing else. Without the Customers permission, NetSuite
answers `400` saying the record "was not found".

What the page does for the person using it:

- A bar across the top and a dimmed table show that a page is loading.
- "Showing 21 to 40 of 53 customers" and "Page 2 of 3" say where they are.
- Under the table it says how long NetSuite took and whether the token came from KV or
  was newly requested.
- If setup is incomplete it says so and links to Status, instead of showing an error.
- Any other failure shows what went wrong and what to do, with **Try again**.
- A page number past the end, or no customers at all, gets its own message.

## Status

`/status` runs four checks, in the order a request depends on them. A check that cannot
run because an earlier one failed is shown as skipped.

| Check | Passes when | Otherwise |
|-------|-------------|-----------|
| 1. Settings | All four are set and the private key is a type NetSuite accepts | Lists each setting as set or not, and the steps to add them |
| 2. Token store (Workers KV) | The `NETSUITE_TOKENS` binding exists; says whether a token is stored and when it expires | Warning: works, but requests a token every time |
| 3. Access token | A stored token is usable, or NetSuite issues a new one | The problem and what to do |
| 4. Reading customers | A one-row customers query succeeds; shows the time taken and the count | The problem and what to do |

It also shows where the app is running, and the kind of NetSuite account, worked out
from the account ID's shape (`_SB1` is a sandbox, `_RP` Release Preview, `TD` or
`TSTDRV` a test account, anything else production).

**On the dev server with a production account ID it shows a warning**: a production
private key is sitting in `.dev.vars` on a laptop.

Buttons:

- **Run checks again** reruns the loader.
- **Request a new token** deletes the stored token and asks NetSuite for another, then
  reruns the checks. It is the manual version of what happens before a token expires.

Like the certificate page, Status never shows a setting's value or a token.

## Adding another NetSuite call

Write a function next to `listCustomers()` that calls `netsuiteRequest()`, and call it
from a loader or action inside `try`/`catch`, returning `toProblem(error)` on failure:

```ts
export async function loader() {
  try {
    const result = await netsuiteRequest<{ items: unknown[] }>(
      "/services/rest/query/v1/suiteql?limit=10",
      { method: "POST", headers: { Prefer: "transient" }, body: { q: "SELECT id, itemid FROM item" } },
    );
    return { ok: true as const, items: result.data.items };
  } catch (error) {
    return { ok: false as const, problem: toProblem(error) };
  }
}
```

Add the record's permission to the role in NetSuite first. Never return a token or a
setting's value from a loader: whatever a loader returns is sent to the browser.
