import { NextRequest, NextResponse } from "next/server";
import { fetchComptrollerById } from "@/lib/comptroller-upstream";
import { UpstreamError } from "@/lib/rulings-upstream";

export const dynamic = "force-dynamic";

// Single scope-13 report metadata for the detail page. PDF is served separately
// via the shared /api/rulings/documents/[id]/file proxy.
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
    const doc = await fetchComptrollerById(id);
    if (!doc) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
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
    console.error("comptroller single-doc proxy error:", err);
    return NextResponse.json({ error: "Upstream fetch failed" }, { status: 502 });
  }
}
