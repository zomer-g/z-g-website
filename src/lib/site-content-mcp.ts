import { readFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { getPrivateFiles } from "@/lib/private-files";
import { extractPdfText } from "@/lib/pdf-text";

/**
 * Data layer for the site-content MCP server (/api/mcp/site).
 *
 * Covers everything a visitor can read: articles, הפליליסט blog posts (with
 * their attachments and case files), practice areas, projects (the /projects,
 * לעם and לץ cards and the browser extensions), dictionary entries, media
 * appearances and the site pages. Only published / active items are visible.
 *
 * An item's "documents" are the files it links to — rulings, letters, reports
 * — found by walking the TipTap JSON: every link to a file hosted on the site
 * (/uploads/...) or to a PDF, plus a blog post's attachments and case-file
 * rows. Each document keeps its link text as its title and the heading or card
 * it sits under as its section. A file an admin hid (/admin/files) is listed
 * as unavailable and its text is never served.
 */

const SITE = (process.env.SITE_URL || "https://www.z-g.co.il").replace(/\/$/, "");

const CATEGORY_LABELS: Record<string, string> = {
  "זכויות-בחקירה": "זכויות בחקירה",
  "הליכים-משפטיים": "הליכים משפטיים",
  "טכנולוגיה-במשפט": "טכנולוגיה במשפט",
};

/* ─── TipTap walking ─── */

interface Node {
  type: string;
  attrs?: Record<string, unknown>;
  content?: Node[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  text?: string;
}

export interface ContentDocument {
  id: string; // file name for hosted files, URL otherwise
  title: string; // link text
  titles: string[]; // every distinct link text used for it in the item
  url: string;
  hosted: boolean; // served from this site under /uploads
  section: string | null; // heading / card title the first link sits under
  mentions: number;
  citation: string | null; // e.g. ע"א 8849/01, parsed from the link text
  available: boolean; // false = hidden by an admin
}

export interface ContentLink {
  title: string;
  url: string;
}

const absolute = (href: string) =>
  href.startsWith("http") ? href : `${SITE}${href.startsWith("/") ? "" : "/"}${href}`;

function uploadName(href: string): string | null {
  try {
    const u = new URL(href, SITE);
    if (!/^(www\.)?z-g\.co\.il$/.test(u.hostname) && href.startsWith("http")) return null;
    const m = u.pathname.match(/^\/(?:seed-)?uploads\/([^/]+)$/);
    return m ? decodeURIComponent(m[1]) : null;
  } catch {
    return null;
  }
}

const CITATION_RE =
  /((?:ע"א|ע"פ|רע"א|רע"פ|בג"ץ|בג"צ|עע"מ|עת"מ|בר"ם|דנ"פ|דנ"א|בש"פ|ת"א|תפ"ח|ת"פ|ע"ח|בע"ח|פר"ק|ה"פ|עמ"ה)\s*(?:\([^)]{1,15}\)\s*)?[\d-]+\/?\d*)/;

function inlineText(n: Node): string {
  if (n.type === "text") return n.text ?? "";
  if (n.type === "hardBreak") return "\n";
  return (n.content ?? []).map(inlineText).join("");
}

function inlineMarkdown(n: Node): string {
  if (n.type === "hardBreak") return "  \n";
  if (n.type !== "text") return (n.content ?? []).map(inlineMarkdown).join("");
  let t = n.text ?? "";
  const marks = n.marks ?? [];
  const link = marks.find((m) => m.type === "link");
  if (marks.some((m) => m.type === "bold")) t = `**${t}**`;
  if (marks.some((m) => m.type === "italic")) t = `*${t}*`;
  if (link) t = `[${t}](${absolute(String(link.attrs?.href ?? ""))})`;
  return t;
}

/** Markdown of a TipTap document, plus the links it contains. */
function renderDoc(doc: unknown): {
  markdown: string;
  plain: string;
  rawLinks: { text: string; href: string; section: string | null }[];
} {
  const out: string[] = [];
  const plain: string[] = [];
  const rawLinks: { text: string; href: string; section: string | null }[] = [];
  let section: string | null = null;

  const collectLinks = (n: Node) => {
    if (n.type === "text") {
      const link = n.marks?.find((m) => m.type === "link");
      if (link) {
        const href = String(link.attrs?.href ?? "");
        const prev = rawLinks[rawLinks.length - 1];
        // Adjacent text runs of one link (e.g. bold inside a link) are one link.
        if (prev && prev.href === href && prev.section === section && prev.text.length < 400) {
          prev.text += n.text ?? "";
        } else {
          rawLinks.push({ text: n.text ?? "", href, section });
        }
      }
    }
    n.content?.forEach(collectLinks);
  };

  const block = (n: Node, depth = 0): void => {
    const indent = "  ".repeat(depth);
    switch (n.type) {
      case "heading": {
        const level = Number(n.attrs?.level ?? 2);
        section = inlineText(n).trim();
        out.push(`${"#".repeat(Math.min(level, 6))} ${section}`);
        plain.push(section);
        return;
      }
      case "paragraph": {
        const md = (n.content ?? []).map(inlineMarkdown).join("");
        if (md.trim()) {
          out.push(indent + md);
          plain.push(inlineText(n));
        }
        collectLinks(n);
        return;
      }
      case "bulletList":
      case "orderedList":
        (n.content ?? []).forEach((li, i) => {
          const marker = n.type === "orderedList" ? `${i + 1}.` : "-";
          const text = (li.content ?? [])
            .map((c) => (c.type === "paragraph" ? (c.content ?? []).map(inlineMarkdown).join("") : ""))
            .filter(Boolean)
            .join(" ");
          out.push(`${indent}${marker} ${text}`);
          plain.push(inlineText(li));
          collectLinks(li);
          (li.content ?? [])
            .filter((c) => c.type === "bulletList" || c.type === "orderedList")
            .forEach((c) => block(c, depth + 1));
        });
        return;
      case "blockquote":
        (n.content ?? []).forEach((c) => {
          out.push(`> ${(c.content ?? []).map(inlineMarkdown).join("")}`);
          plain.push(inlineText(c));
          collectLinks(c);
        });
        return;
      case "infoBlock": {
        const title = String(n.attrs?.title ?? "").trim();
        if (title) {
          section = title;
          out.push(`### ${title}`);
          plain.push(title);
        }
        const rows: Node[] = [];
        const flatten = (nodes: Node[]) =>
          nodes.forEach((c) =>
            c.type === "paragraph" || c.type === "listItem" ? rows.push(c) : flatten(c.content ?? []),
          );
        flatten(n.content ?? []);
        for (const r of rows) {
          out.push(`- ${(r.content ?? []).map(inlineMarkdown).join("") || inlineText(r)}`);
          plain.push(inlineText(r));
          collectLinks(r);
        }
        return;
      }
      case "lawBlock": {
        const title = String(n.attrs?.title ?? "").trim();
        if (title) out.push(`### ${title}`);
        const disclaimer = String(n.attrs?.disclaimer ?? "").trim();
        if (disclaimer) out.push(`*${disclaimer}*`);
        let items: { lawName?: string; quote?: string; url?: string }[] = [];
        try {
          const raw = n.attrs?.items;
          items = typeof raw === "string" ? JSON.parse(raw) : Array.isArray(raw) ? raw : [];
        } catch {
          items = [];
        }
        for (const it of items) {
          if (it.lawName) out.push(`**${it.lawName}**`);
          if (it.quote) out.push(`> ${it.quote.replace(/\n+/g, " ")}`);
          if (it.url) rawLinks.push({ text: it.lawName ?? "נוסח החוק", href: it.url, section: title || section });
          plain.push(`${it.lawName ?? ""} ${it.quote ?? ""}`);
        }
        return;
      }
      case "image": {
        const src = String(n.attrs?.src ?? "");
        if (src) out.push(`![${String(n.attrs?.alt ?? "")}](${absolute(src)})`);
        return;
      }
      case "horizontalRule":
        out.push("---");
        return;
      case "codeBlock":
        out.push("```\n" + inlineText(n) + "\n```");
        return;
      default:
        (n.content ?? []).forEach((c) => block(c, depth));
    }
  };

  const root = doc as Node | null;
  (root?.content ?? []).forEach((n) => block(n));
  return { markdown: out.join("\n\n"), plain: plain.join("\n"), rawLinks };
}

const isDocumentHref = (href: string) =>
  uploadName(href) !== null || /\.pdf($|[?#])/i.test(href);

function buildDocuments(
  rawLinks: { text: string; href: string; section: string | null }[],
  hidden: Set<string>,
): { documents: ContentDocument[]; links: ContentLink[] } {
  const docs = new Map<string, ContentDocument>();
  const links = new Map<string, ContentLink>();
  for (const l of rawLinks) {
    const text = l.text.replace(/\s+/g, " ").trim();
    if (!isDocumentHref(l.href)) {
      if (!links.has(l.href)) links.set(l.href, { title: text, url: absolute(l.href) });
      continue;
    }
    const name = uploadName(l.href);
    const id = name ?? absolute(l.href);
    const existing = docs.get(id);
    if (existing) {
      existing.mentions++;
      if (text && !existing.titles.includes(text)) existing.titles.push(text);
      // The fullest link text (usually the one in the closing ruling list) is the best title.
      if (text.length > existing.title.length) existing.title = text;
      if (!existing.citation) existing.citation = text.match(CITATION_RE)?.[1] ?? null;
      continue;
    }
    docs.set(id, {
      id,
      title: text,
      titles: text ? [text] : [],
      url: name ? `${SITE}/uploads/${encodeURIComponent(name)}` : absolute(l.href),
      hosted: name !== null,
      section: l.section,
      mentions: 1,
      citation: text.match(CITATION_RE)?.[1] ?? null,
      available: name ? !hidden.has(name) : true,
    });
  }
  return { documents: [...docs.values()], links: [...links.values()] };
}

/* ─── Content items ─── */

export type ContentType = "article" | "blog" | "service" | "project" | "dictionary" | "media" | "page";

export const CONTENT_TYPES: Record<ContentType, string> = {
  article: "מאמר",
  blog: "פוסט בהפליליסט (בלוג)",
  service: "תחום עיסוק",
  project: "מיזם / כלי",
  dictionary: "ערך במילון",
  media: "הופעה בתקשורת",
  page: "עמוד באתר",
};

export interface ContentSummary {
  type: ContentType;
  typeLabel: string;
  slug: string;
  id: string; // "<type>:<slug>"
  title: string;
  url: string;
  excerpt: string | null;
  category: string | null;
  tags: string[];
  date: string | null;
  documentCount: number;
}

export interface ContentFull extends ContentSummary {
  markdown: string;
  documents: ContentDocument[];
  links: ContentLink[];
}

interface Loaded extends ContentFull {
  plain: string;
}

// Page rows that are templates or chrome, not pages a visitor reads.
const SKIP_PAGES = new Set(["article-detail", "service-detail", "header", "footer", "site-seo"]);
// Sub-pages that live under their product's folder (/case-tracker/privacy).
const NESTED_PAGE = /^(case-tracker|court-downloader|govscraper|legal-tools)-(privacy|terms|support)$/;
const PAGE_PATHS: Record<string, string> = { home: "/", leam: "/o" };

const pagePath = (slug: string) => {
  if (PAGE_PATHS[slug]) return PAGE_PATHS[slug];
  const m = slug.match(NESTED_PAGE);
  return m ? `/${m[1]}/${m[2]}` : `/${slug}`;
};

// Keys in structured page content that hold configuration, not reader text.
const SKIP_KEYS = new Set([
  "icon", "filterFields", "cardFields", "customQuery", "sql", "fields", "sortOptions",
  "columns", "scope", "scopeId", "position", "srK", "variant", "color", "screenshotUrl",
]);

/** Readable text of a structured Page row: its strings, one per line. */
function flattenPage(value: unknown, out: string[] = [], key = ""): string[] {
  if (SKIP_KEYS.has(key)) return out;
  if (typeof value === "string") {
    const s = value.trim();
    // Skip data URIs, bare identifiers and URLs — keep sentences and labels.
    if (s.length > 1 && !s.startsWith("data:") && !/^[\w./:#?=&-]+$/.test(s) && s.length < 20_000) {
      out.push(s);
    }
  } else if (Array.isArray(value)) {
    value.forEach((v) => flattenPage(v, out, key));
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) flattenPage(v, out, k);
  }
  return out;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

interface ProjectLike {
  title?: string;
  name?: string;
  subtitle?: string;
  tagline?: string;
  description?: string;
  url?: string;
  domain?: string;
  tags?: string[];
}

const CASE_SECTION: Record<string, string> = {
  letter: "תיק: מכתבים",
  ruling: "תיק: פסיקה",
  law: "תיק: חקיקה",
};

let cache: { at: number; items: Loaded[] } | null = null;
const CACHE_MS = 60_000;

async function loadContent(): Promise<Loaded[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.items;

  const [posts, blog, services, milon, media, pages, caseDocs, hidden] = await Promise.all([
    prisma.post.findMany({ where: { status: "PUBLISHED" }, orderBy: { publishedAt: "desc" } }),
    prisma.plilistPost.findMany({ where: { status: "PUBLISHED" }, orderBy: { publishedAt: "desc" } }),
    prisma.service.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
    prisma.milonEntry.findMany({ where: { status: "PUBLISHED" }, orderBy: { order: "asc" } }),
    prisma.mediaAppearance.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
    prisma.page.findMany({ where: { status: "PUBLISHED" } }),
    prisma.caseDocument.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { order: "asc" }],
    }),
    getPrivateFiles(),
  ]);

  const items: Loaded[] = [];
  const add = (
    type: ContentType,
    slug: string,
    base: Omit<Loaded, "type" | "typeLabel" | "slug" | "id" | "documentCount">,
  ) => {
    items.push({
      ...base,
      type,
      typeLabel: CONTENT_TYPES[type],
      slug,
      id: `${type}:${slug}`,
      documentCount: base.documents.length,
    });
  };

  for (const p of posts) {
    const { markdown, plain, rawLinks } = renderDoc(p.content);
    const { documents, links } = buildDocuments(rawLinks, hidden);
    add("article", p.slug, {
      title: p.title,
      url: `${SITE}/articles/${p.slug}`,
      excerpt: p.excerpt,
      category: p.category ? CATEGORY_LABELS[p.category] ?? p.category : null,
      tags: p.tags,
      date: p.publishedAt?.toISOString() ?? null,
      markdown,
      plain,
      documents,
      links,
    });
  }

  for (const p of blog) {
    const { markdown, plain, rawLinks } = renderDoc(p.content);
    // Attachments shown under the post, then the case file (letters, rulings,
    // laws) that its caseTag pulls in.
    const attachments = Array.isArray(p.attachments)
      ? (p.attachments as { name?: string; url?: string }[])
      : [];
    for (const a of attachments) {
      if (a?.url) rawLinks.push({ text: a.name ?? "", href: a.url, section: "קבצים מצורפים" });
    }
    const caseRows = p.caseTag ? caseDocs.filter((d) => d.caseTag === p.caseTag) : [];
    for (const d of caseRows) {
      const href = d.fileUrl || d.sourceUrl;
      if (!href) continue;
      const label = [d.citation, d.title].filter(Boolean).join(" ");
      rawLinks.push({ text: label, href, section: CASE_SECTION[d.category] ?? "תיק" });
    }
    const { documents, links } = buildDocuments(rawLinks, hidden);
    const caseMd = caseRows.length
      ? "\n\n## תיק המקרה\n\n" +
        caseRows
          .map(
            (d) =>
              `- ${CASE_SECTION[d.category] ?? d.category}: **${d.title}**` +
              [d.citation, d.authority, d.docDate]
                .filter(Boolean)
                .map((x) => ` · ${x}`)
                .join("") +
              (d.description ? `\n  ${d.description}` : ""),
          )
          .join("\n")
      : "";
    add("blog", p.slug, {
      title: p.title,
      url: `${SITE}/haplilist/${p.slug}`,
      excerpt: p.excerpt,
      category: p.caseTag ? `תיק: ${p.caseTag}` : null,
      tags: p.tags,
      date: p.publishedAt?.toISOString() ?? null,
      markdown: markdown + caseMd,
      plain:
        plain +
        "\n" +
        caseRows.map((d) => `${d.title} ${d.citation ?? ""} ${d.description ?? ""}`).join("\n"),
      documents,
      links,
    });
  }

  for (const s of services) {
    const { markdown, plain, rawLinks } = renderDoc(s.content);
    const { documents, links } = buildDocuments(rawLinks, hidden);
    add("service", s.slug, {
      title: s.title,
      url: `${SITE}/services/${s.slug}`,
      excerpt: s.description,
      category: null,
      tags: [],
      date: null,
      markdown: `${s.description}\n\n${markdown}`,
      plain: `${s.description}\n${plain}`,
      documents,
      links,
    });
  }

  for (const m of milon) {
    const defs = Array.isArray(m.definitions)
      ? (m.definitions as { text?: string; label?: string }[])
      : [];
    const md = [
      `**${m.term}** (${m.vocalized}) — ${m.partOfSpeech}`,
      ...defs.map((d, i) => `${i + 1}. ${d.label ? `*${d.label}* ` : ""}${d.text ?? ""}`),
      m.example ? `\nדוגמה: ${m.example}` : "",
      m.etymology ? `\nמקור המילה: ${m.etymology}` : "",
      m.inflections ? `\nנטיות: ${m.inflections}` : "",
    ].filter(Boolean);
    add("dictionary", m.slug, {
      title: m.term,
      url: `${SITE}/dictionary#${m.slug}`,
      excerpt: defs[0]?.text ?? null,
      category: m.domains.join(", ") || null,
      tags: m.domains,
      date: null,
      markdown: md.join("\n"),
      plain: md.join("\n"),
      documents: [],
      links: [],
    });
  }

  const seenMedia = new Set<string>();
  for (const a of media) {
    let slug = slugify(`${a.source}-${a.title}`) || a.id;
    if (seenMedia.has(slug)) slug = `${slug}-${a.id.slice(-6)}`;
    seenMedia.add(slug);
    const link = a.url ? absolute(a.url) : null;
    add("media", slug, {
      title: a.title,
      url: link ?? `${SITE}/media`,
      excerpt: a.description,
      category: a.source,
      tags: [a.type, ...(a.caseTag ? [a.caseTag] : [])],
      date: a.date || null,
      markdown: `**${a.source}** · ${a.date} · ${a.type}\n\n${a.description}` + (link ? `\n\n${link}` : ""),
      plain: `${a.title}\n${a.source}\n${a.description}`,
      documents: [],
      links: link ? [{ title: a.title, url: link }] : [],
    });
  }

  // Projects: the /projects cards, the לעם and לץ site cards, and the
  // browser extensions on /digital-services — each its own item.
  const pageBySlug = new Map(pages.map((p) => [p.slug, p.content as Record<string, unknown>]));
  const extensions = pageBySlug.get("digital-services")?.extensions as { items?: unknown } | undefined;
  const projectSources: { from: string; list: unknown }[] = [
    { from: "/projects", list: pageBySlug.get("projects")?.projects },
    { from: "/o", list: pageBySlug.get("leam")?.sites },
    { from: "/letz", list: pageBySlug.get("letz")?.sites },
    { from: "/digital-services", list: extensions?.items },
  ];
  const seenProjects = new Set<string>();
  for (const src of projectSources) {
    if (!Array.isArray(src.list)) continue;
    for (const raw of src.list as ProjectLike[]) {
      const title = raw.title || raw.name;
      if (!title) continue;
      const link = raw.url ? absolute(raw.url) : `${SITE}${src.from}`;
      let slug = slugify(raw.url && raw.url.startsWith("/") ? raw.url : title) || slugify(title);
      if (seenProjects.has(slug)) slug = `${slug}-${slugify(src.from)}`;
      seenProjects.add(slug);
      const subtitle = raw.subtitle || raw.tagline || "";
      const md = [
        subtitle && `*${subtitle}*`,
        raw.description,
        `קישור: ${link}`,
        `מופיע ב: ${SITE}${src.from}`,
      ]
        .filter(Boolean)
        .join("\n\n");
      add("project", slug, {
        title,
        url: link,
        excerpt: subtitle || raw.description || null,
        category: src.from,
        tags: raw.tags ?? [],
        date: null,
        markdown: md,
        plain: `${title}\n${subtitle}\n${raw.description ?? ""}\n${raw.domain ?? ""}`,
        documents: [],
        links: raw.url ? [{ title, url: link }] : [],
      });
    }
  }

  for (const p of pages) {
    if (SKIP_PAGES.has(p.slug)) continue;
    const lines = [...new Set(flattenPage(p.content))];
    if (lines.length === 0) continue;
    add("page", p.slug, {
      title: p.title,
      url: `${SITE}${pagePath(p.slug)}`,
      excerpt: p.seoDesc ?? lines[1] ?? null,
      category: null,
      tags: [],
      date: p.publishedAt?.toISOString() ?? null,
      markdown: lines.join("\n\n"),
      plain: lines.join("\n"),
      documents: [],
      links: [],
    });
  }

  cache = { at: Date.now(), items };
  return items;
}

const summary = (a: Loaded): ContentSummary => ({
  type: a.type,
  typeLabel: a.typeLabel,
  slug: a.slug,
  id: a.id,
  title: a.title,
  url: a.url,
  excerpt: a.excerpt,
  category: a.category,
  tags: a.tags,
  date: a.date,
  documentCount: a.documentCount,
});

const typeFilter = (t?: string) => (t && t in CONTENT_TYPES ? (t as ContentType) : undefined);

export async function listContent(type?: string, category?: string): Promise<ContentSummary[]> {
  const t = typeFilter(type);
  const c = category?.trim();
  return (await loadContent())
    .filter((a) => (!t || a.type === t) && (!c || a.category === c || a.tags.includes(c)))
    .map(summary);
}

/**
 * One item, by "<type>:<slug>", by slug (with an optional type), or by its
 * URL on the site.
 */
export async function getContent(ref: string, type?: string): Promise<ContentFull | null> {
  const all = await loadContent();
  let r = ref.trim();
  let t = typeFilter(type);
  const typed = r.match(/^([a-z]+):(.+)$/);
  if (typed && typed[1] in CONTENT_TYPES) {
    t = typed[1] as ContentType;
    r = typed[2];
  }
  let found = all.find((a) => a.url === r || a.url === absolute(r));
  if (!found) {
    const route = r.match(/\/(articles|haplilist|services)\/([^/?#]+)/);
    if (route) {
      const byRoute = { articles: "article", haplilist: "blog", services: "service" } as const;
      t = byRoute[route[1] as keyof typeof byRoute];
      r = decodeURIComponent(route[2]);
    }
    found = all.find((a) => a.slug === r && (!t || a.type === t));
  }
  if (!found) return null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { plain, ...full } = found;
  return full;
}

/* ─── Search ─── */

const normalize = (s: string) =>
  s
    .replace(/[֑-ׇ]/g, "") // niqqud / cantillation
    .replace(/[״”“]/g, '"')
    .replace(/[׳’‘]/g, "'")
    .toLowerCase();

export interface SearchHit extends ContentSummary {
  score: number;
  snippet: string;
  matchedDocuments: { title: string; url: string }[];
}

export async function searchContent(
  query: string,
  opts: { type?: string; limit?: number } = {},
): Promise<SearchHit[]> {
  const q = normalize(query);
  const phrases = [...q.matchAll(/"([^"]+)"/g)].map((m) => m[1].trim()).filter(Boolean);
  const terms = q
    .replace(/"[^"]*"/g, " ")
    .split(/[\s,.;:()]+/)
    .filter((t) => t.length > 1);
  const needles = [...phrases, ...terms];
  if (needles.length === 0) return [];
  const t = typeFilter(opts.type);

  const count = (hay: string, n: string) => {
    let c = 0;
    for (let i = hay.indexOf(n); i !== -1 && c < 20; i = hay.indexOf(n, i + n.length)) c++;
    return c;
  };

  const hits: SearchHit[] = [];
  for (const a of await loadContent()) {
    if (t && a.type !== t) continue;
    const title = normalize(a.title);
    const excerpt = normalize(a.excerpt ?? "");
    const tags = normalize(`${a.tags.join(" ")} ${a.category ?? ""}`);
    const body = normalize(a.plain);
    const docTitles = normalize(a.documents.map((d) => d.titles.join(" ")).join(" "));
    let score = 0;
    let matchedAll = true;
    for (const n of needles) {
      const s =
        count(title, n) * 6 +
        count(tags, n) * 4 +
        count(excerpt, n) * 3 +
        count(docTitles, n) * 2 +
        Math.min(count(body, n), 10);
      if (s === 0) matchedAll = false;
      score += s * (phrases.includes(n) ? 2 : 1);
    }
    if (score === 0) continue;
    if (matchedAll) score *= 1.5;
    // Long-form content outranks a page that merely mentions the term.
    if (a.type === "page") score *= 0.6;

    const first = needles
      .map((n) => body.indexOf(n))
      .filter((i) => i >= 0)
      .sort((x, y) => x - y)[0];
    const snippet =
      first === undefined
        ? a.excerpt ?? ""
        : (first > 120 ? "…" : "") +
          a.plain.slice(Math.max(0, first - 120), first + 220).replace(/\s+/g, " ").trim() +
          "…";
    const matchedDocuments = a.documents
      .filter((d) => needles.some((n) => normalize(d.titles.join(" ")).includes(n)))
      .map((d) => ({ title: d.title, url: d.url }));
    hits.push({ ...summary(a), score: Math.round(score * 10) / 10, snippet, matchedDocuments });
  }
  return hits
    .sort((x, y) => y.score - x.score)
    .slice(0, Math.max(1, Math.min(opts.limit ?? 10, 25)));
}

/* ─── Documents ─── */

export interface DocumentWithSources extends ContentDocument {
  appearsIn: { id: string; type: ContentType; title: string; url: string }[];
}

export async function listDocuments(ref?: string, type?: string): Promise<DocumentWithSources[]> {
  const only = ref ? await getContent(ref, type) : null;
  if (ref && !only) return [];
  const byId = new Map<string, DocumentWithSources>();
  for (const item of await loadContent()) {
    if (only && item.id !== only.id) continue;
    for (const d of item.documents) {
      const entry = byId.get(d.id) ?? { ...d, appearsIn: [] };
      entry.appearsIn.push({ id: item.id, type: item.type, title: item.title, url: item.url });
      byId.set(d.id, entry);
    }
  }
  return [...byId.values()];
}

const textCache = new Map<string, { pages: string[]; totalPages: number }>();

async function readHostedFile(name: string): Promise<Uint8Array | null> {
  const row = await prisma.uploadedFile.findUnique({ where: { filename: name }, select: { data: true } });
  if (row) return new Uint8Array(row.data);
  for (const dir of ["uploads", "seed-uploads"]) {
    const base = path.resolve(process.cwd(), "public", dir);
    const file = path.resolve(base, name);
    if (!file.startsWith(base + path.sep)) return null;
    try {
      return new Uint8Array(await readFile(file));
    } catch {
      /* try next */
    }
  }
  return null;
}

export type DocumentTextResult =
  | {
      ok: true;
      document: DocumentWithSources;
      totalPages: number;
      fromPage: number;
      toPage: number;
      text: string;
      truncated: boolean;
      scanned: boolean;
    }
  | { ok: false; error: string };

/**
 * Text of a document attached to published content. Only documents that a
 * published item links to are served — this is not a general file reader.
 */
export async function getDocumentText(
  ref: string,
  opts: { fromPage?: number; maxChars?: number } = {},
): Promise<DocumentTextResult> {
  const wanted = ref.trim();
  const name = uploadName(wanted) ?? wanted.replace(/^.*\//, "");
  const doc = (await listDocuments()).find(
    (d) => d.id === name || d.id === wanted || d.url === wanted,
  );
  if (!doc) {
    return { ok: false, error: "המסמך אינו מצורף לאף תוכן שפורסם באתר. השתמשו ב-site_documents כדי לראות את המסמכים הזמינים." };
  }
  if (!doc.hosted) {
    return { ok: false, error: `המסמך מתארח באתר חיצוני ואין לשרת גישה לתוכנו. קישור: ${doc.url}` };
  }
  if (!doc.available || (await getPrivateFiles()).has(doc.id)) {
    return { ok: false, error: "המסמך הוסתר על ידי מנהל האתר." };
  }
  if (!/\.pdf$/i.test(doc.id)) {
    return { ok: false, error: `רק קובצי PDF נתמכים. קישור: ${doc.url}` };
  }

  let parsed = textCache.get(doc.id);
  if (!parsed) {
    const data = await readHostedFile(doc.id);
    if (!data) return { ok: false, error: "הקובץ לא נמצא בשרת." };
    parsed = await extractPdfText(data);
    textCache.set(doc.id, parsed);
  }

  const total = parsed.totalPages;
  const fromPage = Math.min(Math.max(1, Math.floor(opts.fromPage ?? 1)), total);
  const maxChars = Math.min(Math.max(1000, Math.floor(opts.maxChars ?? 30_000)), 60_000);
  let text = "";
  let toPage = fromPage - 1;
  for (let p = fromPage; p <= total; p++) {
    const chunk = `--- עמוד ${p} ---\n${parsed.pages[p - 1]}\n`;
    if (text && text.length + chunk.length > maxChars) break;
    text += chunk.slice(0, maxChars - text.length);
    toPage = p;
  }
  const letters = parsed.pages.join("").replace(/\s/g, "").length;
  return {
    ok: true,
    document: doc,
    totalPages: total,
    fromPage,
    toPage,
    text,
    truncated: toPage < total,
    scanned: letters < total * 40,
  };
}
