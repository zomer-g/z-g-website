import { NextRequest, NextResponse } from "next/server";
import type {
  ConditionalArrangement,
  ArrangementsResponse,
} from "@/types/conditional-arrangement";
import {
  getCachedArrangements,
  setCachedArrangements,
} from "@/lib/conditional-arrangements-cache";
import { fetchAllArrangements } from "@/lib/conditional-arrangements-upstream";
import { getPageContent } from "@/lib/content";
import type { ConditionalArrangementsPageContent } from "@/types/content";

const DEFAULT_TTL_MINUTES = 60;
const MIN_TTL_MINUTES = 1;
const MAX_TTL_MINUTES = 10080; // 1 week
const CACHE_KEY = "all";

async function readTtlMs(): Promise<number> {
  try {
    const content = await getPageContent<ConditionalArrangementsPageContent>(
      "conditional-arrangements",
    );
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

function norm(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .toLocaleLowerCase("he-IL")
    .normalize("NFKD")
    .replace(/[֑-ׇ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function applyFilters(
  items: ConditionalArrangement[],
  params: URLSearchParams,
): ConditionalArrangement[] {
  const source = params.get("source"); // "police" | "prosecutor" | "all" | null
  const q = norm(params.get("q"));
  const dateFrom = params.get("date_from") ?? "";
  const dateTo = params.get("date_to") ?? "";
  const district = norm(params.get("district"));
  const offense = norm(params.get("offense"));

  return items.filter((item) => {
    // Source filter
    if (source && source !== "all" && item.source !== source) return false;

    // Date range
    if (dateFrom && item.date && item.date < dateFrom) return false;
    if (dateTo && item.date && item.date > dateTo) return false;

    // District (normalised substring match)
    if (district) {
      if (!item.district || !norm(item.district).includes(district)) return false;
    }

    // Offense (normalised substring match)
    if (offense) {
      if (!item.offense || !norm(item.offense).includes(offense)) return false;
    }

    // Free-text: split into AND terms — every term must appear somewhere in the
    // combined haystack: raw fields + extracted offense + district.
    // offense and district are extracted separately from raw and must be
    // searched explicitly so e.g. "גניבה" (offense text) + "פלאפון" (in תיאור)
    // works as an AND query.
    if (q) {
      const terms = q.split(/\s+/).filter(Boolean);
      const haystack = [
        ...Object.values(item.raw),
        item.offense ?? "",
        item.district ?? "",
      ].map(norm).join(" ");
      if (!terms.every((t) => haystack.includes(t))) return false;
    }

    return true;
  });
}

function buildFacets(items: ConditionalArrangement[]): {
  districts: string[];
  offenses: string[];
} {
  const districts = new Set<string>();
  const offenses = new Set<string>();
  for (const item of items) {
    if (item.district) districts.add(item.district);
    if (item.offense) offenses.add(item.offense);
  }
  return {
    districts: [...districts].sort((a, b) => a.localeCompare(b, "he")),
    offenses: [...offenses].sort((a, b) => a.localeCompare(b, "he")),
  };
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const skip = clampInt(params.get("skip"), 0, 0);
  const limit = Math.min(100, Math.max(1, clampInt(params.get("limit"), 1, 24)));
  const sortParam = params.get("sort");
  const sortAsc = sortParam === "date_asc";

  // Fetch from cache or upstream
  let allItems = getCachedArrangements(CACHE_KEY);
  let cacheStatus = allItems ? "HIT" : "MISS";

  if (!allItems) {
    try {
      const [rawItems, ttlMs] = await Promise.all([
        fetchAllArrangements(),
        readTtlMs(),
      ]);

      if (rawItems === null) {
        return NextResponse.json(
          { error: "נכשלה שליפת הנתונים מ-over.org.il" },
          { status: 502 },
        );
      }

      setCachedArrangements(CACHE_KEY, rawItems, ttlMs);
      allItems = rawItems;
      cacheStatus = "MISS";
    } catch (err) {
      console.error("conditional-arrangements proxy error:", err);
      return NextResponse.json(
        { error: "שגיאה בשליפת הנתונים" },
        { status: 502 },
      );
    }
  }

  // Apply filters
  let filtered = applyFilters(allItems, params);

  // Sort (allItems already sorted date_desc from upstream; only re-sort for asc)
  if (sortAsc) {
    filtered = [...filtered].sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date.localeCompare(b.date);
    });
  }

  // Compute facets from filtered set (so dropdowns reflect current results)
  const facets = buildFacets(filtered);

  // Paginate
  const page = filtered.slice(skip, skip + limit);

  const body: ArrangementsResponse = {
    total: filtered.length,
    skip,
    limit,
    records: page,
    facets,
  };

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=3600",
      "X-Cache": cacheStatus,
    },
  });
}
