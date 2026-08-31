/**
 * The public, machine-readable face of פח המשפט.
 *
 * The dashboard has always been readable by a person with a browser. This is
 * the same board for everything that is not a person: a status endpoint a
 * monitor can poll, and an RSS feed a reader can subscribe to. Both are
 * unauthenticated and read-only, both serve exactly the rows the page already
 * shows anyone (hidden/moderated rows never leave the database), and both are
 * built from the same helpers so the JSON and the feed can never disagree
 * about what the board says.
 */

import { NextResponse } from "next/server";
import { SITE_ORIGIN, absoluteUrl } from "@/lib/site";

export const PACH_PAGE_URL = absoluteUrl("/pach-hamishpat");
export const PACH_FEED_URL = absoluteUrl("/pach-hamishpat/feed.xml");
export const PACH_STATUS_API_URL = absoluteUrl("/api/pach-hamishpat/status");

/**
 * Said in every response, in both formats.
 *
 * A status API is the kind of thing that gets wired into a dashboard once and
 * then read for years by people who never saw the page it came from. If the
 * "this is community-reported, not an official announcement from הנהלת בתי
 * המשפט" caveat lives only in the page's prose, it is lost the moment anyone
 * consumes the data. So it travels with the data.
 */
export const PACH_DISCLAIMER =
  "הסטטוס נקבע מדיווחים של משתמשים, ולא מהודעה רשמית של הנהלת בתי המשפט. פח המשפט הוא כלי קהילתי עצמאי.";

/**
 * Cross-origin reads are the entire point.
 *
 * Everything these endpoints return is already public and anonymous, so a
 * wildcard origin costs nothing — and without it the endpoints would be usable
 * from curl and from a server, but not from the browser dashboard someone
 * actually wants to build. Reads only: no credentials, no non-GET methods.
 */
export const PACH_CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

/** Preflight answer shared by every public פח המשפט read endpoint. */
export function pachCorsPreflight(): NextResponse {
  return new NextResponse(null, { status: 204, headers: PACH_CORS_HEADERS });
}

/**
 * Ten seconds is the dashboard's own poll interval, so nothing served from
 * cache is more stale than what a human staring at the page sees. `s-maxage`
 * plus a generous `stale-while-revalidate` means a burst of monitors polling
 * during an actual outage — precisely when they all poll at once — collapses
 * into roughly one database read per interval instead of one per caller.
 */
export const PACH_CACHE_CONTROL =
  "public, max-age=10, s-maxage=10, stale-while-revalidate=60";

/* ────────────────────────── XML ────────────────────────── */

/**
 * Comment bodies are free text typed by anonymous strangers, and they land in
 * an XML document. Escaping the five entities is the correctness half; the
 * control-character strip is the robustness half, because XML 1.0 has no
 * representation for most C0 bytes at all — not even as an entity — and a
 * single stray one makes the whole feed unparseable for every subscriber, not
 * just for the item that carried it.
 */
export function escapeXml(s: string): string {
  return s
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** RSS 2.0 wants RFC-822 dates; `toUTCString()` is exactly that form. */
export function rfc822(d: Date): string {
  return d.toUTCString();
}

/* ─────────────────────── Shared shapes ─────────────────────── */

export interface PachPublicReport {
  id: number;
  status: string;
  description: string | null;
  reporterType: string;
  createdDate: Date;
  expiresAt: Date | null;
  isScheduled: boolean;
  scheduledFrom: Date | null;
  scheduledUntil: Date | null;
}

export interface PachPublicComment {
  id: number;
  content: string;
  authorName: string;
  isAdmin: boolean;
  createdDate: Date;
}

/**
 * The report shape `resolvePachStatus` reasons about — ISO strings, the same
 * field names the existing `/reports` endpoint has always emitted. Kept
 * identical on purpose: a caller that already parses `/reports` can read
 * `active_report` here without a second parser.
 */
export function reportToJson(r: PachPublicReport) {
  return {
    id: r.id,
    status: r.status,
    description: r.description,
    reporter_type: r.reporterType,
    created_date: r.createdDate.toISOString(),
    expires_at: r.expiresAt?.toISOString() ?? null,
    is_scheduled: r.isScheduled,
    scheduled_from: r.scheduledFrom?.toISOString() ?? null,
    scheduled_until: r.scheduledUntil?.toISOString() ?? null,
  };
}

export function commentToJson(c: PachPublicComment) {
  return {
    id: c.id,
    content: c.content,
    author_name: c.authorName,
    is_admin: c.isAdmin,
    created_date: c.createdDate.toISOString(),
  };
}

/** Stable, human-meaningful anchors so a feed item links back to the board. */
export function reportPermalink(id: number): string {
  return `${SITE_ORIGIN}/pach-hamishpat#report-${id}`;
}

export function commentPermalink(id: number): string {
  return `${SITE_ORIGIN}/pach-hamishpat#comment-${id}`;
}
