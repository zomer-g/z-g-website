import { NextRequest, NextResponse } from "next/server";
import type { ClassActionDocument, ClassActionListResponse } from "@/types/class-action";
import { getCached, setCached } from "@/lib/class-actions-cache";
import { getPageContent } from "@/lib/content";
import type { ClassActionsPageContent } from "@/types/content";

const UPSTREAM = "https://tag-it.biz/api/public/class-action/documents";

// Upstream params we forward to tag-it.biz as-is.
const UPSTREAM_PARAMS = ["date_from", "date_to", "court", "is_appeal", "case_number"] as const;

// Always fetch a generous window so post-filters have plenty to work on.
const UPSTREAM_LIMIT = 500;

const DEFAULT_TTL_MINUTES = 60;
const MIN_TTL_MINUTES = 1;
const MAX_TTL_MINUTES = 1440;

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
    const content = await getPageContent<ClassActionsPageContent>("class-actions");
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

// Hebrew + Latin: lowercase + strip diacritics + collapse whitespace.
function norm(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .toLocaleLowerCase("he-IL")
    .normalize("NFKD")
    .replace(/[֑-ׇ]/g, "") // strip Hebrew niqqud
    .replace(/\s+/g, " ")
    .trim();
}

function applyPostFilters(items: ClassActionDocument[], params: URLSearchParams): ClassActionDocument[] {
  const q = norm(params.get("q"));
  const isAttachment = params.get("is_attachment"); // "true" | "false" | null
  const claimMinRaw = params.get("claim_min");
  const claimMaxRaw = params.get("claim_max");
  const claimMin = claimMinRaw != null && claimMinRaw !== "" ? Number(claimMinRaw) : null;
  const claimMax = claimMaxRaw != null && claimMaxRaw !== "" ? Number(claimMaxRaw) : null;

  if (!q && isAttachment == null && claimMin == null && claimMax == null) {
    return items;
  }

  return items.filter((it) => {
    if (isAttachment === "true" && !it.is_attachment) return false;
    if (isAttachment === "false" && it.is_attachment) return false;

    if (claimMin != null && Number.isFinite(claimMin) && (it.claim_amount ?? 0) < claimMin) return false;
    if (claimMax != null && Number.isFinite(claimMax) && (it.claim_amount ?? 0) > claimMax) return false;

    if (q) {
      const haystack = [
        it.case_name,
        it.case_number,
        it.class_definition,
        it.legal_question,
        it.requested_aid,
        it.document_title,
      ]
        .map(norm)
        .join(" \n ");
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

export async function GET(req: NextRequest) {
  const apiKey = process.env.CLASS_ACTION_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API not configured" }, { status: 503 });
  }

  const params = req.nextUrl.searchParams;
  const skip = clampInt(params.get("skip"), 0, 0);
  const limit = Math.min(100, Math.max(1, clampInt(params.get("limit"), 1, 20)));

  const upstreamQs = buildUpstreamQuery(params);
  const cacheKey = upstreamQs;

  let allItems: ClassActionDocument[] | null = null;
  let cacheStatus = "MISS";
  const cached = getCached(cacheKey);
  if (cached) {
    allItems = cached.items;
    cacheStatus = "HIT";
  }

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

      const json = (await upstream.json()) as ClassActionListResponse;
      const cleanedItems: ClassActionDocument[] = (json.items || []).map((it) => {
        const rest = { ...(it as unknown as Record<string, unknown>) };
        delete rest.file_url;
        return rest as unknown as ClassActionDocument;
      });

      const cachedShape: ClassActionListResponse = {
        total: cleanedItems.length,
        skip: 0,
        limit: cleanedItems.length,
        items: cleanedItems,
      };
      setCached(cacheKey, cachedShape, ttlMs);
      allItems = cleanedItems;
    } catch (err) {
      console.error("class-actions proxy error:", err);
      return NextResponse.json({ error: "Upstream fetch failed" }, { status: 502 });
    }
  }

  const filtered = applyPostFilters(allItems, params);
  const page = filtered.slice(skip, skip + limit);

  const body: ClassActionListResponse = {
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
