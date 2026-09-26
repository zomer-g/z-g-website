import { readFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { getPrivateFiles } from "@/lib/private-files";
import { extractPdfText } from "@/lib/pdf-text";

/**
 * Data layer for the articles MCP server (/api/mcp/articles).
 *
 * Only PUBLISHED posts are visible. An article's "documents" are the files it
 * links to — the rulings and papers attached in the body — found by walking
 * the TipTap JSON: every link to a file hosted on the site (/uploads/...) or
 * to a PDF. Each document keeps the link text as its title and the heading or
 * card it sits under as its section, so a caller can tell a cited ruling from
 * the ruling list at the end. A file an admin hid (/admin/files) is listed as
 * unavailable and its text is never served.
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

export interface ArticleDocument {
  id: string; // file name for hosted files, URL otherwise
  title: string; // link text
  titles: string[]; // every distinct link text used for it in the article
  url: string;
  hosted: boolean; // served from this site under /uploads
  section: string | null; // heading / card title the first link sits under
  mentions: number;
  citation: string | null; // e.g. ע"א 8849/01, parsed from the link text
  available: boolean; // false = hidden by an admin
}

export interface ArticleLink {
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
): { documents: ArticleDocument[]; links: ArticleLink[] } {
  const docs = new Map<string, ArticleDocument>();
  const links = new Map<string, ArticleLink>();
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

/* ─── Articles ─── */

export interface ArticleSummary {
  slug: string;
  title: string;
  url: string;
  excerpt: string | null;
  category: string | null;
  tags: string[];
  author: string | null;
  publishedAt: string | null;
  updatedAt: string;
  documentCount: number;
}

export interface ArticleFull extends ArticleSummary {
  markdown: string;
  documents: ArticleDocument[];
  links: ArticleLink[];
}

interface Loaded extends ArticleFull {
  plain: string;
}

let cache: { at: number; articles: Loaded[] } | null = null;
const CACHE_MS = 60_000;

async function loadArticles(): Promise<Loaded[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.articles;
  const [posts, hidden] = await Promise.all([
    prisma.post.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      include: { author: { select: { name: true } } },
    }),
    getPrivateFiles(),
  ]);
  const articles = posts.map((p): Loaded => {
    const { markdown, plain, rawLinks } = renderDoc(p.content);
    const { documents, links } = buildDocuments(rawLinks, hidden);
    return {
      slug: p.slug,
      title: p.title,
      url: `${SITE}/articles/${p.slug}`,
      excerpt: p.excerpt,
      category: p.category ? CATEGORY_LABELS[p.category] ?? p.category : null,
      tags: p.tags,
      author: p.author?.name ?? null,
      publishedAt: p.publishedAt?.toISOString() ?? null,
      updatedAt: p.updatedAt.toISOString(),
      documentCount: documents.length,
      markdown,
      documents,
      links,
      plain,
    };
  });
  cache = { at: Date.now(), articles };
  return articles;
}

const summary = (a: Loaded): ArticleSummary => ({
  slug: a.slug,
  title: a.title,
  url: a.url,
  excerpt: a.excerpt,
  category: a.category,
  tags: a.tags,
  author: a.author,
  publishedAt: a.publishedAt,
  updatedAt: a.updatedAt,
  documentCount: a.documentCount,
});

export async function listArticles(category?: string): Promise<ArticleSummary[]> {
  const all = await loadArticles();
  const c = category?.trim();
  return all
    .filter((a) => !c || a.category === c || a.tags.includes(c))
    .map(summary);
}

export async function getArticle(slugOrUrl: string): Promise<ArticleFull | null> {
  const slug = slugOrUrl.trim().replace(/^.*\/articles\//, "").replace(/[/?#].*$/, "");
  const found = (await loadArticles()).find((a) => a.slug === decodeURIComponent(slug));
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

export interface SearchHit extends ArticleSummary {
  score: number;
  snippet: string;
  matchedDocuments: { title: string; url: string }[];
}

export async function searchArticles(query: string, limit = 10): Promise<SearchHit[]> {
  const q = normalize(query);
  const phrases = [...q.matchAll(/"([^"]+)"/g)].map((m) => m[1].trim()).filter(Boolean);
  const terms = q
    .replace(/"[^"]*"/g, " ")
    .split(/[\s,.;:()]+/)
    .filter((t) => t.length > 1);
  const needles = [...phrases, ...terms];
  if (needles.length === 0) return [];

  const count = (hay: string, n: string) => {
    let c = 0;
    for (let i = hay.indexOf(n); i !== -1 && c < 20; i = hay.indexOf(n, i + n.length)) c++;
    return c;
  };

  const hits: SearchHit[] = [];
  for (const a of await loadArticles()) {
    const title = normalize(a.title);
    const excerpt = normalize(a.excerpt ?? "");
    const tags = normalize(a.tags.join(" "));
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

    const first = needles.map((n) => body.indexOf(n)).filter((i) => i >= 0).sort((x, y) => x - y)[0];
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
  return hits.sort((x, y) => y.score - x.score).slice(0, Math.max(1, Math.min(limit, 25)));
}

/* ─── Documents ─── */

export interface DocumentWithArticles extends ArticleDocument {
  articles: { slug: string; title: string; url: string }[];
}

export async function listDocuments(slug?: string): Promise<DocumentWithArticles[]> {
  const articles = await loadArticles();
  const byId = new Map<string, DocumentWithArticles>();
  for (const a of articles) {
    if (slug && a.slug !== slug) continue;
    for (const d of a.documents) {
      const entry = byId.get(d.id) ?? { ...d, articles: [] };
      entry.articles.push({ slug: a.slug, title: a.title, url: a.url });
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
      document: DocumentWithArticles;
      totalPages: number;
      fromPage: number;
      toPage: number;
      text: string;
      truncated: boolean;
      scanned: boolean;
    }
  | { ok: false; error: string };

/**
 * Text of a document attached to a published article. Only documents that a
 * published article links to are served — this is not a general file reader.
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
    return { ok: false, error: "המסמך אינו מצורף לאף מאמר שפורסם. השתמשו ב-article_documents כדי לראות את המסמכים הזמינים." };
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
