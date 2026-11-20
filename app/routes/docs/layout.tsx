import { NavLink, Outlet } from "react-router";

import { listAreas } from "~/lib/guides.server";
import type { Route } from "./+types/layout";

export function loader() {
  return { areas: listAreas() };
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded px-2 py-1 ${
    isActive
      ? "bg-blue-50 font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300"
      : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-900"
  }`;

const headingClass = ({ isActive }: { isActive: boolean }) =>
  `block px-2 text-sm font-semibold uppercase tracking-wide ${
    isActive ? "text-blue-700 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"
  }`;

export default function DocsLayout({ loaderData }: Route.ComponentProps) {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8 md:flex-row">
      <nav aria-label="Documentation" className="space-y-6 md:w-60 md:shrink-0">
        <NavLink to="/docs" end className={headingClass}>
          All documentation
        </NavLink>
        {loaderData.areas.map((area) => (
          <div key={area.slug}>
            <NavLink to={area.url} end className={headingClass}>
              {area.title}
            </NavLink>
            <ul className="mt-2 space-y-1">
              {area.guides.map((guide) => (
                <li key={guide.slug}>
                  <NavLink to={guide.url} className={linkClass}>
                    {guide.title}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
