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
// NOTE: expired entries are deliberately kept resident (see getCached) as a
// stale fallback, so this cap is the ONLY thing bounding this cache — 16
// full corpora (12,281 docs each as of 2026-08) is far more than the 512 MB
// container can hold — hence the low cap.
const MAX_ENTRIES = 6;

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
export function getStale(
  key: string,
): { items: Guideline[]; ageMs: number } | null {
  const entry = cache.get(key);
  if (!entry) return null;
  cache.delete(key);
  cache.set(key, entry);
  return { items: entry.items, ageMs: Date.now() - entry.ts };
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

/* ─── Single-flight ───
 *
 * A miss pulls the ENTIRE corpus (~4,200 docs over many upstream pages), and
 * three public routes — documents, sources and search — all need the same
 * unfiltered set. Without coordination, one visitor landing on /guidelines
 * starts two crawls at once, and every extra visitor during the warm-up starts
 * two more. On 2026-08-20 that turned a slow upstream into a hard outage: each
 * request piled another 9-page walk onto the same 512 MB instance and none of
 * them finished inside the 90 s proxy window.
 *
 * With this, N concurrent callers share ONE crawl. Note that the promise is
 * kept until the FETCHER settles, not until a caller stops waiting — a request
 * that gives up early leaves the crawl running, so the work still lands in the
 * cache for whoever asks next.
 */
const inFlight = new Map<string, Promise<Guideline[] | null>>();

export function runSingleFlight(
  key: string,
  fetcher: () => Promise<Guideline[] | null>,
): Promise<Guideline[] | null> {
  const existing = inFlight.get(key);
  if (existing) return existing;
  const p = fetcher().finally(() => inFlight.delete(key));
  inFlight.set(key, p);
  return p;
}

export function isInFlight(key: string): boolean {
  return inFlight.has(key);
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
