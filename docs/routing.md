# Routes, menu, data and bindings

Every route is behind the Zero Trust check in `workers/app.ts`; there is no way to
make a route public. See [zero-trust.md](zero-trust.md).

## Adding a page

1. Create the route module, for example `app/routes/customer.tsx`, with a default
   export for the component.
2. Register it in `app/routes.ts`:

   ```ts
   route("customers/:id", "routes/customer.tsx"),
   ```

3. Import its generated types from `./+types/customer`.

```tsx
import { data } from "react-router";
import type { Route } from "./+types/customer";

export async function loader({ params }: Route.LoaderArgs) {
  const customer = await getCustomer(params.id);
  if (!customer) throw data("Customer not found", { status: 404 });
  return { customer };
}

export default function Customer({ loaderData }: Route.ComponentProps) {
  return <h1>{loaderData.customer.name}</h1>;
}
```

`loader` and `action` run only on the server, inside the Worker, so they are the place
for secrets and calls to NetSuite. To call NetSuite, use `netsuiteRequest()` and return
a problem instead of throwing: see
[netsuite-client.md](netsuite-client.md#adding-another-netsuite-call). Whatever a loader returns is sent to the browser,
so return only the fields the page needs. A thrown `data(...)` or `Response` is
rendered by the nearest `ErrorBoundary`, which here is the one in `app/root.tsx`.

Pages render inside the app shell in `app/root.tsx`: the header with the menu and the
signed-in user, a "Skip to content" link, and a loading bar across the top that shows
while a loader is running. Loaders that call NetSuite can take a second or more, so the
bar is what tells the person their click worked. For feedback inside a page, such as a
button that says "Checking…", use the pieces in `app/components/feedback.tsx`. Nested routes, like `docs/`, can add their own layout with
`route("path", "layout.tsx", [children])`.

## Adding a menu item

The header menu comes from `app/lib/menu.ts`. Items show in array order, and
**Documentation** stays first.

```ts
export const menu: MenuItem[] = [
  { label: "Documentation", to: "/docs" },
  { label: "NetSuite certificate", to: "/netsuite-certificate" },
  { label: "Customers", to: "/customers" },
  { label: "Status", to: "/status" },
  { label: "Items", to: "/items" }, // a new item
];
```

Each `to` must match a route in `app/routes.ts`. The item is highlighted while the
current URL is at or below its `to` path.

## Handling form submissions

Export an `action` from the route and submit to it with `<Form method="post">` from
`react-router`. The action receives the `request` (read it with
`await request.formData()`). After it finishes, React Router reloads the loaders on the
page so the UI shows fresh data.

## API routes (resource routes)

A route module with no default export is a resource route. Its loader or action's
`Response` goes to the client unchanged. `app/routes/api.health.ts` is the example:

```ts
export function loader() {
  return Response.json({ ok: true });
}
```

Use these for JSON endpoints and file downloads. Link to them with a plain `<a href>`,
or `<Link reloadDocument>`, because they do not render a page. Like everything else,
they only answer signed-in Zero Trust users.

## Who is signed in

```ts
import { identityContext } from "~/lib/identity";

export function loader({ context }: Route.LoaderArgs) {
  const identity = context.get(identityContext);
  if (identity.source === "cloudflare-access") {
    identity.email; // the Access user's email
  }
  // identity.source === "local-dev" on the dev server
}
```

## Reading bindings, vars and secrets

Import `env` from `cloudflare:workers`:

```ts
import { env, waitUntil } from "cloudflare:workers";

export async function loader() {
  const token = env.SOME_SECRET;
  waitUntil(logUsage());   // runs after the response is sent
  // ...
}
```

- `env` is typed from `worker-configuration.d.ts`. Run `npm run types` after changing
  `wrangler.jsonc`.
- `waitUntil` replaces `ctx.waitUntil`. Use these imports instead of `env` and `ctx`
  from the Worker entry, which are not passed into React Router.
- Use `env` only in server code: loaders, actions, and `*.server.ts` modules. React
  Router strips loaders and actions from the browser bundle. It fails the build if a
  `*.server.ts` module ends up in browser code, so keep shared server logic, such as a
  NetSuite REST client, in files named like `app/lib/netsuite.server.ts`.
- Bindings such as the `NETSUITE_TOKENS` KV namespace are on `env` too:
  `env.NETSUITE_TOKENS.get(key)`.
- Declare new secrets in `secrets.required` in `wrangler.jsonc`. See
  [development.md](development.md#secrets).
