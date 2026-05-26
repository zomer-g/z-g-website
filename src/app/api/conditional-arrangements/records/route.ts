import { NextRequest, NextResponse } from "next/server";
import { ensureData, queryArrangements } from "@/lib/conditional-arrangements-db";

export async function GET(req: NextRequest) {
  // Ensure DB is populated. On first deploy (empty DB) this blocks until
  // the initial CKAN sync completes; subsequent calls return immediately
  // (DB already has data) and schedule a background version-check if the
  // last check was more than a week ago.
  try {
    await ensureData();
  } catch (err) {
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
    return NextResponse.json({ error: "שגיאה בשאילתת הנתונים" }, { status: 500 });
  }
}
