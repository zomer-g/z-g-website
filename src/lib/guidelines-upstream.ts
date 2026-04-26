import type { Guideline, UpstreamGuidelinesListResponse } from "@/types/guideline";

const UPSTREAM = "https://tag-it.biz/api/public/over-guidelines/documents";
const PAGE_SIZE = 500; // upstream max
const PARALLEL = 4;

export function getGuidelinesApiKey(): string | undefined {
  return process.env.GUIDELINES_API_KEY || process.env.CLASS_ACTION_API_KEY;
}

export interface FetchAllOptions {
  filters?: Record<string, string | undefined>;
  signal?: AbortSignal;
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
    const res = await fetch(buildUrl(skip), {
      headers: { "X-API-Key": apiKey, Accept: "application/json" },
      cache: "no-store",
      signal: opts.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as UpstreamGuidelinesListResponse;
  };

  // First page tells us the total.
  const first = await fetchOne(0);
  if (!first) return null;
  const all: Guideline[] = [...(first.items || [])];
  const total = Number(first.total) || all.length;
  if (all.length >= total) return all;

  const offsets: number[] = [];
  for (let skip = PAGE_SIZE; skip < total; skip += PAGE_SIZE) offsets.push(skip);

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
