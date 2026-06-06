/**
 * Compute a field schema from a sample of flat documents, in the same shape
 * the rulings schema endpoint returns ({ key, label, type, source,
 * enum_values_sample }). Used by class-actions and guidelines — whose upstream
 * data is flat and has no dedicated TAG-IT schema endpoint — so their admin
 * editors can offer the same searchable field list as the rulings pages.
 */

export interface ComputedSchemaField {
  key: string;
  label: string;
  type: "string" | "number" | "boolean" | "date" | "string[]";
  source: string;
  enum_values_sample?: string[];
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}/;

function inferType(values: unknown[]): ComputedSchemaField["type"] {
  let sawArray = false;
  let sawString = false;
  let allNumber = true;
  let allBool = true;
  let allDate = true;
  let any = false;

  for (const v of values) {
    if (v == null || v === "") continue;
    any = true;
    if (Array.isArray(v)) {
      sawArray = true;
      continue;
    }
    if (typeof v === "number") {
      allBool = false;
      allDate = false;
      sawString = false;
      continue;
    }
    if (typeof v === "boolean") {
      allNumber = false;
      allDate = false;
      continue;
    }
    if (typeof v === "string") {
      sawString = true;
      allBool = false;
      if (!/^-?\d+(\.\d+)?$/.test(v.trim())) allNumber = false;
      if (!ISO_DATE_RE.test(v.trim())) allDate = false;
      continue;
    }
    allNumber = false;
    allBool = false;
    allDate = false;
  }

  if (!any) return "string";
  if (sawArray) return "string[]";
  if (allDate && sawString) return "date";
  if (allNumber) return "number";
  if (allBool) return "boolean";
  return "string";
}

function labelFor(key: string): string {
  const tail = key.includes(".") ? key.split(".").slice(1).join(".") : key;
  return tail.replace(/_/g, " ");
}

export function computeSchemaFromItems(
  items: Array<Record<string, unknown>>,
  opts: { source?: string; sampleSize?: number; maxEnum?: number } = {},
): ComputedSchemaField[] {
  const source = opts.source || "doc";
  const sampleSize = opts.sampleSize ?? 500;
  const maxEnum = opts.maxEnum ?? 20;

  const sample = items.slice(0, sampleSize);
  const valuesByKey = new Map<string, unknown[]>();

  for (const it of sample) {
    if (!it || typeof it !== "object") continue;
    for (const [k, v] of Object.entries(it)) {
      // Skip internal/url-ish keys.
      if (k.endsWith("_url") || k === "file_url") continue;
      const arr = valuesByKey.get(k);
      if (arr) arr.push(v);
      else valuesByKey.set(k, [v]);
    }
  }

  const fields: ComputedSchemaField[] = [];
  for (const [key, values] of valuesByKey) {
    const type = inferType(values);
    const field: ComputedSchemaField = {
      key,
      label: labelFor(key),
      type,
      source,
    };
    // Provide enum samples for short-cardinality string fields (good "select"
    // candidates). Skip free-text-ish fields (long values, high cardinality).
    if (type === "string") {
      const distinct = new Set<string>();
      let tooMany = false;
      let tooLong = false;
      for (const v of values) {
        if (typeof v !== "string" || v.trim() === "") continue;
        if (v.length > 60) {
          tooLong = true;
          break;
        }
        distinct.add(v);
        if (distinct.size > maxEnum * 3) {
          tooMany = true;
          break;
        }
      }
      if (!tooLong && !tooMany && distinct.size > 0 && distinct.size <= maxEnum) {
        field.enum_values_sample = [...distinct].sort((a, b) =>
          a.localeCompare(b, "he"),
        );
      }
    }
    fields.push(field);
  }

  fields.sort((a, b) => a.key.localeCompare(b.key));
  return fields;
}
