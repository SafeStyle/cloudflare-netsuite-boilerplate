import { createContext } from "react-router";

/**
 * Who is making the request. Set by the Worker entry (workers/app.ts) after the
 * Zero Trust check, before any route code runs. See docs/zero-trust.md.
 */
export type Identity =
  | { source: "cloudflare-access"; email: string }
  | { source: "local-dev" };

// No default value: reading it when the Worker did not set it throws, so a request
// that somehow skipped the Zero Trust check fails instead of rendering.
export const identityContext = createContext<Identity>();
