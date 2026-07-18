import type { Guideline, UpstreamGuidelinesListResponse } from "@/types/guideline";

const UPSTREAM = "https://tag-it.biz/api/public/over-guidelines/documents";
const PAGE_SIZE = 500; // upstream max
// Low concurrency to cap peak memory during the once-per-TTL bulk fetch
// (see class-actions-upstream for rationale).
const PARALLEL = 2;
// Per-page hard timeout + retries. TAG-IT's authenticated list query on this
// collection is occasionally very slow / drops a single page; without a bound
// one hung page stalls the whole corpus load for ~2 min and one flaky page
// fails the entire fetch. A tight-ish timeout with a couple of retries turns
// that transient into a success instead of a 502.
const PAGE_TIMEOUT_MS = 30_000;
const MAX_ATTEMPTS = 3;

export function getGuidelinesApiKey(): string | undefined {
  return process.env.GUIDELINES_API_KEY || process.env.CLASS_ACTION_API_KEY;
}

export interface FetchAllOptions {
  filters?: Record<string, string | undefined>;
  signal?: AbortSignal;
  // Return just the first page — enough to infer a field schema without
  // pulling the whole corpus into memory (avoids 512MB OOM spikes).
  sampleOnly?: boolean;
}

// Walks every page of the upstream list endpoint and returns the full
// concatenated items array. Returns null if the API key is missing or if any
// page failed to load (so callers can decide whether to surface 503/502).
export async function fetchAllUpstreamGuidelines(
  opts: FetchAllOptions = {},
): Promise<Guideline[] | null> {
  const apiKey = getGuidelinesApiKey();
  if (!apiKey) return null;

  const filters = opts.filters || {};
  const buildUrl = (skip: number) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) {
      if (v != null && v !== "") p.set(k, String(v));
    }
    p.set("limit", String(PAGE_SIZE));
    p.set("skip", String(skip));
    return `${UPSTREAM}?${p.toString()}`;
  };

  const fetchOne = async (skip: number): Promise<UpstreamGuidelinesListResponse | null> => {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      // Per-attempt timeout so a hung page fails fast and gets retried, rather
      // than stalling the whole load. Combine with any caller-supplied signal.
      const timeout = AbortSignal.timeout(PAGE_TIMEOUT_MS);
      const signal =
        opts.signal && typeof AbortSignal.any === "function"
          ? AbortSignal.any([opts.signal, timeout])
          : (opts.signal ?? timeout);
      try {
        const res = await fetch(buildUrl(skip), {
          headers: { "X-API-Key": apiKey, Accept: "application/json" },
          cache: "no-store",
          signal,
        });
        if (res.ok) {
          return (await res.json()) as UpstreamGuidelinesListResponse;
        }
        // Client errors (except 408/429) won't fix themselves on retry.
        if (res.status < 500 && res.status !== 408 && res.status !== 429) {
          return null;
        }
      } catch (err) {
        // The caller aborted (not our per-page timeout) → propagate, don't retry.
        if (opts.signal?.aborted) throw err;
        // Otherwise: our timeout or a transient network error → fall through
        // and retry.
      }
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 500 * attempt));
      }
    }
    return null;
  };

  // First page tells us the total.
  const first = await fetchOne(0);
  if (!first) return null;
  const all: Guideline[] = [...(first.items || [])];
  if (opts.sampleOnly) return all;
  const total = Number(first.total) || all.length;
  if (all.length >= total) return all;

  // TAG-IT silently caps `limit` per collection — advance by the actual
  // page size returned, not the size we asked for, so we don't skip
  // whole ranges of items and end up with a truncated corpus.
  const actualPageSize = (first.items?.length ?? 0) || PAGE_SIZE;

  const offsets: number[] = [];
  for (let skip = actualPageSize; skip < total; skip += actualPageSize) offsets.push(skip);

  for (let i = 0; i < offsets.length; i += PARALLEL) {
    const batch = offsets.slice(i, i + PARALLEL);
    const pages = await Promise.all(batch.map(fetchOne));
    if (pages.some((p) => p === null)) return null; // partial failure → bail
    for (const page of pages) {
      if (page) all.push(...(page.items || []));
    }
  }

  return all;
}

// Cheap helper that strips the upstream-key-bearing URLs from each item before
// they leave our process. csv_row + over_* provenance fields are kept.
export function stripUrls(items: Guideline[]): Guideline[] {
  return items.map((it) => {
    const rest = { ...(it as unknown as Record<string, unknown>) };
    delete rest.file_url;
    delete rest.text_url;
    return rest as unknown as Guideline;
  });
}
