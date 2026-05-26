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
    const description = await fetchArrangementDetail(source as ArrangementSource, ckanId);
    if (description === null) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json(
      { description },
      { headers: { "Cache-Control": "public, max-age=3600" } },
    );
  } catch (err) {
    console.error("conditional-arrangements detail error:", err);
    return NextResponse.json({ error: "upstream error" }, { status: 502 });
  }
}
