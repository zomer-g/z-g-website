import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCached } from "@/lib/class-actions-cache";
import {
  fetchAllUpstreamClassActions,
  stripClassActionUrls,
} from "@/lib/class-actions-upstream";
import { computeSchemaFromItems } from "@/lib/schema-from-items";

/**
 * Admin-only field schema for the class-actions data, computed from a sample
 * of the actual documents. Lets the Site Editor offer the same searchable
 * field list as the rulings pages (which get their schema from TAG-IT).
 */
export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "נדרשת הזדהות" }, { status: 401 });
  }

  if (!process.env.CLASS_ACTION_API_KEY) {
    return NextResponse.json(
      { error: "CLASS_ACTION_API_KEY not configured" },
      { status: 503 },
    );
  }

  try {
    // Prefer the full cache if a visitor already populated it; otherwise
    // fetch only a SAMPLE (first page) — enough to infer the field list
    // without loading the whole corpus into memory (avoids 512MB OOM).
    let items = getCached("");
    if (!items) {
      const raw = await fetchAllUpstreamClassActions({
        filters: {},
        sampleOnly: true,
      });
      if (raw === null) {
        return NextResponse.json({ error: "Upstream fetch failed" }, { status: 502 });
      }
      // Don't cache the partial sample under the documents key — it would
      // serve truncated data to the public listing.
      items = stripClassActionUrls(raw);
    }

    const fields = computeSchemaFromItems(
      items as unknown as Array<Record<string, unknown>>,
      { source: "doc" },
    );
    return NextResponse.json(
      { source: "class-actions", count: items.length, fields },
      { headers: { "Cache-Control": "private, max-age=60" } },
    );
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("class-actions schema error:", detail);
    return NextResponse.json({ error: "Schema computation failed", detail }, { status: 502 });
  }
}
