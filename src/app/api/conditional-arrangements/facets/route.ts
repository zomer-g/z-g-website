import { NextResponse } from "next/server";
import { getFacets, ensureData, SyncInProgressError } from "@/lib/conditional-arrangements-db";

/**
 * GET /api/conditional-arrangements/facets
 *
 * Returns all distinct district and offense values across the full dataset.
 * The result is cached server-side (unstable_cache tag: "ca-facets") and
 * only recomputed after a weekly CKAN sync completes.
 *
 * The client fetches this once on mount and reuses the values for all
 * filter interactions — dropdown options do not change mid-session.
 */
export async function GET() {
  try {
    await ensureData();
  } catch (err) {
    if (err instanceof SyncInProgressError) {
      return NextResponse.json(
        { districts: [], offenses: [] },
        { status: 200 }, // return empty facets (not 503) so dropdowns render without crashing
      );
    }
    return NextResponse.json({ districts: [], offenses: [] }, { status: 200 });
  }

  try {
    const facets = await getFacets();
    return NextResponse.json(facets, {
      headers: {
        // Long CDN TTL — facets are stable between weekly syncs.
        // stale-while-revalidate allows serving stale content while revalidating.
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    console.error("conditional-arrangements: facets error:", err);
    return NextResponse.json({ districts: [], offenses: [] }, { status: 200 });
  }
}
