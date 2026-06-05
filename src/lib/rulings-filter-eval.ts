/**
 * In-memory evaluator for FilterExpression against an UpstreamRulingItem.
 * Used so the admin can author filters today even before TAG-IT supports the
 * `filter` query param server-side — we just walk the cached bulk snapshot.
 *
 * Field path convention (matches the TAG-IT schema spec):
 *   "ai.X"   → item.ai?.X ?? item.ai_analysis?.X        (AI-extracted)
 *   "sql.X"  → item.sql?.X                              (SQL queries)
 *   "meta.X" → item.X (top-level, after stripping ai/sql/ai_analysis)
 *   "X"      → item.X (fallback — top-level)
 */
import type { UpstreamRulingItem } from "./rulings-upstream";
import type {
  FilterExpression,
  LeafFilter,
  FilterValue,
} from "@/types/ruling-filter";

function getField(item: UpstreamRulingItem, path: string): unknown {
  if (!path) return undefined;
  const [head, ...rest] = path.split(".");
  const sub = rest.join(".");
  const top = item as Record<string, unknown>;

  if (head === "ai") {
    const ai = (top.ai || top.ai_analysis || {}) as Record<string, unknown>;
    return sub ? ai[sub] : ai;
  }
  if (head === "sql") {
    const sql = (top.sql || {}) as Record<string, unknown>;
    return sub ? sql[sub] : sql;
  }
  if (head === "meta") {
    // New shape nests promoted columns under `meta`; fall back to the
    // legacy shape where they sit at the top level.
    const meta = (top.meta as Record<string, unknown>) || {};
    if (!sub) return meta;
    return meta[sub] !== undefined ? meta[sub] : top[sub];
  }
  // bare key — treat as top-level
  return sub ? undefined : top[path];
}

function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asString(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function compareScalar(a: unknown, b: unknown): number {
  // Numbers first if both look numeric, otherwise string comparison.
  const an = asNumber(a);
  const bn = asNumber(b);
  if (an !== null && bn !== null) return an - bn;
  return asString(a).localeCompare(asString(b));
}

function evalLeaf(item: UpstreamRulingItem, leaf: LeafFilter): boolean {
  const actual = getField(item, leaf.field);
  const expected = leaf.value as FilterValue | undefined;

  switch (leaf.op) {
    case "is_null":
      return actual === undefined || actual === null || actual === "";
    case "not_null":
      return !(actual === undefined || actual === null || actual === "");
    case "eq":
      return asString(actual) === asString(expected);
    case "ne":
      return asString(actual) !== asString(expected);
    case "gt":
      return compareScalar(actual, expected) > 0;
    case "ge":
      return compareScalar(actual, expected) >= 0;
    case "lt":
      return compareScalar(actual, expected) < 0;
    case "le":
      return compareScalar(actual, expected) <= 0;
    case "contains":
      if (Array.isArray(actual)) {
        return actual.some((x) => asString(x).includes(asString(expected)));
      }
      return asString(actual).includes(asString(expected));
    case "starts_with":
      return asString(actual).startsWith(asString(expected));
    case "in": {
      const list = Array.isArray(expected) ? expected : [];
      const aStr = asString(actual);
      return list.some((x) => asString(x) === aStr);
    }
    default:
      return false;
  }
}

export function evaluateFilter(
  item: UpstreamRulingItem,
  expr: FilterExpression | null,
): boolean {
  if (!expr) return true;
  if ("op" in expr && expr.op === "and") {
    return expr.clauses.every((c) => evaluateFilter(item, c));
  }
  if ("op" in expr && expr.op === "or") {
    return expr.clauses.some((c) => evaluateFilter(item, c));
  }
  if ("op" in expr && expr.op === "not") {
    return !evaluateFilter(item, expr.clause);
  }
  return evalLeaf(item, expr as LeafFilter);
}
