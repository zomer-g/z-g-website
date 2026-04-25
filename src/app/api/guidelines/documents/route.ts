import { NextRequest, NextResponse } from "next/server";
import type {
  Guideline,
  GuidelinesListResponse,
  UpstreamGuidelinesListResponse,
} from "@/types/guideline";
import { getCached, setCached } from "@/lib/guidelines-cache";
import { getPageContent } from "@/lib/content";
import type { GuidelinesPageContent } from "@/types/content";

const UPSTREAM = "https://tag-it.biz/api/public/over-guidelines/documents";

const UPSTREAM_PARAMS = ["q", "date_from", "date_to", "topic", "directive_number"] as const;

const UPSTREAM_LIMIT = 500;

const DEFAULT_TTL_MINUTES = 60;
const MIN_TTL_MINUTES = 1;
const MAX_TTL_MINUTES = 1440;

function getApiKey(): string | undefined {
  return process.env.GUIDELINES_API_KEY || process.env.CLASS_ACTION_API_KEY;
}

function buildUpstreamQuery(params: URLSearchParams): string {
  const out = new URLSearchParams();
  for (const k of UPSTREAM_PARAMS) {
    const v = params.get(k);
    if (v != null && v !== "") out.set(k, v);
  }
  out.set("limit", String(UPSTREAM_LIMIT));
  out.set("skip", "0");
  return out.toString();
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

export async function GET(req: NextRequest) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "API not configured" }, { status: 503 });
  }

  const params = req.nextUrl.searchParams;
  const skip = clampInt(params.get("skip"), 0, 0);
  const limit = Math.min(100, Math.max(1, clampInt(params.get("limit"), 1, 20)));

  const upstreamQs = buildUpstreamQuery(params);
  const cacheKey = upstreamQs;

  let allItems = getCached(cacheKey);
  let cacheStatus = allItems ? "HIT" : "MISS";

  if (!allItems) {
    try {
      const [upstream, ttlMs] = await Promise.all([
        fetch(`${UPSTREAM}?${upstreamQs}`, {
          headers: { "X-API-Key": apiKey, Accept: "application/json" },
          cache: "no-store",
        }),
        readTtlMs(),
      ]);

      if (!upstream.ok) {
        return NextResponse.json(
          { error: "Upstream error" },
          { status: upstream.status === 401 ? 502 : upstream.status }
        );
      }

      const json = (await upstream.json()) as UpstreamGuidelinesListResponse;
      const cleanedItems: Guideline[] = (json.items || []).map((it) => {
        const rest = { ...(it as unknown as Record<string, unknown>) };
        // Strip URLs that embed the upstream API key. csv_row and over_*
        // provenance fields are kept for the metadata view.
        delete rest.file_url;
        delete rest.text_url;
        return rest as unknown as Guideline;
      });

      setCached(cacheKey, cleanedItems, ttlMs);
      allItems = cleanedItems;
      cacheStatus = "MISS";
    } catch (err) {
      console.error("guidelines proxy error:", err);
      return NextResponse.json({ error: "Upstream fetch failed" }, { status: 502 });
    }
  }

  const filtered = applySourceFilter(allItems, params);
  const page = filtered.slice(skip, skip + limit);

  const body: GuidelinesListResponse = {
    total: filtered.length,
    skip,
    limit,
    items: page,
  };

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      "X-Cache": cacheStatus,
    },
  });
}
