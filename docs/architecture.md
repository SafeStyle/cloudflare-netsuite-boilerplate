# Architecture

The project is one Cloudflare Worker that serves a React Router v8 app in framework
mode, rendered on the server (`ssr: true`). Vite builds it, and the Cloudflare Vite
plugin runs the server code inside workerd (the Workers runtime) in both dev and build.
Deployed instances sit behind Cloudflare Zero Trust; see [zero-trust.md](zero-trust.md).

## How a request is handled

1. On a deployed instance, Cloudflare Access signs the user in before the request
   reaches the Worker and attaches a signed JWT.
2. `"run_worker_first": true` sends every request to `workers/app.ts`, including
   requests for static files.
3. **Zero Trust check.** `authenticate()` in `workers/zero-trust.ts` verifies the
   Access JWT. Without a valid user JWT, the Worker answers `403`, or `500` if Access
   settings are missing, and nothing else runs. The local dev server skips this step.
4. **Static files.** For `GET` and `HEAD`, the Worker asks the `ASSETS` binding for a
   matching file (JavaScript, CSS, anything from `public/`) and returns it if found.
5. **React Router.** Anything else goes to React Router with the signed-in user in its
   context. It matches the URL against `app/routes.ts` and runs the matched routes'
   `loader` (GET) or `action` (POST, PUT, DELETE…) on the server. Then it either:
   - renders the route components to HTML inside the app shell in `app/root.tsx`
     (header, menu, signed-in user), or
   - returns the loader or action's `Response` unchanged (resource routes, which have
     no default export).
6. The browser hydrates the HTML. Later in-app navigations fetch only loader data from
   the Worker, and each of those requests passes the same Zero Trust check.

Unmatched URLs get a 404 rendered by the `ErrorBoundary` in `app/root.tsx`.

## Files

| Path | Purpose |
|------|---------|
| `workers/app.ts` | Worker entry (`main` in `wrangler.jsonc`). Zero Trust check, then static files, then React Router. Durable Objects, Workflows, and queue or cron handlers would also be exported from here. |
| `workers/zero-trust.ts` | Access JWT verification and the local dev exception. |
| `app/root.tsx` | HTML shell (`Layout`), header with the menu and signed-in user, root `ErrorBoundary`. |
| `app/routes.ts` | Route table. Routes are not picked up from the file system; each one must be listed here. |
| `app/routes/` | Route modules: `home.tsx`, `docs/` (in-app documentation), `netsuite-certificate.tsx` (certificate generator), `customers.tsx` (customers read from NetSuite), `status.tsx` (configuration and connectivity checks), `api.health.ts`. |
| `app/lib/menu.ts` | Top-level menu items, in display order. |
| `app/lib/identity.ts` | `Identity` type and the React Router context that carries it from the Worker to routes. |
| `app/lib/guides.server.ts` | Loads and renders the markdown guides in `docs/guides/`, and inlines their SVG diagrams. |
| `app/lib/self-signed-cert.ts` | Browser-only generator for the NetSuite certificate and private key (Web Crypto). |
| `app/lib/netsuite-credentials.server.ts` | The NetSuite settings: names, private key parsing and the set/valid status shown on the certificate and Status pages. |
| `app/lib/netsuite.server.ts` | The NetSuite REST client: token requests, the token store in Workers KV, REST calls, `listCustomers()`. See [netsuite-client.md](netsuite-client.md). |
| `app/lib/netsuite-status.server.ts` | The checks behind the Status page. |
| `app/components/` | Shared UI components: `GuideList.tsx`, and `feedback.tsx` (state icons, callouts, buttons, the NetSuite problem panel). |
| `app/app.css` | Tailwind CSS v4 entry point, with the Typography plugin for guides. |
| `docs/guides/` | Markdown guides shown in the app under Documentation, one folder per area, with any SVG diagrams they show. |
| `public/` | Files served from the site root, such as `/favicon.ico`. Like everything else, a deployed Worker serves them only to signed-in Zero Trust users. |
| `public/walkthrough/` | The simulated setup walkthrough: plain HTML, CSS and JavaScript, no build step. See [walkthrough.md](walkthrough.md). |
| `.github/workflows/pages.yml` | Publishes `public/walkthrough/` to GitHub Pages. Nothing else is built or deployed by GitHub. |
| `react-router.config.ts` | React Router settings (`ssr: true`). |
| `vite.config.ts` | Vite plugins: Cloudflare (runs the SSR environment in workerd), Tailwind, React Router. |
| `wrangler.jsonc` | Worker settings: name, compatibility date, static assets, the `NETSUITE_TOKENS` KV namespace, required secrets. |
| `worker-configuration.d.ts` | Generated `Env` and Workers runtime types. Committed. Regenerate with `npm run types`; do not edit by hand. |
| `tsconfig.json` | Project references only. `tsconfig.cloudflare.json` covers `app/` and `workers/`; `tsconfig.node.json` covers `vite.config.ts`. |

Generated and gitignored:

- `.react-router/` holds the route types that `./+types/<route>` imports resolve to.
- `build/` is the output of `npm run build`.

## Build output

`npm run build` writes two folders:

- `build/client/` holds the browser assets, served through the `ASSETS` binding.
- `build/server/` holds the bundled Worker and a generated `wrangler.json` (the
  plugin fills in the assets directory).

The build also writes `.wrangler/deploy/config.json`, which points `wrangler deploy`
at `build/server/wrangler.json`. A deploy therefore ships whatever was last built, so
always build first; `npm run deploy` does both.

A production build compiles `import.meta.env.DEV` to `false`, which removes the local
dev exception from the deployed Worker.
