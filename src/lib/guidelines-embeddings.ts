import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { EMBED_DIMS } from "@/lib/openai-embeddings";

// In-memory cache: doc id → unit-normalized embedding. Cosine similarity is a
// dot product on normalized vectors, so we normalize once at load time.
interface CachedEmbedding {
  id: number;
  vector: Float32Array; // length EMBED_DIMS, L2-normalized
}

let cache: CachedEmbedding[] | null = null;
let cacheLoadedAt = 0;
let inflight: Promise<CachedEmbedding[]> | null = null;

const CACHE_TTL_MS = 5 * 60_000; // 5-minute soft TTL — refreshed on writes too

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

async function loadFromDb(): Promise<CachedEmbedding[]> {
  const rows = await prisma.guidelineEmbedding.findMany({
    select: { id: true, embedding: true },
  });
  const out: CachedEmbedding[] = [];
  for (const r of rows) {
    const arr = r.embedding as Prisma.JsonValue;
    if (!Array.isArray(arr) || arr.length !== EMBED_DIMS) continue;
    out.push({ id: r.id, vector: normalize(arr as number[]) });
  }
  return out;
}

export async function getCachedEmbeddings(): Promise<CachedEmbedding[]> {
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

// Compute cosine similarity. Both vectors must already be L2-normalized.
function dot(a: Float32Array, b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

export interface SemanticHit {
  id: number;
  score: number;
}

export async function semanticSearch(
  queryVector: number[],
  topK: number,
): Promise<SemanticHit[]> {
  const items = await getCachedEmbeddings();
  if (items.length === 0) return [];

  // Normalize query once.
  const qLen = Math.sqrt(queryVector.reduce((s, v) => s + v * v, 0));
  const qNorm: number[] = qLen === 0 ? queryVector : queryVector.map((v) => v / qLen);

  // Score every doc; small N (a few thousand at most) so a linear scan is fine.
  const scored: SemanticHit[] = items.map((it) => ({
    id: it.id,
    score: dot(it.vector, qNorm),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}
