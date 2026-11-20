import { data, Link } from "react-router";

import { getGuide } from "~/lib/guides.server";
import type { Route } from "./+types/guide";

export function loader({ params }: Route.LoaderArgs) {
  const guide = getGuide(params.area, params.guide);
  if (!guide) throw data("Guide not found", { status: 404 });
  return { guide };
}

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: `${loaderData?.guide.title ?? "Guide"} · Cloudflare + NetSuite demo` },
  { name: "description", content: loaderData?.guide.summary ?? "" },
];

export default function Guide({ loaderData }: Route.ComponentProps) {
  const { guide } = loaderData;
  return (
    <main>
      <p className="mb-4 text-sm">
        <Link to={guide.area.url} className="text-gray-500 hover:underline dark:text-gray-400">
          {guide.area.title}
        </Link>
      </p>
      <article
        className="prose prose-gray max-w-none dark:prose-invert"
        // Rendered from markdown files in this repository (docs/guides), not user input.
        dangerouslySetInnerHTML={{ __html: guide.html }}
      />
      {(guide.previous || guide.next) && (
        <nav
          aria-label="Guide steps"
          className="mt-12 flex justify-between gap-4 border-t border-gray-200 pt-4 text-sm dark:border-gray-800"
        >
          {guide.previous ? (
            <Link to={guide.previous.url} className="text-blue-700 hover:underline dark:text-blue-400">
              ← {guide.previous.title}
            </Link>
          ) : (
            <span />
          )}
          {guide.next && (
            <Link to={guide.next.url} className="text-right text-blue-700 hover:underline dark:text-blue-400">
              {guide.next.title} →
            </Link>
          )}
        </nav>
      )}
    </main>
  );
}
