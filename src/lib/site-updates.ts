import { prisma } from "@/lib/prisma";
import { getPrivateFiles, uploadNameFromPath } from "@/lib/private-files";
import { SITE_ORIGIN, absoluteUrl } from "@/lib/site";
import { UPDATE_TYPES, selectUpdates, type SiteUpdate, type UpdatesQuery } from "@/lib/site-updates-format";

/**
 * The site-wide "what's new" stream: everything that goes up on the site,
 * newest first, in one list — for /feed.xml, /api/v1/updates and the
 * site_updates MCP tool.
 *
 * /api/v1/content and the other site_* MCP tools answer "what is on the
 * site"; this answers "what changed since I last looked". It covers the
 * content that is added over time and carries real dates:
 *
 *   article    — published articles (Post)
 *   blog       — published הפליליסט posts (PlilistPost)
 *   dictionary — published dictionary entries (MilonEntry)
 *   media      — active media appearances (MediaAppearance)
 *   document   — active case-file documents (CaseDocument): letters,
 *                rulings, laws added to a case after its post went up
 *
 * Services, project cards and static pages are left out on purpose: they have
 * no publication date, and a page row's updatedAt moves on every settings
 * edit, which would flood subscribers with noise.
 *
 * Visibility is the same as everywhere else on the public site: drafts and
 * inactive rows never appear, and a document whose file an admin hid
 * (/admin/files) is dropped entirely rather than listed.
 */

const CATEGORY_LABELS: Record<string, string> = {
  "זכויות-בחקירה": "זכויות בחקירה",
  "הליכים-משפטיים": "הליכים משפטיים",
  "טכנולוגיה-במשפט": "טכנולוגיה במשפט",
};

const DOC_CATEGORY: Record<string, string> = {
  letter: "מכתב",
  court: "כתב בי-דין",
  ruling: "פסיקה",
  law: "חקיקה",
};

const iso = (d: Date) => d.toISOString();
const later = (a: Date, b: Date) => (b > a ? b : a);

function hiddenUpload(href: string, hidden: Set<string>): boolean {
  try {
    const name = uploadNameFromPath(new URL(href, SITE_ORIGIN).pathname);
    return !!name && hidden.has(name);
  } catch {
    return false;
  }
}

// `at` doubles as the snapshot time handed to pollers as `checked_at`: it must
// be when the rows were read, not when the request came in, or anything added
// inside the cache window would fall between two polls.
let cache: { at: number; items: SiteUpdate[] } | null = null;
const CACHE_MS = 60_000;

export async function loadSiteUpdates(): Promise<{ items: SiteUpdate[]; asOf: Date }> {
  if (cache && Date.now() - cache.at < CACHE_MS) return { items: cache.items, asOf: new Date(cache.at) };
  const startedAt = Date.now();

  const [posts, blog, milon, media, docs, hidden] = await Promise.all([
    prisma.post.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, slug: true, title: true, excerpt: true, category: true, tags: true, publishedAt: true, createdAt: true, updatedAt: true },
    }),
    prisma.plilistPost.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, slug: true, title: true, excerpt: true, tags: true, caseTag: true, publishedAt: true, createdAt: true, updatedAt: true },
    }),
    prisma.milonEntry.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, slug: true, term: true, definitions: true, domains: true, createdAt: true, updatedAt: true },
    }),
    prisma.mediaAppearance.findMany({
      where: { isActive: true },
      select: { id: true, title: true, description: true, type: true, source: true, date: true, url: true, caseTag: true, createdAt: true },
    }),
    prisma.caseDocument.findMany({
      where: { isActive: true },
      select: {
        id: true, caseTag: true, category: true, title: true, description: true, docDate: true,
        citation: true, authority: true, fileUrl: true, sourceUrl: true, createdAt: true, updatedAt: true,
      },
    }),
    getPrivateFiles(),
  ]);

  const items: SiteUpdate[] = [];
  const push = (u: Omit<SiteUpdate, "typeLabel">) => items.push({ ...u, typeLabel: UPDATE_TYPES[u.type] });

  for (const p of posts) {
    const pub = p.publishedAt ?? p.createdAt;
    push({
      id: `article:${p.id}`,
      type: "article",
      title: p.title,
      url: absoluteUrl(`/articles/${p.slug}`),
      excerpt: p.excerpt,
      published: iso(pub),
      updated: iso(later(pub, p.updatedAt)),
      category: p.category ? CATEGORY_LABELS[p.category] ?? p.category : null,
      tags: p.tags,
      parentUrl: null,
    });
  }

  // A case's documents are shown on the post that carries its caseTag.
  const caseHome = new Map<string, string>();
  for (const p of blog) {
    const pub = p.publishedAt ?? p.createdAt;
    const url = absoluteUrl(`/haplilist/${p.slug}`);
    if (p.caseTag && !caseHome.has(p.caseTag)) caseHome.set(p.caseTag, url);
    push({
      id: `blog:${p.id}`,
      type: "blog",
      title: p.title,
      url,
      excerpt: p.excerpt,
      published: iso(pub),
      updated: iso(later(pub, p.updatedAt)),
      category: p.caseTag ? `תיק: ${p.caseTag}` : null,
      tags: p.tags,
      parentUrl: null,
    });
  }

  for (const m of milon) {
    const defs = Array.isArray(m.definitions) ? (m.definitions as { text?: string }[]) : [];
    push({
      id: `dictionary:${m.id}`,
      type: "dictionary",
      title: m.term,
      url: absoluteUrl(`/dictionary#${m.slug}`),
      excerpt: defs[0]?.text ?? null,
      published: iso(m.createdAt),
      updated: iso(later(m.createdAt, m.updatedAt)),
      category: m.domains.join(", ") || null,
      tags: m.domains,
      parentUrl: null,
    });
  }

  // `date` on a media row is the free-text date of the appearance itself,
  // which can be years before it was added here. The feed is about what was
  // added, so `published` is createdAt and the appearance date goes in the text.
  for (const a of media) {
    push({
      id: `media:${a.id}`,
      type: "media",
      title: a.title,
      url: a.url ? absoluteUrl(a.url) : absoluteUrl("/media"),
      excerpt: [a.date && `${a.source} · ${a.date}`, a.description].filter(Boolean).join("\n") || null,
      published: iso(a.createdAt),
      updated: iso(a.createdAt),
      category: a.source,
      tags: [a.type, ...(a.caseTag ? [a.caseTag] : [])],
      parentUrl: a.caseTag ? caseHome.get(a.caseTag) ?? null : null,
    });
  }

  for (const d of docs) {
    const href = d.fileUrl || d.sourceUrl;
    if (d.fileUrl && hiddenUpload(d.fileUrl, hidden)) continue;
    const home = caseHome.get(d.caseTag) ?? null;
    if (!href && !home) continue;
    push({
      id: `document:${d.id}`,
      type: "document",
      title: d.citation ? `${d.citation} — ${d.title}` : d.title,
      url: href ? absoluteUrl(href) : home!,
      excerpt:
        [d.description, [d.authority, d.docDate].filter(Boolean).join(" · ")].filter(Boolean).join("\n") || null,
      published: iso(d.createdAt),
      updated: iso(later(d.createdAt, d.updatedAt)),
      category: `תיק: ${d.caseTag} · ${DOC_CATEGORY[d.category] ?? d.category}`,
      tags: [d.caseTag],
      parentUrl: home,
    });
  }

  cache = { at: startedAt, items };
  return { items, asOf: new Date(startedAt) };
}

/** The matching items, plus the moment the underlying snapshot was read. */
export async function getSiteUpdates(q: UpdatesQuery): Promise<{ items: SiteUpdate[]; asOf: Date }> {
  const { items, asOf } = await loadSiteUpdates();
  return { items: selectUpdates(items, q), asOf };
}
