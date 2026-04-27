import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { EMBED_DIMS } from "@/lib/openai-embeddings";
import { evaluateQuery, type QueryNode } from "@/lib/guidelines-query";

// In-memory cache: one entry per chunk. Vectors are L2-normalized at load
// time so cosine similarity becomes a single dot product per scoring call.
// normalizedText is also computed up-front so substring search doesn't pay
// a normalization cost per query × per chunk.
interface CachedChunk {
  docId: number;
  chunkIdx: number;
  text: string;
  normalizedText: string;
  vector: Float32Array; // length EMBED_DIMS, L2-normalized
}

let cache: CachedChunk[] | null = null;
let cacheLoadedAt = 0;
let inflight: Promise<CachedChunk[]> | null = null;

const CACHE_TTL_MS = 5 * 60_000;

function normalize(v: number[]): Float32Array {
  let sum = 0;
  for (let i = 0; i < v.length; i++) sum += v[i] * v[i];
  const norm = Math.sqrt(sum);
  const out = new Float32Array(v.length);
  if (norm === 0) return out;
  const inv = 1 / norm;
  for (let i = 0; i < v.length; i++) out[i] = v[i] * inv;
  return out;
}

async function loadFromDb(): Promise<CachedChunk[]> {
  const rows = await prisma.guidelineChunk.findMany({
    select: { docId: true, chunkIdx: true, text: true, embedding: true },
  });
  const out: CachedChunk[] = [];
  for (const r of rows) {
    const arr = r.embedding as Prisma.JsonValue;
    if (!Array.isArray(arr) || arr.length !== EMBED_DIMS) continue;
    out.push({
      docId: r.docId,
      chunkIdx: r.chunkIdx,
      text: r.text,
      normalizedText: normalizeHebrew(r.text),
      vector: normalize(arr as number[]),
    });
  }
  return out;
}

export async function getCachedChunks(): Promise<CachedChunk[]> {
  if (cache && Date.now() - cacheLoadedAt < CACHE_TTL_MS) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    const loaded = await loadFromDb();
    cache = loaded;
    cacheLoadedAt = Date.now();
    inflight = null;
    return loaded;
  })();
  return inflight;
}

export function invalidateEmbeddingsCache() {
  cache = null;
  cacheLoadedAt = 0;
}

function dot(a: Float32Array, b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
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

// Returns top-K chunks across the whole corpus, dropping anything below the
// minimum similarity floor.
export async function semanticChunkSearch(
  queryVector: number[],
  topK: number,
  minScore = SEMANTIC_MIN_SCORE,
): Promise<ChunkHit[]> {
  const items = await getCachedChunks();
  if (items.length === 0) return [];

  const qLen = Math.sqrt(queryVector.reduce((s, v) => s + v * v, 0));
  const qNorm: number[] = qLen === 0 ? queryVector : queryVector.map((v) => v / qLen);

  const scored: ChunkHit[] = [];
  for (const it of items) {
    const score = dot(it.vector, qNorm);
    if (score < minScore) continue;
    scored.push({
      docId: it.docId,
      chunkIdx: it.chunkIdx,
      text: it.text,
      score,
    });
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
  const items = await getCachedChunks();
  if (items.length === 0) return [];

  const hits: SubstringHit[] = [];
  for (const it of items) {
    const r = evaluateQuery(query, it.normalizedText, normalizeHebrew);
    if (r.matched) {
      hits.push({
        docId: it.docId,
        chunkIdx: it.chunkIdx,
        text: it.text,
        matchCount: r.matchCount,
      });
    }
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
