export interface MenuItem {
  label: string;
  to: string;
}

/**
 * Top-level menu, shown in this order in the header on every page. Documentation
 * stays first. Add items here when you add a section; each `to` must match a route
 * in app/routes.ts. See docs/routing.md.
 */
export const menu: MenuItem[] = [
  { label: "Documentation", to: "/docs" },
  { label: "NetSuite certificate", to: "/netsuite-certificate" },
  { label: "Customers", to: "/customers" },
  { label: "Status", to: "/status" },
];
