import { NextRequest, NextResponse } from "next/server";
import type { ArrangementSource } from "@/types/conditional-arrangement";
import { fetchArrangementDetail } from "@/lib/conditional-arrangements-upstream";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const source = params.get("source");
  const rawId = params.get("id");

  if (!source || !rawId || !["police", "prosecutor"].includes(source)) {
    return NextResponse.json({ error: "invalid params" }, { status: 400 });
  }

  const ckanId = Number(rawId);
  if (!Number.isFinite(ckanId) || ckanId <= 0) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  try {
    // Fetch the full description directly from CKAN for this single record.
    // The DB stores only a 300-char snippet (for the card display); the full
    // text is fetched on-demand here so we don't hold ~5 KB × 33 k records
    // in the database during the weekly bulk sync.
    const description = await fetchArrangementDetail(
      source as ArrangementSource,
      ckanId,
    );
    if (description === null) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json(
      { description },
      // Cache per-record — full text never changes between weekly syncs.
      { headers: { "Cache-Control": "public, max-age=86400" } },
    );
  } catch (err) {
    console.error("conditional-arrangements detail error:", err);
    return NextResponse.json({ error: "שגיאה בשליפת הפרטים" }, { status: 500 });
  }
}
