import { NextRequest, NextResponse } from "next/server";
import { CONTENT_TYPES, getDocumentText, listDocuments } from "@/lib/site-content-mcp";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

/**
 * Public, read-only REST view of the documents attached to published content
 * (rulings, letters, reports) — the REST twin of the site_documents and
 * document_get_text tools of the /api/mcp/site MCP server. Only documents that
 * a published item links to are served; hidden files are refused.
 *
 *   GET /api/v1/documents                                — every attached document
 *   GET /api/v1/documents?item=blog:<slug>               — the documents of one item
 *   GET /api/v1/documents?document=<id>&from_page=1&max_chars=30000
 *                                                        — the text of one PDF, by pages
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "public, max-age=60",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const param = (k: string) => sp.get(k)?.trim().slice(0, 500) || undefined;
  const document = param("document");

  // PDF extraction is the expensive path, so it gets the tighter budget.
  const limited = document
    ? rateLimit(`documents-text-api:${getClientIp(req)}`, { limit: 20, windowMs: 60_000 })
    : rateLimit(`documents-api:${getClientIp(req)}`, { limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const type = param("type");
  if (type && !(type in CONTENT_TYPES)) {
    return NextResponse.json(
      { error: `unknown type; one of: ${Object.keys(CONTENT_TYPES).join(", ")}` },
      { status: 400, headers: CORS },
    );
  }

  try {
    if (document) {
      const num = (k: string) => (sp.get(k) ? Number(sp.get(k)) || undefined : undefined);
      const res = await getDocumentText(document, { fromPage: num("from_page"), maxChars: num("max_chars") });
      if (!res.ok) return NextResponse.json({ error: res.error }, { status: 404, headers: CORS });
      return NextResponse.json(
        {
          document: res.document,
          totalPages: res.totalPages,
          fromPage: res.fromPage,
          toPage: res.toPage,
          truncated: res.truncated,
          scanned: res.scanned,
          text: res.scanned ? "" : res.text,
        },
        { headers: CORS },
      );
    }

    const item = param("item");
    const documents = await listDocuments(item, type);
    return NextResponse.json({ ...(item ? { item } : {}), count: documents.length, documents }, { headers: CORS });
  } catch (err) {
    console.error("GET /api/v1/documents error:", err);
    return NextResponse.json({ error: "server error" }, { status: 500, headers: CORS });
  }
}
