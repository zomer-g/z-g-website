import { NextRequest, NextResponse } from "next/server";

// Warm the sanegoria cache by hitting the API with common filter combinations.
// Called by Render cron or external scheduler every 12 hours.
// Safe to call anonymously — just triggers cache population.

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes

export async function GET(_req: NextRequest) {
  // Always use the public URL for self-calls (internal fetch to localhost
  // doesn't work reliably inside the Render container)
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
      results.push({
        url: combo,
        ms: Date.now() - t0,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({
    totalMs: Date.now() - start,
    results,
  });
}
