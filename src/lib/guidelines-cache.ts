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

// Cache key for "no upstream filters". The full corpus lives at this key.
export const UNFILTERED_KEY = "";

export function findUnfilteredKey(): string | null {
  return cache.has(UNFILTERED_KEY) ? UNFILTERED_KEY : null;
}
