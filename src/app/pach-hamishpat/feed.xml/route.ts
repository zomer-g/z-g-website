import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PACH_STATUS_TEXT,
  resolvePachStatus,
  toPachStatus,
  type PachStatus,
} from "@/lib/pach-status";
import {
  PACH_CACHE_CONTROL,
  PACH_CORS_HEADERS,
  PACH_DISCLAIMER,
  PACH_FEED_URL,
  PACH_PAGE_URL,
  commentPermalink,
  escapeXml,
  pachCorsPreflight,
  reportPermalink,
  reportToJson,
  rfc822,
} from "@/lib/pach-public";

/**
 * GET /pach-hamishpat/feed.xml — the board as an RSS 2.0 feed.
 *
 * Refreshing a status page all day is the failure mode this replaces. One
 * feed carries both halves of the board, because in practice they are one
 * story: a red report says the system is down, and the comment underneath it
 * says what actually broke and whether the court accepted a late filing over
 * it. Splitting them would mean subscribing twice to follow one outage — so
 * `?type=` exists for callers who genuinely want one, and the default is both.
 *
 * Only non-hidden rows are ever emitted. Moderating a comment on the board
 * cannot retract it from a subscriber's reader, which is a reason to keep the
 * feed strictly to what is already public — never a reason to widen it.
 */

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

// Long enough that a comment reads as a comment in a feed reader's list view,
// short enough that it does not swallow the line. The full text is always in
// the item body regardless.
const TITLE_SNIPPET = 70;

const STATUS_ICON: Record<PachStatus, string> = {
  green: "🟢",
  orange: "🟠",
  red: "🔴",
};

/** Israeli local time, since every reader of this feed is in that timezone. */
function ilTime(d: Date): string {
  return d.toLocaleString("he-IL", {
    timeZone: "Asia/Jerusalem",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function snippet(s: string): string {
  const flat = s.replace(/\s+/g, " ").trim();
  return flat.length > TITLE_SNIPPET
    ? `${flat.slice(0, TITLE_SNIPPET).trimEnd()}…`
    : flat;
}

interface FeedItem {
  title: string;
  description: string;
  link: string;
  guid: string;
  date: Date;
  categories: string[];
  creator: string;
}

/**
 * Every field is escaped rather than wrapped in CDATA. CDATA looks simpler
 * until a body happens to contain the CDATA terminator — free-text comments
 * are exactly where that eventually happens, and it breaks the whole document
 * for every subscriber, not just that item.
 */
function renderItem(it: FeedItem): string {
  return [
    "    <item>",
    `      <title>${escapeXml(it.title)}</title>`,
    `      <link>${escapeXml(it.link)}</link>`,
    `      <guid isPermaLink="false">${escapeXml(it.guid)}</guid>`,
    `      <pubDate>${rfc822(it.date)}</pubDate>`,
    `      <dc:creator>${escapeXml(it.creator)}</dc:creator>`,
    ...it.categories.map((c) => `      <category>${escapeXml(c)}</category>`),
    `      <description>${escapeXml(it.description)}</description>`,
    "    </item>",
  ].join("\n");
}

export async function OPTIONS() {
  return pachCorsPreflight();
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const typeRaw = sp.get("type");
  const type =
    typeRaw === "reports" || typeRaw === "comments" ? typeRaw : "all";
  const limitRaw = Number(sp.get("limit"));
  const limit =
    Number.isFinite(limitRaw) && limitRaw > 0
      ? Math.min(MAX_LIMIT, Math.floor(limitRaw))
      : DEFAULT_LIMIT;

  const now = new Date();

  try {
    // Status is always computed from reports, even for ?type=comments: the
    // channel description states the live status, and a comments-only
    // subscriber still wants that header to be true.
    const [reportRows, commentRows] = await Promise.all([
      prisma.pachReport.findMany({
        where: { isHidden: false },
        orderBy: { createdDate: "desc" },
        take: Math.max(limit, 200),
      }),
      type === "reports"
        ? Promise.resolve([])
        : prisma.pachComment.findMany({
            where: { isHidden: false },
            orderBy: { createdDate: "desc" },
            take: limit,
          }),
    ]);

    const { status } = resolvePachStatus(
      reportRows.map(reportToJson),
      now.getTime(),
    );

    const items: FeedItem[] = [];

    if (type !== "comments") {
      for (const r of reportRows) {
        const s = toPachStatus(r.status);
        const scheduled = !!(
          r.isScheduled &&
          r.scheduledFrom &&
          r.scheduledUntil
        );
        const kind = scheduled
          ? "תחזוקה מתוכננת"
          : r.reporterType === "admin"
            ? "עדכון מערכת"
            : "דיווח משתמש";

        const lines: string[] = [`${PACH_STATUS_TEXT[s]} — ${kind}.`];
        // The stock client-side descriptions ("דיווח red", "איפוס מערכת") are
        // machine noise, not prose; repeating them under a title that already
        // says the same thing in Hebrew helps nobody.
        if (
          r.description &&
          !/^דיווח (red|orange|green)$/.test(r.description.trim())
        ) {
          lines.push(r.description.trim());
        }
        if (scheduled) {
          lines.push(
            `חלון התחזוקה: ${ilTime(r.scheduledFrom!)} — ${ilTime(r.scheduledUntil!)}.`,
          );
        } else if (r.expiresAt && s !== "green") {
          lines.push(`הדיווח בתוקף עד ${ilTime(r.expiresAt)}.`);
        }
        lines.push(`דווח ב-${ilTime(r.createdDate)} (שעון ישראל).`);

        items.push({
          title: `${STATUS_ICON[s]} ${PACH_STATUS_TEXT[s]} — ${kind}`,
          description: lines.join(" "),
          link: reportPermalink(r.id),
          guid: reportPermalink(r.id),
          date: r.createdDate,
          categories: ["דיווח סטטוס", PACH_STATUS_TEXT[s], s],
          creator: r.reporterType === "admin" ? "צוות פח המשפט" : "דיווח משתמש",
        });
      }
    }

    if (type !== "reports") {
      for (const c of commentRows) {
        const author = c.authorName?.trim() || "אנונימי";
        items.push({
          title: `💬 ${author}: ${snippet(c.content)}`,
          description: `${c.content.trim()}\n\nנכתב ב-${ilTime(c.createdDate)} (שעון ישראל).`,
          link: commentPermalink(c.id),
          guid: commentPermalink(c.id),
          date: c.createdDate,
          categories: ["תגובה", ...(c.isAdmin ? ["מנהל"] : [])],
          creator: author,
        });
      }
    }

    items.sort((a, b) => b.date.getTime() - a.date.getTime());
    const shown = items.slice(0, limit);

    // The self-link has to name the exact URL that was requested, or a reader
    // subscribed to ?type=comments silently re-points itself at the combined
    // feed on its next poll.
    const selfParams = new URLSearchParams({
      ...(type === "all" ? {} : { type }),
      ...(limit === DEFAULT_LIMIT ? {} : { limit: String(limit) }),
    }).toString();
    const selfUrl = selfParams ? `${PACH_FEED_URL}?${selfParams}` : PACH_FEED_URL;

    const title =
      type === "comments"
        ? "פח המשפט — תגובות"
        : type === "reports"
          ? "פח המשפט — דיווחי סטטוס נט המשפט"
          : "פח המשפט — סטטוס נט המשפט";

    const description =
      `הסטטוס כרגע: ${PACH_STATUS_TEXT[status]}. ` +
      (type === "comments"
        ? "תגובות שנכתבו על לוח הסטטוס של נט המשפט. "
        : type === "reports"
          ? "כל דיווח על השבתה, תקלה חלקית או חזרה לפעילות של נט המשפט. "
          : "כל דיווח על השבתה או תקלה בנט המשפט, וכל תגובה שנכתבה על הלוח. ") +
      PACH_DISCLAIMER;

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">',
      "  <channel>",
      `    <title>${escapeXml(title)}</title>`,
      `    <link>${escapeXml(PACH_PAGE_URL)}</link>`,
      `    <description>${escapeXml(description)}</description>`,
      "    <language>he-il</language>",
      `    <lastBuildDate>${rfc822(shown[0]?.date ?? now)}</lastBuildDate>`,
      // The dashboard polls every 10s; a reader honouring ttl at 5 minutes is
      // already far more current than a person refreshing by hand.
      "    <ttl>5</ttl>",
      `    <atom:link href="${escapeXml(selfUrl)}" rel="self" type="application/rss+xml" />`,
      "    <generator>z-g.co.il</generator>",
      ...shown.map(renderItem),
      "  </channel>",
      "</rss>",
      "",
    ].join("\n");

    return new NextResponse(xml, {
      headers: {
        ...PACH_CORS_HEADERS,
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": PACH_CACHE_CONTROL,
      },
    });
  } catch (e) {
    console.error("GET /pach-hamishpat/feed.xml", e);
    // Readers retry on 5xx and keep their last good copy; handing them a valid
    // but empty feed would instead look like the board going quiet.
    return new NextResponse("feed unavailable", {
      status: 503,
      headers: {
        ...PACH_CORS_HEADERS,
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }
}
