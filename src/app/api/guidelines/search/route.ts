import { NextRequest, NextResponse } from "next/server";
import type { Guideline, UpstreamGuidelinesListResponse } from "@/types/guideline";
import { getCached, setCached, findUnfilteredKey } from "@/lib/guidelines-cache";
import { getPageContent } from "@/lib/content";
import type { GuidelinesPageContent } from "@/types/content";
import {
  embedText,
  OpenAIEmbeddingsError,
} from "@/lib/openai-embeddings";
import { semanticSearch } from "@/lib/guidelines-embeddings";

const UPSTREAM = "https://tag-it.biz/api/public/over-guidelines/documents";
const UPSTREAM_LIMIT = 500;
const TOPK_SEMANTIC = 100;

const DEFAULT_TTL_MINUTES = 60;
const MIN_TTL_MINUTES = 1;
const MAX_TTL_MINUTES = 1440;

function getApiKey(): string | undefined {
  return process.env.GUIDELINES_API_KEY || process.env.CLASS_ACTION_API_KEY;
}

async function readTtlMs(): Promise<number> {
  try {
    const content = await getPageContent<GuidelinesPageContent>("guidelines");
    const raw = Number(content?.cacheTtlMinutes);
    if (!Number.isFinite(raw)) return DEFAULT_TTL_MINUTES * 60_000;
    return Math.max(MIN_TTL_MINUTES, Math.min(MAX_TTL_MINUTES, raw)) * 60_000;
  } catch {
    return DEFAULT_TTL_MINUTES * 60_000;
  }
}

async function ensureItemsCache(): Promise<Guideline[] | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const existingKey = findUnfilteredKey();
  if (existingKey) {
    const cached = getCached(existingKey);
    if (cached) return cached;
  }

  const qs = new URLSearchParams({ limit: String(UPSTREAM_LIMIT), skip: "0" }).toString();
  const [upstream, ttlMs] = await Promise.all([
    fetch(`${UPSTREAM}?${qs}`, {
      headers: { "X-API-Key": apiKey, Accept: "application/json" },
      cache: "no-store",
    }),
    readTtlMs(),
  ]);
  if (!upstream.ok) return null;
  const json = (await upstream.json()) as UpstreamGuidelinesListResponse;
  const cleaned: Guideline[] = (json.items || []).map((it) => {
    const rest = { ...(it as unknown as Record<string, unknown>) };
    delete rest.file_url;
    delete rest.text_url;
    return rest as unknown as Guideline;
  });
  setCached(qs, cleaned, ttlMs);
  return cleaned;
}

function clampInt(v: string | null, min: number, fallback: number): number {
  if (v == null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(min, Math.floor(n)) : fallback;
}

function dateInRange(s: string | null | undefined, from: string | null, to: string | null): boolean {
  if (!s) return !from && !to;
  if (from && s < from) return false;
  if (to && s > to) return false;
  return true;
}

export async function GET(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "Semantic search not configured" }, { status: 503 });
  }

  const params = req.nextUrl.searchParams;
  const q = params.get("q")?.trim() ?? "";
  if (!q) {
    return NextResponse.json({ error: "Missing q" }, { status: 400 });
  }

  const skip = clampInt(params.get("skip"), 0, 0);
  const limit = Math.min(100, Math.max(1, clampInt(params.get("limit"), 1, 20)));
  const dateFrom = params.get("date_from") || null;
  const dateTo = params.get("date_to") || null;
  const sourceFilter = new Set(params.getAll("source").filter(Boolean));

  // 1. Embed the query.
  let queryVector: number[];
  try {
    queryVector = await embedText(q);
  } catch (err) {
    if (err instanceof OpenAIEmbeddingsError) {
      return NextResponse.json(
        { error: "Embedding failed" },
        { status: err.status === 401 || err.status === 503 ? 503 : 502 },
      );
    }
    return NextResponse.json({ error: "Embedding failed" }, { status: 502 });
  }

  // 2. Top-K by cosine similarity over the cached embedding set.
  const hits = await semanticSearch(queryVector, TOPK_SEMANTIC);
  if (hits.length === 0) {
    return NextResponse.json({ total: 0, skip, limit, items: [], scores: [] });
  }

  // 3. Pull metadata for those ids from the documents cache (warm it if needed).
  const allItems = await ensureItemsCache();
  if (!allItems) {
    return NextResponse.json(
      { error: "Upstream metadata unavailable" },
      { status: 502 },
    );
  }
  const byId = new Map<number, Guideline>();
  for (const it of allItems) byId.set(it.id, it);

  // 4. Build the ranked list, applying the optional filters in score order.
  const ranked: { doc: Guideline; score: number }[] = [];
  for (const hit of hits) {
    const doc = byId.get(hit.id);
    if (!doc) continue;
    if (sourceFilter.size > 0 && !sourceFilter.has(doc.source_label)) continue;
    if (!dateInRange(doc.document_date, dateFrom, dateTo)) continue;
    ranked.push({ doc, score: hit.score });
  }

  const page = ranked.slice(skip, skip + limit);

  return NextResponse.json({
    total: ranked.length,
    skip,
    limit,
    items: page.map((r) => r.doc),
    scores: page.map((r) => Number(r.score.toFixed(4))),
  });
}
