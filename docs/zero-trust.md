# Zero Trust

Every deployed instance of this app sits behind Cloudflare Zero Trust (Cloudflare
Access). The Worker serves no request that does not come from a user signed in
through Access. The only exception is the local dev server.

There are two layers:

1. **Cloudflare Access** on Cloudflare's network makes users sign in before their
   request reaches the Worker. It adds a signed JWT to each request it lets through.
2. **The Worker** (`workers/zero-trust.ts`) checks that JWT on every request,
   static files included, and refuses anything without a valid one. If Access is
   switched off or misconfigured, or someone finds a route Access does not cover,
   the Worker still refuses the request.

## What the Worker checks

`authenticate()` in `workers/zero-trust.ts` runs first in `workers/app.ts`, before
static files or any route code.

| Situation | Response |
|-----------|----------|
| Local dev server (`npm run dev`) on `localhost`, `127.0.0.1` or `[::1]` | Allowed; the header shows "Local dev · Zero Trust check skipped" |
| `ACCESS_TEAM_DOMAIN` or `ACCESS_AUD` not set, or the team domain is not `https` | `500 Server misconfigured.` (details go to the Worker logs) |
| No `Cf-Access-Jwt-Assertion` header | `403` |
| JWT invalid, expired, signed by another key, wrong issuer or wrong audience | `403` |
| Valid JWT without an `email` claim (an Access service token) | `403`, by design: only users are served |
| Valid user JWT | Allowed; the user's email is passed to routes |

The JWT is verified with [`jose`](https://github.com/panva/jose) against the team's
public keys at `https://<team-name>.cloudflareaccess.com/cdn-cgi/access/certs`. Keys
are cached in memory and refetched when Access rotates them.

### Why the local exception is safe

The dev-server branch is wrapped in `import.meta.env.DEV`. A production build
replaces that with `false` and removes the branch, so deployed code does not contain
it. As a second guard, the branch also requires a loopback hostname, and on
Cloudflare's network a request's hostname is never loopback. If you open the dev
server from another device on your network (`--host`), the check applies there too.

### Why the Worker checks the JWT itself

Cloudflare offers `ctx.access` for Workers behind Access, but it is not passed to a
Worker that has static assets, which this one does. So the Worker reads the
`Cf-Access-Jwt-Assertion` header and verifies it, as Cloudflare's docs describe for
that case.

### Static files go through the check too

`"run_worker_first": true` in `wrangler.jsonc` sends every request to the Worker,
including requests for JavaScript, CSS and files in `public/`. After the Zero Trust
check passes, the Worker serves them through the `ASSETS` binding. Without this
setting, Cloudflare would serve static files without running the Worker.

Side effect: every static file request counts as a Worker request (the Workers Free
plan allows 100,000 a day).

## Using the signed-in user in routes

The Worker puts the user's identity into the React Router context. Read it in a
loader or action:

```ts
import { identityContext } from "~/lib/identity";

export function loader({ context }: Route.LoaderArgs) {
  const identity = context.get(identityContext);
  // { source: "cloudflare-access", email: "someone@example.com" }
  // or { source: "local-dev" } on the dev server
}
```

`app/root.tsx` uses it to show "Signed in as …" in the header.

## Setting it up for a deployment

Before you start, complete the in-app guide
[Cloudflare account sign up process](guides/01-cloudflare/01-account-sign-up.md). It
ends with a Zero Trust organisation and a team name.

1. **Deploy once.**

   ```bash
   npx wrangler login
   npm run deploy
   ```

   Until steps 2 and 3 are done, the deployed Worker answers every request with
   `500 Server misconfigured.`, so it is never open.

2. **Put the Worker behind Access.** In the Cloudflare dashboard:
   1. Go to **Workers & Pages** and select the `cloudflare-netsuite-boilerplate` Worker.
   2. Open the **Access** tab and select **Protect this Worker behind Access**.
   3. Choose **All traffic**, so the `workers.dev` address, any custom domains and
      version or preview URLs are all covered.
   4. Under **Authentication policy**, choose who may sign in, then select **Apply Access**.

3. **Give the Worker its Access settings.** Find the Access application that now
   protects the Worker under **Zero Trust** > **Access controls** > **Applications**.
   Open it and copy the **Application Audience (AUD) Tag** from its settings. Then:

   ```bash
   npx wrangler secret put ACCESS_TEAM_DOMAIN   # https://<team-name>.cloudflareaccess.com
   npx wrangler secret put ACCESS_AUD           # the AUD tag
   ```

   Each `secret put` deploys a new version of the Worker immediately. The AUD tag only
   changes if the Access application is deleted and recreated.

4. **Check it.** Open the Worker's URL in a private browser window. You should get the
   Cloudflare Access sign-in page first, then the app with "Signed in as <your email>"
   in the header. If you get `500`, a secret is missing or wrong. If you get `403`
   after signing in, the AUD tag or team domain does not match the Access application.

## Rules for changing this

These rules are also directives in `CLAUDE.md`.

- Do not add bypasses: no environment flags, allow-listed paths, public routes, or
  acceptance of requests without a valid user JWT.
- Keep `authenticate()` as the first thing `workers/app.ts` does, and keep
  `"run_worker_first": true`.
- Any new way into the Worker (another handler, a Durable Object reachable over HTTP,
  WebSockets) must go through the same check. Worker-level Access does not support
  WebSockets.
- If a feature needs machine access or unauthenticated access, such as NetSuite
  calling back into the app, treat it as a design change and agree it first. Access
  service tokens are refused today.

## Sources

- [Validate JWTs](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/)
- [Cloudflare Access for Workers](https://developers.cloudflare.com/workers/configuration/cloudflare-access/)
- [Static assets: run your Worker first](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/)
- [Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
