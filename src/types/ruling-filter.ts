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
  | "number"
  | "date"
  | "boolean";

export interface RulingsFilterField {
  key: string;        // e.g. "ai.בית_משפט", "sql.סכום_הוצאות_שקלים"
  label: string;      // shown above the control
  control: FilterControl;
}

/**
 * A field the END USER can sort the results by. The admin configures the
 * list; the first entry is the default sort. The user picks any entry plus
 * a direction (asc/desc).
 */
export interface RulingsSortField {
  key: string;   // e.g. "meta.document_date", "sql.סכום_הוצאות_שקלים"
  label: string; // shown in the sort dropdown
}

export type SortDir = "asc" | "desc";

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
  // ── API parameters the admin controls ──
  // TAG-IT scope id to pull from. 0/undefined → fall back to the per-page
  // built-in default (defamation=4, FOI=6).
  scope?: number;
  // Results per page on the public listing. undefined → built-in default (12).
  pageSize?: number;
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
  "number",
  "date",
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
