import { Link } from "react-router";

import { linkClass } from "~/components/feedback";
import type { Route } from "./+types/home";

export const meta: Route.MetaFunction = () => [
  { title: "Cloudflare + NetSuite demo" },
  {
    name: "description",
    content: "Example of integrating Cloudflare with NetSuite's REST API",
  },
];

const sections = [
  {
    to: "/docs",
    title: "Documentation",
    text: "How it works and how to set it up, step by step, on the Cloudflare side and in NetSuite.",
  },
  {
    to: "/netsuite-certificate",
    title: "NetSuite certificate",
    text: "Make the certificate NetSuite needs and the private key the app signs with, in your browser.",
  },
  {
    to: "/customers",
    title: "Customers",
    text: "A list of customers read live from NetSuite's REST API, a page at a time.",
  },
  {
    to: "/status",
    title: "Status",
    text: "Whether the settings are in place, a token can be issued and NetSuite answers.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-3xl font-semibold">Cloudflare + NetSuite demo</h1>
      <p className="mt-4 max-w-2xl text-gray-700 dark:text-gray-300">
        An example for the Perth NetSuite User Group of how Cloudflare can be used to integrate
        with NetSuite's REST API. It runs on Cloudflare Workers, signs in to NetSuite with a
        certificate instead of a password, and is only reachable by users signed in through
        Cloudflare Zero Trust.
      </p>

      <p className="mt-6 max-w-2xl">
        New here?{" "}
        <a href="/walkthrough/index.html" className={linkClass}>
          Watch the walkthrough
        </a>
        : every step from downloading the code to seeing your customers, shown on screen.
      </p>

      <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {sections.map((section) => (
          <li key={section.to}>
            <Link
              to={section.to}
              className="block h-full rounded-lg border border-gray-200 p-5 hover:border-blue-600 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-gray-800 dark:hover:border-blue-500 dark:hover:bg-blue-950"
            >
              <h2 className="text-lg font-semibold text-blue-700 dark:text-blue-400">{section.title}</h2>
              <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{section.text}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
