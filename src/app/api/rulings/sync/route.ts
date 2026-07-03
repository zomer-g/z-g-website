/**
 * TAG-IT mirror sync — manual trigger + status.
 *
 * POST ?mode=full|incremental — kicks a sync in the background and returns
 * immediately (the run continues in-process; Render web services are
 * long-lived). Admin session required, or the x-sync-secret header matching
 * MIRROR_SYNC_SECRET (for an external cron / curl).
 *
 * GET — sync state per scope (admin only).
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  syncAllScopes,
  isSyncRunning,
  mirrorStates,
} from "@/lib/rulings-mirror";

async function isAuthorized(req: NextRequest): Promise<boolean> {
  const secret = process.env.MIRROR_SYNC_SECRET;
  if (secret && req.headers.get("x-sync-secret") === secret) return true;
  const session = await auth();
  return session?.user?.role === "ADMIN";
}

export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: "נדרשת הזדהות" }, { status: 401 });
  }
  const mode =
    new URL(req.url).searchParams.get("mode") === "full"
      ? ("full" as const)
      : ("incremental" as const);
  if (isSyncRunning()) {
    return NextResponse.json({ started: false, running: true, mode });
  }
  // Fire and forget — progress is visible via GET.
  syncAllScopes(mode).catch((err) =>
    console.error("rulings-mirror: manual sync failed:", err),
  );
  return NextResponse.json({ started: true, mode });
}

export async function GET(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: "נדרשת הזדהות" }, { status: 401 });
  }
  return NextResponse.json({
    running: isSyncRunning(),
    scopes: await mirrorStates(),
  });
}
