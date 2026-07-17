import { NextRequest, NextResponse } from "next/server";
import { getPageContent } from "@/lib/content";
import type { ComptrollerReportsPageContent } from "@/types/content";
import type {
  FilterExpression,
  RulingsFilterField,
  RulingsSortField,
} from "@/types/ruling-filter";
import { VALID_FILTER_CONTROLS } from "@/types/ruling-filter";
import { fetchComptrollerPage, fetchReportTypeFacets } from "@/lib/comptroller-upstream";
import { UpstreamError } from "@/lib/rulings-upstream";

export const dynamic = "force-dynamic";

interface CConfig {
  customQuery: FilterExpression | null;
  filterFields: RulingsFilterField[];
  sortFields: RulingsSortField[];
  displayFields: string[];
}

async function readConfig(): Promise<CConfig> {
  try {
    const content = await getPageContent<ComptrollerReportsPageContent>(
      "comptroller-reports",
    );
    const q = content?.query;
    const customQuery = q && typeof q === "object" ? (q.customQuery ?? null) : null;
    const filterFields =
      q && Array.isArray(q.filterFields)
        ? q.filterFields.filter(
            (f): f is RulingsFilterField =>
              !!f &&
              typeof f.key === "string" &&
              f.key.trim() !== "" &&
              VALID_FILTER_CONTROLS.includes(f.control),
          )
        : [];
    const sortFields =
      q && Array.isArray(q.sortFields)
        ? q.sortFields.filter(
            (s): s is RulingsSortField =>
              !!s && typeof s.key === "string" && s.key.trim() !== "",
          )
        : [];
    const displayFields =
      q && Array.isArray(q.displayFields)
        ? q.displayFields.map((s) => String(s).trim()).filter(Boolean)
        : [];
    return { customQuery, filterFields, sortFields, displayFields };
  } catch {
    return { customQuery: null, filterFields: [], sortFields: [], displayFields: [] };
  }
}

function clampInt(v: string | null, min: number, fallback: number): number {
  if (v == null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(min, Math.floor(n)) : fallback;
}

// Translate the user's active filter selections into TAG-IT filter clauses so
// they're applied server-side (the result set is paginated upstream, so they
// CAN'T be applied in memory on a single page). Shapes mirror what the
// dashboard sends: string (text/select), {min,max} (number), {from,to} (date),
// string[] (multiselect).
function buildUserClauses(
  filterFields: RulingsFilterField[],
  userFilters: Record<string, unknown>,
): FilterExpression[] {
  const clauses: FilterExpression[] = [];
  for (const f of filterFields) {
    const v = userFilters[f.key];
    if (v == null || v === "") continue;
    if (f.control === "text") {
      if (typeof v === "string" && v.trim()) {
        clauses.push({ field: f.key, op: "contains", value: v.trim() });
      }
    } else if (f.control === "select") {
      if (typeof v === "string" && v.trim()) {
        clauses.push({ field: f.key, op: f.matchOp === "contains" ? "contains" : "eq", value: v });
      }
    } else if (f.control === "multiselect") {
      const arr = Array.isArray(v) ? v.filter((x) => x !== "" && x != null) : [];
      if (arr.length) clauses.push({ field: f.key, op: "in", value: arr as (string | number)[] });
    } else if (f.control === "number") {
      const r = v as { min?: number; max?: number };
      if (r.min != null) clauses.push({ field: f.key, op: "ge", value: r.min });
      if (r.max != null) clauses.push({ field: f.key, op: "le", value: r.max });
    } else if (f.control === "date") {
      const r = v as { from?: string; to?: string };
      if (r.from) clauses.push({ field: f.key, op: "ge", value: r.from });
      if (r.to) clauses.push({ field: f.key, op: "le", value: r.to });
    } else if (f.control === "boolean") {
      if (v === "true" || v === "false" || typeof v === "boolean") {
        clauses.push({ field: f.key, op: "eq", value: v === true || v === "true" });
      }
    }
  }
  return clauses;
}

function andAll(clauses: FilterExpression[]): FilterExpression | null {
  if (clauses.length === 0) return null;
  if (clauses.length === 1) return clauses[0];
  return { op: "and", clauses };
}

function parseJsonObject(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const o = JSON.parse(raw);
    return o && typeof o === "object" ? (o as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

// Normalize raw ts_rank floats to a 0–100 relevance, relative to the strongest
// hit on this page (results arrive already sorted by rank). Items without a
// rank (no text_query) map to undefined → no tier badge.
function normalizeRanks(ranks: (number | undefined)[]): (number | undefined)[] {
  const max = ranks.reduce<number>((m, r) => (r != null && r > m ? r : m), 0);
  if (max <= 0) return ranks.map(() => undefined);
  return ranks.map((r) => (r == null ? undefined : Math.max(1, Math.round((r / max) * 100))));
}

export async function GET(req: NextRequest) {
  // Every distinct filter combination is a fresh cache key, so varying the
  // params forces unbounded TAG-IT query storms. Throttle per IP first.
  const { rateLimit, getClientIp } = await import("@/lib/rate-limit");
  const limited = rateLimit(`comptroller-documents:${getClientIp(req)}`, {
    limit: 30,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const params = req.nextUrl.searchParams;
  const skip = clampInt(params.get("skip"), 0, 0);
  // Cap at 12: scope-13's sorted "new shape" projection on TAG-IT scales
  // ~2.2s/doc, so size 24 + sort times out (~54s → 502). 12 completes in ~17s.
  // Defence-in-depth alongside the client PAGE_SIZE=12 so a direct/oversized
  // request can't re-trigger the timeout. Revisit once TAG-IT indexes the sort.
  const limit = Math.min(12, Math.max(1, clampInt(params.get("limit"), 1, 12)));
  const q = params.get("q")?.trim() || "";
  const dateFrom = params.get("date_from") || null;
  const dateTo = params.get("date_to") || null;
  const sources = params.getAll("source").filter(Boolean);

  const config = await readConfig();

  // Base filter = everything EXCEPT the report-type (source) selection: admin
  // base + native date range + admin-configured user filters. The report-type
  // facet counts are computed against this base (so every type's count reflects
  // the current search, letting the user switch types). The main query then
  // also applies the selected report types on top.
  const baseClauses: FilterExpression[] = [];
  if (config.customQuery) baseClauses.push(config.customQuery);
  if (dateFrom) baseClauses.push({ field: "meta.document_date", op: "ge", value: dateFrom });
  if (dateTo) baseClauses.push({ field: "meta.document_date", op: "le", value: dateTo });
  baseClauses.push(...buildUserClauses(config.filterFields, parseJsonObject(params.get("userFilters"))));
  const baseFilter = andAll(baseClauses);

  const mainClauses = [...baseClauses];
  if (sources.length) mainClauses.push({ field: "meta.report_group", op: "in", value: sources });
  const filter = andAll(mainClauses);
  const filterJson = filter ? JSON.stringify(filter) : undefined;

  // Sort selection. Sending a sort (or text_query) forces TAG-IT's "new shape"
  // response ({id, ai, sql, meta, snippet, rank}); without either, the legacy
  // path returns flat items AND ignores text_query. So: explicit user sort wins;
  // otherwise while searching we send no sort (text_query → relevance order +
  // new shape); for a plain listing we default to newest-first, which both
  // orders sensibly and forces the new shape.
  const sortParam = params.get("sort");
  const dir = params.get("dir") === "asc" ? "" : "-";
  let sortKey: string | undefined;
  if (sortParam && config.sortFields.some((s) => s.key === sortParam)) {
    sortKey = `${dir}${sortParam}`;
  } else if (!q) {
    sortKey = "-meta.document_date";
  }
  const page = Math.floor(skip / limit) + 1;

  // Fetch the page of results AND the dynamic report-type facet counts together
  // (the facets are ~11 cheap count queries; running them in parallel with the
  // main query keeps total latency ≈ the slower of the two).
  let result;
  let reportTypeFacets;
  try {
    [result, reportTypeFacets] = await Promise.all([
      fetchComptrollerPage({ page, size: limit, textQuery: q || undefined, filterJson, sortKey }),
      fetchReportTypeFacets({ textQuery: q || undefined, baseFilter }),
    ]);
  } catch (err) {
    // Surface TAG-IT's own error body verbatim (e.g. an unknown_field).
    if (err instanceof UpstreamError) {
      return NextResponse.json(
        { error: `Upstream ${err.status}: ${err.body.slice(0, 300)}` },
        { status: 502 },
      );
    }
    console.error("comptroller proxy error:", err);
    return NextResponse.json({ error: "Upstream fetch failed" }, { status: 502 });
  }

  if (!result) {
    return NextResponse.json({ error: "API not configured" }, { status: 503 });
  }

  // Configured select dropdowns get their options from the filterField itself
  // (curated/enum list), since we don't scan a full corpus here.
  const filterOptions: Record<string, string[]> = {};
  for (const f of config.filterFields) {
    if ((f.control === "select" || f.control === "multiselect") && Array.isArray(f.options)) {
      filterOptions[f.key] = f.options;
    }
  }

  return NextResponse.json(
    {
      total: result.total,
      skip,
      limit,
      items: result.items,
      snippets: result.snippets,
      relevance: normalizeRanks(result.ranks),
      facets: { sources: reportTypeFacets },
      filterFields: config.filterFields,
      sortFields: config.sortFields,
      displayFields: config.displayFields,
      filterOptions,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
