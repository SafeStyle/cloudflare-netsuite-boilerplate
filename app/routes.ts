import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("docs", "routes/docs/layout.tsx", [
    index("routes/docs/index.tsx"),
    route(":area", "routes/docs/area.tsx"),
    route(":area/:guide", "routes/docs/guide.tsx"),
  ]),
  route("netsuite-certificate", "routes/netsuite-certificate.tsx"),
  route("customers", "routes/customers.tsx"),
  route("status", "routes/status.tsx"),
  route("api/health", "routes/api.health.ts"),
] satisfies RouteConfig;
