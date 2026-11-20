import { Link, useNavigation, useRevalidator } from "react-router";

import { buttonClass, Callout, linkClass, ProblemDetails, Spinner } from "~/components/feedback";
import { listCustomers, toProblem } from "~/lib/netsuite.server";
import type { Route } from "./+types/customers";

export const meta: Route.MetaFunction = () => [
  { title: "Customers · Cloudflare + NetSuite demo" },
  { name: "description", content: "Customers read live from NetSuite's REST API" },
];

const PAGE_SIZE = 20;

export async function loader({ request }: Route.LoaderArgs) {
  const requested = Number(new URL(request.url).searchParams.get("page") ?? "1");
  const page = Number.isInteger(requested) && requested >= 1 && requested <= 50_000 ? requested : 1;
  try {
    const result = await listCustomers(page, PAGE_SIZE);
    return {
      ok: true as const,
      ...result.data,
      durationMs: result.durationMs,
      tokenSource: result.token.source,
      tokenReplaced: result.tokenReplaced,
    };
  } catch (error) {
    // The page itself still loads; it explains what is wrong instead of the table.
    return { ok: false as const, page, problem: toProblem(error) };
  }
}

export default function Customers({ loaderData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const loading =
    revalidator.state !== "idle" ||
    (navigation.state === "loading" && navigation.location.pathname === "/customers");

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-semibold">Customers</h1>
      <p className="mt-3 max-w-3xl text-gray-700 dark:text-gray-300">
        Active customers, read live from NetSuite's REST API each time this page loads, {PAGE_SIZE} at
        a time. The app signs in with its certificate, not as you, and can only see what its NetSuite
        role allows.
      </p>

      {loaderData.ok ? (
        <CustomerTable data={loaderData} loading={loading} />
      ) : loaderData.problem.kind === "not-configured" || loaderData.problem.kind === "invalid-key" ? (
        <Callout tone="info" title={loaderData.problem.title} className="mt-6 max-w-3xl">
          <p>{loaderData.problem.detail}</p>
          <p>
            The <Link to="/status" className="font-medium underline hover:no-underline">Status</Link> page
            shows which settings are missing and how to add them.
          </p>
        </Callout>
      ) : (
        <div className="mt-6 max-w-3xl">
          <Callout tone="fail" title={loaderData.problem.title}>
            <ProblemDetails problem={loaderData.problem} />
          </Callout>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" className={buttonClass} disabled={loading} onClick={() => revalidator.revalidate()}>
              {loading && <Spinner />}
              {loading ? "Trying…" : "Try again"}
            </button>
            <Link to="/status" className={linkClass}>
              Check the connection on the Status page
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}

type Loaded = Extract<Route.ComponentProps["loaderData"], { ok: true }>;

function CustomerTable({ data, loading }: { data: Loaded; loading: boolean }) {
  const { customers, page, pageSize, total, pageCount } = data;
  const first = (page - 1) * pageSize + 1;
  const last = first + customers.length - 1;
  const number = (value: number) => value.toLocaleString("en");

  if (customers.length === 0) {
    return (
      <Callout tone="info" title={total === 0 ? "No customers found" : "There is no page " + number(page)} className="mt-6 max-w-3xl">
        <p>
          {total === 0
            ? "NetSuite answered, but the role cannot see any active customers. Check the role's permissions and any restrictions on it."
            : `There are ${number(total)} customers on ${number(pageCount)} pages.`}
        </p>
        {total > 0 && (
          <p>
            <Link to="/customers" className="font-medium underline hover:no-underline">
              Go to the first page
            </Link>
          </p>
        )}
      </Callout>
    );
  }

  return (
    <section className="mt-6" aria-label="Customer list">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <p className="text-sm text-gray-700 dark:text-gray-300" role="status">
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Spinner /> Asking NetSuite…
            </span>
          ) : (
            <>
              Showing <strong>{number(first)}</strong> to <strong>{number(last)}</strong> of{" "}
              <strong>{number(total)}</strong> customers
            </>
          )}
        </p>
        <Pagination page={page} pageCount={pageCount} />
      </div>

      <div
        className={`mt-3 overflow-x-auto rounded-lg border border-gray-200 transition-opacity dark:border-gray-800 ${loading ? "opacity-50" : ""}`}
        aria-busy={loading}
      >
        <table className="w-full min-w-[40rem] text-left text-sm">
          <caption className="sr-only">
            Customers {first} to {last} of {total}
          </caption>
          <thead className="bg-gray-50 text-gray-700 dark:bg-gray-900 dark:text-gray-300">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-semibold">Name</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">Customer ID</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">Email</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">Phone</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {customers.map((customer) => (
              <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                <th scope="row" className="px-4 py-2.5 font-medium">{customer.name}</th>
                <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{customer.entityId}</td>
                <td className="px-4 py-2.5">
                  {customer.email ? (
                    <a href={`mailto:${customer.email}`} className={linkClass}>{customer.email}</a>
                  ) : (
                    <Empty />
                  )}
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap text-gray-700 dark:text-gray-300">
                  {customer.phone || <Empty />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          NetSuite answered in {number(data.durationMs)} ms.{" "}
          {data.tokenReplaced
            ? "NetSuite rejected the stored access token, so the app requested a new one and retried."
            : data.tokenSource === "cache"
              ? "Used the access token kept in Workers KV."
              : "Requested a new access token and stored it in Workers KV."}
        </p>
        <Pagination page={page} pageCount={pageCount} />
      </div>
    </section>
  );
}

function Empty() {
  return (
    <span className="text-gray-400 dark:text-gray-600">
      <span aria-hidden="true">–</span>
      <span className="sr-only">None</span>
    </span>
  );
}

function Pagination({ page, pageCount }: { page: number; pageCount: number }) {
  const step = (label: string, target: number, enabled: boolean) =>
    enabled ? (
      <Link to={`/customers?page=${target}`} prefetch="intent" className={buttonClass}>
        {label}
      </Link>
    ) : (
      <span aria-disabled="true" className={`${buttonClass} cursor-not-allowed opacity-50`}>
        {label}
      </span>
    );

  return (
    <nav aria-label="Pages" className="flex items-center gap-3 text-sm">
      {step("Previous", page - 1, page > 1)}
      <span className="whitespace-nowrap text-gray-700 dark:text-gray-300">
        Page {page.toLocaleString("en")} of {pageCount.toLocaleString("en")}
      </span>
      {step("Next", page + 1, page < pageCount)}
    </nav>
  );
}
