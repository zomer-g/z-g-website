/**
 * Shared user-filter / sort / select-option helpers, operating on any flat
 * document via getFieldValue. Used by the rulings pages and — additively — by
 * the class-actions and guidelines dashboards so the admin-configured
 * filterFields / sortFields work uniformly across all of them.
 */
import { getFieldValue } from "./rulings-filter-eval";
import type { UpstreamRulingItem } from "./rulings-upstream";
import type { RulingsFilterField, SortDir } from "@/types/ruling-filter";

export type UserFilterValue =
  | string
  | { min?: number; max?: number }
  | { from?: string; to?: string };

export function parseUserFilters(
  raw: string | null,
): Record<string, UserFilterValue> {
  if (!raw) return {};
  try {
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}

function valueToString(v: unknown): string {
  if (v == null) return "";
  if (Array.isArray(v)) return v.map(valueToString).join(" ");
  if (typeof v === "object") {
    try {
      return JSON.stringify(v);
    } catch {
      return "";
    }
  }
  return String(v);
}

function valueToNumber(v: unknown): number | null {
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

export function isUserFilterActive(v: UserFilterValue | undefined): boolean {
  if (v == null) return false;
  if (typeof v === "string") return v.trim() !== "";
  if (typeof v === "object") {
    return Object.values(v).some((x) => x != null && x !== "");
  }
  return false;
}

function passesUserFilter(
  item: UpstreamRulingItem,
  field: RulingsFilterField,
  value: UserFilterValue,
): boolean {
  const actual = getFieldValue(item, field.key);
  switch (field.control) {
    case "text": {
      const needle = String(value ?? "").trim().toLocaleLowerCase("he-IL");
      if (!needle) return true;
      return valueToString(actual).toLocaleLowerCase("he-IL").includes(needle);
    }
    case "select": {
      const want = String(value ?? "").trim();
      if (!want) return true;
      return valueToString(actual) === want;
    }
    case "number": {
      const range = (value || {}) as { min?: number; max?: number };
      const n = valueToNumber(actual);
      if (range.min != null && (n == null || n < range.min)) return false;
      if (range.max != null && (n == null || n > range.max)) return false;
      return true;
    }
    case "date": {
      const range = (value || {}) as { from?: string; to?: string };
      const d = valueToString(actual).slice(0, 10);
      if (range.from && (!d || d < range.from)) return false;
      if (range.to && (!d || d > range.to)) return false;
      return true;
    }
    default:
      return true;
  }
}

export function applyUserFilters<T extends Record<string, unknown>>(
  items: T[],
  filterFields: RulingsFilterField[],
  userFilters: Record<string, UserFilterValue>,
): T[] {
  const active = filterFields.filter((f) => isUserFilterActive(userFilters[f.key]));
  if (active.length === 0) return items;
  return items.filter((it) =>
    active.every((f) =>
      passesUserFilter(it as unknown as UpstreamRulingItem, f, userFilters[f.key]),
    ),
  );
}

export function computeSelectOptions<T extends Record<string, unknown>>(
  items: T[],
  filterFields: RulingsFilterField[],
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const f of filterFields) {
    if (f.control !== "select") continue;
    const set = new Set<string>();
    for (const it of items) {
      const s = valueToString(
        getFieldValue(it as unknown as UpstreamRulingItem, f.key),
      ).trim();
      if (s) set.add(s);
    }
    out[f.key] = [...set].sort((a, b) => a.localeCompare(b, "he"));
  }
  return out;
}

export function sortByConfiguredField<T extends Record<string, unknown>>(
  items: T[],
  key: string,
  dir: SortDir,
): T[] {
  const sign = dir === "asc" ? 1 : -1;
  const numOf = (v: unknown): number | null => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const cleaned = v.replace(/[^\d.-]/g, "");
      if (cleaned) {
        const n = Number(cleaned);
        if (Number.isFinite(n)) return n;
      }
    }
    return null;
  };
  const strOf = (v: unknown): string =>
    v == null ? "" : Array.isArray(v) ? v.join(" ") : String(v);

  return [...items].sort((a, b) => {
    const av = getFieldValue(a as unknown as UpstreamRulingItem, key);
    const bv = getFieldValue(b as unknown as UpstreamRulingItem, key);
    const aEmpty = av == null || av === "";
    const bEmpty = bv == null || bv === "";
    if (aEmpty && bEmpty) return 0;
    if (aEmpty) return 1;
    if (bEmpty) return -1;
    const an = numOf(av);
    const bn = numOf(bv);
    if (an != null && bn != null) return (an - bn) * sign;
    return strOf(av).localeCompare(strOf(bv), "he") * sign;
  });
}
