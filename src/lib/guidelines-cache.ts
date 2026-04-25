import type { Guideline } from "@/types/guideline";

interface CacheEntry {
  items: Guideline[];
  ts: number;
  ttl: number;
}

const cache = new Map<string, CacheEntry>();

export function getCached(key: string): Guideline[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts >= entry.ttl) {
    cache.delete(key);
    return null;
  }
  return entry.items;
}

export function setCached(key: string, items: Guideline[], ttlMs: number) {
  cache.set(key, { items, ts: Date.now(), ttl: ttlMs });
  if (cache.size > 200) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
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

// Latest unfiltered cache key — useful for the /sources endpoint to find the
// broadest set of source_labels seen so far.
export function findUnfilteredKey(): string | null {
  // The unfiltered upstream call has only limit=500 and skip=0 in its query.
  for (const key of cache.keys()) {
    const params = new URLSearchParams(key);
    let onlyDefaults = true;
    for (const [k] of params) {
      if (k !== "limit" && k !== "skip") {
        onlyDefaults = false;
        break;
      }
    }
    if (onlyDefaults) return key;
  }
  return null;
}
