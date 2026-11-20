# In-app documentation

The app's **Documentation** menu shows the markdown guides in `docs/guides/`, grouped
into areas. The same files read fine on GitHub, so each guide is written once.

## Layout

```
docs/guides/
  01-cloudflare/                 area "cloudflare"  -> /docs/cloudflare
    README.md                    area overview
    01-account-sign-up.md        guide              -> /docs/cloudflare/account-sign-up
  02-netsuite/                   area "netsuite"    -> /docs/netsuite
    README.md
    00-certificates-roles-and-tokens.md   -> /docs/netsuite/certificates-roles-and-tokens
    certificates-roles-and-tokens.svg     diagram shown in that guide
    01-integration-record.md              -> /docs/netsuite/integration-record
    ...
```

- The `NN-` prefix sets the order of areas and of guides within an area. It is not part
  of the URL. `00-` is used for a guide that explains an area before its steps begin.
- Each file's first `# Heading` is its title. The first paragraph after the title is its
  summary, shown in listings.
- An area's `README.md` is its overview page. GitHub also shows it when you open the
  folder.

## How it works

`app/lib/guides.server.ts` loads every `docs/guides/*/*.md` file at build time
(`import.meta.glob`) and renders it to HTML with [`marked`](https://marked.js.org/).
While rendering it:

- rewrites relative links to other guide files into in-app URLs, so
  `../01-cloudflare/01-account-sign-up.md#5-set-up-cloudflare-zero-trust` becomes
  `/docs/cloudflare/account-sign-up#5-set-up-cloudflare-zero-trust`;
- gives headings GitHub-style IDs, so `#heading` links work in the app as they do on
  GitHub;
- replaces an image that points to an SVG file in `docs/guides/` with the SVG itself.
  See [Diagrams](#diagrams).

| Route | File | Shows |
|-------|------|-------|
| `/docs` | `app/routes/docs/index.tsx` | Every area with its summary and guides |
| `/docs/<area>` | `app/routes/docs/area.tsx` | The area's `README.md`, then its guides |
| `/docs/<area>/<guide>` | `app/routes/docs/guide.tsx` | One guide, with previous and next links within the area |
| (all) | `app/routes/docs/layout.tsx` | Sidebar listing every area and guide |

Unknown areas and guides return `404`. Guides are styled with the Tailwind Typography
plugin (the `prose` class). `app/components/GuideList.tsx` renders the guide lists.

## Adding a guide

1. Create `docs/guides/NN-area/NN-slug.md`. Use lowercase letters, numbers and dashes
   in the slug.
2. Start it with a `# Title` line, then a one or two sentence summary paragraph.
3. Link to other guides by relative file path, for example
   `[set up the integration](01-integration-record.md)` within an area or
   `[sign up](../01-cloudflare/01-account-sign-up.md)` across areas. Do not link to
   files outside `docs/guides/`; the app cannot show them.
4. Run `npm run dev` and check the page. New files appear without code changes;
   restart the dev server if one does not.

## Diagrams

A guide shows a diagram with a normal markdown image:

```md
![What the diagram shows, for people who cannot see it](my-diagram.svg)
```

Put the `.svg` file in the same area folder as the guide. GitHub shows it as an image.
The app does not serve it as a separate file: `guides.server.ts` also loads every
`docs/guides/*/*.svg` at build time and puts the SVG markup straight into the page in
place of the image (inside `<span class="guide-diagram">`, styled in `app/app.css`).
On a narrow screen the diagram keeps a readable width and scrolls sideways. Images
that are not SVG files in `docs/guides/` are left as ordinary `<img>` tags, which the
app cannot serve, so use SVG.

Because the SVG becomes part of the page, and must also work alone on GitHub, write it
like `02-netsuite/certificates-roles-and-tokens.svg`:

- Give the root `<svg>` a unique class and a `viewBox`, and start every CSS selector
  in its `<style>` with that class (`.nsd .box { ... }`). Styles inside an inlined SVG
  apply to the whole page, so an unscoped `text { ... }` rule would restyle the app.
- Prefix every `id` and every `@keyframes` name (`nsd-`), for the same reason.
- Set colours as CSS variables on the root class and override them under
  `@media (prefers-color-scheme: dark)`. Draw an opaque background, because GitHub's
  theme can differ from the reader's system theme.
- Animate with CSS only: no `<script>`, which neither GitHub nor the app will run.
  Turn animation off under `@media (prefers-reduced-motion: reduce)`, and make sure
  the diagram still reads correctly as a still picture.
- Style the contents of a `<use>` icon with attributes on the icon itself, and set its
  colour by inheritance from a class on the `<use>` element. Selectors do not reach
  into `<use>` copies.
- Say what the diagram shows in the image's alt text and in the SVG's `aria-label`,
  and explain it in the guide's text as well.

To add an area, create `docs/guides/NN-area/` with a `README.md` that has a title and
summary, then add guides to it.

Guides are compiled into the Worker, so a change only reaches a deployed instance
after `npm run deploy`. The HTML is rendered from files in this repository, not user
input, which is why it is inserted without sanitising.

## Current guides

| Area | File | Title |
|------|------|-------|
| Cloudflare setup | `01-cloudflare/01-account-sign-up.md` | Cloudflare account sign up process |
| NetSuite setup | `02-netsuite/00-certificates-roles-and-tokens.md` | How certificates, roles and tokens work (with `certificates-roles-and-tokens.svg`) |
| NetSuite setup | `02-netsuite/01-integration-record.md` | Create the integration record |
| NetSuite setup | `02-netsuite/02-oauth-2-client-credentials.md` | OAuth 2.0 client credentials (M2M) setup |
| NetSuite setup | `02-netsuite/03-concurrency-limit.md` | Allocate a concurrency limit |
| NetSuite setup | `02-netsuite/04-security-and-key-rotation.md` | Security and key rotation |
