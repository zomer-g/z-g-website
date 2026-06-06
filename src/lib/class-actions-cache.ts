import type { ClassActionDocument } from "@/types/class-action";

interface CacheEntry {
  items: ClassActionDocument[];
  ts: number;
  ttl: number;
}

const cache = new Map<string, CacheEntry>();

// Bounded LRU — see guidelines-cache for rationale. Low entry cap + LRU
// eviction keeps the hot full-corpus entry resident and bounds worst-case
// memory (each entry can hold a large document array).
const MAX_ENTRIES = 16;

export function getCached(key: string): ClassActionDocument[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts >= entry.ttl) {
    cache.delete(key);
    return null;
  }
  // Touch: move to most-recently-used position.
  cache.delete(key);
  cache.set(key, entry);
  return entry.items;
}

export function setCached(key: string, items: ClassActionDocument[], ttlMs: number) {
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
