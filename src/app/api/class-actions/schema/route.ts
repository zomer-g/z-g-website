import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCached, setCached } from "@/lib/class-actions-cache";
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
    // Reuse the unfiltered cache if present; otherwise fetch + cache.
    let items = getCached("");
    if (!items) {
      const raw = await fetchAllUpstreamClassActions({ filters: {} });
      if (raw === null) {
        return NextResponse.json({ error: "Upstream fetch failed" }, { status: 502 });
      }
      items = stripClassActionUrls(raw);
      setCached("", items, 60 * 60_000);
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
