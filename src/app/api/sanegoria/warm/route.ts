import { NextRequest, NextResponse } from "next/server";

// Warm the sanegoria cache by hitting the API with common filter combinations.
// Called by Render cron or external scheduler every 12 hours.
// Safe to call anonymously — just triggers cache population.

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const start = Date.now();

  // Common filter combinations that users are likely to hit
  const combos = [
    "",                             // No filters (most common)
    "?filters=1",                   // Filter options
    "?yearMin=2024&yearMax=2024",   // Current year
    "?yearMin=2023&yearMax=2023",   // Previous year
    "?yearMin=2022&yearMax=2025",   // All years
  ];

  const results: { url: string; ms: number; ok: boolean }[] = [];

  for (const combo of combos) {
    const t0 = Date.now();
    try {
      const res = await fetch(`${origin}/api/sanegoria${combo}`, {
        cache: "no-store",
        headers: { "x-cache-warm": "1" },
      });
      results.push({ url: combo, ms: Date.now() - t0, ok: res.ok });
    } catch {
      results.push({ url: combo, ms: Date.now() - t0, ok: false });
    }
  }

  return NextResponse.json({
    totalMs: Date.now() - start,
    results,
  });
}
