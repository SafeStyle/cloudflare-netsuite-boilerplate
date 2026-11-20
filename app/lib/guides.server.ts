import { Marked } from "marked";

/**
 * In-app documentation, read from docs/guides/ at build time.
 *
 *   docs/guides/NN-area/README.md     area overview  -> /docs/area
 *   docs/guides/NN-area/NN-guide.md   guide          -> /docs/area/guide
 *
 * NN sets the order. Each file's first `# Heading` is its title and the first
 * paragraph after it is its summary. See docs/in-app-documentation.md.
 */

export interface PageSummary {
  title: string;
  summary: string;
  url: string;
}

export interface AreaSummary extends PageSummary {
  slug: string;
  guides: (PageSummary & { slug: string })[];
}

interface Page extends PageSummary {
  path: string;
  source: string;
}

interface GuidePage extends Page {
  slug: string;
  order: number;
}

interface AreaEntry {
  slug: string;
  order: number;
  overview: Page;
  guides: GuidePage[];
}

const sources = import.meta.glob<string>("/docs/guides/*/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});

/** SVG diagrams kept next to the guides. A guide that shows one as an image gets it inlined. */
const diagrams = import.meta.glob<string>("/docs/guides/*/*.svg", {
  query: "?raw",
  import: "default",
  eager: true,
});

const AREA_PATH = /^\/docs\/guides\/(\d+)-([a-z0-9-]+)\/([^/]+)$/;
const GUIDE_FILE = /^(\d+)-([a-z0-9-]+)\.md$/;

function parse(source: string, fallbackTitle: string) {
  const heading = /^#\s+(.+)$/m.exec(source);
  const title = heading?.[1]?.trim() ?? fallbackTitle;
  const body = heading ? source.slice(heading.index + heading[0].length) : source;
  const paragraph = body
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .find((block) => block && !/^[#>|`\-*\d]/.test(block));
  // Plain text for listings: drop link targets and inline markup.
  const summary = (paragraph ?? "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ");
  return { title, summary };
}

const pagesByPath = new Map<string, Page>();
const areaMap = new Map<string, AreaEntry>();

for (const [path, source] of Object.entries(sources)) {
  const match = AREA_PATH.exec(path);
  if (!match) continue;
  const [, areaOrder, areaSlug, file] = match as unknown as [string, string, string, string];

  let area = areaMap.get(areaSlug);
  if (!area) {
    area = {
      slug: areaSlug,
      order: Number(areaOrder),
      overview: { path: "", source: "", url: `/docs/${areaSlug}`, title: areaSlug, summary: "" },
      guides: [],
    };
    areaMap.set(areaSlug, area);
  }

  if (file === "README.md") {
    area.overview = { path, source, url: `/docs/${areaSlug}`, ...parse(source, areaSlug) };
    pagesByPath.set(path, area.overview);
    continue;
  }

  const guide = GUIDE_FILE.exec(file);
  if (!guide) continue;
  const [, guideOrder, guideSlug] = guide as unknown as [string, string, string];
  const page: GuidePage = {
    path,
    source,
    slug: guideSlug,
    order: Number(guideOrder),
    url: `/docs/${areaSlug}/${guideSlug}`,
    ...parse(source, guideSlug),
  };
  area.guides.push(page);
  pagesByPath.set(path, page);
}

const areas = [...areaMap.values()].sort((a, b) => a.order - b.order);
for (const area of areas) area.guides.sort((a, b) => a.order - b.order);

/** Resolve a relative href in a guide to a project path such as `/docs/guides/02-netsuite/x.md`. */
function resolvePath(fromPath: string, href: string): string | null {
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("/") || href.startsWith("#")) {
    return null;
  }
  return new URL(href, `https://guides.invalid${fromPath}`).pathname;
}

/** Rewrite a relative link to another guide file into its in-app URL. */
function resolveLink(fromPath: string, href: string): string | null {
  if (href.startsWith("#")) return null;
  const hashIndex = href.indexOf("#");
  const target = hashIndex === -1 ? href : href.slice(0, hashIndex);
  const hash = hashIndex === -1 ? "" : href.slice(hashIndex);
  const resolved = resolvePath(fromPath, target);
  const page = resolved ? pagesByPath.get(resolved) : undefined;
  return page ? page.url + hash : null;
}

/** GitHub-style heading IDs, so `#some-heading` links work in the app too. */
function headingId(text: string, used: Map<string, number>): string {
  const base = text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s/g, "-");
  const count = used.get(base) ?? 0;
  used.set(base, count + 1);
  return count === 0 ? base : `${base}-${count}`;
}

// The HTML comes from markdown files in this repository, compiled in at build
// time, not from user input, so it is trusted.
function render(page: Page): string {
  const usedIds = new Map<string, number>();
  const markdown = new Marked({
    gfm: true,
    walkTokens(token) {
      if (token.type !== "link") return;
      const href = resolveLink(page.path, token.href);
      if (href) token.href = href;
    },
    renderer: {
      heading({ tokens, depth }) {
        const text = this.parser.parseInline(tokens, this.parser.textRenderer);
        const id = headingId(text, usedIds);
        return `<h${depth} id="${id}">${this.parser.parseInline(tokens)}</h${depth}>\n`;
      },
      // `![alt](diagram.svg)` for an SVG in docs/guides is inlined, so it needs no URL
      // of its own and follows the page's light or dark theme. Other images are left
      // to the default renderer.
      image({ href }) {
        const path = resolvePath(page.path, href);
        const svg = path ? diagrams[path] : undefined;
        return svg ? `<span class="guide-diagram">${svg.trim()}</span>` : false;
      },
    },
  });
  return markdown.parse(page.source, { async: false });
}

const summary = ({ title, summary, url }: PageSummary): PageSummary => ({ title, summary, url });

export function listAreas(): AreaSummary[] {
  return areas.map((area) => ({
    slug: area.slug,
    ...summary(area.overview),
    guides: area.guides.map((guide) => ({ slug: guide.slug, ...summary(guide) })),
  }));
}

export function getArea(areaSlug: string) {
  const area = areaMap.get(areaSlug);
  if (!area) return null;
  return {
    ...summary(area.overview),
    html: area.overview.source ? render(area.overview) : "",
    guides: area.guides.map(summary),
  };
}

export function getGuide(areaSlug: string, guideSlug: string) {
  const area = areaMap.get(areaSlug);
  const index = area?.guides.findIndex((g) => g.slug === guideSlug) ?? -1;
  const guide = area?.guides[index];
  if (!area || !guide) return null;
  const previous = area.guides[index - 1];
  const next = area.guides[index + 1];
  return {
    ...summary(guide),
    html: render(guide),
    area: summary(area.overview),
    previous: previous ? summary(previous) : null,
    next: next ? summary(next) : null,
  };
}
