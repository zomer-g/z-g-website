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
const FIELD_PATHS = {
  title: ["ai.שם_הדוח", "ai.כותרת_הדוח", "ai.כותרת", "ai.שם_המסמך", "filename"],
  date: ["meta.document_date", "ai.תאריך_הדוח", "ai.תאריך_פרסום"],
  // Audited body / responsible ministry.
  source: ["ai.גוף_מבוקר", "ai.משרד", "ai.הגוף_המבוקר", "meta.audited_body"],
  topic: ["ai.נושא", "ai.תחום", "ai.נושא_הדוח"],
  summary: ["ai.תקציר", "ai.תמצית", "ai.תקציר_הדוח"],
  reportType: ["ai.סוג_הדוח", "ai.סדרת_הדוח", "meta.report_type"],
  reportYear: ["ai.שנת_הדוח", "meta.report_year"],
} as const;

// Where a full-text result may carry its snippet + rank (when TAG-IT's public
// text_query returns them). All optional.
const SNIPPET_PATHS = ["snippet", "highlight", "meta.snippet", "meta.highlight"];
const RANK_PATHS = ["meta.rank", "rank", "score", "meta.score", "relevance"];

function resolvePath(item: UpstreamRulingItem, path: string): unknown {
  const parts = path.split(".");
  // Try the dotted path against the document and against each known group.
  const roots: Array<Record<string, unknown> | undefined> = [
    item as Record<string, unknown>,
    item.ai_analysis as Record<string, unknown> | undefined,
  ];
  for (const root of roots) {
    if (!root) continue;
    let cur: unknown = root;
    for (const p of parts) {
      if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
        cur = (cur as Record<string, unknown>)[p];
      } else {
        cur = undefined;
        break;
      }
    }
    if (cur != null && cur !== "") return cur;
  }
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

/** Map a raw TAG-IT scope-13 document onto the flat card shape. */
export function mapComptrollerDoc(item: UpstreamRulingItem): ComptrollerReport {
  return {
    id: Number(item.id),
    filename: asStr(item.filename),
    document_title: asStr(pick(item, FIELD_PATHS.title)),
    document_date: asStr(pick(item, FIELD_PATHS.date)),
    source_label: asStr(pick(item, FIELD_PATHS.source)),
    topic: asStr(pick(item, FIELD_PATHS.topic)),
    summary: asStr(pick(item, FIELD_PATHS.summary)),
    report_type: asStr(pick(item, FIELD_PATHS.reportType)),
    report_year: asStr(pick(item, FIELD_PATHS.reportYear)),
  };
}

/** Extract a per-result text snippet, if TAG-IT returned one. */
export function extractSnippet(item: UpstreamRulingItem): string {
  return asStr(pick(item, SNIPPET_PATHS)) ?? "";
}

/**
 * Extract a 0–100 relevance score from whatever rank/score TAG-IT returned.
 * Heuristic: if the value is already 0–100 use it; if it's a 0–1 cosine-style
 * score scale it up; otherwise return undefined (card shows no tier badge).
 */
export function extractRelevance(item: UpstreamRulingItem): number | undefined {
  const raw = pick(item, RANK_PATHS);
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return undefined;
  if (n >= 0 && n <= 1) return Math.round(n * 100);
  if (n > 1 && n <= 100) return Math.round(n);
  return undefined;
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
  relevance: (number | undefined)[];
  // raw items kept for facet computation (source labels live on the mapped doc)
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
  const relevance = res.items.map(extractRelevance);
  return { items, total: res.total, snippets, relevance };
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
