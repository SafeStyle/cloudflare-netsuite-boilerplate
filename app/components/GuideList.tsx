import { Link } from "react-router";

import type { PageSummary } from "~/lib/guides.server";

export function GuideList({ guides }: { guides: PageSummary[] }) {
  return (
    <ol className="mt-4 list-decimal space-y-3 pl-6">
      {guides.map((guide) => (
        <li key={guide.url}>
          <Link to={guide.url} className="font-medium text-blue-700 underline dark:text-blue-400">
            {guide.title}
          </Link>
          {guide.summary && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{guide.summary}</p>
          )}
        </li>
      ))}
    </ol>
  );
}
