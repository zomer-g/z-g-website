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
 * Per-page query config. Lives inside FoiRulingsPageContent /
 * DefamationRulingsPageContent and drives both the upstream request and the
 * rendered card. `customQuery` is null when the admin hasn't set anything;
 * `displayFields` empty means "show the built-in default set".
 */
export interface RulingsPageQuery {
  customQuery: FilterExpression | null;
  displayFields: string[]; // ordered list of field keys to render per card
}

export const EMPTY_RULINGS_QUERY: RulingsPageQuery = {
  customQuery: null,
  displayFields: [],
};

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
