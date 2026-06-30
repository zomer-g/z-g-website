/**
 * Filter expression language for the rulings API.
 *
 * Mirrors the spec sent to TAG-IT: AND/OR/NOT trees over leaf comparisons.
 * We carry the same JSON shape end-to-end:
 *   admin UI → page content → /api/rulings → TAG-IT ?filter=…
 *
 * When TAG-IT supports it the filter is applied server-side; until then we
 * apply the same expression in memory against the bulk-cached snapshot, so
 * the admin experience is identical either way.
 */

export type Comparator =
  | "eq"
  | "ne"
  | "gt"
  | "ge"
  | "lt"
  | "le"
  | "contains"
  | "starts_with"
  | "in"
  | "is_null"
  | "not_null";

export type FilterValue =
  | string
  | number
  | boolean
  | null
  | Array<string | number | boolean>;

export interface LeafFilter {
  field: string;          // e.g. "ai.כותרת_המסמך", "sql.הוצאות_משפט"
  op: Comparator;
  value?: FilterValue;    // omitted for is_null / not_null
}

export interface AndFilter {
  op: "and";
  clauses: FilterExpression[];
}

export interface OrFilter {
  op: "or";
  clauses: FilterExpression[];
}

export interface NotFilter {
  op: "not";
  clause: FilterExpression;
}

export type FilterExpression = LeafFilter | AndFilter | OrFilter | NotFilter;

/**
 * A field exposed to the END USER as an interactive filter control on the
 * public page. The admin configures these; the page renders a control per
 * entry and the API applies the user's selections in memory on top of the
 * admin's `customQuery`.
 *
 *   text    → free-text "contains" box
 *   select  → dropdown of distinct values found in the data
 *   number  → min/max numeric range
 *   date    → from/to date range
 *   boolean → כן/לא dropdown over a true/false field (eq match)
 */
export type FilterControl =
  | "text"
  | "select"
  | "multiselect" // pick several values; matches as OR (`in`) over an array field
  | "number"
  | "date"
  | "yearrange" // pick a start/end YEAR; sent as a date ge/le range (Jan 1 … Dec 31)
  | "boolean";

export interface RulingsFilterField {
  key: string;        // e.g. "ai.בית_משפט", "sql.סכום_הוצאות_שקלים"
  label: string;      // shown above the control
  control: FilterControl;
  // For "select" controls: a fixed option list. When set it takes precedence
  // over values discovered from the upstream schema (needed for fields whose
  // schema doesn't advertise enum samples, e.g. sql.הגנות_שנטענו.התקבלה).
  options?: string[];
  // For "select" / "text": how to match the user's choice against the field.
  // Defaults to "eq" for select / "contains" for text. The escape hatch is
  // "contains" on select — useful when the underlying field has many noisy
  // variants of the same logical value (e.g. dozens of court-name spellings
  // that all contain the city). Then options can be a clean curated list
  // (cities) and any document whose court name contains the choice matches.
  matchOp?: "eq" | "contains";
  // Optional collapsible-group label. Filters sharing a `group` render together
  // inside an accordion section (collapsed by default) so a long filter set
  // isn't all on screen at once. Ungrouped filters stay always-visible.
  group?: string;
}

/**
 * A field the END USER can sort the results by. The admin configures the
 * list; the first entry is the default sort. The user picks any entry plus
 * a direction (asc/desc).
 */
export interface RulingsSortField {
  key: string;   // e.g. "meta.document_date", "sql.סכום_הוצאות_שקלים"
  label: string; // shown in the sort dropdown
  // Direction applied when this is the active default sort (the first entry,
  // before the user picks anything). undefined → no server-side default sort
  // (rely on TAG-IT's newest-first order).
  defaultDir?: SortDir;
}

export type SortDir = "asc" | "desc";

/**
 * Cascading law→section filter over an array-of-objects field (FOI's
 * sql.טענות_סעיפי_חוק_שנדונו). The user picks a law, then one or more of its
 * sections, with OR ("any of") / AND ("all of") logic. TAG-IT cannot match the
 * parenthesised section values server-side, so this filter is applied IN MEMORY
 * against the bulk-fetched (law-narrowed) snapshot — `map` holds the closed
 * dropdown lists, built by a corpus scan.
 */
export interface LawSectionFilterConfig {
  label: string;
  // sql sub-key holding the array of claim objects (e.g. "טענות_סעיפי_חוק_שנדונו").
  arrayKey: string;
  // element keys to read the law name from (first present wins).
  lawSubKeys: string[];
  // element key holding the section value (e.g. "סעיף_החוק").
  sectionSubKey: string;
  // dotted field used for an upstream `contains` narrow (law has no parens, so
  // it filters fine) — shrinks the in-memory set before section matching.
  upstreamLawField: string;
  // canonical law name → its closed list of section values.
  map: Record<string, string[]>;
  // Display order for the law dropdown (most-cited first). Needed because
  // Postgres jsonb does not preserve `map`'s key insertion order.
  lawOrder?: string[];
}

/**
 * The shape a user's law/section selection takes inside the userFilters object,
 * under the reserved key LAW_SECTION_FILTER_KEY.
 */
export interface LawSectionSelection {
  law?: string;
  sections?: string[];
  mode?: "or" | "and";
}

export const LAW_SECTION_FILTER_KEY = "__lawSection";

/**
 * Per-page query config. Lives inside FoiRulingsPageContent /
 * DefamationRulingsPageContent and drives both the upstream request and the
 * rendered card. `customQuery` is null when the admin hasn't set anything;
 * `displayFields` empty means "show the built-in default set"; `filterFields`
 * empty means "no user-facing filter bar".
 */
export interface RulingsPageQuery {
  customQuery: FilterExpression | null;
  displayFields: string[]; // ordered list of field keys to render per card
  filterFields: RulingsFilterField[]; // user-facing filter controls
  sortFields: RulingsSortField[]; // user-facing sort options (first = default)
  // Optional cascading law→section filter (FOI). undefined = not shown.
  lawSectionFilter?: LawSectionFilterConfig | null;
  // ── API parameters the admin controls ──
  // TAG-IT scope id to pull from. 0/undefined → fall back to the per-page
  // built-in default (defamation=4, FOI=6).
  scope?: number;
  // Results per page on the public listing. undefined → built-in default (12).
  pageSize?: number;
  // Smaller page size used for the INITIAL view (before the user applies any
  // filter), so a slow/large scope shows a quick teaser; `pageSize` kicks in
  // once a filter is active. undefined → always use pageSize.
  initialPageSize?: number;
  // Show a general free-text content search box (TAG-IT text_query). Each result
  // then carries meta.snippet (highlighted «…») + meta.rank.
  fullTextSearch?: boolean;
}

export const EMPTY_RULINGS_QUERY: RulingsPageQuery = {
  customQuery: null,
  displayFields: [],
  filterFields: [],
  sortFields: [],
  scope: 0,
  pageSize: 12,
};

export const VALID_FILTER_CONTROLS: FilterControl[] = [
  "text",
  "select",
  "multiselect",
  "number",
  "date",
  "yearrange",
  "boolean",
];

/** Quick validator — used by the admin form to reject bad JSON before save. */
export function isValidFilterExpression(value: unknown): value is FilterExpression {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (v.op === "and" || v.op === "or") {
    return Array.isArray(v.clauses) && v.clauses.every(isValidFilterExpression);
  }
  if (v.op === "not") {
    return isValidFilterExpression(v.clause);
  }
  if (typeof v.field !== "string" || typeof v.op !== "string") return false;
  const allowed: Comparator[] = [
    "eq", "ne", "gt", "ge", "lt", "le",
    "contains", "starts_with", "in", "is_null", "not_null",
  ];
  return allowed.includes(v.op as Comparator);
}
