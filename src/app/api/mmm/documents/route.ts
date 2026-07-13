import { NextRequest, NextResponse } from "next/server";
import { getPageContent } from "@/lib/content";
import type { MmmPageContent } from "@/types/content";
import type {
  FilterExpression,
  RulingsFilterField,
  RulingsSortField,
} from "@/types/ruling-filter";
import { VALID_FILTER_CONTROLS } from "@/types/ruling-filter";
import {
  fetchMmmPage,
  fetchDocTypeFacets,
  MMM_CATEGORY_FIELD,
} from "@/lib/mmm-upstream";
import { UpstreamError } from "@/lib/rulings-upstream";

export const dynamic = "force-dynamic";

interface MConfig {
  customQuery: FilterExpression | null;
  filterFields: RulingsFilterField[];
  sortFields: RulingsSortField[];
  displayFields: string[];
}

async function readConfig(): Promise<MConfig> {
  try {
    const content = await getPageContent<MmmPageContent>("mmm");
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
  const params = req.nextUrl.searchParams;
  const skip = clampInt(params.get("skip"), 0, 0);
  // Cap at 12: like scope-13, TAG-IT's sorted "new shape" projection scales
  // ~2s/doc, so a larger size + sort risks the 50s timeout (→ 502). Defence in
  // depth alongside the client PAGE_SIZE=12. Revisit once TAG-IT indexes sort.
  const limit = Math.min(12, Math.max(1, clampInt(params.get("limit"), 1, 12)));
  const q = params.get("q")?.trim() || "";
  const dateFrom = params.get("date_from") || null;
  const dateTo = params.get("date_to") || null;
  const sources = params.getAll("source").filter(Boolean);

  const config = await readConfig();

  // Base filter = everything EXCEPT the document-type (source) selection: admin
  // base + native date range + admin-configured user filters. The type facet
  // counts are computed against this base (so every type's count reflects the
  // current search, letting the user switch types). The main query then also
  // applies the selected types on top.
  const baseClauses: FilterExpression[] = [];
  if (config.customQuery) baseClauses.push(config.customQuery);
  if (dateFrom) baseClauses.push({ field: "meta.document_date", op: "ge", value: dateFrom });
  if (dateTo) baseClauses.push({ field: "meta.document_date", op: "le", value: dateTo });
  baseClauses.push(...buildUserClauses(config.filterFields, parseJsonObject(params.get("userFilters"))));
  const baseFilter = andAll(baseClauses);

  const mainClauses = [...baseClauses];
  // ai.תחום is a raw scalar field — match with eq (operator-confirmed), OR-ing
  // the clauses together for a multi-select. (`in` isn't confirmed on raw ai
  // fields, so we don't rely on it.)
  if (sources.length === 1) {
    mainClauses.push({ field: MMM_CATEGORY_FIELD, op: "eq", value: sources[0] });
  } else if (sources.length > 1) {
    mainClauses.push({
      op: "or",
      clauses: sources.map((s) => ({ field: MMM_CATEGORY_FIELD, op: "eq", value: s })),
    });
  }
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

  // Fetch the page of results AND the dynamic type facet counts together (when
  // no types are curated yet the facet call returns [] with zero upstream cost).
  let result;
  let docTypeFacets;
  try {
    [result, docTypeFacets] = await Promise.all([
      fetchMmmPage({ page, size: limit, textQuery: q || undefined, filterJson, sortKey }),
      fetchDocTypeFacets({ textQuery: q || undefined, baseFilter }),
    ]);
  } catch (err) {
    // Surface TAG-IT's own error body verbatim (e.g. an unknown_field).
    if (err instanceof UpstreamError) {
      return NextResponse.json(
        { error: `Upstream ${err.status}: ${err.body.slice(0, 300)}` },
        { status: 502 },
      );
    }
    console.error("mmm proxy error:", err);
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
      facets: { sources: docTypeFacets },
      filterFields: config.filterFields,
      sortFields: config.sortFields,
      displayFields: config.displayFields,
      filterOptions,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
