# cloudflare-netsuite-boilerplate

Starting point for a Cloudflare Worker that talks to NetSuite. Right now it is an
empty Worker that answers every request with a small JSON reply.

## Setup

```bash
npm install
cp .dev.vars.example .dev.vars   # local secrets, never committed
npm run dev                      # http://localhost:8787
```

## Scripts

| Command             | What it does                                         |
|---------------------|------------------------------------------------------|
| `npm run dev`       | Run the Worker locally                               |
| `npm run deploy`    | Deploy to Cloudflare                                 |
| `npm run types`     | Regenerate `worker-configuration.d.ts` from wrangler |
| `npm run typecheck` | Regenerate types and run `tsc`                       |

## Secrets

Never put keys in `wrangler.jsonc`. Use `.dev.vars` locally and
`wrangler secret put <NAME>` in production.

## Calling NetSuite

Route NetSuite calls through the concurrency proxy
(`netsuite-concurrency-proxy`, ns-proxy.safestyle.dev) over a service binding so the
account's concurrency limit is respected. See that repo's README for the caller contract.
