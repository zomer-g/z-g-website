/**
 * Admin endpoint to sync conditional arrangements from CKAN.
 * POST /api/conditional-arrangements/sync
 * POST /api/conditional-arrangements/sync?force=true   (re-downloads ALL records)
 *
 * Without ?force (default): version-check only — syncs sources whose CKAN UUID
 * changed, or sources never synced (e.g. a newly added dataset). Fast (~5-10s).
 *
 * With ?force=true: full re-download of all sources regardless of version.
 * Slow (~65s); use after major upstream data fixes.
 *
 * Requires ADMIN role.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { forceSync, syncVersionCheck } from "@/lib/conditional-arrangements-db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const force = req.nextUrl.searchParams.get("force") === "true";

  try {
    const t0 = Date.now();
    const counts = force ? await forceSync() : await syncVersionCheck();
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    return NextResponse.json({
      ok: true,
      mode: force ? "force" : "version-check",
      elapsed: `${elapsed}s`,
      police: counts.police,
      prosecutor: counts.prosecutor,
      labor: counts.labor,
      total: counts.police + counts.prosecutor + counts.labor,
    });
  } catch (err) {
    console.error("ca-sync forced sync error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
