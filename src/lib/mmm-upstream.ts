/**
 * TAG-IT scope-14 (Knesset Research & Information Center — מ.מ.מ) adapter.
 *
 * Reuses the shared rulings page fetcher (server-side filter + pagination + the
 * `text_query` full-text param) and maps each TAG-IT document — shape
 * `{ id, ai:{}, sql:{}, meta:{} }` — onto the flat `MmmDoc` the card renders.
 * This is a clone of comptroller-upstream.ts (scope 13); the only differences
 * are the scope id, the scope-specific field paths, and the category/type facet
 * dimension.
 *
 * ✅ Field paths confirmed against the live scope-14 API (operator recon,
 * 2026-07-13): 6,493 docs served publicly. The SHARED meta fields
 * (meta.document_title / meta.document_date / meta.filename / meta.scope_id) are
 * present, so title/date/PDF/sort work. The scope-specific type/category
 * dimension is `ai.תחום` (NOT meta.report_group — that field is empty here,
 * only 2 docs). `ai.תחום` is a RAW, unindexed ai field: the operator confirmed
 * exact/contains filtering works fast over the 6,493-doc corpus, so the facet
 * uses `eq` (never `in`, which isn't confirmed on raw ai fields). If facet
 * latency ever bites, the fix is a TAG-IT-side projection of תחום to an indexed
 * meta.* array column.
 */
import {
  fetchUpstreamRulingsPage,
  type UpstreamRulingItem,
} from "@/lib/rulings-upstream";
import type { MmmDoc } from "@/types/mmm-doc";
import type { FilterExpression } from "@/types/ruling-filter";

export const MMM_SCOPE = 14;

// First matching (present, non-empty) path wins. Paths are dotted and resolved
// against the merged {ai, sql, meta, <flat>} document.
// ✅ meta.document_title / meta.document_date / meta.filename are the SHARED
// rulings meta fields (confirmed present on scope 14). ai.תחום / ai.תקציר are
// confirmed scope-14 ai fields; ai.מחבר is a best-guess that hides when absent.
const FIELD_PATHS = {
  title: ["meta.document_title", "ai.כותרת_המסמך", "ai.שם_המסמך", "filename"],
  date: ["meta.document_date", "ai.תאריך_המסמך"],
  // The document domain/type (e.g. "סקירה כלכלית", "פיקוח תקציבי") — the scope-14
  // analog of scope-13's report_group. Drives the card badge + the facet pills.
  docType: ["ai.תחום"],
  author: ["ai.מחבר", "ai.כותב", "ai.מחברת"],
  topic: ["ai.נושא"],
  summary: ["ai.תקציר", "ai.תמצית"],
} as const;

// The category/type dimension — drives the badge + the facet-pill filter.
// Confirmed scope-14 field: ai.תחום (raw, single scalar string per doc).
const CATEGORY_PATHS = ["ai.תחום"];

// Full-text result extras returned by TAG-IT's text_query.
const SNIPPET_PATHS = ["snippet"];
// ts_rank relevance (small unbounded float). Normalized to 0–100 per page by the
// route, so we return the raw value here.
const RANK_PATHS = ["rank", "meta.rank"];

function descend(root: Record<string, unknown> | undefined, parts: string[]): unknown {
  if (!root) return undefined;
  let cur: unknown = root;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return cur != null && cur !== "" ? cur : undefined;
}

function resolvePath(item: UpstreamRulingItem, path: string): unknown {
  const parts = path.split(".");
  const top = item as Record<string, unknown>;
  const nested =
    descend(top, parts) ??
    descend(top.ai_analysis as Record<string, unknown> | undefined, parts);
  if (nested != null) return nested;
  // Flat shape: the group prefix is absent and the bare key sits at the top
  // level (e.g. "document_date" instead of "meta.document_date").
  if (parts.length > 1) return descend(top, [parts[parts.length - 1]]);
  return undefined;
}

function pick(item: UpstreamRulingItem, paths: readonly string[]): unknown {
  for (const p of paths) {
    const v = resolvePath(item, p);
    if (v != null && v !== "") return v;
  }
  return undefined;
}

function asStr(v: unknown): string | undefined {
  if (v == null || v === "") return undefined;
  return typeof v === "string" ? v : String(v);
}

// Resolve a field that may be a string or string[] into a clean string array.
function resolveArray(item: UpstreamRulingItem, paths: readonly string[]): string[] {
  const v = pick(item, paths);
  if (v == null || v === "") return [];
  if (Array.isArray(v)) return v.map((x) => String(x)).filter((s) => s.trim() !== "");
  return [String(v)];
}

/** Map a raw TAG-IT scope-14 document onto the flat card shape. */
export function mapMmmDoc(item: UpstreamRulingItem): MmmDoc {
  const categories = resolveArray(item, CATEGORY_PATHS);
  return {
    id: Number(item.id),
    filename: asStr(item.filename),
    document_title: asStr(pick(item, FIELD_PATHS.title)),
    document_date: asStr(pick(item, FIELD_PATHS.date)),
    // First category drives the card badge; the full array stays for the
    // type facet pills (matched via the category `in` filter).
    doc_type: asStr(pick(item, FIELD_PATHS.docType)) ?? categories[0],
    categories,
    author: asStr(pick(item, FIELD_PATHS.author)),
    topic: asStr(pick(item, FIELD_PATHS.topic)),
    summary: asStr(pick(item, FIELD_PATHS.summary)),
  };
}

/** Per-result text snippet (TAG-IT highlights matches with «…»). */
export function extractSnippet(item: UpstreamRulingItem): string {
  return asStr(pick(item, SNIPPET_PATHS)) ?? "";
}

/** Raw ts_rank relevance (small float); the route normalizes per page. */
export function extractRank(item: UpstreamRulingItem): number | undefined {
  const raw = pick(item, RANK_PATHS);
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

/* ── Document-type facets (category dimension) ──
   The filter screen shows the document TYPES as clickable pills (like the
   comptroller source facets); clicking one filters the corpus on ai.תחום with an
   `eq` match. The pills are a CURATED subset of the ~35 distinct תחום values —
   the meaningful head of the distribution, copied verbatim from the live corpus
   (2026-07-13, most-common first) so `eq` matches exactly. The long tail (~25
   rarer values) is intentionally dropped from the pills but stays reachable via
   the free-text search. */

export interface CategoryFacet {
  label: string;
  count?: number;
}

// The raw ai field the facet `eq` filter targets. Keep in sync with
// CATEGORY_PATHS[0]. Exact match is the operator-confirmed op for this field
// (`in` is NOT confirmed on raw ai fields, so the route ORs eq clauses instead).
const CATEGORY_FIELD = "ai.תחום";

// Curated head of the ai.תחום distribution (value → approx corpus count, for
// ordering only). Counts are just the initial ranking; live facet counts come
// from fetchDocTypeFacets against the current query.
const DOC_TYPE_SERIES: string[] = [
  "סקירה כלכלית",
  "פיקוח תקציבי",
  "סקירה משווה",
  "מבט על",
  "סקירה משפטית משווה",
  "נתונים",
  "אומדן עלות",
  "רקע לדיון",
  'אחר [מסמך ממ"מ]',
  "מכתב",
  "מבט משווה",
];

const facetCache = new Map<string, { ts: number; facets: CategoryFacet[] }>();
const FACET_TTL_MS = 10 * 60_000;
const FACET_MAX_ENTRIES = 60;

export async function fetchDocTypeFacets(opts: {
  textQuery?: string;
  baseFilter?: FilterExpression | null;
}): Promise<CategoryFacet[]> {
  // No curated types configured yet → no facet pills, zero upstream queries.
  if (DOC_TYPE_SERIES.length === 0) return [];

  const key = JSON.stringify({ q: opts.textQuery ?? "", f: opts.baseFilter ?? null });
  const cached = facetCache.get(key);
  if (cached && Date.now() - cached.ts < FACET_TTL_MS) return cached.facets;

  const counts = await Promise.all(
    DOC_TYPE_SERIES.map(async (type) => {
      const typeClause: FilterExpression = {
        field: CATEGORY_FIELD,
        op: "eq",
        value: type,
      };
      const filter: FilterExpression = opts.baseFilter
        ? { op: "and", clauses: [opts.baseFilter, typeClause] }
        : typeClause;
      const res = await fetchUpstreamRulingsPage({
        scopeId: MMM_SCOPE,
        page: 1,
        size: 1,
        textQuery: opts.textQuery,
        filterJson: JSON.stringify(filter),
        sortKey: opts.textQuery ? undefined : "-meta.document_date",
      }).catch(() => null);
      return { label: type, count: res?.total ?? 0 };
    }),
  );

  const facets = counts
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);
  facetCache.set(key, { ts: Date.now(), facets });
  if (facetCache.size > FACET_MAX_ENTRIES) {
    facetCache.delete(facetCache.keys().next().value as string);
  }
  return facets;
}

/** The filter field the facet-pill selection maps to (route uses this for the
 *  `in` clause). Exposed so the route and the facet builder stay in lockstep. */
export const MMM_CATEGORY_FIELD = CATEGORY_FIELD;

export interface FetchMmmPageOptions {
  page: number; // 1-based
  size: number;
  textQuery?: string;
  filterJson?: string;
  sortKey?: string;
  signal?: AbortSignal;
}

export interface MmmPageResult {
  items: MmmDoc[];
  total: number;
  snippets: string[];
  // Raw ts_rank per item (undefined when no text_query); route normalizes 0–100.
  ranks: (number | undefined)[];
}

/**
 * Fetch one page of scope-14 documents from TAG-IT and map to card docs.
 * Returns null when the API key is missing (local dev without RULINGS_API_KEY).
 */
export async function fetchMmmPage(
  opts: FetchMmmPageOptions,
): Promise<MmmPageResult | null> {
  const res = await fetchUpstreamRulingsPage({
    scopeId: MMM_SCOPE,
    page: opts.page,
    size: opts.size,
    textQuery: opts.textQuery,
    filterJson: opts.filterJson,
    sortKey: opts.sortKey,
    signal: opts.signal,
  });
  if (!res) return null;
  const items = res.items.map(mapMmmDoc);
  const snippets = res.items.map(extractSnippet);
  const ranks = res.items.map(extractRank);
  return { items, total: res.total, snippets, ranks };
}

/**
 * Fetch a single scope-14 document by id. TAG-IT has no single-doc public
 * endpoint, so — like the other rulings pages — we query the list with a
 * `meta.id` equality filter and take the first hit. Returns null if not found
 * or the API key is missing.
 */
export async function fetchMmmById(
  id: number,
  signal?: AbortSignal,
): Promise<MmmDoc | null> {
  const res = await fetchUpstreamRulingsPage({
    scopeId: MMM_SCOPE,
    page: 1,
    size: 1,
    filterJson: JSON.stringify({ field: "meta.id", op: "eq", value: id }),
    signal,
  });
  if (!res || res.items.length === 0) return null;
  return mapMmmDoc(res.items[0]);
}
