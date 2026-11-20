import type { NetsuiteProblem } from "~/lib/netsuite.server";

/**
 * Shared feedback pieces: state icons, callouts and the panel that explains a
 * NetSuite problem. State is always shown with an icon and words, never colour alone.
 */

export type Tone = "ok" | "warn" | "fail" | "skipped" | "info";

const toneText: Record<Tone, string> = {
  ok: "text-green-700 dark:text-green-400",
  warn: "text-amber-700 dark:text-amber-400",
  fail: "text-red-700 dark:text-red-400",
  skipped: "text-gray-400 dark:text-gray-500",
  info: "text-blue-700 dark:text-blue-400",
};

const tonePanel: Record<Exclude<Tone, "skipped">, string> = {
  ok: "border-green-300 bg-green-50 text-green-950 dark:border-green-800 dark:bg-green-950 dark:text-green-100",
  warn: "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100",
  fail: "border-red-300 bg-red-50 text-red-950 dark:border-red-800 dark:bg-red-950 dark:text-red-100",
  info: "border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100",
};

const iconPath: Record<Tone, string> = {
  ok: "M6 10.5l2.5 2.5L14 7.5",
  warn: "M10 5.5v5.5M10 14v.5",
  fail: "M7 7l6 6M13 7l-6 6",
  skipped: "M6.5 10h7",
  info: "M10 9v5M10 6v.5",
};

export const toneLabel: Record<Tone, string> = {
  ok: "OK",
  warn: "Warning",
  fail: "Problem",
  skipped: "Skipped",
  info: "Note",
};

export function StateIcon({ tone, className = "h-5 w-5" }: { tone: Tone; className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={`${className} shrink-0 ${toneText[tone]}`}>
      <circle cx="10" cy="10" r="8.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d={iconPath[tone]} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Callout({
  tone,
  title,
  children,
  className = "",
}: {
  tone: Exclude<Tone, "skipped">;
  title: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex gap-3 rounded-lg border p-4 ${tonePanel[tone]} ${className}`}>
      <StateIcon tone={tone} className="mt-0.5 h-5 w-5" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        {children && <div className="mt-1 space-y-2 text-sm">{children}</div>}
      </div>
    </div>
  );
}

/** What went wrong, what it means and what to do, for any NetSuite failure. */
export function ProblemDetails({ problem }: { problem: NetsuiteProblem }) {
  return (
    <>
      <p>{problem.detail}</p>
      <p>
        <span className="font-semibold">What to do: </span>
        {problem.fix}
      </p>
      {(problem.status || problem.code) && (
        <p className="opacity-80">
          NetSuite's answer: {[problem.status && `HTTP ${problem.status}`, problem.code].filter(Boolean).join(" · ")}
        </p>
      )}
    </>
  );
}

export const buttonClass =
  "inline-flex items-center gap-2 rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-900 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800";

export const primaryButtonClass =
  "inline-flex items-center gap-2 rounded bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50";

export const linkClass = "text-blue-700 underline hover:no-underline dark:text-blue-400";

/** A small spinner for buttons while their action is in progress. */
export function Spinner() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:hidden">
      <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="2.5" opacity=".25" />
      <path d="M10 3a7 7 0 0 1 7 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
