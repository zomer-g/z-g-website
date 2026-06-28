import { NextRequest, NextResponse } from "next/server";
import { getPageContent } from "@/lib/content";
import type { ComptrollerReportsPageContent } from "@/types/content";
import type {
  FilterExpression,
  RulingsFilterField,
  RulingsSortField,
} from "@/types/ruling-filter";
import { VALID_FILTER_CONTROLS } from "@/types/ruling-filter";
import { fetchComptrollerPage } from "@/lib/comptroller-upstream";
import type { ComptrollerReport } from "@/types/comptroller-report";
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

// Combine the admin base filter with the date range into a single AND tree.
// meta.document_date is the standard indexed date field across TAG-IT scopes,
// so a ge/le range is safe even before the scope-13 schema is finalized.
function buildFilter(
  customQuery: FilterExpression | null,
  dateFrom: string | null,
  dateTo: string | null,
): FilterExpression | null {
  const clauses: FilterExpression[] = [];
  if (customQuery) clauses.push(customQuery);
  if (dateFrom) clauses.push({ field: "meta.document_date", op: "ge", value: dateFrom });
  if (dateTo) clauses.push({ field: "meta.document_date", op: "le", value: dateTo });
  if (clauses.length === 0) return null;
  if (clauses.length === 1) return clauses[0];
  return { op: "and", clauses };
}

interface SourceFacet {
  label: string;
  count: number;
}

function computeSourceFacets(items: ComptrollerReport[]): SourceFacet[] {
  const counts = new Map<string, number>();
  for (const it of items) {
    const label = (it.source_label || "").trim();
    if (!label) continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "he"));
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const skip = clampInt(params.get("skip"), 0, 0);
  const limit = Math.min(100, Math.max(1, clampInt(params.get("limit"), 1, 24)));
  const q = params.get("q")?.trim() || "";
  const dateFrom = params.get("date_from") || null;
  const dateTo = params.get("date_to") || null;
  const sourceFilter = new Set(params.getAll("source").filter(Boolean));

  const config = await readConfig();

  // Server-side filter + pagination + full-text live on TAG-IT.
  const filter = buildFilter(config.customQuery, dateFrom, dateTo);
  const filterJson = filter ? JSON.stringify(filter) : undefined;
  const sortParam = params.get("sort");
  const dir = params.get("dir") === "asc" ? "" : "-";
  const sortKey =
    sortParam && config.sortFields.some((s) => s.key === sortParam)
      ? `${dir}${sortParam}`
      : undefined;
  const page = Math.floor(skip / limit) + 1;

  let result;
  try {
    result = await fetchComptrollerPage({
      page,
      size: limit,
      textQuery: q || undefined,
      filterJson,
      sortKey,
    });
  } catch (err) {
    // Surface TAG-IT's own error body so we can see e.g. "scope must be one of
    // [4,6]" while scope 13 is still being enabled operator-side.
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

  // Facets are computed from the current page (approximate). Source-pill
  // narrowing is applied in-memory on the page for now; both become exact once
  // the scope-13 schema lets us push the audited-body field to TAG-IT.
  const facets = { sources: computeSourceFacets(result.items) };

  let items = result.items;
  let snippets = result.snippets;
  let relevance = result.relevance;
  if (sourceFilter.size > 0) {
    const keep = items.map((it) => sourceFilter.has((it.source_label || "").trim()));
    items = items.filter((_, i) => keep[i]);
    snippets = snippets.filter((_, i) => keep[i]);
    relevance = relevance.filter((_, i) => keep[i]);
  }

  return NextResponse.json(
    {
      total: result.total,
      skip,
      limit,
      items,
      snippets,
      relevance,
      facets,
      filterFields: config.filterFields,
      sortFields: config.sortFields,
      displayFields: config.displayFields,
      filterOptions: {},
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
