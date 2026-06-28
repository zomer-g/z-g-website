/**
 * TAG-IT scope-13 (State Comptroller reports) adapter.
 *
 * Reuses the shared rulings page fetcher (server-side filter + pagination +
 * the new `text_query` full-text param) and maps each TAG-IT document — shape
 * `{ id, ai:{}, sql:{}, meta:{} }` — onto the flat `ComptrollerReport` the card
 * renders.
 *
 * ⚠️ The source field paths below are PLACEHOLDERS pending the real scope-13
 * schema (see scratchpad/tagit-handoff-scope13-comptroller.md). Each card field
 * resolves the first non-empty candidate path, so when the schema arrives the
 * only change needed here is to adjust the `FIELD_PATHS` lists. Until TAG-IT
 * exposes scope 13 publicly the page still renders (empty / error state).
 */
import {
  fetchUpstreamRulingsPage,
  type UpstreamRulingItem,
} from "@/lib/rulings-upstream";
import type { ComptrollerReport } from "@/types/comptroller-report";

export const COMPTROLLER_SCOPE = 13;

// First matching (present, non-empty) path wins. Paths are dotted and resolved
// against the merged {ai, sql, meta, <flat>} document.
// ✅ Confirmed against the live scope-13 API: meta.document_title /
// meta.document_date / meta.report_group are structured fields. The ai.* paths
// for summary/topic are still best-guess fallbacks pending a sample doc.
const FIELD_PATHS = {
  title: ["meta.document_title", "ai.כותרת_המסמך", "ai.שם_הדוח", "filename"],
  date: ["meta.document_date", "ai.תאריך_המסמך"],
  // The audit series / source of the report (e.g. "מבקר המדינה — ביקורת על
  // השלטון המקומי"). Confirmed present on scope-13 docs as ai.מקור_הנחיה.
  series: ["ai.מקור_הנחיה", "ai.מקור"],
  topic: ["ai.נושא", "ai.תחום"],
  summary: ["ai.תקציר", "ai.תמצית"],
} as const;

// report_group is an array (a doc may belong to several series/bodies). It's
// the only structured "category" field — drives the badge + the select filter.
const REPORT_GROUP_PATHS = ["meta.report_group"];

// Full-text result extras returned by TAG-IT's text_query.
const SNIPPET_PATHS = ["snippet"];
// ts_rank relevance (small unbounded float). Normalized to 0–100 per page by
// the route, so we return the raw value here.
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
  // New shape: nested under ai/sql/meta (or legacy ai_analysis). The dotted
  // path resolves directly against the document.
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

/** Map a raw TAG-IT scope-13 document onto the flat card shape. */
export function mapComptrollerDoc(item: UpstreamRulingItem): ComptrollerReport {
  const reportGroup = resolveArray(item, REPORT_GROUP_PATHS);
  return {
    id: Number(item.id),
    filename: asStr(item.filename),
    document_title: asStr(pick(item, FIELD_PATHS.title)),
    document_date: asStr(pick(item, FIELD_PATHS.date)),
    // First group drives the card badge; the full array stays for the report-
    // type facet pills (matched via the report_group `in` filter).
    source_label: reportGroup[0],
    report_group: reportGroup,
    series: asStr(pick(item, FIELD_PATHS.series)),
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

/* ── Report-type facets (report_group) ──
   The filter screen shows the report TYPES as clickable pills (like the
   guidelines source facets); clicking one filters via the report_group `in`
   path. meta.report_group actually mixes ~11 thematic report SERIES with ~185
   individual audited bodies (ministries, municipalities, companies). The user
   wants "report types", so the pills are the curated series subset — values
   copied verbatim from the live corpus so the `in` filter matches exactly.
   Ordered most-common-first (per the known corpus distribution). */

export interface ReportGroupFacet {
  label: string;
  count?: number;
}

const REPORT_TYPE_SERIES: string[] = [
  "מטלות רוחב",
  "דוח מימון בחירות ברשויות המקומיות",
  "עיונים, מאמרים, ספרים",
  "דוח מימון מפלגות",
  "דוח נציב תלונות הציבור",
  "דוח ביקורת מיוחד",
  "מטלות רוחב ומטלות בין-משרדיות",
  "דוח מעקב",
  "דוח מימון בחירות מקדימות (פריימריז)",
  "חוות דעת",
  "ביקורת על האיגודים",
];

export async function fetchReportGroupFacets(): Promise<ReportGroupFacet[]> {
  return REPORT_TYPE_SERIES.map((label) => ({ label }));
}

export interface FetchComptrollerPageOptions {
  page: number; // 1-based
  size: number;
  textQuery?: string;
  filterJson?: string;
  sortKey?: string;
  signal?: AbortSignal;
}

export interface ComptrollerPageResult {
  items: ComptrollerReport[];
  total: number;
  snippets: string[];
  // Raw ts_rank per item (undefined when no text_query); route normalizes 0–100.
  ranks: (number | undefined)[];
}

/**
 * Fetch one page of scope-13 reports from TAG-IT and map to card docs.
 * Returns null when the API key is missing (local dev without RULINGS_API_KEY).
 */
export async function fetchComptrollerPage(
  opts: FetchComptrollerPageOptions,
): Promise<ComptrollerPageResult | null> {
  const res = await fetchUpstreamRulingsPage({
    scopeId: COMPTROLLER_SCOPE,
    page: opts.page,
    size: opts.size,
    textQuery: opts.textQuery,
    filterJson: opts.filterJson,
    sortKey: opts.sortKey,
    signal: opts.signal,
  });
  if (!res) return null;
  const items = res.items.map(mapComptrollerDoc);
  const snippets = res.items.map(extractSnippet);
  const ranks = res.items.map(extractRank);
  return { items, total: res.total, snippets, ranks };
}

/**
 * Fetch a single scope-13 report by id. TAG-IT has no single-doc public
 * endpoint, so — like the other rulings pages — we query the list with a
 * `meta.id` equality filter and take the first hit. Returns null if not found
 * or the API key is missing.
 */
export async function fetchComptrollerById(
  id: number,
  signal?: AbortSignal,
): Promise<ComptrollerReport | null> {
  const res = await fetchUpstreamRulingsPage({
    scopeId: COMPTROLLER_SCOPE,
    page: 1,
    size: 1,
    filterJson: JSON.stringify({ field: "meta.id", op: "eq", value: id }),
    signal,
  });
  if (!res || res.items.length === 0) return null;
  return mapComptrollerDoc(res.items[0]);
}
