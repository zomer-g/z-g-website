import { NextRequest, NextResponse } from "next/server";
import type { Guideline } from "@/types/guideline";
import {
  getCached,
  setCached,
  findUnfilteredKey,
  UNFILTERED_KEY,
} from "@/lib/guidelines-cache";
import { getPageContent } from "@/lib/content";
import type { GuidelinesPageContent } from "@/types/content";
import {
  embedQuery,
  OpenAIEmbeddingsError,
} from "@/lib/openai-embeddings";
import {
  semanticChunkSearch,
  substringChunkSearch,
  fuseRankings,
  getCachedChunks,
  computeRelevance,
  type RankedDoc,
} from "@/lib/guidelines-embeddings";
import {
  parseQuery,
  flattenForEmbedding,
  collectTerms,
  isBareSingleWord,
  hasPhrase,
} from "@/lib/guidelines-query";
import {
  fetchAllUpstreamGuidelines,
  getGuidelinesApiKey,
  stripUrls,
} from "@/lib/guidelines-upstream";

const TOPK_PER_METHOD = 200;

const DEFAULT_TTL_MINUTES = 60;
const MIN_TTL_MINUTES = 1;
const MAX_TTL_MINUTES = 1440;

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
  if (!getGuidelinesApiKey()) return null;

  const existingKey = findUnfilteredKey();
  if (existingKey) {
    const cached = getCached(existingKey);
    if (cached) return cached;
  }

  const [rawItems, ttlMs] = await Promise.all([
    fetchAllUpstreamGuidelines(),
    readTtlMs(),
  ]);
  if (rawItems === null) return null;
  const cleaned = stripUrls(rawItems);
  setCached(UNFILTERED_KEY, cleaned, ttlMs);
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

// Build a short snippet around the first match of any query term inside the
// chunk text. Falls back to the start of the chunk when no term matches.
function buildSnippet(text: string, queryTerms: string[], maxLen = 280): string {
  if (!text) return "";
  if (text.length <= maxLen) return text;

  const lower = text.toLocaleLowerCase("he-IL");
  let firstMatch = -1;
  for (const term of queryTerms) {
    if (term.length < 2) continue;
    const idx = lower.indexOf(term.toLocaleLowerCase("he-IL"));
    if (idx !== -1 && (firstMatch === -1 || idx < firstMatch)) firstMatch = idx;
  }

  if (firstMatch === -1) return text.slice(0, maxLen).trim() + "…";
  const start = Math.max(0, firstMatch - 60);
  const end = Math.min(text.length, start + maxLen);
  const slice = text.slice(start, end).trim();
  return (start > 0 ? "…" : "") + slice + (end < text.length ? "…" : "");
}

export async function GET(req: NextRequest) {
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

  // Confirm we actually have a chunk index — without it semantic + substring
  // both return nothing meaningful.
  const chunks = await getCachedChunks();
  if (chunks.length === 0) {
    return NextResponse.json(
      {
        error:
          "האינדקס הסמנטי טרם נבנה. היכנס ל-/admin/site-editor/guidelines וגש לסקציית 'חיפוש סמנטי (AI)' כדי לבנות אותו.",
      },
      { status: 503 },
    );
  }

  // Parse the query once; the substring leg evaluates the AST directly while
  // the semantic leg gets a flattened version (the embedding model doesn't
  // understand operators).
  const parsed = parseQuery(q);
  if (!parsed) {
    return NextResponse.json({ error: "Empty query" }, { status: 400 });
  }
  const flatForEmbed = flattenForEmbedding(parsed);
  const bareSingle = isBareSingleWord(parsed);
  const phraseMode = hasPhrase(parsed);

  // Quoted phrases mean "literal text only" — semantic results that don't
  // contain the literal phrase would just be noise, so we skip the embedding
  // call entirely for these queries.
  const semanticEnabled = !!process.env.OPENAI_API_KEY && !phraseMode;
  const substringPromise = substringChunkSearch(parsed, TOPK_PER_METHOD);
  const semanticPromise: Promise<Awaited<ReturnType<typeof semanticChunkSearch>>> = (async () => {
    if (!semanticEnabled) return [];
    try {
      const queryVec = await embedQuery(flatForEmbed);
      return await semanticChunkSearch(queryVec, TOPK_PER_METHOD);
    } catch (err) {
      if (err instanceof OpenAIEmbeddingsError) {
        console.error("Semantic search failed:", err.status, err.message);
      } else {
        console.error("Semantic search failed:", err);
      }
      return [];
    }
  })();

  const [substringHits, semanticHitsRaw] = await Promise.all([
    substringPromise,
    semanticPromise,
  ]);

  // For a single bare word with zero substring hits, semantic results are
  // almost always noise (cosine similarity to a single Hebrew word picks up
  // OCR-garbage chunks more than meaningful matches). Suppress them.
  const semanticHits =
    bareSingle && substringHits.length === 0 ? [] : semanticHitsRaw;

  // Reciprocal Rank Fusion → ranked list of doc ids with snippets.
  const fused = fuseRankings(semanticHits, substringHits);

  if (fused.length === 0) {
    return NextResponse.json({
      total: 0,
      skip,
      limit,
      items: [],
      snippets: [],
      facets: { sources: [] },
    });
  }

  // Pull metadata for those ids from the documents cache.
  const allItems = await ensureItemsCache();
  if (!allItems) {
    return NextResponse.json(
      { error: "Upstream metadata unavailable" },
      { status: 502 },
    );
  }
  const byId = new Map<number, Guideline>();
  for (const it of allItems) byId.set(it.id, it);

  // Apply optional filters in score order. We compute source facets from the
  // result set BEFORE the source filter is applied, so the user always sees
  // the full set of sources their other filters yield.
  const queryTerms = collectTerms(parsed);
  const ranked: {
    doc: Guideline;
    snippet: string;
    rrf: number;
    relevance: number;
    hit: RankedDoc;
  }[] = [];
  const facetCounts = new Map<string, number>();
  for (const hit of fused) {
    const doc = byId.get(hit.docId);
    if (!doc) continue;
    if (!dateInRange(doc.document_date, dateFrom, dateTo)) continue;

    const label = (doc.source_label || "").trim();
    if (label) facetCounts.set(label, (facetCounts.get(label) ?? 0) + 1);

    if (sourceFilter.size > 0 && !sourceFilter.has(doc.source_label)) continue;
    ranked.push({
      doc,
      snippet: buildSnippet(hit.snippet, queryTerms),
      rrf: hit.rrfScore,
      relevance: computeRelevance(hit),
      hit,
    });
  }

  // Sort primarily by the user-facing relevance score. RRF is the tiebreaker
  // since two docs with the same rounded relevance can still differ slightly
  // in the underlying retrieval quality.
  ranked.sort((a, b) => b.relevance - a.relevance || b.rrf - a.rrf);

  const facets = {
    sources: Array.from(facetCounts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "he")),
  };

  const page = ranked.slice(skip, skip + limit);

  return NextResponse.json(
    {
      total: ranked.length,
      skip,
      limit,
      items: page.map((r) => r.doc),
      snippets: page.map((r) => r.snippet),
      scores: page.map((r) => Number(r.rrf.toFixed(4))),
      relevance: page.map((r) => r.relevance),
      facets,
      methods: {
        semantic: semanticEnabled && semanticHits.length > 0,
        substring: substringHits.length > 0,
      },
    },
    {
      headers: {
        // User-specific query — never cache at the CDN.
        "Cache-Control": "private, no-store",
      },
    },
  );
}
