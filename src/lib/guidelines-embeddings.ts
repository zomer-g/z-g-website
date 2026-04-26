import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { EMBED_DIMS } from "@/lib/openai-embeddings";

// In-memory cache: one entry per chunk. Vectors are L2-normalized at load
// time so cosine similarity becomes a single dot product per scoring call.
interface CachedChunk {
  docId: number;
  chunkIdx: number;
  text: string;
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

// Returns top-K chunks across the whole corpus.
export async function semanticChunkSearch(
  queryVector: number[],
  topK: number,
): Promise<ChunkHit[]> {
  const items = await getCachedChunks();
  if (items.length === 0) return [];

  const qLen = Math.sqrt(queryVector.reduce((s, v) => s + v * v, 0));
  const qNorm: number[] = qLen === 0 ? queryVector : queryVector.map((v) => v / qLen);

  const scored: ChunkHit[] = items.map((it) => ({
    docId: it.docId,
    chunkIdx: it.chunkIdx,
    text: it.text,
    score: dot(it.vector, qNorm),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

// Local substring search over the chunk text. Cheap, deterministic, and Hebrew
// prefix-aware (strips ה/ב/ל/מ/ש/ו/כ from query terms so "הפגנה" finds
// "פגנה" / "פגנות"). Returns chunk hits with the same shape as semantic.
const HEB_PREFIX_RE = /^[הבלמשוכ]+/;

function normalizeHebrew(s: string): string {
  return s
    .toLocaleLowerCase("he-IL")
    // Strip Hebrew diacritics (niqqud + cantillation).
    .replace(/[֑-ׇ]/g, "")
    .replace(/[״"']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function expandHebrewTerm(term: string): string[] {
  const variants = new Set<string>([term]);
  const stripped = term.replace(HEB_PREFIX_RE, "");
  if (stripped.length >= 2) variants.add(stripped);
  return Array.from(variants);
}

export interface SubstringHit {
  docId: number;
  chunkIdx: number;
  text: string;
  matchCount: number;
}

export async function substringChunkSearch(
  q: string,
  topK: number,
): Promise<SubstringHit[]> {
  const items = await getCachedChunks();
  if (items.length === 0) return [];

  const normalized = normalizeHebrew(q);
  if (!normalized) return [];

  // Treat each whitespace-separated token as a required term (AND), but allow
  // any prefix-stripped variant of the term to satisfy it.
  const terms = normalized.split(" ").filter((t) => t.length >= 2);
  if (terms.length === 0) return [];
  const termVariants = terms.map(expandHebrewTerm);

  const hits: SubstringHit[] = [];
  for (const it of items) {
    const haystack = normalizeHebrew(it.text);
    let totalMatches = 0;
    let allTermsFound = true;
    for (const variants of termVariants) {
      let bestForTerm = 0;
      for (const v of variants) {
        const c = countOccurrences(haystack, v);
        if (c > bestForTerm) bestForTerm = c;
      }
      if (bestForTerm === 0) {
        allTermsFound = false;
        break;
      }
      totalMatches += bestForTerm;
    }
    if (allTermsFound) {
      hits.push({
        docId: it.docId,
        chunkIdx: it.chunkIdx,
        text: it.text,
        matchCount: totalMatches,
      });
    }
  }

  hits.sort((a, b) => b.matchCount - a.matchCount);
  return hits.slice(0, topK);
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let idx = 0;
  while (true) {
    const pos = haystack.indexOf(needle, idx);
    if (pos === -1) break;
    count += 1;
    idx = pos + needle.length;
  }
  return count;
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
}

export function fuseRankings(
  semantic: ChunkHit[],
  substring: SubstringHit[],
): RankedDoc[] {
  const semanticDocs = bestPerDoc(semantic);
  const substringDocs = bestPerDoc(substring);

  const aggregates = new Map<number, DocAggregate>();

  semanticDocs.forEach(({ doc, rank }) => {
    aggregates.set(doc.docId, {
      docId: doc.docId,
      rrfScore: 1 / (RRF_K + rank),
      bestChunkIdx: doc.chunkIdx,
      bestSnippet: doc.text,
      semanticScore: doc.score,
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
      });
    } else {
      existing.rrfScore += score;
      existing.matchCount = doc.matchCount;
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
    }));
}

export { normalizeHebrew, expandHebrewTerm };
