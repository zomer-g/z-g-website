import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { secretMatches } from "@/lib/shared-secret";

// Warm the sanegoria cache by hitting the API with common filter combinations.
// Called by an external scheduler every 12 hours.
//
// Not open to anyone: each call fans out into five of the heaviest queries the
// site runs, against itself, with a five-minute budget — an unauthenticated
// warm endpoint is a request-amplification lever, not a convenience. The
// scheduler sends the x-cron-secret header (CRON_SECRET, the same scheme as
// /api/guidelines/embed); an admin session works too, for a manual warm.

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes

async function isAuthorized(req: NextRequest): Promise<boolean> {
  if (secretMatches(req.headers.get("x-cron-secret"), process.env.CRON_SECRET)) return true;
  const session = await auth();
  return session?.user?.role === "ADMIN";
}

export async function GET(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  // Always use the public URL for self-calls (internal fetch to localhost
  // doesn't work reliably inside the container)
  const origin = process.env.SITE_URL || "https://www.z-g.co.il";
  const start = Date.now();

  // Common filter combinations that users are likely to hit
  const combos = [
    "",                             // No filters (most common)
    "?filters=1",                   // Filter options
    "?yearMin=2024&yearMax=2024",   // Current year
    "?yearMin=2023&yearMax=2023",   // Previous year
    "?yearMin=2022&yearMax=2025",   // All years
  ];

  const results: { url: string; ms: number; ok: boolean; status?: number; error?: string }[] = [];

  for (const combo of combos) {
    const t0 = Date.now();
    try {
      const res = await fetch(`${origin}/api/sanegoria${combo}`, {
        cache: "no-store",
        headers: { "x-cache-warm": "1" },
      });
      results.push({ url: combo, ms: Date.now() - t0, ok: res.ok, status: res.status });
    } catch (err) {
      // The reason stays in the server log; the caller only learns it failed.
      console.error(`[sanegoria/warm] ${combo || "(no filters)"} failed:`, err);
      results.push({ url: combo, ms: Date.now() - t0, ok: false, error: "fetch failed" });
    }
  }

  return NextResponse.json({
    totalMs: Date.now() - start,
    results,
  });
}
