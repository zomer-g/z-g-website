import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCached, setCached, UNFILTERED_KEY } from "@/lib/guidelines-cache";
import {
  fetchAllUpstreamGuidelines,
  getGuidelinesApiKey,
  stripUrls,
} from "@/lib/guidelines-upstream";
import { computeSchemaFromItems } from "@/lib/schema-from-items";

/**
 * Admin-only field schema for the guidelines data, computed from a sample of
 * the actual documents — same purpose as the class-actions schema route.
 */
export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "נדרשת הזדהות" }, { status: 401 });
  }

  if (!getGuidelinesApiKey()) {
    return NextResponse.json(
      { error: "GUIDELINES_API_KEY not configured" },
      { status: 503 },
    );
  }

  try {
    let items = getCached(UNFILTERED_KEY);
    if (!items) {
      const raw = await fetchAllUpstreamGuidelines();
      if (raw === null) {
        return NextResponse.json({ error: "Upstream fetch failed" }, { status: 502 });
      }
      items = stripUrls(raw);
      setCached(UNFILTERED_KEY, items, 60 * 60_000);
    }

    const fields = computeSchemaFromItems(
      items as unknown as Array<Record<string, unknown>>,
      { source: "doc" },
    );
    return NextResponse.json(
      { source: "guidelines", count: items.length, fields },
      { headers: { "Cache-Control": "private, max-age=60" } },
    );
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("guidelines schema error:", detail);
    return NextResponse.json({ error: "Schema computation failed", detail }, { status: 502 });
  }
}
