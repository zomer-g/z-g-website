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
const MAX_ENTRIES = 6;

export function getCached(key: string): ClassActionDocument[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts >= entry.ttl) {
    // Expired but DELIBERATELY KEPT — see getStale. An expired copy of the
    // corpus is worth far more than an error page when TAG-IT is briefly
    // unavailable, and LRU still bounds how many we hold.
    return null;
  }
  // Touch: move to most-recently-used position.
  cache.delete(key);
  cache.set(key, entry);
  return entry.items;
}

/**
 * The last known copy for a key, however old — the fallback for when the
 * upstream fetch fails.
 *
 * This page is the only TAG-IT-backed page with no local mirror, so a TAG-IT
 * blip took it down completely while the mirrored pages carried on. TAG-IT
 * self-restarts when its OCR queue crosses its memory ceiling (~1 minute,
 * eight times since 2026-07-20), and one of those landed on a real visitor.
 * Class-action filings do not change minute to minute, so serving an hour-old
 * list beats "שגיאה בטעינת התובענות".
 */
export function getStale(
  key: string,
): { items: ClassActionDocument[]; ageMs: number } | null {
  const entry = cache.get(key);
  if (!entry) return null;
  return { items: entry.items, ageMs: Date.now() - entry.ts };
}

/* ── single-flight ───────────────────────────────────────────────────────
   A cache miss pulls the WHOLE corpus (1,646 documents, four 500-row pages)
   before it can answer. Without coordination each concurrent visitor starts
   its own crawl: the logs from the 2026-08-10 incident show skip=0, 500 and
   1000 each fetched twice within seconds, doubling the load we put on a box
   that was already at 96% of its memory ceiling. Callers now share one
   in-flight crawl per key. */
const inFlight = new Map<string, Promise<ClassActionDocument[] | null>>();

export function runSingleFlight(
  key: string,
  fetcher: () => Promise<ClassActionDocument[] | null>,
): Promise<ClassActionDocument[] | null> {
  const existing = inFlight.get(key);
  if (existing) return existing;
  const p = fetcher().finally(() => inFlight.delete(key));
  inFlight.set(key, p);
  return p;
}

export function inFlightCount(): number {
  return inFlight.size;
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
