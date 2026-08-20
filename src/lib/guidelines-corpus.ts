import type { Guideline } from "@/types/guideline";
import {
  getCached,
  getStale,
  setCached,
  runSingleFlight,
  isInFlight,
} from "./guidelines-cache";
import { fetchAllUpstreamGuidelines, stripUrls } from "./guidelines-upstream";

/**
 * One way in to the guidelines corpus, shared by /documents, /sources and
 * /search.
 *
 * Those three routes each used to do their own cache-check-then-crawl. That
 * was fine while the cache was warm and became an outage when it wasn't: the
 * dashboard calls two of them on load, so a cold start meant two full-corpus
 * walks racing each other, and every visitor who arrived during the warm-up
 * added two more. On 2026-08-20 none of them finished inside the platform's
 * 90 s proxy window, so every one of them 502'd — and each 502 left the next
 * visitor with an equally cold cache.
 *
 * The rules here:
 *   1. Fresh cache wins outright.
 *   2. Otherwise ONE crawl runs, shared by every concurrent caller.
 *   3. Callers wait a bounded time, well under the proxy timeout. The crawl
 *      is not cancelled when they stop waiting — it keeps going and caches
 *      its result, so giving up early still makes progress for everyone.
 *   4. If the wait runs out, serve the last known copy rather than an error.
 *   5. Only with no copy at all do we admit we have nothing yet.
 *
 * Note what this deliberately does NOT do: warm itself on boot or on a timer.
 * Corpus walks inside the 512 MB web instance are what caused the OOM kills of
 * late July — see src/instrumentation.ts. This only ever crawls in response to
 * a real request, and now at most once at a time.
 */

// Comfortably inside the ~90 s proxy limit. A caller that hits this gets a
// useful answer instead of a connection that dies at 90 s with nothing.
const WAIT_BUDGET_MS = 25_000;

export type CorpusStatus =
  | { kind: "fresh"; items: Guideline[] }
  | { kind: "stale"; items: Guideline[]; ageMs: number }
  | { kind: "warming" }
  | { kind: "failed" };

export async function getGuidelinesCorpus(
  cacheKey: string,
  filters: Record<string, string>,
  ttlMs: number,
): Promise<CorpusStatus> {
  const cached = getCached(cacheKey);
  if (cached) return { kind: "fresh", items: cached };

  // Two things happen inside the single-flight, both on purpose:
  //
  //  - Caching. A crawl that finishes after every caller has walked away must
  //    still store its result, so setCached lives here rather than at the
  //    call site.
  //  - Swallowing rejections. Callers stop awaiting this promise when their
  //    wait budget runs out; if it rejected afterwards with nobody attached,
  //    Node would see an unhandled rejection and could take the process down.
  //    Failure is reported as null instead.
  const crawl = runSingleFlight(cacheKey, async () => {
    try {
      const raw = await fetchAllUpstreamGuidelines({ filters });
      if (raw === null) return null;
      const cleaned = stripUrls(raw);
      setCached(cacheKey, cleaned, ttlMs);
      return cleaned;
    } catch (err) {
      console.error("guidelines corpus: crawl failed", err);
      return null;
    }
  });

  let timer: ReturnType<typeof setTimeout> | undefined;
  const TIMED_OUT = Symbol("timeout");
  try {
    const settled = await Promise.race([
      crawl,
      new Promise<typeof TIMED_OUT>((resolve) => {
        timer = setTimeout(() => resolve(TIMED_OUT), WAIT_BUDGET_MS);
      }),
    ]);

    if (settled !== TIMED_OUT && settled !== null) {
      return { kind: "fresh", items: settled };
    }
  } finally {
    if (timer) clearTimeout(timer);
  }

  // Either the crawl failed, or it is still running. Both are survivable if we
  // have an older copy — guidelines change on the order of weeks, not seconds.
  const stale = getStale(cacheKey);
  if (stale) {
    console.warn(
      `guidelines: serving cache ${Math.round(stale.ageMs / 1000)}s old (${
        isInFlight(cacheKey) ? "refresh still running" : "refresh failed"
      })`,
    );
    return { kind: "stale", items: stale.items, ageMs: stale.ageMs };
  }

  // Nothing cached at all — the first load after a restart. Say so plainly so
  // the client can retry, instead of returning a 502 that reads like a bug.
  return isInFlight(cacheKey) ? { kind: "warming" } : { kind: "failed" };
}
