import { createRequestHandler, RouterContextProvider } from "react-router";

import { identityContext } from "../app/lib/identity";
import { authenticate } from "./zero-trust";

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

export default {
  async fetch(request, env) {
    // 1. Zero Trust first. Nothing, not even a static file, is served without it.
    const auth = await authenticate(request, env);
    if (!auth.ok) return auth.response;

    // 2. Static files (public/ and the client build). `assets.run_worker_first`
    //    in wrangler.jsonc routes them through this Worker so step 1 covers them.
    if (request.method === "GET" || request.method === "HEAD") {
      const asset = await env.ASSETS.fetch(request);
      if (asset.status !== 404) return asset;
    }

    // 3. Everything else is a React Router page or resource route.
    const context = new RouterContextProvider();
    context.set(identityContext, auth.identity);
    return requestHandler(request, context);
  },
} satisfies ExportedHandler<Env>;
