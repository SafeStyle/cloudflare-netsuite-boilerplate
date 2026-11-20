import { env } from "cloudflare:workers";

import { netsuiteSettingsStatus, type SettingStatus } from "./netsuite-credentials.server";
import {
  accountKind,
  ensureAccessToken,
  listCustomers,
  tokenStoreState,
  toProblem,
  type AccountKind,
  type NetsuiteProblem,
} from "./netsuite.server";

/**
 * The checks behind the Status page, run in the order a request depends on them:
 * settings, token store, access token, then a real API call. A check that cannot
 * run because an earlier one failed is reported as skipped. No setting value or
 * token is ever included. See docs/netsuite-client.md.
 */

export type CheckState = "ok" | "warn" | "fail" | "skipped";

export interface StatusCheck {
  id: "settings" | "token-store" | "token" | "api";
  label: string;
  state: CheckState;
  summary: string;
  problem?: NetsuiteProblem;
}

export interface NetsuiteStatus {
  environment: "local" | "deployed";
  /** Worked out from the account ID's shape; null until the account ID is set. */
  accountKind: AccountKind | null;
  settings: SettingStatus[];
  checks: StatusCheck[];
  /** True when every check passed, so the Customers page will work. */
  ready: boolean;
}

/** "about 42 minutes", for a time in the future. */
export function timeUntil(expiresAt: number): string {
  const minutes = Math.max(0, Math.round((expiresAt - Date.now()) / 60_000));
  return minutes <= 1 ? "about a minute" : `about ${minutes} minutes`;
}

export async function netsuiteStatus(): Promise<NetsuiteStatus> {
  const settings = await netsuiteSettingsStatus();
  const unusable = settings.filter((setting) => !setting.ok);
  const checks: StatusCheck[] = [];

  checks.push(
    unusable.length === 0
      ? {
          id: "settings",
          label: "Settings",
          state: "ok",
          summary: "All four settings are set and the private key is valid.",
        }
      : {
          id: "settings",
          label: "Settings",
          state: "fail",
          summary: `${unusable.length} of ${settings.length} settings need attention.`,
        },
  );

  const store = await tokenStoreState();
  checks.push({
    id: "token-store",
    label: "Token store (Workers KV)",
    state: store.available ? "ok" : "warn",
    summary: !store.available
      ? "No KV namespace is bound as NETSUITE_TOKENS. The app still works, but it has to ask NetSuite for a new token on every request."
      : store.expiresAt
        ? `KV is available and holds a token that expires in ${timeUntil(store.expiresAt)}.`
        : "KV is available. No token is stored yet.",
  });

  let tokenOk = false;
  if (unusable.length > 0) {
    checks.push({ id: "token", label: "Access token", state: "skipped", summary: "Needs the settings first." });
  } else {
    try {
      const token = await ensureAccessToken();
      tokenOk = true;
      checks.push({
        id: "token",
        label: "Access token",
        state: "ok",
        summary:
          token.source === "cache"
            ? `Using the token kept in KV. It expires in ${timeUntil(token.expiresAt)}, and the app will replace it shortly before then.`
            : `NetSuite issued a new token${token.stored ? " and it was stored in KV" : ", but it could not be stored"}. It expires in ${timeUntil(token.expiresAt)}.`,
      });
    } catch (error) {
      const problem = toProblem(error);
      checks.push({ id: "token", label: "Access token", state: "fail", summary: problem.title, problem });
    }
  }

  let apiOk = false;
  if (!tokenOk) {
    checks.push({ id: "api", label: "Reading customers", state: "skipped", summary: "Needs an access token first." });
  } else {
    try {
      const result = await listCustomers(1, 1);
      apiOk = true;
      checks.push({
        id: "api",
        label: "Reading customers",
        state: "ok",
        summary: `NetSuite answered in ${result.durationMs} ms. The role can read customers: ${result.data.total.toLocaleString("en")} active.`,
      });
    } catch (error) {
      const problem = toProblem(error);
      checks.push({ id: "api", label: "Reading customers", state: "fail", summary: problem.title, problem });
    }
  }

  const accountId = (env.NETSUITE_ACCOUNT_ID ?? "").trim();
  return {
    environment: import.meta.env.DEV ? "local" : "deployed",
    accountKind: accountId ? accountKind(accountId) : null,
    settings,
    checks,
    ready: unusable.length === 0 && tokenOk && apiOk,
  };
}
