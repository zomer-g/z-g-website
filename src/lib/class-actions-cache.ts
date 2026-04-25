import type { ClassActionListResponse } from "@/types/class-action";

interface CacheEntry {
  data: ClassActionListResponse;
  ts: number;
  ttl: number;
}

const cache = new Map<string, CacheEntry>();

export function getCached(key: string): ClassActionListResponse | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts >= entry.ttl) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

export function setCached(
  key: string,
  data: ClassActionListResponse,
  ttlMs: number,
) {
  cache.set(key, { data, ts: Date.now(), ttl: ttlMs });
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
