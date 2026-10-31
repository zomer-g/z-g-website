import { NextRequest, NextResponse } from "next/server";
import { getSiteUpdates } from "@/lib/site-updates";
import { FEED_URL, UPDATE_TYPES, changeKind, parseLimit, parseSince, parseTypes } from "@/lib/site-updates-format";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

/**
 * Public, read-only JSON stream of what is new on the site, newest first —
 * the same items as /feed.xml and the site_updates MCP tool.
 *
 *   GET /api/v1/updates                          — latest 50 items
 *   GET /api/v1/updates?type=article,document    — only some types
 *   GET /api/v1/updates?since=2026-10-01T00:00Z  — published or edited since
 *   GET /api/v1/updates?limit=200                — up to 200
 *
 * For polling: keep `checked_at` from each response and pass it back as
 * `since` next time. Each item says whether it is `new` or `updated`
 * relative to `since`. For the full text of an item, pass its url to
 * /api/v1/content?id=<url> (articles, blog posts, dictionary entries).
 */

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "public, max-age=60",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(req: NextRequest) {
  const limited = rateLimit(`updates-api:${getClientIp(req)}`, { limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const sp = req.nextUrl.searchParams;
  const types = parseTypes(sp.get("type"));
  if (types && "error" in types) return NextResponse.json({ error: types.error }, { status: 400, headers: CORS });
  const since = parseSince(sp.get("since"));
  if (since && "error" in since) return NextResponse.json({ error: since.error }, { status: 400, headers: CORS });

  try {
    const { items, asOf } = await getSiteUpdates({ types, since, limit: parseLimit(sp.get("limit")) });
    return NextResponse.json(
      {
        checked_at: asOf.toISOString(),
        since: since?.toISOString() ?? null,
        types: UPDATE_TYPES,
        feed: FEED_URL,
        count: items.length,
        items: items.map((u) => ({ ...u, change: changeKind(u, since) })),
      },
      { headers: CORS },
    );
  } catch (err) {
    console.error("GET /api/v1/updates error:", err);
    return NextResponse.json({ error: "server error" }, { status: 500, headers: CORS });
  }
}
