# Development

First-time machine setup (Git, Node.js, Claude Code) is in the project
[README](../README.md#set-up-a-development-environment).

## Running locally

```bash
npm install
cp .dev.vars.example .dev.vars   # local secrets, never committed
npm run dev                      # http://localhost:5173
```

Node.js 22.22.0 or later is required (`engines` in `package.json`).

The dev server runs the app inside workerd through the Cloudflare Vite plugin, with hot
module reload. Bindings and `.dev.vars` values behave as they do in production.

The dev server is the only place the Zero Trust check is skipped, and only for
requests to `localhost`, `127.0.0.1` or `[::1]`. The header shows "Local dev · Zero
Trust check skipped" so this is always visible. See [zero-trust.md](zero-trust.md).

There is no local preview of the production build. A production build always enforces
Zero Trust, so to try one, deploy it behind Access.

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Dev server with hot reload at http://localhost:5173 |
| `npm run build` | Production build into `build/` |
| `npm run deploy` | Build, run `scripts/check-build.mjs`, then deploy to Cloudflare. The check stops the deploy if the build still contains the local dev exception to the Zero Trust check. Do not deploy with `npx wrangler deploy` alone. |
| `npm run types` | Regenerate `worker-configuration.d.ts` (Wrangler) and route types in `.react-router/` |
| `npm run typecheck` | `npm run types`, then `tsc -b` |

## Types

- Each route module imports its types from `./+types/<file name>`, for example
  `Route.LoaderArgs` and `Route.ComponentProps`. The dev server regenerates these as you
  edit. Without it running (in CI, or after adding a route), run `npm run types`.
- After changing bindings, vars or required secrets in `wrangler.jsonc`, run
  `npm run types` so `Env` in `worker-configuration.d.ts` matches, and commit the
  regenerated file.

## Secrets

Never put keys in `wrangler.jsonc`.

- **Declare** every secret's name in `secrets.required` in `wrangler.jsonc`. That is
  what types it in `Env`. Wrangler warns during local dev and builds when a declared
  secret is missing from `.dev.vars`.
- **Local:** put values in `.dev.vars` (gitignored), and list each name in
  `.dev.vars.example` so others know what to set.
- **Production:** `npx wrangler secret put <NAME>`. This creates and deploys a new
  Worker version immediately.

The Zero Trust secrets, `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD` and `ACCESS_ALLOWED_EMAILS`, can stay empty in
`.dev.vars`. The dev server does not use them, and the empty entries only keep
Wrangler from warning.

Use a NetSuite **sandbox** account's values in `.dev.vars`, never production's: the
file is plain text on your computer. See
[Security and key rotation](guides/02-netsuite/04-security-and-key-rotation.md).

The NetSuite secrets (`NETSUITE_ACCOUNT_ID`, `NETSUITE_CLIENT_ID`,
`NETSUITE_CERTIFICATE_ID`, `NETSUITE_PRIVATE_KEY`) and the private key's one-line format
are covered in [netsuite-credentials.md](netsuite-credentials.md). The app's **NetSuite
certificate** page shows whether each one is set in the current environment.

## Bindings and local state

`wrangler.jsonc` binds one Workers KV namespace, `NETSUITE_TOKENS`, which holds the
current NetSuite access token ([netsuite-client.md](netsuite-client.md#the-token-store-workers-kv)).

- **Locally** the dev server keeps KV data in `.wrangler/state/`, which Git ignores.
  Delete that folder to start clean. The stored token is a working credential for up
  to an hour, so treat the folder like `.dev.vars`.
- **Deployed**, the binding has no `id` in `wrangler.jsonc`, so Wrangler creates the
  namespace on the first `npm run deploy` and remembers it. Nothing to set up by hand.

## Deploying

The first deploy needs a Cloudflare account with Zero Trust set up. Follow the guide
[Cloudflare account sign up process](guides/01-cloudflare/01-account-sign-up.md), then
[zero-trust.md](zero-trust.md#setting-it-up-for-a-deployment).

`npm run deploy` builds and deploys to the Cloudflare account Wrangler is logged in
to (`npx wrangler whoami`). If you belong to several accounts, Wrangler asks which to
use, or you can set `CLOUDFLARE_ACCOUNT_ID`.

To upload a version without changing what production serves:

```bash
npm run build
npx wrangler versions upload    # prints a version URL, which is also behind the Zero Trust check
npx wrangler versions deploy    # later: promote it, fully or gradually
```
