/**
 * Shared model for the /api/rulings page benchmark (defamation + FOI).
 *
 * The drug benchmark could lean on one hand-written ground truth because it
 * tested one page with one question. These pages ask many small questions —
 * eleven filters on defamation alone, over nested `sql.*` paths that cross
 * arrays of objects — so the ground truth here is the FILTER SEMANTICS
 * themselves, implemented once from the contract in
 * src/lib/rulings-mirror.ts and evaluated over the mirrored corpus:
 *
 *   • array-typed leaf   → contains = EXACT element match; in = any-of exact
 *   • scalar leaf        → contains = case-insensitive substring
 *   • eq / ne            → string-coerced equality (any element, for arrays)
 *   • ge/le/gt/lt        → numeric when the operand is a number, else
 *                          lexicographic (ISO dates)
 *   • missing value      → every comparator is false
 *
 * A page's filter is "honest" when the count the API returns equals the count
 * this model computes. When they diverge, the filter is quietly answering a
 * different question than its label promises — which is how a judge-name box
 * that needs an exact full name, or a court dropdown matched with `eq` against
 * noisy court strings, ends up returning nothing and looking like "no results".
 */
import { readFileSync } from "fs";

export type Control =
  | "text" | "select" | "multiselect" | "number" | "date" | "yearrange" | "boolean";

export interface FilterField {
  key: string;
  label: string;
  control: Control;
  options?: string[];
  matchOp?: "eq" | "contains";
  group?: string;
}

export interface PageSpec {
  /** ?category= value */
  category: string;
  slug: string;
  scopeId: number;
  label: string;
}

export const PAGES: PageSpec[] = [
  { category: "defamation",    slug: "defamation-rulings", scopeId: 4, label: "לשון הרע" },
  { category: "foi-judgments", slug: "foi-judgments",      scopeId: 6, label: "פסיקות חופש מידע" },
  { category: "foi-costs",     slug: "foi-costs",          scopeId: 6, label: "הוצאות בחופש מידע" },
];

/** One corpus document, reduced to the values the page's filters address. */
export interface SlimDoc {
  id: number;
  /** filter key → extracted value (scalar, or array when the path crosses one) */
  v: Record<string, unknown>;
}

/**
 * Filter key → whether TAG-IT declares it an ARRAY type, read from the same
 * field catalog the mirror compiles against (tagit_sync_state.field_schema).
 *
 * This distinction cannot be guessed from the values. `ai.שופטים` is declared
 * `string[]`, so `contains` is an exact element match — a partial name can
 * never hit. `sql.הגנות_שנטענו.שם_ההגנה` is declared plain `string` even
 * though the path crosses an array of objects, so `contains` stays a
 * substring, applied per element. Getting this backwards made the model
 * predict 22 where the API correctly returned 953.
 */
export type FieldKinds = Record<string, "array" | "scalar">;

export function loadSlim(file: string): SlimDoc[] {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as SlimDoc[];
  } catch {
    throw new Error(
      `corpus cache missing (${file}).\n` +
        `Run:  npx tsx tests/benchmarks/fetch-rulings-corpus.ts`,
    );
  }
}

/* ── value helpers ─────────────────────────────────────────────────────── */

/** Flatten a value into the scalar leaves a filter compares against. */
export function leaves(v: unknown): unknown[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v.flatMap(leaves);
  if (typeof v === "object") return Object.values(v as Record<string, unknown>).flatMap(leaves);
  return [v];
}

/** Did the extracted path cross an array? Decides contains-semantics. */
export function isArrayValued(v: unknown): boolean {
  return Array.isArray(v) && v.length > 0;
}

const str = (v: unknown): string => (v == null ? "" : String(v));
const lower = (v: unknown): string => str(v).toLocaleLowerCase("he-IL");

export function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const cleaned = v.replace(/[^\d.-]/g, "");
    if (cleaned) {
      const n = Number(cleaned);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

export function asBool(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  const s = lower(v).trim();
  if (["true", "כן", "yes", "1"].includes(s)) return true;
  if (["false", "לא", "no", "0"].includes(s)) return false;
  return null;
}

/* ── the operators, per the mirror contract ────────────────────────────── */

export function opContains(value: unknown, needle: string, kind: "array" | "scalar" = "scalar"): boolean {
  const ls = leaves(value);
  if (ls.length === 0) return false;
  // The load-bearing distinction, and it comes from the DECLARED type, not the
  // stored shape: an array-typed field matches an element exactly, a scalar
  // matches a substring (per element, when the path crossed an array).
  if (kind === "array") return ls.some((x) => str(x) === needle);
  return ls.some((x) => lower(x).includes(lower(needle)));
}

/**
 * Equality is TYPE-STRICT, exactly as the mirror's jsonpath comparison is:
 * `@ == "true"` (a JSON string) does not match a stored JSON boolean `true`.
 * That is not pedantry — it is why a boolean field placed behind a `select`
 * control, which sends the string "true", can never match anything.
 */
export function opEq(value: unknown, want: unknown): boolean {
  const ls = leaves(value);
  if (ls.length === 0) return false;
  if (typeof want === "boolean") return ls.some((x) => x === want);
  const s = str(want);
  const asNum = Number(s);
  return ls.some((x) => {
    if (typeof x === "boolean") return false;   // string never equals boolean
    if (typeof x === "number") return x === asNum || str(x) === s;
    return str(x) === s;
  });
}

export function opRange(
  value: unknown,
  min?: number | string,
  max?: number | string,
): boolean {
  const ls = leaves(value);
  if (ls.length === 0) return false;
  const numeric = typeof min === "number" || typeof max === "number";
  return ls.some((x) => {
    if (numeric) {
      const n = asNumber(x);
      if (n == null) return false;
      if (min != null && n < (min as number)) return false;
      if (max != null && n > (max as number)) return false;
      return true;
    }
    const s = str(x).slice(0, 10);
    if (!s) return false;
    if (min != null && s < String(min)) return false;
    if (max != null && s > String(max)) return false;
    return true;
  });
}

export function opNotNull(value: unknown): boolean {
  return leaves(value).some((x) => x !== null && x !== "" && x !== undefined);
}

/* ── one user filter, evaluated ────────────────────────────────────────── */

export type FilterValue =
  | string | string[]
  | { min?: number; max?: number }
  | { from?: string; to?: string };

export function matchesField(
  doc: SlimDoc, f: FilterField, value: FilterValue, kinds: FieldKinds = {},
): boolean {
  const v = doc.v[f.key];
  const kind = kinds[f.key] ?? "scalar";
  switch (f.control) {
    case "text": {
      const s = String(value ?? "").trim();
      if (!s) return true;
      return f.matchOp === "eq" ? opEq(v, s) : opContains(v, s, kind);
    }
    case "select": {
      const s = String(value ?? "").trim();
      if (!s) return true;
      return f.matchOp === "contains" ? opContains(v, s, kind) : opEq(v, s);
    }
    case "multiselect": {
      const arr = Array.isArray(value) ? value : [];
      if (!arr.length) return true;
      return arr.some((x) => opContains(v, x, kind));
    }
    case "boolean": {
      const s = String(value ?? "").trim();
      if (s !== "true" && s !== "false") return true;
      return opEq(v, s === "true");
    }
    case "number": {
      const r = (value ?? {}) as { min?: number; max?: number };
      if (r.min == null && r.max == null) return true;
      return opRange(v, r.min, r.max);
    }
    case "date":
    case "yearrange": {
      const r = (value ?? {}) as { from?: string; to?: string };
      if (!r.from && !r.to) return true;
      return opRange(v, r.from, r.to);
    }
    default:
      return true;
  }
}

/** Expected result count for a set of user filters over the page corpus. */
export function expectedCount(
  corpus: SlimDoc[],
  fields: FilterField[],
  filters: Record<string, FilterValue>,
  kinds: FieldKinds = {},
): number {
  const active = fields.filter((f) => {
    const v = filters[f.key];
    if (v == null) return false;
    if (typeof v === "string") return v.trim() !== "";
    if (Array.isArray(v)) return v.length > 0;
    return Object.values(v).some((x) => x != null && x !== "");
  });
  if (!active.length) return corpus.length;
  return corpus.filter((d) => active.every((f) => matchesField(d, f, filters[f.key]!, kinds))).length;
}
