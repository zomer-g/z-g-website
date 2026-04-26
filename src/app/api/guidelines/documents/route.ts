import { NextRequest, NextResponse } from "next/server";
import type { Guideline, GuidelinesListResponse } from "@/types/guideline";
import { getCached, setCached } from "@/lib/guidelines-cache";
import { getPageContent } from "@/lib/content";
import type { GuidelinesPageContent } from "@/types/content";
import {
  fetchAllUpstreamGuidelines,
  getGuidelinesApiKey,
  stripUrls,
} from "@/lib/guidelines-upstream";

const UPSTREAM_PARAMS = ["q", "date_from", "date_to", "topic", "directive_number"] as const;

const DEFAULT_TTL_MINUTES = 60;
const MIN_TTL_MINUTES = 1;
const MAX_TTL_MINUTES = 1440;

// Cache key represents a unique upstream filter combination — pagination is
// owned by us, so skip/limit are not part of the key.
function buildCacheKey(params: URLSearchParams): string {
  const out = new URLSearchParams();
  for (const k of UPSTREAM_PARAMS) {
    const v = params.get(k);
    if (v != null && v !== "") out.set(k, v);
  }
  return out.toString();
}

function buildUpstreamFilters(params: URLSearchParams): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of UPSTREAM_PARAMS) {
    const v = params.get(k);
    if (v != null && v !== "") out[k] = v;
  }
  return out;
}

async function readTtlMs(): Promise<number> {
  try {
    const content = await getPageContent<GuidelinesPageContent>("guidelines");
    const raw = Number(content?.cacheTtlMinutes);
    if (!Number.isFinite(raw)) return DEFAULT_TTL_MINUTES * 60_000;
    const clamped = Math.max(MIN_TTL_MINUTES, Math.min(MAX_TTL_MINUTES, raw));
    return clamped * 60_000;
  } catch {
    return DEFAULT_TTL_MINUTES * 60_000;
  }
}

function clampInt(v: string | null, min: number, fallback: number): number {
  if (v == null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(min, Math.floor(n)) : fallback;
}

function applySourceFilter(items: Guideline[], params: URLSearchParams): Guideline[] {
  const sources = params.getAll("source").filter((s) => s.trim() !== "");
  if (sources.length === 0) return items;
  const set = new Set(sources);
  return items.filter((it) => set.has(it.source_label));
}

interface SourceFacet {
  label: string;
  count: number;
}

// Drilldown-style facet: counts reflect what's left after every filter EXCEPT
// the source filter — so the user can see "if I add source X on top of my
// current filters, I'd get N results".
function computeSourceFacets(items: Guideline[]): SourceFacet[] {
  const counts = new Map<string, number>();
  for (const it of items) {
    const label = (it.source_label || "").trim();
    if (!label) continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "he"));
}

export async function GET(req: NextRequest) {
  const apiKey = getGuidelinesApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "API not configured" }, { status: 503 });
  }

  const params = req.nextUrl.searchParams;
  const skip = clampInt(params.get("skip"), 0, 0);
  const limit = Math.min(100, Math.max(1, clampInt(params.get("limit"), 1, 20)));

  const cacheKey = buildCacheKey(params);
  let allItems = getCached(cacheKey);
  let cacheStatus = allItems ? "HIT" : "MISS";

  if (!allItems) {
    try {
      const [rawItems, ttlMs] = await Promise.all([
        fetchAllUpstreamGuidelines({ filters: buildUpstreamFilters(params) }),
        readTtlMs(),
      ]);

      if (rawItems === null) {
        return NextResponse.json(
          { error: "Upstream fetch failed" },
          { status: 502 },
        );
      }

      const cleanedItems = stripUrls(rawItems);
      setCached(cacheKey, cleanedItems, ttlMs);
      allItems = cleanedItems;
      cacheStatus = "MISS";
    } catch (err) {
      console.error("guidelines proxy error:", err);
      return NextResponse.json({ error: "Upstream fetch failed" }, { status: 502 });
    }
  }

  // Compute facets BEFORE applying the source filter so the pills always
  // reflect what's available given the user's other filters.
  const facets = { sources: computeSourceFacets(allItems) };

  const filtered = applySourceFilter(allItems, params);
  const page = filtered.slice(skip, skip + limit);

  const body: GuidelinesListResponse & { facets: typeof facets } = {
    total: filtered.length,
    skip,
    limit,
    items: page,
    facets,
  };

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=3600",
      "X-Cache": cacheStatus,
    },
  });
}
