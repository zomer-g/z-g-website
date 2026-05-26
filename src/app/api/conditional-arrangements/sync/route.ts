/**
 * Admin endpoint to force a full re-sync of conditional arrangements from CKAN.
 * POST /api/conditional-arrangements/sync
 *
 * Requires ADMIN role. Used to manually trigger a sync without waiting for the
 * weekly automatic version-check, e.g. right after a new ODATA dataset is published.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { forceSync } from "@/lib/conditional-arrangements-db";

export async function POST(_req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const t0 = Date.now();
    const counts = await forceSync();
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    return NextResponse.json({
      ok: true,
      elapsed: `${elapsed}s`,
      police: counts.police,
      prosecutor: counts.prosecutor,
      total: counts.police + counts.prosecutor,
    });
  } catch (err) {
    console.error("ca-sync forced sync error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
