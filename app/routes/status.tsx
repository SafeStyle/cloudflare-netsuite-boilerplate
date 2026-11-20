import { Link, useFetcher, useRevalidator } from "react-router";

import {
  buttonClass,
  Callout,
  linkClass,
  primaryButtonClass,
  ProblemDetails,
  Spinner,
  StateIcon,
  toneLabel,
} from "~/components/feedback";
import { netsuiteStatus, timeUntil } from "~/lib/netsuite-status.server";
import { ensureAccessToken, forgetAccessToken, toProblem } from "~/lib/netsuite.server";
import type { Route } from "./+types/status";

export const meta: Route.MetaFunction = () => [
  { title: "Status · Cloudflare + NetSuite demo" },
  { name: "description", content: "Whether this app is set up and can reach NetSuite" },
];

export async function loader() {
  return netsuiteStatus();
}

/** "Request a new token": forgets the stored token and asks NetSuite for another. */
export async function action() {
  try {
    await forgetAccessToken();
    const token = await ensureAccessToken({ forceNew: true });
    return {
      ok: true as const,
      message: `NetSuite issued a new token${token.stored ? " and it replaced the one in KV" : ""}. It expires in ${timeUntil(token.expiresAt)}.`,
    };
  } catch (error) {
    return { ok: false as const, problem: toProblem(error) };
  }
}

const accountKindText = {
  sandbox: "Sandbox account",
  "release-preview": "Release Preview account",
  test: "Test or developer account",
  production: "Production account",
} as const;

export default function Status({ loaderData }: Route.ComponentProps) {
  const { environment, accountKind, settings, checks, ready } = loaderData;
  const revalidator = useRevalidator();
  const fetcher = useFetcher<typeof action>();
  const checking = revalidator.state !== "idle";
  const requesting = fetcher.state !== "idle";
  const settingsOk = checks[0]?.state === "ok";
  const local = environment === "local";

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-semibold">Status</h1>
      <p className="mt-3 max-w-3xl text-gray-700 dark:text-gray-300">
        Whether this app is set up and can reach NetSuite. The checks run in the order a request
        depends on them, and each one says what to fix if it fails. Setting values and tokens are
        never shown.
      </p>

      <div className="mt-6 max-w-3xl" role="status">
        {ready ? (
          <Callout tone="ok" title="Connected to NetSuite">
            <p>
              Every check passed.{" "}
              <Link to="/customers" className="font-medium underline hover:no-underline">
                See the customers
              </Link>
              .
            </p>
          </Callout>
        ) : (
          <Callout tone={settingsOk ? "fail" : "info"} title={settingsOk ? "Not connected" : "Not set up yet"}>
            <p>
              {settingsOk
                ? "The settings are in place, but a check below failed. It says what to fix."
                : "Some settings are missing. That is expected on a fresh copy: follow the steps under Settings below."}
            </p>
          </Callout>
        )}
      </div>

      <dl className="mt-6 grid max-w-3xl grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-gray-500 dark:text-gray-400">Running on</dt>
          <dd className="font-medium">
            {local ? "Local dev server (settings from .dev.vars)" : "Cloudflare (settings from Worker secrets)"}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500 dark:text-gray-400">NetSuite account</dt>
          <dd className="font-medium">{accountKind ? accountKindText[accountKind] : "Not set"}</dd>
        </div>
      </dl>

      {local && accountKind === "production" && (
        <Callout tone="warn" title="This looks like a production account" className="mt-6 max-w-3xl">
          <p>
            The account ID has no sandbox suffix (such as <code>_SB1</code>), and the private key
            for it is sitting in <code>.dev.vars</code> on this computer. If the computer is lost
            or stolen, anyone who can read the disk can act as this integration.
          </p>
          <p>
            Use a sandbox for local work. Keep production private keys only in Cloudflare Worker
            secrets.{" "}
            <Link to="/docs/netsuite/security-and-key-rotation" className="font-medium underline hover:no-underline">
              Security and key rotation
            </Link>
          </p>
        </Callout>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button type="button" className={primaryButtonClass} disabled={checking} onClick={() => revalidator.revalidate()}>
          {checking && <Spinner />}
          {checking ? "Checking…" : "Run checks again"}
        </button>
        <fetcher.Form method="post">
          <button type="submit" className={buttonClass} disabled={!settingsOk || requesting}>
            {requesting && <Spinner />}
            {requesting ? "Requesting…" : "Request a new token"}
          </button>
        </fetcher.Form>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {settingsOk
            ? "A new token replaces the one in KV, as happens automatically before it expires."
            : "Requesting a token needs the settings first."}
        </span>
      </div>

      <div className="mt-4 max-w-3xl" aria-live="polite">
        {fetcher.data && !requesting &&
          (fetcher.data.ok ? (
            <Callout tone="ok" title="New token issued">
              <p>{fetcher.data.message}</p>
            </Callout>
          ) : (
            <Callout tone="fail" title={fetcher.data.problem.title}>
              <ProblemDetails problem={fetcher.data.problem} />
            </Callout>
          ))}
      </div>

      <ol className={`mt-8 max-w-3xl space-y-4 transition-opacity ${checking ? "opacity-60" : ""}`} aria-busy={checking}>
        {checks.map((check, index) => (
          <li key={check.id} className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
            <div className="flex items-start gap-3">
              <StateIcon tone={check.state} className="mt-0.5 h-6 w-6" />
              <div className="min-w-0 flex-1">
                <h2 className="flex flex-wrap items-baseline gap-x-3 text-lg font-semibold">
                  <span>
                    {index + 1}. {check.label}
                  </span>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{toneLabel[check.state]}</span>
                </h2>
                <p className={`mt-1 ${check.state === "skipped" ? "text-gray-500 dark:text-gray-400" : ""}`}>{check.summary}</p>

                {check.problem && (
                  <div className="mt-3 space-y-2 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-950 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
                    <ProblemDetails problem={check.problem} />
                  </div>
                )}

                {check.id === "settings" && (
                  <>
                    <table className="mt-3 w-full text-left text-sm">
                      <caption className="sr-only">NetSuite settings in this environment</caption>
                      <thead className="border-b border-gray-300 dark:border-gray-700">
                        <tr>
                          <th scope="col" className="py-1.5 pr-4 font-semibold">Setting</th>
                          <th scope="col" className="py-1.5 font-semibold">State</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {settings.map((setting) => (
                          <tr key={setting.name}>
                            <th scope="row" className="py-1.5 pr-4 font-normal">
                              <code>{setting.name}</code>
                            </th>
                            <td className="py-1.5">
                              <span className="inline-flex items-center gap-1.5">
                                <StateIcon tone={setting.ok ? "ok" : "fail"} className="h-4 w-4" />
                                {setting.detail}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {check.state !== "ok" && (
                      <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">
                        <li>
                          Make a certificate and private key on the{" "}
                          <Link to="/netsuite-certificate" className={linkClass}>NetSuite certificate</Link> page.
                        </li>
                        <li>
                          Set up NetSuite and collect the IDs with the{" "}
                          <Link to="/docs/netsuite" className={linkClass}>NetSuite setup guides</Link>.
                        </li>
                        <li>
                          {local ? (
                            <>
                              Put the four values in <code>.dev.vars</code> in the project folder, then stop and
                              restart <code>npm run dev</code>.
                            </>
                          ) : (
                            <>
                              Set each value with <code>npx wrangler secret put &lt;NAME&gt;</code>.
                            </>
                          )}
                        </li>
                      </ol>
                    )}
                  </>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>

      <section className="mt-10 max-w-3xl text-sm text-gray-700 dark:text-gray-300">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Keeping it safe</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Develop against a sandbox account, not production.</li>
          <li>Give the integration role only the permissions it needs. This demo only reads customers.</li>
          <li>Keep production private keys only in Cloudflare Worker secrets, never on a laptop.</li>
          <li>Replace the certificate before it expires, and revoke it straight away if the key may have leaked.</li>
        </ul>
        <p className="mt-2">
          <Link to="/docs/netsuite/security-and-key-rotation" className={linkClass}>
            Security and key rotation
          </Link>{" "}
          explains each of these.
        </p>
      </section>
    </main>
  );
}
