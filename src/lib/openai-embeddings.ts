// Thin wrapper around the OpenAI embeddings REST endpoint. We don't pull in
// the official SDK because the surface we use is tiny.

const OPENAI_URL = "https://api.openai.com/v1/embeddings";
export const EMBED_MODEL = "text-embedding-3-small";
export const EMBED_DIMS = 1536;

export interface EmbeddingResponse {
  data: { embedding: number[]; index: number }[];
  model: string;
  usage: { prompt_tokens: number; total_tokens: number };
}

export class OpenAIEmbeddingsError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function embedTexts(inputs: string[]): Promise<number[][]> {
  if (inputs.length === 0) return [];
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new OpenAIEmbeddingsError("OPENAI_API_KEY is not set", 503);
  }

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ input: inputs, model: EMBED_MODEL }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new OpenAIEmbeddingsError(
      `OpenAI embeddings ${res.status}: ${text.slice(0, 200)}`,
      res.status,
    );
  }

  const json = (await res.json()) as EmbeddingResponse;
  // OpenAI may return `data` out of order — sort by index.
  const ordered = [...json.data].sort((a, b) => a.index - b.index);
  return ordered.map((d) => d.embedding);
}

export async function embedText(input: string): Promise<number[]> {
  const [v] = await embedTexts([input]);
  return v;
}

// Per-process LRU for query embeddings. Repeated queries — including the
// natural case of paginating through the same search — skip the OpenAI call
// entirely. Identical queries are very common (each page click re-runs).
const QUERY_CACHE_MAX = 256;
const QUERY_CACHE_TTL_MS = 60 * 60_000; // 1 hour

interface QueryCacheEntry {
  vector: number[];
  ts: number;
}

const queryCache = new Map<string, QueryCacheEntry>();
let inflightQueryEmbeds = new Map<string, Promise<number[]>>();

export async function embedQuery(query: string): Promise<number[]> {
  const key = query.trim();
  if (!key) return embedText(key);

  const hit = queryCache.get(key);
  if (hit && Date.now() - hit.ts < QUERY_CACHE_TTL_MS) {
    // LRU touch — re-insert so it's the newest entry.
    queryCache.delete(key);
    queryCache.set(key, hit);
    return hit.vector;
  }

  // Coalesce concurrent identical queries onto a single in-flight request.
  const existing = inflightQueryEmbeds.get(key);
  if (existing) return existing;

  const p = embedText(key)
    .then((vector) => {
      queryCache.set(key, { vector, ts: Date.now() });
      while (queryCache.size > QUERY_CACHE_MAX) {
        const oldest = queryCache.keys().next().value;
        if (oldest === undefined) break;
        queryCache.delete(oldest);
      }
      return vector;
    })
    .finally(() => {
      inflightQueryEmbeds.delete(key);
    });

  inflightQueryEmbeds.set(key, p);
  return p;
}

export function clearQueryEmbeddingCache() {
  queryCache.clear();
  inflightQueryEmbeds = new Map();
}

// Deterministic hash for the input text — used to skip re-embedding when
// nothing about a document has changed since the last build.
export async function hashText(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Truncate to fit comfortably under text-embedding-3-small's 8K-token window.
// Hebrew is ~1.5 char/token on average, so 24K chars ≈ 16K tokens; we go below
// that to leave a safety margin.
const MAX_EMBED_CHARS = 20_000;
export function truncateForEmbedding(text: string): string {
  if (text.length <= MAX_EMBED_CHARS) return text;
  return text.slice(0, MAX_EMBED_CHARS);
}
