import { useEffect, useState } from "react";
import { Link } from "react-router";

import { netsuiteSettingsStatus } from "~/lib/netsuite-credentials.server";
import {
  type GeneratedCertificate,
  generateSelfSignedCertificate,
  pemToSingleLine,
  SUBJECT_FIELDS,
  type Subject,
} from "~/lib/self-signed-cert";
import type { Route } from "./+types/netsuite-certificate";

export const meta: Route.MetaFunction = () => [
  { title: "NetSuite certificate · Cloudflare + NetSuite demo" },
  {
    name: "description",
    content: "Generate the certificate and private key for NetSuite OAuth 2.0 client credentials (M2M)",
  },
];

// Server side: reports only whether each NetSuite setting is present and whether
// the private key is usable. Values are never sent to the browser.
export async function loader() {
  return {
    environment: import.meta.env.DEV ? ("local" as const) : ("deployed" as const),
    settings: await netsuiteSettingsStatus(),
  };
}

const MAX_DAYS = 730; // NetSuite shortens anything longer than two years.

const PLACEHOLDER_KEY = "-----BEGIN PRIVATE KEY-----\\n…\\n-----END PRIVATE KEY-----";

export default function NetsuiteCertificate({ loaderData }: Route.ComponentProps) {
  const [ready, setReady] = useState(false);
  const [subject, setSubject] = useState<Subject>({ commonName: "cloudflare-netsuite-demo" });
  const [days, setDays] = useState("365");
  const [result, setResult] = useState<GeneratedCertificate | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Generation needs the browser's Web Crypto, so keep the button off until hydrated.
  useEffect(() => setReady(true), []);

  async function generate(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const trimmed = Object.fromEntries(
      Object.entries(subject).map(([key, value]) => [key, (value ?? "").trim()]),
    ) as Subject;
    const dayCount = Number(days);
    if (!trimmed.commonName) return setError("Enter a common name, for example cloudflare-netsuite-demo.");
    if (trimmed.country && !/^[A-Za-z]{2}$/.test(trimmed.country)) {
      return setError("Country must be a 2-letter code, for example AU.");
    }
    if (!Number.isInteger(dayCount) || dayCount < 1 || dayCount > MAX_DAYS) {
      return setError(`Days valid must be a whole number from 1 to ${MAX_DAYS}.`);
    }
    setBusy(true);
    try {
      setResult(
        await generateSelfSignedCertificate({
          subject: { ...trimmed, country: trimmed.country?.toUpperCase() },
          days: dayCount,
        }),
      );
    } catch (e) {
      setError(`Could not generate the certificate: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  const singleLineKey = result ? pemToSingleLine(result.privateKeyPem) : PLACEHOLDER_KEY;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-semibold">NetSuite certificate generator</h1>
      <p className="mt-3 max-w-3xl text-gray-700 dark:text-gray-300">
        NetSuite's OAuth 2.0 client credentials (machine-to-machine) login needs a
        certificate and a matching private key. NetSuite keeps the <strong>certificate</strong>,
        which is public. This app keeps the <strong>private key</strong>, which is secret, and
        uses it to sign its requests for NetSuite access tokens. This page makes both, the same
        as Oracle's <code>openssl</code> command for ES256 keys.
      </p>

      <div className="mt-6 max-w-3xl rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
        <p className="font-semibold">The private key is made in your browser and never leaves it.</p>
        <p className="mt-1 text-sm">
          It is generated on this page with your browser's built-in cryptography. It is not sent
          to this app's server, to Cloudflare or to NetSuite. It also disappears when you reload
          or leave the page, so download or copy it before you go.
        </p>
      </div>

      <Section number={1} title="Generate the certificate and key">
        <form onSubmit={generate} className="space-y-4" autoComplete="off">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SUBJECT_FIELDS.map(({ key, label }) => (
              <label key={key} className="block text-sm">
                <span className="text-gray-700 dark:text-gray-300">
                  {label}
                  {key === "commonName" && " *"}
                </span>
                <input
                  className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1 dark:border-gray-700 dark:bg-gray-900"
                  value={subject[key] ?? ""}
                  maxLength={key === "country" ? 2 : 64}
                  onChange={(e) => setSubject({ ...subject, [key]: e.target.value })}
                />
              </label>
            ))}
            <label className="block text-sm">
              <span className="text-gray-700 dark:text-gray-300">Days valid *</span>
              <input
                className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1 dark:border-gray-700 dark:bg-gray-900"
                type="number"
                min={1}
                max={MAX_DAYS}
                value={days}
                onChange={(e) => setDays(e.target.value)}
              />
            </label>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Only the common name is required; NetSuite does not check the other fields. NetSuite
            accepts certificates valid for up to two years ({MAX_DAYS} days). When the certificate
            expires the integration stops working, so note the expiry date.
          </p>
          <button
            type="submit"
            disabled={!ready || busy}
            className="rounded bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-50"
          >
            {!ready ? "Loading…" : busy ? "Generating…" : result ? "Generate a new pair" : "Generate"}
          </button>
          {result && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Generating again replaces the pair below. Only use one pair: the one you upload to
              NetSuite must match the private key you store.
            </p>
          )}
        </form>
        {error && (
          <p className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100">
            {error}
          </p>
        )}

        {result && (
          <div className="mt-6 space-y-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Valid from {result.notBefore.toLocaleDateString()} to{" "}
              <strong>{result.notAfter.toLocaleDateString()}</strong>. SHA-256 fingerprint:{" "}
              <code className="break-all">{result.sha256Fingerprint}</code>
            </p>
            <PemFile
              fileName="public.pem"
              title="Certificate (public.pem): upload this to NetSuite"
              text={result.certificatePem}
            />
            <PemFile
              fileName="private.pem"
              title="Private key (private.pem): keep this secret"
              text={result.privateKeyPem}
              secret
            />
          </div>
        )}
      </Section>

      <Section number={2} title="Upload the certificate to NetSuite">
        <ol className="list-decimal space-y-1 pl-6">
          <li>
            Sign in to NetSuite as an administrator, or with a role that has{" "}
            <strong>OAuth 2.0 Authorized Applications Management</strong>.
          </li>
          <li>
            Go to <strong>Setup &gt; Integration &gt; Manage Authentication &gt; OAuth 2.0 Client
            Credentials (M2M) Setup</strong> and select <strong>Create New</strong>.
          </li>
          <li>Choose the entity (user), the role and the application (the integration record).</li>
          <li>
            Upload <code>public.pem</code> and select <strong>Save</strong>.
          </li>
          <li>
            Copy the <strong>Certificate ID</strong> from the new row. You need it in step 3.
          </li>
        </ol>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          Not set up the integration record, role and user yet? Follow{" "}
          <Link to="/docs/netsuite" className="text-blue-700 underline dark:text-blue-400">
            NetSuite setup
          </Link>{" "}
          in the documentation first.
        </p>
      </Section>

      <Section number={3} title="Store the private key and certificate ID">
        <p className="max-w-3xl">
          The app reads the key from <code>NETSUITE_PRIVATE_KEY</code> and the certificate ID from{" "}
          <code>NETSUITE_CERTIFICATE_ID</code>. Where you put them depends on where the app runs.
          The key is stored as one line, with <code>\n</code> where the line breaks go; the app
          turns those back into line breaks when it reads it.
        </p>

        <h3 className="mt-6 text-lg font-semibold">On your computer (local dev server): .dev.vars</h3>
        <ol className="mt-2 list-decimal space-y-2 pl-6">
          <li>
            Open <code>.dev.vars</code> in the project folder. If it does not exist, copy{" "}
            <code>.dev.vars.example</code> to <code>.dev.vars</code>. Git ignores this file, so it
            is never committed or deployed.
          </li>
          <li>
            Replace the <code>NETSUITE_PRIVATE_KEY=</code> line with this line
            {!result && " (generate in step 1 to fill it in)"}:
            <CodeBlock code={`NETSUITE_PRIVATE_KEY="${singleLineKey}"`} disabled={!result} />
          </li>
          <li>
            Set the certificate ID from step 2:
            <CodeBlock code="NETSUITE_CERTIFICATE_ID=<the Certificate ID from NetSuite>" copy={false} />
          </li>
          <li>
            Restart <code>npm run dev</code>. <strong>This environment</strong> at the bottom of
            this page should then show the key as valid.
          </li>
        </ol>

        <h3 className="mt-6 text-lg font-semibold">On a deployed Worker: Cloudflare secrets</h3>
        <ol className="mt-2 list-decimal space-y-2 pl-6">
          <li>
            In a terminal in the project folder, run:
            <CodeBlock code="npx wrangler secret put NETSUITE_PRIVATE_KEY" />
            When it asks for the value, paste this single line
            {!result && " (generate in step 1 to fill it in)"}:
            <CodeBlock code={singleLineKey} disabled={!result} />
          </li>
          <li>
            Then run this, and paste the certificate ID when asked:
            <CodeBlock code="npx wrangler secret put NETSUITE_CERTIFICATE_ID" />
          </li>
        </ol>
        <p className="mt-3 max-w-3xl text-sm text-gray-600 dark:text-gray-400">
          Each command stores an encrypted secret on the Worker and deploys a new version straight
          away. Cloudflare does not show a secret's value again, in the dashboard or in Wrangler.
          The secret names are listed under <code>secrets.required</code> in{" "}
          <code>wrangler.jsonc</code>; the values never go in that file.
        </p>
        <p className="mt-2 max-w-3xl text-sm text-gray-600 dark:text-gray-400">
          Prefer to send the file instead of pasting? On macOS or Linux:{" "}
          <code>npx wrangler secret put NETSUITE_PRIVATE_KEY &lt; private.pem</code>. In Windows
          PowerShell:{" "}
          <code>Get-Content -Raw private.pem | npx wrangler secret put NETSUITE_PRIVATE_KEY</code>.
        </p>
      </Section>

      <Section number={4} title="Clean up">
        <ul className="list-disc space-y-1 pl-6">
          <li>
            Keep a copy of <code>private.pem</code> in a password manager or secrets vault, then
            delete it from your Downloads folder.
          </li>
          <li>
            Never commit it to Git, email it, or paste it into a chat, including AI assistants.
            Anyone with it can act as the integration in NetSuite.
          </li>
          <li>
            If it leaks, revoke the certificate in NetSuite (the <strong>Revoke</strong> button on
            the M2M setup page), then generate a new pair here and repeat steps 2 and 3.
          </li>
        </ul>
      </Section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Where the key lives</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="border-b border-gray-300 dark:border-gray-700">
              <tr>
                <th className="py-2 pr-4">Place</th>
                <th className="py-2 pr-4">What is there</th>
                <th className="py-2">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              <tr>
                <td className="py-2 pr-4 align-top">This page</td>
                <td className="py-2 pr-4 align-top">Certificate and private key, in memory</td>
                <td className="py-2 align-top">Gone when you reload or leave the page.</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 align-top">NetSuite</td>
                <td className="py-2 pr-4 align-top">Certificate only</td>
                <td className="py-2 align-top">Public. It can check signatures but cannot make them.</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 align-top">
                  <code>.dev.vars</code> on your computer
                </td>
                <td className="py-2 pr-4 align-top">Private key and certificate ID</td>
                <td className="py-2 align-top">
                  Used only by <code>npm run dev</code>. Gitignored and never deployed.
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4 align-top">Cloudflare Worker secrets</td>
                <td className="py-2 pr-4 align-top">Private key and certificate ID</td>
                <td className="py-2 align-top">
                  Encrypted. Set with <code>npx wrangler secret put</code>. Names listed in{" "}
                  <code>wrangler.jsonc</code>, values never.
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4 align-top">Your password manager</td>
                <td className="py-2 pr-4 align-top">
                  Backup of <code>private.pem</code>
                </td>
                <td className="py-2 align-top">So you can set up another environment later.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <EnvironmentStatus environment={loaderData.environment} settings={loaderData.settings} />
    </main>
  );
}

function Section({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold">
        <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-700 text-sm text-white">
          {number}
        </span>
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function CopyButton({ text, disabled }: { text: string; disabled?: boolean }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
    setTimeout(() => setState("idle"), 2000);
  }
  return (
    <button
      type="button"
      onClick={copy}
      disabled={disabled}
      className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
    >
      {state === "copied" ? "Copied" : state === "failed" ? "Copy failed: select it instead" : "Copy"}
    </button>
  );
}

function CodeBlock({
  code,
  copy = true,
  disabled = false,
}: {
  code: string;
  copy?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="mt-2 flex items-start gap-2 rounded bg-gray-100 p-3 dark:bg-gray-900">
      <code className="min-w-0 flex-1 text-sm break-all whitespace-pre-wrap">{code}</code>
      {copy && <CopyButton text={code} disabled={disabled} />}
    </div>
  );
}

function download(fileName: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/x-pem-file" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function PemFile({
  fileName,
  title,
  text,
  secret = false,
}: {
  fileName: string;
  title: string;
  text: string;
  secret?: boolean;
}) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h3 className="font-semibold">{title}</h3>
        <span className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => download(fileName, text)}
            className="rounded bg-blue-700 px-3 py-1 text-sm font-medium text-white hover:bg-blue-800"
          >
            Download {fileName}
          </button>
          <CopyButton text={text} />
        </span>
      </div>
      {secret && (
        <p className="mb-2 text-sm text-red-800 dark:text-red-300">
          Anyone with this key can act as the integration in NetSuite. Store it as described in step
          3, and keep it out of Git, email and chat.
        </p>
      )}
      <textarea
        readOnly
        rows={text.trim().split("\n").length}
        value={text}
        onFocus={(e) => e.target.select()}
        className="w-full rounded border border-gray-300 bg-gray-50 p-2 font-mono text-xs dark:border-gray-700 dark:bg-gray-900"
      />
    </div>
  );
}

function EnvironmentStatus({
  environment,
  settings,
}: {
  environment: "local" | "deployed";
  settings: { name: string; label: string; ok: boolean; detail: string }[];
}) {
  return (
    <section className="mt-12 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
      <h2 className="text-xl font-semibold">This environment</h2>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        {environment === "local"
          ? "Local dev server: values come from .dev.vars. Restart npm run dev after changing it."
          : "Deployed Worker: values come from Worker secrets set with npx wrangler secret put."}{" "}
        Values are never shown, only whether they are set.
      </p>
      <ul className="mt-3 space-y-1 text-sm">
        {settings.map((setting) => (
          <li key={setting.name} className="flex flex-wrap gap-x-2">
            <span aria-hidden className={setting.ok ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}>
              {setting.ok ? "✓" : "✗"}
            </span>
            <code>{setting.name}</code>
            <span className="text-gray-600 dark:text-gray-400">
              ({setting.label}): {setting.detail}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
