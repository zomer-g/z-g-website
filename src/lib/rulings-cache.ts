import type { UpstreamRulingItem } from "./rulings-upstream";

interface CacheEntry {
  items: UpstreamRulingItem[];
  ts: number;
  ttl: number;
}

const cache = new Map<string, CacheEntry>();

// Bounded LRU — low entry cap + least-recently-used eviction keeps hot
// per-scope snapshots resident and bounds worst-case memory.
const MAX_ENTRIES = 16;

export function getCached(key: string): UpstreamRulingItem[] | null {
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

export function setCached(key: string, items: UpstreamRulingItem[], ttlMs: number) {
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
