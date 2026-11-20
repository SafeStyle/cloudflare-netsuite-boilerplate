import { Link } from "react-router";

import { GuideList } from "~/components/GuideList";
import { listAreas } from "~/lib/guides.server";
import type { Route } from "./+types/index";

export const meta: Route.MetaFunction = () => [
  { title: "Documentation · Cloudflare + NetSuite demo" },
];

export function loader() {
  return { areas: listAreas() };
}

export default function DocsIndex({ loaderData }: Route.ComponentProps) {
  return (
    <main>
      <h1 className="text-2xl font-semibold">Documentation</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400">
        Step-by-step guides for setting up and running this demo, grouped by area.
      </p>
      {loaderData.areas.map((area) => (
        <section key={area.slug} className="mt-8">
          <h2 className="text-xl font-semibold">
            <Link to={area.url} className="hover:underline">
              {area.title}
            </Link>
          </h2>
          {area.summary && (
            <p className="mt-1 text-gray-600 dark:text-gray-400">{area.summary}</p>
          )}
          <GuideList guides={area.guides} />
        </section>
      ))}
    </main>
  );
}
