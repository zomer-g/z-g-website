import { NextRequest, NextResponse } from "next/server";
import { getSiteUpdates } from "@/lib/site-updates";
import { FEED_URL, parseLimit, parseTypes, renderRss, DEFAULT_LIMIT } from "@/lib/site-updates-format";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

/**
 * GET /feed.xml — everything new on the site as one RSS 2.0 feed.
 *
 *   /feed.xml                         — all content types
 *   /feed.xml?type=article,blog       — only some types
 *   /feed.xml?limit=100               — more items (max 200)
 *
 * The פח המשפט status board keeps its own feed at /pach-hamishpat/feed.xml;
 * it moves every few minutes during an outage and would drown this one.
 */

export const dynamic = "force-dynamic";

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: HEADERS });
}

export async function GET(req: NextRequest) {
  const limited = rateLimit(`site-feed:${getClientIp(req)}`, { limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const sp = req.nextUrl.searchParams;
  const types = parseTypes(sp.get("type"));
  if (types && "error" in types) {
    return new NextResponse(types.error, { status: 400, headers: { ...HEADERS, "Content-Type": "text/plain; charset=utf-8" } });
  }
  const limit = parseLimit(sp.get("limit"));

  try {
    const { items } = await getSiteUpdates({ types, since: null, limit });
    const selfParams = new URLSearchParams({
      ...(types ? { type: types.join(",") } : {}),
      ...(limit === DEFAULT_LIMIT ? {} : { limit: String(limit) }),
    }).toString();
    const xml = renderRss(items, {
      selfUrl: selfParams ? `${FEED_URL}?${selfParams}` : FEED_URL,
      types,
      now: new Date(),
    });
    return new NextResponse(xml, {
      headers: {
        ...HEADERS,
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=3600",
      },
    });
  } catch (e) {
    console.error("GET /feed.xml", e);
    // A 5xx makes readers keep their last good copy; an empty feed would not.
    return new NextResponse("feed unavailable", {
      status: 503,
      headers: { ...HEADERS, "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
}
