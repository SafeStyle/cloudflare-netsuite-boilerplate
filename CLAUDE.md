# CLAUDE.md

## Directives

1. **Always update documentation in the `./docs` folder.** Every change to code,
   config, routes, bindings, scripts or deployment updates the matching doc in `./docs`
   in the same change. If no doc covers it, create one and link it from
   `docs/README.md`. The in-app guides in `docs/guides/` count too. So does the
   walkthrough in `public/walkthrough/`, which repeats the app's pages and the setup
   steps: `docs/walkthrough.md` lists what to update when those change. A task is not
   done until `./docs` matches the code.

2. **Every deployed instance is behind Cloudflare Zero Trust.** Assume any instance not
   running on the local dev server (`npm run dev`) is deployed behind Cloudflare Zero
   Trust (Cloudflare Access). By design, no non-local request is served without an
   authenticated Zero Trust user:
   - Every request, static files included, goes through `authenticate()` in
     `workers/zero-trust.ts` before anything else runs. Keep that order in
     `workers/app.ts`, and keep `"run_worker_first": true` in `wrangler.jsonc`.
   - The only exception is the local dev server. It is decided at build time
     (`import.meta.env.DEV`) and also requires a loopback hostname. Do not add any
     other bypass: no environment flags, allow-listed paths, public routes, or
     acceptance of a request without a valid user JWT.
   - Any new way into the Worker (another handler, a Durable Object reachable over
     HTTP, WebSockets) must go through the same check.
   - If a feature seems to need unauthenticated or machine access, such as NetSuite
     calling back into the app, stop and ask rather than working around the check.
     Access service tokens are refused by design.
   - Details: `docs/zero-trust.md`.

3. **This is not a SafeStyle application.** It lives under SafeStyle's GitHub, but it
   is an example for the Perth NetSuite User Group of how Cloudflare can be used to
   integrate with NetSuite's REST API. Keep it generic: no SafeStyle accounts, account
   IDs, domains, data, branding or internal systems. Write docs and UI text for that
   audience: NetSuite users who may be new to Cloudflare.

## Project

React Router v8 (framework mode, SSR) on a single Cloudflare Worker, built with Vite and
`@cloudflare/vite-plugin`. Start with `docs/architecture.md`.

- Worker entry: `workers/app.ts`. Routes: `app/routes.ts` (an explicit list, not
  file-based).
- Menu: `app/lib/menu.ts`. **Documentation** stays the first item, then **NetSuite
  certificate** (`/netsuite-certificate`), **Customers** (`/customers`) and **Status**
  (`/status`).
- NetSuite REST client: `app/lib/netsuite.server.ts`. See `docs/netsuite-client.md`.
  It is a basic demo client: do not add retries, back-off or queueing unless asked.
- Walkthrough: `public/walkthrough/`, plain HTML/CSS/JS with no build step. See
  `docs/walkthrough.md`.
- In-app documentation renders `docs/guides/NN-area/` folders: `README.md` is the
  area overview and `NN-guide.md` files are its guides. See
  `docs/in-app-documentation.md`.
- Generated, do not edit: `worker-configuration.d.ts` (committed), `.react-router/`,
  `build/`.

## Commands

- `npm run dev`: dev server at http://localhost:5173 (Zero Trust check skipped)
- `npm run typecheck`: regenerates types, then runs `tsc -b`
- `npm run build`: production build
- `npm run deploy`: build and deploy. Only run it when asked.

Before finishing a change, run `npm run typecheck` and `npm run build`.

## Conventions

- The certificate generator (`app/lib/self-signed-cert.ts`) runs only in the browser.
  Never send a generated private key to the server, and never return or log any secret
  value: status checks report set/valid only. See `docs/netsuite-credentials.md`.
- Call NetSuite only through `netsuiteRequest()` in `app/lib/netsuite.server.ts`. In a
  loader or action, catch failures and return `toProblem(error)` so the page explains
  what is wrong instead of crashing. Access tokens stay in that module and in the
  `NETSUITE_TOKENS` KV namespace: never return one from a loader or log it.
- This demo is for a NetSuite sandbox. Keep the security guidance visible: sandbox
  locally, least-privilege role, production private keys only in Worker secrets. See
  `docs/guides/02-netsuite/04-security-and-key-rotation.md`.
- Show state with an icon and words, not colour alone, and give every slow action
  visible feedback. Shared pieces are in `app/components/feedback.tsx`.
- Read the signed-in user with `context.get(identityContext)` from `~/lib/identity`.
- Read bindings, vars and secrets with
  `import { env, waitUntil } from "cloudflare:workers"`, only in loaders, actions or
  `*.server.ts` modules.
- Declare secrets in `secrets.required` in `wrangler.jsonc` and list them in
  `.dev.vars.example`. Never put secret values in `wrangler.jsonc`. After changing
  `wrangler.jsonc`, run `npm run types` and commit `worker-configuration.d.ts`.
- For React Router APIs, check the installed version's docs in
  `node_modules/react-router/docs/` rather than relying on memory. Older v6/v7 examples
  that use `context.cloudflare.env` do not apply here.
