import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { EMBED_DIMS } from "@/lib/openai-embeddings";
import { evaluateQuery, type QueryNode } from "@/lib/guidelines-query";

// No in-memory chunk cache. The previous design held all chunk text +
// normalized text (~70 MB) plus all 1536-dim vectors (~75 MB) in process
// memory, which OOM'd Render Starter (~256 MB Node heap on a 512 MB
// instance) on cold start of any request. Both substring and semantic
// search now stream chunks from Postgres in pages, so peak memory stays
// bounded by SEARCH_PAGE regardless of corpus size.

// invalidateEmbeddingsCache stays as a no-op so existing callers (the
// embed pipeline) still compile and don't need to change. It used to
// reset the in-memory cache after a rebuild.
export function invalidateEmbeddingsCache() {
  // No-op: there's no in-memory cache to invalidate anymore.
}

// Returns just the count of indexed chunks (cheap, no full table scan).
// The search route uses this to decide whether the index has been built
// at all yet.
export async function getCachedChunks(): Promise<{ length: number }> {
  const length = await prisma.guidelineChunk.count();
  return { length };
}

export interface ChunkHit {
  docId: number;
  chunkIdx: number;
  text: string;
  score: number;
}

// Cosine similarity below this is treated as noise. text-embedding-3-small on
// Hebrew legal text typically scores 0.4-0.7 for genuinely related content;
// anything under ~0.30 tends to be a junk chunk (OCR garbage, page numbers)
// that just happens to live in the same vector neighborhood.
export const SEMANTIC_MIN_SCORE = 0.3;

// Page size for streamed search. Smaller = lower peak memory, more
// roundtrips. Sized so that one page of vectors (PAGE × 1536 floats ≈
// 6 MB) plus the JSON-parse intermediate (~3×) stays comfortably under
// the ~256 MB Node heap on Render Starter.
const SEARCH_PAGE = 500;
const SEMANTIC_PAGE = SEARCH_PAGE;

// Returns top-K chunks across the whole corpus, dropping anything below the
// minimum similarity floor. Streams chunks via cursor-on-id pagination so
// each page is an O(PAGE) index seek rather than O(N) sort+offset.
export async function semanticChunkSearch(
  queryVector: number[],
  topK: number,
  minScore = SEMANTIC_MIN_SCORE,
): Promise<ChunkHit[]> {
  const qLen = Math.sqrt(queryVector.reduce((s, v) => s + v * v, 0));
  if (qLen === 0) return [];
  const qNorm = new Array<number>(queryVector.length);
  for (let i = 0; i < queryVector.length; i++) qNorm[i] = queryVector[i] / qLen;

  // Keep a running top-N (= 4 × topK) buffer; trim periodically. A proper
  // heap would be faster but topK is small (~200) so a sort-and-trim works.
  const TRIM_AT = topK * 4;
  let scored: ChunkHit[] = [];

  let cursorId = 0;
  while (true) {
    const rows = await prisma.guidelineChunk.findMany({
      select: { id: true, docId: true, chunkIdx: true, text: true, embedding: true },
      where: { id: { gt: cursorId } },
      take: SEMANTIC_PAGE,
      orderBy: { id: "asc" },
    });
    if (rows.length === 0) break;

    for (const r of rows) {
      const arr = r.embedding as Prisma.JsonValue;
      if (!Array.isArray(arr) || arr.length !== EMBED_DIMS) continue;
      const vec = arr as number[];

      let dot = 0;
      let len = 0;
      for (let i = 0; i < vec.length; i++) {
        const v = vec[i];
        dot += v * qNorm[i];
        len += v * v;
      }
      if (len === 0) continue;
      const score = dot / Math.sqrt(len);
      if (score < minScore) continue;

      scored.push({
        docId: r.docId,
        chunkIdx: r.chunkIdx,
        text: r.text,
        score,
      });
    }

    if (scored.length > TRIM_AT) {
      scored.sort((a, b) => b.score - a.score);
      scored = scored.slice(0, topK);
    }

    cursorId = rows[rows.length - 1].id;
    if (rows.length < SEMANTIC_PAGE) break;
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

// Local substring search over the chunk text. Evaluates a parsed boolean
// query (AND/OR/phrase/parentheses) with Hebrew prefix-stripping for bare
// words. Each chunk's normalized text is computed once at load time, so the
// per-search cost is just walking the AST against an already-prepared string.
function normalizeHebrew(s: string): string {
  return s
    .toLocaleLowerCase("he-IL")
    .replace(/[֑-ׇ]/g, "") // niqqud + cantillation
    .replace(/[״'׳]/g, "")
    // Invisible characters that PDF extraction / OCR routinely sprinkle into
    // Hebrew text and that silently break literal-substring matches: BIDI
    // marks (LRM/RLM, embeds, isolates), zero-width joiners, soft hyphens,
    // word joiner, BOM. Without this, a query like "מצלמות גוף" misses any
    // chunk where an invisible RLM sits between the two words.
    .replace(/[­​-‏‪-‮⁠⁦-⁩﻿]/g, "")
    .replace(/ /g, " ") // NBSP → regular space (some \s flavors miss it)
    .replace(/\s+/g, " ")
    .trim();
}

export interface SubstringHit {
  docId: number;
  chunkIdx: number;
  text: string;
  matchCount: number;
}

export async function substringChunkSearch(
  query: QueryNode,
  topK: number,
): Promise<SubstringHit[]> {
  // Stream chunk text from DB in pages — never materialize the whole
  // corpus in memory. Normalization runs per-chunk inside the loop and
  // discarded immediately after the match decision so heap stays bounded.
  const hits: SubstringHit[] = [];
  let cursorId = 0;
  while (true) {
    const rows = await prisma.guidelineChunk.findMany({
      select: { id: true, docId: true, chunkIdx: true, text: true },
      where: { id: { gt: cursorId } },
      take: SEARCH_PAGE,
      orderBy: { id: "asc" },
    });
    if (rows.length === 0) break;

    for (const r of rows) {
      const normalized = normalizeHebrew(r.text);
      const result = evaluateQuery(query, normalized, normalizeHebrew);
      if (result.matched) {
        hits.push({
          docId: r.docId,
          chunkIdx: r.chunkIdx,
          text: r.text,
          matchCount: result.matchCount,
        });
      }
    }

    cursorId = rows[rows.length - 1].id;
    if (rows.length < SEARCH_PAGE) break;
  }

  hits.sort((a, b) => b.matchCount - a.matchCount);
  return hits.slice(0, topK);
}

// Reciprocal Rank Fusion across two ranked lists. The intuition: a doc that
// appears in both lists should rank higher than a doc that appears only in
// one, even if its position in either list is mediocre.
const RRF_K = 60;

interface DocAggregate {
  docId: number;
  rrfScore: number;
  bestChunkIdx: number;
  bestSnippet: string;
  semanticScore?: number;
  matchCount?: number;
  semanticChunks: number;
  substringChunks: number;
}

function bestPerDoc<T extends { docId: number; chunkIdx: number; text: string }>(
  ranked: T[],
): { doc: T; rank: number }[] {
  // First-occurrence wins (the list is already sorted best-first).
  const seen = new Set<number>();
  const out: { doc: T; rank: number }[] = [];
  ranked.forEach((doc, idx) => {
    if (seen.has(doc.docId)) return;
    seen.add(doc.docId);
    out.push({ doc, rank: idx });
  });
  return out;
}

export interface RankedDoc {
  docId: number;
  rrfScore: number;
  bestChunkIdx: number;
  snippet: string;
  semanticScore?: number;
  substringMatches?: number;
  semanticChunks: number;
  substringChunks: number;
}

export function fuseRankings(
  semantic: ChunkHit[],
  substring: SubstringHit[],
): RankedDoc[] {
  const semanticDocs = bestPerDoc(semantic);
  const substringDocs = bestPerDoc(substring);

  // Pre-count how many distinct chunks each doc had in each ranking. Used
  // by the relevance score: a doc with multiple matching chunks is a much
  // stronger signal than a doc with one weak match.
  const semChunkCount = new Map<number, number>();
  for (const c of semantic) {
    semChunkCount.set(c.docId, (semChunkCount.get(c.docId) ?? 0) + 1);
  }
  const subChunkCount = new Map<number, number>();
  for (const c of substring) {
    subChunkCount.set(c.docId, (subChunkCount.get(c.docId) ?? 0) + 1);
  }

  const aggregates = new Map<number, DocAggregate>();

  semanticDocs.forEach(({ doc, rank }) => {
    aggregates.set(doc.docId, {
      docId: doc.docId,
      rrfScore: 1 / (RRF_K + rank),
      bestChunkIdx: doc.chunkIdx,
      bestSnippet: doc.text,
      semanticScore: doc.score,
      semanticChunks: semChunkCount.get(doc.docId) ?? 0,
      substringChunks: 0,
    });
  });

  substringDocs.forEach(({ doc, rank }) => {
    const existing = aggregates.get(doc.docId);
    const score = 1 / (RRF_K + rank);
    if (!existing) {
      aggregates.set(doc.docId, {
        docId: doc.docId,
        rrfScore: score,
        bestChunkIdx: doc.chunkIdx,
        bestSnippet: doc.text,
        matchCount: doc.matchCount,
        semanticChunks: 0,
        substringChunks: subChunkCount.get(doc.docId) ?? 0,
      });
    } else {
      existing.rrfScore += score;
      existing.matchCount = doc.matchCount;
      existing.substringChunks = subChunkCount.get(doc.docId) ?? 0;
      // Prefer the substring snippet when available — it has the literal
      // query term in it, which is more useful as visual feedback.
      existing.bestSnippet = doc.text;
      existing.bestChunkIdx = doc.chunkIdx;
    }
  });

  return Array.from(aggregates.values())
    .sort((a, b) => b.rrfScore - a.rrfScore)
    .map((a) => ({
      docId: a.docId,
      rrfScore: a.rrfScore,
      bestChunkIdx: a.bestChunkIdx,
      snippet: a.bestSnippet,
      semanticScore: a.semanticScore,
      substringMatches: a.matchCount,
      semanticChunks: a.semanticChunks,
      substringChunks: a.substringChunks,
    }));
}

// Composite 0–100 relevance score derived from the underlying signals.
// Easier for users to read than the tiny RRF score, and correlates well
// with how strongly a doc actually matched the query.
//
// Calibration assumes SEMANTIC_MIN_SCORE = 0.30 floor on cosine. A doc with
// cosine 1.0 alone tops out around 80; matching chunks across both lists
// (or matching multiple distinct chunks) push it past 90.
export function computeRelevance(d: RankedDoc): number {
  const sem =
    d.semanticScore != null
      ? Math.max(0, Math.min(80, ((d.semanticScore - 0.30) / 0.70) * 80))
      : 0;
  const sub =
    d.substringMatches && d.substringMatches > 0
      ? 25 + Math.min(15, Math.log2(1 + d.substringMatches) * 5)
      : 0;
  const multi = Math.min(15, (d.semanticChunks + d.substringChunks) * 2);
  // When semantic missed entirely (e.g. phrase mode), substring carries the
  // full weight rather than being a minor topper.
  const base = sem > 0 ? sem : 0;
  return Math.round(Math.min(100, base + sub + multi));
}

export { normalizeHebrew };
