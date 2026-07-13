import { NextRequest, NextResponse } from "next/server";
import { fetchMmmById } from "@/lib/mmm-upstream";
import { UpstreamError } from "@/lib/rulings-upstream";

export const dynamic = "force-dynamic";

// Single scope-14 document metadata for the detail page. PDF is served
// separately via the shared /api/rulings/documents/[id]/file proxy.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const doc = await fetchMmmById(id);
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    return NextResponse.json(doc, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" },
    });
  } catch (err) {
    if (err instanceof UpstreamError) {
      return NextResponse.json(
        { error: `Upstream ${err.status}: ${err.body.slice(0, 300)}` },
        { status: 502 },
      );
    }
    console.error("mmm single-doc proxy error:", err);
    return NextResponse.json({ error: "Upstream fetch failed" }, { status: 502 });
  }
}
