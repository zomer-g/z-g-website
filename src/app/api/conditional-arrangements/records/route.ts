import { NextRequest, NextResponse } from "next/server";
import { ensureData, queryArrangements, SyncInProgressError } from "@/lib/conditional-arrangements-db";

export async function GET(req: NextRequest) {
  // Ensure DB is populated.
  // On first deploy (empty DB): ensureData() starts a background sync and
  // throws SyncInProgressError immediately — we return 503 + Retry-After so
  // Render's proxy never times out waiting for the ~65 s initial CKAN fetch.
  // On subsequent requests (DB populated): returns normally in <1 ms.
  try {
    await ensureData();
  } catch (err) {
    if (err instanceof SyncInProgressError) {
      return NextResponse.json(
        { error: "הנתונים נטענים לראשונה, נסו שוב בעוד דקה." },
        { status: 503, headers: { "Retry-After": "60" } },
      );
    }
    console.error("conditional-arrangements: ensureData failed:", err);
    return NextResponse.json(
      { error: "נכשלה האינדוקסציה הראשונית של הנתונים. נסו שוב בעוד כמה דקות." },
      { status: 503, headers: { "Retry-After": "60" } },
    );
  }

  try {
    const body = await queryArrangements(req.nextUrl.searchParams);
    return NextResponse.json(body, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=3600",
        "X-Data-Source": "database",
      },
    });
  } catch (err) {
    console.error("conditional-arrangements: query error:", err);
    // Temporarily expose the actual error for diagnosis. Remove after root cause confirmed.
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "שגיאה בשאילתת הנתונים", _debug: detail }, { status: 500 });
  }
}
