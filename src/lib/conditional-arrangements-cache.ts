import type { ConditionalArrangement } from "@/types/conditional-arrangement";

interface CacheEntry {
  items: ConditionalArrangement[];
  ts: number;
  ttl: number;
}

const cache = new Map<string, CacheEntry>();

export function getCachedArrangements(key: string): ConditionalArrangement[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts >= entry.ttl) {
    cache.delete(key);
    return null;
  }
  return entry.items;
}

export function setCachedArrangements(
  key: string,
  items: ConditionalArrangement[],
  ttlMs: number,
) {
  cache.set(key, { items, ts: Date.now(), ttl: ttlMs });
  if (cache.size > 200) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
}

export function clearArrangementsCache(): number {
  const n = cache.size;
  cache.clear();
  return n;
}

export function getArrangementsCacheSize(): number {
  return cache.size;
}
