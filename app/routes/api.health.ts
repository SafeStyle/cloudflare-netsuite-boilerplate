// Resource route: no default export, so it returns the loader's Response as-is
// instead of rendering HTML.
export function loader() {
  return Response.json({ ok: true });
}
