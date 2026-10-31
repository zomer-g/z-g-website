/**
 * Pure half of the site-wide "what's new" stream: the item shape, the query
 * parsing shared by the RSS feed, the JSON API and the MCP tool, and the RSS
 * renderer. No database here, so it can be unit-tested on its own.
 *
 * The DB half (collecting the rows) is src/lib/site-updates.ts.
 */

import { escapeXml, rfc822 } from "./pach-public";
import { SITE_ORIGIN, absoluteUrl } from "./site";

export const UPDATE_TYPES = {
  article: "מאמר",
  blog: "פוסט בהפליליסט",
  dictionary: "ערך במילון",
  media: "הופעה בתקשורת",
  document: "מסמך בתיק",
} as const;

export type UpdateType = keyof typeof UPDATE_TYPES;

export interface SiteUpdate {
  /** "<type>:<row id>" — stable for the life of the row, used as the RSS guid. */
  id: string;
  type: UpdateType;
  typeLabel: string;
  title: string;
  url: string;
  excerpt: string | null;
  /** When it went public (publishedAt, or the time it was added). ISO. */
  published: string;
  /** Last edit. Equal to or after `published`. ISO. */
  updated: string;
  /** Free-text context: category, source, case, citation. */
  category: string | null;
  tags: string[];
  /** For a case document: the post its case file sits on, when there is one. */
  parentUrl: string | null;
}

export const FEED_URL = absoluteUrl("/feed.xml");
export const UPDATES_API_URL = absoluteUrl("/api/v1/updates");

export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 200;

export interface UpdatesQuery {
  types: UpdateType[] | null; // null = all
  since: Date | null;
  limit: number;
}

/** Comma-separated `type`, validated. Unknown names are an error, not ignored. */
export function parseTypes(raw: string | null | undefined): UpdateType[] | null | { error: string } {
  if (!raw || !raw.trim()) return null;
  const parts = [...new Set(raw.split(",").map((s) => s.trim()).filter(Boolean))];
  const bad = parts.filter((p) => !(p in UPDATE_TYPES));
  if (bad.length) {
    return { error: `unknown type: ${bad.join(", ")}; one of: ${Object.keys(UPDATE_TYPES).join(", ")}` };
  }
  return parts as UpdateType[];
}

/** ISO date or date-time. Anything unparseable is an error. */
export function parseSince(raw: string | null | undefined): Date | null | { error: string } {
  if (!raw || !raw.trim()) return null;
  const d = new Date(raw.trim());
  if (Number.isNaN(d.getTime())) return { error: "since must be an ISO date, e.g. 2026-10-01 or 2026-10-01T08:00:00Z" };
  return d;
}

export function parseLimit(raw: unknown): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.min(MAX_LIMIT, Math.floor(n)) : DEFAULT_LIMIT;
}

/**
 * Filter + order. Sorted by publication, newest first. With `since`, an item
 * is included when it was published OR edited at/after that moment — so a
 * poller that passes its last check time also sees corrections to old items.
 */
export function selectUpdates(all: SiteUpdate[], q: UpdatesQuery): SiteUpdate[] {
  const since = q.since?.getTime();
  return all
    .filter((u) => !q.types || q.types.includes(u.type))
    .filter((u) => since === undefined || Date.parse(u.published) >= since || Date.parse(u.updated) >= since)
    .sort((a, b) => b.published.localeCompare(a.published) || a.id.localeCompare(b.id))
    .slice(0, q.limit);
}

/** "new" if it first appeared after `since`, otherwise "updated". */
export function changeKind(u: SiteUpdate, since: Date | null): "new" | "updated" {
  return !since || Date.parse(u.published) >= since.getTime() ? "new" : "updated";
}

/* ─────────────────────────── RSS ─────────────────────────── */

const TYPE_ICON: Record<UpdateType, string> = {
  article: "📝",
  blog: "⚖️",
  dictionary: "📖",
  media: "🎙️",
  document: "📄",
};

/**
 * RSS 2.0, every field escaped (no CDATA — see the note in the פח המשפט feed).
 * `selfUrl` must be the exact URL requested, query string included, or a
 * reader subscribed to a filtered feed re-points itself at the full one.
 */
export function renderRss(items: SiteUpdate[], opts: { selfUrl: string; types: UpdateType[] | null; now: Date }): string {
  const scope = opts.types?.length ? opts.types.map((t) => UPDATE_TYPES[t]).join(", ") : null;
  const title = scope ? `עו"ד גיא זומר — עדכונים: ${scope}` : 'עו"ד גיא זומר — עדכונים באתר';
  const description =
    "כל תוכן חדש שעולה לאתר z-g.co.il: מאמרים, פוסטים בהפליליסט, מסמכים בתיקי המקרה, ערכי מילון והופעות בתקשורת. " +
    "התכנים הם מידע כללי ואינם ייעוץ משפטי.";
  const newest = items.reduce<string | null>((m, u) => (!m || u.updated > m ? u.updated : m), null);

  const renderItem = (u: SiteUpdate) => {
    const body = [
      u.excerpt?.trim(),
      u.category ? `${u.typeLabel} · ${u.category}` : u.typeLabel,
      u.parentUrl ? `מתוך: ${u.parentUrl}` : null,
    ]
      .filter(Boolean)
      .join("\n\n");
    return [
      "    <item>",
      `      <title>${escapeXml(`${TYPE_ICON[u.type]} ${u.title}`)}</title>`,
      `      <link>${escapeXml(u.url)}</link>`,
      `      <guid isPermaLink="false">${escapeXml(`${SITE_ORIGIN}#${u.id}`)}</guid>`,
      `      <pubDate>${rfc822(new Date(u.published))}</pubDate>`,
      `      <category>${escapeXml(u.typeLabel)}</category>`,
      ...(u.category ? [`      <category>${escapeXml(u.category)}</category>`] : []),
      ...u.tags.map((t) => `      <category>${escapeXml(t)}</category>`),
      `      <description>${escapeXml(body)}</description>`,
      "    </item>",
    ].join("\n");
  };

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${escapeXml(title)}</title>`,
    `    <link>${escapeXml(`${SITE_ORIGIN}/`)}</link>`,
    `    <description>${escapeXml(description)}</description>`,
    "    <language>he-il</language>",
    `    <lastBuildDate>${rfc822(newest ? new Date(newest) : opts.now)}</lastBuildDate>`,
    "    <ttl>60</ttl>",
    `    <atom:link href="${escapeXml(opts.selfUrl)}" rel="self" type="application/rss+xml" />`,
    "    <generator>z-g.co.il</generator>",
    ...items.map(renderItem),
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}
