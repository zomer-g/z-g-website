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
// Rulings fetches are server-side-filtered (only the configured doc types),
// so the result set is much smaller than a full scope corpus — we can afford
// PARALLEL=4 here to keep cold-load latency under the function timeout.
const PARALLEL = 4;
// Cap how many pages we pull. Some scopes are huge even after filtering
// (defamation = ~4.4k פס"ד = 44 pages); pulling all of them makes TAG-IT 502
// on deep pages and overruns the function timeout. TAG-IT returns newest-first
// by default, and these are "latest rulings" pages, so the most-recent
// MAX_PAGES×PAGE_SIZE documents are exactly what we want. 30 pages = 3000 docs.
const MAX_PAGES = 30;

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

/* ─── Server-side pagination ───────────────────────────────────────────────
   Fetch ONE page directly from TAG-IT (filter + sort applied upstream) instead
   of pulling the whole corpus and paginating in memory. This is what the
   rulings route uses: it never holds more than `size` documents, so large
   scopes (defamation = thousands) can't OOM or time out. */

export interface FetchRulingsPageOptions {
  scopeId: number;
  page: number; // 1-based
  size: number;
  filterJson?: string;
  sortKey?: string; // e.g. "-meta.document_date"
  // Full-text search over the document MD/text (TAG-IT `text_query`). Used by
  // the comptroller-reports page; for scopes where TAG-IT doesn't index the
  // text it's simply ignored upstream and the page still lists.
  textQuery?: string;
  signal?: AbortSignal;
}

export interface RulingsPageResult {
  items: UpstreamRulingItem[];
  total: number;
}

// Hard per-request timeout. Most scope queries return in ~1-2s, but a COLD
// load (first request after the per-scope catalog cache expires, ~5 min) can
// take longer on a big scope like scope-1 (~49k docs) — TAG-IT recommends a
// ≥30s client budget for that. We set 35s so cold loads succeed (then the
// route's page cache keeps subsequent loads fast), while still aborting before
// the fetch hangs the serverless function indefinitely.
const PAGE_TIMEOUT_MS = 35_000;
const SCHEMA_TIMEOUT_MS = 9_000;

async function fetchWithTimeout(
  url: string,
  apiKey: string,
  ms: number,
  outerSignal?: AbortSignal,
): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  const onAbort = () => ctrl.abort();
  outerSignal?.addEventListener("abort", onAbort);
  try {
    return await fetch(url, {
      headers: { "X-API-Key": apiKey, Accept: "application/json" },
      cache: "no-store",
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(t);
    outerSignal?.removeEventListener("abort", onAbort);
  }
}

export async function fetchUpstreamRulingsPage(
  opts: FetchRulingsPageOptions,
): Promise<RulingsPageResult | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const u = new URL(`${UPSTREAM_BASE}/api/public/rulings/documents`);
  u.searchParams.set("scope", String(opts.scopeId));
  u.searchParams.set("page", String(opts.page));
  u.searchParams.set("size", String(opts.size));
  if (opts.filterJson) u.searchParams.set("filter", opts.filterJson);
  if (opts.sortKey) u.searchParams.set("sort", opts.sortKey);
  if (opts.textQuery && opts.textQuery.trim()) {
    u.searchParams.set("text_query", opts.textQuery.trim());
  }

  const MAX_ATTEMPTS = 2;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let res: Response;
    try {
      res = await fetchWithTimeout(u.toString(), apiKey, PAGE_TIMEOUT_MS, opts.signal);
    } catch (err) {
      // AbortError = our timeout (TAG-IT too slow) or caller cancelled.
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 600));
        continue;
      }
      throw new UpstreamError(
        504,
        `TAG-IT request timed out after ${PAGE_TIMEOUT_MS}ms (${(err as Error)?.name || "fetch error"})`,
      );
    }
    if (res.ok) {
      const data = (await res.json()) as UpstreamListResponse;
      return {
        items: data.items || data.documents || [],
        total: Number(data.total) || 0,
      };
    }
    const body = await res.text().catch(() => "");
    // 4xx (e.g. unknown_field) is permanent — surface immediately.
    if (res.status >= 400 && res.status < 500) {
      throw new UpstreamError(res.status, body);
    }
    // 5xx — retry once for a transient TAG-IT gateway blip.
    if (attempt < MAX_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, 800));
      continue;
    }
    throw new UpstreamError(res.status, body);
  }
  return null;
}

/** Schema (field list incl. enum_values_sample) for a scope — server-side,
 *  with the API key. Used to populate select-filter dropdowns without
 *  scanning the corpus. */
export interface UpstreamSchemaField {
  key: string;
  label?: string;
  type?: string;
  source?: string;
  enum_values_sample?: string[];
}

export async function fetchUpstreamRulingsSchema(
  scopeId: number,
): Promise<UpstreamSchemaField[] | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;
  const url = `${UPSTREAM_BASE}/api/public/rulings/schema?scope=${scopeId}`;
  // Best-effort with a short timeout — this only feeds select-filter
  // dropdowns. If it's slow (computing enums over a big scope) we'd rather
  // return empty options than hang the page.
  try {
    const res = await fetchWithTimeout(url, apiKey, SCHEMA_TIMEOUT_MS);
    if (!res.ok) return null;
    const data = (await res.json()) as { fields?: UpstreamSchemaField[] };
    return Array.isArray(data.fields) ? data.fields : [];
  } catch {
    return null;
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

  const fetchPageOnce = async (
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

  // Retry a page on transient failures (5xx / network — large scopes like
  // defamation make TAG-IT 502 intermittently on deep pages). 4xx is a
  // permanent client error (e.g. unknown_field) and is re-thrown immediately
  // so the admin sees it. Returns null only when every attempt failed with a
  // transient error — the caller decides whether that's fatal.
  const fetchPage = async (page: number): Promise<UpstreamListResponse | null> => {
    const MAX_ATTEMPTS = 3;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        return await fetchPageOnce(page);
      } catch (err) {
        const status = err instanceof UpstreamError ? err.status : 0;
        // Permanent client errors: don't retry, surface immediately.
        if (status >= 400 && status < 500) throw err;
        if (attempt < MAX_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, 1000 * attempt));
          continue;
        }
        console.error(
          `rulings-upstream: page ${page} failed after ${MAX_ATTEMPTS} attempts (status ${status})`,
        );
        return null;
      }
    }
    return null;
  };

  // First page is required (gives us the total + drives pagination).
  const first = await fetchPage(1);
  if (!first) {
    throw new UpstreamError(502, "first page unavailable after retries");
  }

  const firstItems = first.items || first.documents || [];
  const total = Number(first.total) || firstItems.length;
  const all: UpstreamRulingItem[] = [...firstItems];

  if (all.length >= total) return all;

  // Use the actual size we received (TAG-IT may silently cap) to advance
  // pages — otherwise we'd skip or duplicate ranges.
  const actualSize = firstItems.length || PAGE_SIZE;
  const totalPages = Math.ceil(total / actualSize);
  // Cap at MAX_PAGES — the most-recent N docs (TAG-IT default = newest first).
  const pagesToFetch = Math.min(totalPages, MAX_PAGES);
  if (totalPages > MAX_PAGES) {
    console.warn(
      `rulings-upstream: scope ${opts.scopeId} has ${total} docs (${totalPages} pages) — capping to ${MAX_PAGES} most-recent pages`,
    );
  }

  const remainingPages: number[] = [];
  for (let p = 2; p <= pagesToFetch; p++) remainingPages.push(p);

  for (let i = 0; i < remainingPages.length; i += PARALLEL) {
    const batch = remainingPages.slice(i, i + PARALLEL);
    const responses = await Promise.all(batch.map(fetchPage));
    for (const r of responses) {
      // A null here means one page permanently failed; we keep the rest
      // rather than breaking the whole listing (a few missing rows beats a
      // 502 page). The failure is logged above.
      if (r) all.push(...(r.items || r.documents || []));
    }
  }

  return all;
}
