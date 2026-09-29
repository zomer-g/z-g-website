import { NextRequest, NextResponse } from "next/server";
import { CONTENT_TYPES, getContent, listContent, searchContent } from "@/lib/site-content-mcp";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

/**
 * Public, read-only REST view of everything published on the site — the same
 * data the /api/mcp/site MCP server serves, for clients that speak plain HTTP.
 * Only published content is ever returned (the loader filters drafts out).
 *
 *   GET /api/v1/content                      — index of all items
 *   GET /api/v1/content?type=blog            — one content type
 *   GET /api/v1/content?category=<tag>       — by category / tag
 *   GET /api/v1/content?q=<query>&limit=10   — full-text search
 *   GET /api/v1/content?id=blog:<slug>       — one item in full, as Markdown
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
  const limited = rateLimit(`content-api:${getClientIp(req)}`, { limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const sp = req.nextUrl.searchParams;
  const param = (k: string) => sp.get(k)?.trim().slice(0, 300) || undefined;
  const type = param("type");
  if (type && !(type in CONTENT_TYPES)) {
    return NextResponse.json(
      { error: `unknown type; one of: ${Object.keys(CONTENT_TYPES).join(", ")}` },
      { status: 400, headers: CORS },
    );
  }

  try {
    const id = param("id");
    if (id) {
      const item = await getContent(id, type);
      if (!item) return NextResponse.json({ error: "not found" }, { status: 404, headers: CORS });
      return NextResponse.json(item, { headers: CORS });
    }

    const q = param("q");
    if (q) {
      const limit = Math.min(25, Math.max(1, Number(sp.get("limit")) || 10));
      const results = await searchContent(q, { type, limit });
      return NextResponse.json({ query: q, count: results.length, results }, { headers: CORS });
    }

    const items = await listContent(type, param("category"));
    return NextResponse.json({ types: CONTENT_TYPES, count: items.length, items }, { headers: CORS });
  } catch (err) {
    console.error("GET /api/v1/content error:", err);
    return NextResponse.json({ error: "server error" }, { status: 500, headers: CORS });
  }
}
