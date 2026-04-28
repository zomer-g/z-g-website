import type {
  ClassActionDocument,
  UpstreamListResponse,
} from "@/types/class-action";

const UPSTREAM = "https://tag-it.biz/api/public/class-action/documents";
const PAGE_SIZE = 500;
const PARALLEL = 4;

export interface FetchAllOptions {
  filters?: Record<string, string | undefined>;
  signal?: AbortSignal;
}

export async function fetchAllUpstreamClassActions(
  opts: FetchAllOptions = {},
): Promise<ClassActionDocument[] | null> {
  const apiKey = process.env.CLASS_ACTION_API_KEY;
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

  const fetchOne = async (skip: number): Promise<UpstreamListResponse | null> => {
    const res = await fetch(buildUrl(skip), {
      headers: { "X-API-Key": apiKey, Accept: "application/json" },
      cache: "no-store",
      signal: opts.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as UpstreamListResponse;
  };

  const first = await fetchOne(0);
  if (!first) return null;
  const all: ClassActionDocument[] = [...(first.items || [])];
  const total = Number(first.total) || all.length;
  if (all.length >= total) return all;

  // TAG-IT silently caps `limit` for some collections (class-action returns
  // ~200 per page even when we ask for 500). Advance offsets by the actual
  // page size we got, not the size we requested — otherwise we skip whole
  // ranges of items and return a truncated set.
  const actualPageSize = (first.items?.length ?? 0) || PAGE_SIZE;

  const offsets: number[] = [];
  for (let skip = actualPageSize; skip < total; skip += actualPageSize) offsets.push(skip);

  for (let i = 0; i < offsets.length; i += PARALLEL) {
    const batch = offsets.slice(i, i + PARALLEL);
    const pages = await Promise.all(batch.map(fetchOne));
    if (pages.some((p) => p === null)) return null;
    for (const page of pages) {
      if (page) all.push(...(page.items || []));
    }
  }

  return all;
}

export function stripClassActionUrls(items: ClassActionDocument[]): ClassActionDocument[] {
  return items.map((it) => {
    const rest = { ...(it as unknown as Record<string, unknown>) };
    delete rest.file_url;
    return rest as unknown as ClassActionDocument;
  });
}
