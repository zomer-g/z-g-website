import { NextRequest, NextResponse } from "next/server";
import type { ArrangementSource } from "@/types/conditional-arrangement";
import { getArrangementDescription } from "@/lib/conditional-arrangements-db";

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
    const description = await getArrangementDescription(
      source as ArrangementSource,
      ckanId,
    );
    if (description === null) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json(
      { description },
      // Full text stored in DB — cache aggressively, it never changes mid-week
      { headers: { "Cache-Control": "public, max-age=86400" } },
    );
  } catch (err) {
    console.error("conditional-arrangements detail error:", err);
    return NextResponse.json({ error: "שגיאה בשליפת הפרטים" }, { status: 500 });
  }
}
