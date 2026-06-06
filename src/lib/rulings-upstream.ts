/**
 * Bulk fetcher for the TAG-IT rulings endpoint.
 * Mirrors class-actions-upstream.ts: pages through the upstream API in parallel
 * and returns the full result set so the API route can cache, filter and
 * paginate in memory.
 */

export interface UpstreamRulingItem {
  id: number;
  filename?: string;
  scope_id?: number;
  ai_analysis?: Record<string, unknown>;
  [key: string]: unknown;
}

interface UpstreamListResponse {
  total: number;
  page: number;
  size: number;
  items?: UpstreamRulingItem[];
  documents?: UpstreamRulingItem[];
}

const UPSTREAM_BASE = process.env.TAGIT_API_URL || "https://tag-it.biz";
const PAGE_SIZE = 100;   // TAG-IT spec: max 100 per page
const PARALLEL = 2;      // low concurrency to cap peak fetch memory (RSS)

function getApiKey() {
  return process.env.RULINGS_API_KEY || process.env.CLASS_ACTION_API_KEY;
}

export interface FetchAllRulingsOptions {
  scopeId: number;
  signal?: AbortSignal;
  // Optional server-side filter — opaque JSON-encoded FilterExpression.
  // We forward it to TAG-IT untouched. TAG-IT returns flat error JSON
  // for bad filters; we propagate it via UpstreamError below.
  filterJson?: string;
  // Sort key, e.g. "-ai.תאריך_המסמך". Sending sort is enough to force
  // TAG-IT's "new shape" response ({id, ai:{}, sql:{}, meta:{}}) — we
  // always send one so sql.* and meta.* are available for displayFields.
  sortKey?: string;
  // Comma-separated field keys. Sending `fields` ALSO forces the new shape
  // (and limits the payload). We use it to pull sql.*/meta.* groups that the
  // page config references when no filter is set (e.g. defamation with a
  // sql.* display field but no customQuery).
  fieldsParam?: string;
}

/**
 * Surfaced upstream failure. Lets the route turn an upstream 400 into a 502
 * with the same flat error body, so the admin can see "unknown_field: ai.X"
 * directly in the page instead of "Upstream fetch failed".
 */
export class UpstreamError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string) {
    super(`Upstream HTTP ${status}: ${body.slice(0, 200)}`);
    this.status = status;
    this.body = body;
  }
}

export async function fetchAllUpstreamRulings(
  opts: FetchAllRulingsOptions,
): Promise<UpstreamRulingItem[] | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const buildUrl = (page: number) => {
    const u = new URL(`${UPSTREAM_BASE}/api/public/rulings/documents`);
    u.searchParams.set("scope", String(opts.scopeId));
    u.searchParams.set("page", String(page));
    u.searchParams.set("size", String(PAGE_SIZE));
    if (opts.filterJson) u.searchParams.set("filter", opts.filterJson);
    if (opts.sortKey) u.searchParams.set("sort", opts.sortKey);
    if (opts.fieldsParam) u.searchParams.set("fields", opts.fieldsParam);
    return u.toString();
  };

  const fetchPage = async (
    page: number,
  ): Promise<UpstreamListResponse> => {
    const res = await fetch(buildUrl(page), {
      headers: { "X-API-Key": apiKey, Accept: "application/json" },
      cache: "no-store",
      signal: opts.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new UpstreamError(res.status, body);
    }
    return (await res.json()) as UpstreamListResponse;
  };

  const first = await fetchPage(1);

  const firstItems = first.items || first.documents || [];
  const total = Number(first.total) || firstItems.length;
  const all: UpstreamRulingItem[] = [...firstItems];

  if (all.length >= total) return all;

  // Use the actual size we received (TAG-IT may silently cap) to advance
  // pages — otherwise we'd skip or duplicate ranges.
  const actualSize = firstItems.length || PAGE_SIZE;
  const totalPages = Math.ceil(total / actualSize);

  const remainingPages: number[] = [];
  for (let p = 2; p <= totalPages; p++) remainingPages.push(p);

  for (let i = 0; i < remainingPages.length; i += PARALLEL) {
    const batch = remainingPages.slice(i, i + PARALLEL);
    const responses = await Promise.all(batch.map(fetchPage));
    for (const r of responses) {
      all.push(...(r.items || r.documents || []));
    }
  }

  return all;
}
