import { data } from "react-router";

import { GuideList } from "~/components/GuideList";
import { getArea } from "~/lib/guides.server";
import type { Route } from "./+types/area";

export function loader({ params }: Route.LoaderArgs) {
  const area = getArea(params.area);
  if (!area) throw data("Documentation area not found", { status: 404 });
  return { area };
}

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: `${loaderData?.area.title ?? "Documentation"} · Cloudflare + NetSuite demo` },
  { name: "description", content: loaderData?.area.summary ?? "" },
];

export default function Area({ loaderData }: Route.ComponentProps) {
  const { area } = loaderData;
  return (
    <main>
      {area.html ? (
        <article
          className="prose prose-gray max-w-none dark:prose-invert"
          // Rendered from markdown files in this repository (docs/guides), not user input.
          dangerouslySetInnerHTML={{ __html: area.html }}
        />
      ) : (
        <h1 className="text-2xl font-semibold">{area.title}</h1>
      )}
      <h2 className="mt-8 text-lg font-semibold">Guides</h2>
      <GuideList guides={area.guides} />
    </main>
  );
}
