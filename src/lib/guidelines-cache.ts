import type { Guideline } from "@/types/guideline";

interface CacheEntry {
  items: Guideline[];
  ts: number;
  ttl: number;
}

const cache = new Map<string, CacheEntry>();

// Bounded LRU. Each entry can hold a large document array, so we cap the
// number of entries low and evict the LEAST-recently-used (not FIFO) — that
// keeps the hot full-corpus entry resident while rare filter combos rotate
// out, bounding worst-case memory without hurting typical browsing.
const MAX_ENTRIES = 16;

export function getCached(key: string): Guideline[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts >= entry.ttl) {
    // Expired. Keep the entry resident (don't delete) so it can still be
    // served as a stale fallback via getStale() when a live upstream refresh
    // fails. Return null so callers try to refresh first. LRU eviction still
    // bounds memory. clearCache()/setCached() replace it on a successful load.
    return null;
  }
  // Touch: move to most-recently-used position.
  cache.delete(key);
  cache.set(key, entry);
  return entry.items;
}

// Last-known-good items regardless of TTL. Used ONLY as a fallback when a live
// upstream refresh fails, so the corpus keeps serving (slightly stale) instead
// of 502-ing. Returns null only if the entry was never populated. Touches LRU
// so a served-stale entry isn't the next eviction victim.
export function getStale(key: string): Guideline[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  cache.delete(key);
  cache.set(key, entry);
  return entry.items;
}

export function setCached(key: string, items: Guideline[], ttlMs: number) {
  cache.delete(key);
  cache.set(key, { items, ts: Date.now(), ttl: ttlMs });
  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (!oldest) break;
    cache.delete(oldest);
  }
}

export function clearCache(): number {
  const n = cache.size;
  cache.clear();
  return n;
}

export function getCacheSize(): number {
  return cache.size;
}

// Cache key for "no upstream filters". The full corpus lives at this key.
export const UNFILTERED_KEY = "";

export function findUnfilteredKey(): string | null {
  return cache.has(UNFILTERED_KEY) ? UNFILTERED_KEY : null;
}
