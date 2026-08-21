import type { Guideline, UpstreamGuidelinesListResponse } from "@/types/guideline";

const UPSTREAM = "https://tag-it.biz/api/public/over-guidelines/documents";
const PAGE_SIZE = 500; // upstream max
// Low concurrency to cap peak memory during the once-per-TTL bulk fetch
// (see class-actions-upstream for rationale).
const PARALLEL = 2;
// Per-page hard timeout + retries. TAG-IT's authenticated list query on this
// collection is occasionally very slow / drops a single page; without a bound
// one hung page stalls the whole corpus load and one flaky page fails the
// entire fetch.
//
// 45s, not the original 30s: production logs show pages that time out on all
// three attempts at 30s and then succeed on a later crawl, so the bound was
// cutting off pages that were still coming. Three failed attempts cost more
// than one slower success.
const PAGE_TIMEOUT_MS = 45_000;
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
        // Every failure mode used to collapse into a bare null here, so a
        // rejected key, a broken collection and a slow one were
        // indistinguishable from the outside. Diagnosing the 2026-08-20
        // outage meant guessing between them; log enough to tell them apart.
        const body = await res.text().catch(() => "");
        console.error(
          `[guidelines-upstream] skip=${skip} attempt=${attempt}/${MAX_ATTEMPTS} → HTTP ${res.status} ${body.slice(0, 200)}`,
        );
        // Client errors (except 408/429) won't fix themselves on retry.
        if (res.status < 500 && res.status !== 408 && res.status !== 429) {
          return null;
        }
      } catch (err) {
        // The caller aborted (not our per-page timeout) → propagate, don't retry.
        if (opts.signal?.aborted) throw err;
        // Otherwise: our timeout or a transient network error → fall through
        // and retry.
        console.error(
          `[guidelines-upstream] skip=${skip} attempt=${attempt}/${MAX_ATTEMPTS} → ${
            err instanceof Error ? `${err.name}: ${err.message}` : String(err)
          }`,
        );
      }
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 500 * attempt));
      }
    }
    return null;
  };

  // First page tells us the total.
  const startedAt = Date.now();
  const first = await fetchOne(0);
  if (!first) {
    console.error("[guidelines-upstream] first page failed — corpus unavailable");
    return null;
  }
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

  // One bad page used to discard the whole corpus. At 25 pages that made a
  // complete crawl improbable: any single offset timing out three times threw
  // away everything already fetched, and the next attempt started from zero.
  // Failed offsets are collected and swept once more at the end instead.
  //
  // Pages are keyed by offset rather than appended, so the retried ones land
  // back in their original position — callers that don't apply an explicit
  // sort rely on upstream order.
  const byOffset = new Map<number, Guideline[]>();
  const failed: number[] = [];

  for (let i = 0; i < offsets.length; i += PARALLEL) {
    const batch = offsets.slice(i, i + PARALLEL);
    const pages = await Promise.all(batch.map(fetchOne));
    batch.forEach((skip, j) => {
      const page = pages[j];
      if (page) byOffset.set(skip, page.items || []);
      else failed.push(skip);
    });
  }

  if (failed.length > 0) {
    console.warn(
      `[guidelines-upstream] retrying ${failed.length} failed page(s): ${failed.join(", ")}`,
    );
    for (let i = 0; i < failed.length; i += PARALLEL) {
      const batch = failed.slice(i, i + PARALLEL);
      const pages = await Promise.all(batch.map(fetchOne));
      for (let j = 0; j < batch.length; j++) {
        const page = pages[j];
        if (!page) {
          // Still short after a second pass. Returning a corpus with silent
          // holes would show as "no such guideline" to a reader searching for
          // one of the missing documents, which is worse than a visible
          // failure the caller can fall back to a cached copy for.
          console.error(
            `[guidelines-upstream] bailed — page ${batch[j]} failed twice ` +
              `(${byOffset.size + 1}/${offsets.length + 1} pages, ` +
              `${Math.round((Date.now() - startedAt) / 1000)}s in)`,
          );
          return null;
        }
        byOffset.set(batch[j], page.items || []);
      }
    }
  }

  for (const skip of offsets) all.push(...(byOffset.get(skip) || []));

  console.info(
    `[guidelines-upstream] loaded ${all.length} items in ` +
      `${Math.round((Date.now() - startedAt) / 1000)}s ` +
      `(${offsets.length + 1} pages of ${actualPageSize})`,
  );
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
