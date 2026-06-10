"use client";

import { useCallback, useEffect, useState } from "react";

interface Ruling {
  id: number;
  caseName: string;
  court: string;
  judges: string[];
  date: string;
  summary: string;
  title: string;
  documentUrl: string;
  // Flattened ai.*/sql.*/meta.* lookup the route attaches per item. The
  // client uses it to render admin-configured `displayFields` dynamically.
  fields?: Record<string, unknown>;
}

type FilterControl = "text" | "select" | "number" | "date" | "boolean";

interface FilterField {
  key: string;
  label: string;
  control: FilterControl;
}

// User filter selections, keyed by field key.
type UserFilterValue =
  | string
  | { min?: number; max?: number }
  | { from?: string; to?: string };

interface RulingsResponse {
  total: number;
  page: number;
  size: number;
  rulings: Ruling[];
  // Ordered list of field keys (e.g. "ai.שם_התיק", "sql.הוצאות_משפט") set
  // by the admin in the Site Editor. Empty array = render the built-in
  // default block (court, judges, summary).
  displayFields?: string[];
  // User-facing filter controls configured by the admin.
  filterFields?: FilterField[];
  // Distinct values for each "select" control, computed server-side.
  filterOptions?: Record<string, string[]>;
  // User-facing sort options (first = default).
  sortFields?: { key: string; label: string }[];
}

type SortDir = "asc" | "desc";

// Fallback page size used only before the first API response arrives — the
// server is authoritative (admin-configurable, default 24). 24 = LCM(2,3,4)
// so every full page is row-aligned across the 1/2/3/4-col breakpoints.
const PAGE_SIZE = 24;

const C_PRIMARY = "#1a365d";
const C_PD = "#2a6f97";
const C_MUTED = "#4b5563";

const dateFmt = new Intl.DateTimeFormat("he-IL", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return dateFmt.format(d);
}

function SkeletonCard() {
  return (
    <div className="rounded-xl shadow-md border border-gray-200 bg-white p-5 animate-pulse">
      <div className="h-4 w-3/4 bg-gray-200 rounded mb-3" />
      <div className="h-3 w-1/2 bg-gray-200 rounded mb-2" />
      <div className="h-3 w-1/3 bg-gray-200 rounded mb-4" />
      <div className="h-3 w-2/3 bg-gray-200 rounded" />
    </div>
  );
}

function Badge({
  children,
  color = C_PRIMARY,
  bg = "#e6edf5",
}: {
  children: React.ReactNode;
  color?: string;
  bg?: string;
}) {
  return (
    <span
      className="inline-block text-xs font-semibold rounded-md px-2 py-0.5"
      style={{ color, background: bg }}
    >
      {children}
    </span>
  );
}

function fieldKeyToLabel(key: string): string {
  // "ai.שם_התיק" → "שם התיק", "sql.הוצאות_משפט" → "הוצאות משפט"
  const tail = key.includes(".") ? key.split(".").slice(1).join(".") : key;
  return tail.replace(/_/g, " ");
}

function formatFieldValue(v: unknown): string {
  if (v == null || v === "") return "—";
  if (Array.isArray(v)) return v.map(formatFieldValue).join(", ");
  if (typeof v === "number") return v.toLocaleString("he-IL");
  if (typeof v === "boolean") return v ? "כן" : "לא";
  if (typeof v === "string") return v;
  if (typeof v === "object") {
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
  return String(v);
}

// True when a value is an array of plain objects (a "table inside the case",
// e.g. sql.הגנות_שנטענו / sql.רשימת_פרסומים) rather than scalars or strings.
function isObjectArray(v: unknown): v is Record<string, unknown>[] {
  return (
    Array.isArray(v) &&
    v.length > 0 &&
    v.every((x) => x != null && typeof x === "object" && !Array.isArray(x))
  );
}

// Pull the first present value from an object whose key (ignoring spaces /
// underscores) contains any of the given substrings. Lets one renderer handle
// slight key-name variations across documents (שם_החוק vs שם_חוק_רשמי …).
function pickByKeyHint(
  obj: Record<string, unknown>,
  hints: string[],
): unknown {
  const norm = (s: string) => s.replace(/[\s_]/g, "");
  for (const hint of hints) {
    const h = norm(hint);
    for (const k of Object.keys(obj)) {
      const val = obj[k];
      if (norm(k).includes(h) && val != null && val !== "") return val;
    }
  }
  return undefined;
}

type PillKind = "accepted" | "rejected" | "na" | "on" | "off";
type RowStatus = { kind: PillKind; label: string };

// Map a Hebrew acceptance value ("כן"/"לא"/"לא נדונה"/…) to a status pill.
function rowStatusFromValue(raw: unknown): RowStatus | null {
  if (raw == null || raw === "") return null;
  const s = String(raw).trim();
  if (s.includes("נדונה") || s.includes("לא נדון"))
    return { kind: "na", label: "לא נדונה" };
  if (s === "כן" || s.includes("התקבל") || s.includes("מתקבל"))
    return { kind: "accepted", label: "התקבלה" };
  if (s === "לא" || s.includes("נדחת") || s.includes("דחה") || s.includes("נדחה"))
    return { kind: "rejected", label: "נדחתה" };
  return { kind: "na", label: s };
}

// Boolean parameters (e.g. נקבע_כלשון_הרע, חלו_הגנות) become a pill labelled
// with the field name; true is highlighted (noteworthy flag), false muted.
function boolPillsFor(item: Record<string, unknown>): RowStatus[] {
  return Object.keys(item)
    .filter((k) => typeof item[k] === "boolean")
    .map((k) => {
      const on = item[k] as boolean;
      const label = fieldKeyToLabel(k);
      return { kind: on ? "on" : "off", label: on ? label : `לא ${label}` };
    });
}

const ROW_STATUS_STYLE: Record<
  PillKind,
  { pill: string; dot: string; accent: string }
> = {
  accepted: {
    pill: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    dot: "#10b981",
    accent: "#a7f3d0",
  },
  rejected: {
    pill: "bg-red-50 text-red-700 border border-red-200",
    dot: "#ef4444",
    accent: "#fecaca",
  },
  na: {
    pill: "bg-gray-100 text-gray-500 border border-gray-200",
    dot: "#9ca3af",
    accent: "#e5e7eb",
  },
  on: {
    pill: "bg-amber-50 text-amber-700 border border-amber-200",
    dot: "#f59e0b",
    accent: "#fde68a",
  },
  off: {
    pill: "bg-gray-100 text-gray-500 border border-gray-200",
    dot: "#9ca3af",
    accent: "#e5e7eb",
  },
};

// Renders an array-of-objects field as elegant status rows. Tuned for the
// "defenses claimed" table (status pill + name + clause badge + reasoning) but
// degrades gracefully for any object-array: it shows whatever of those parts
// it can find, falling back to a compact JSON line per item if none match.
function StructuredFieldRows({
  label,
  items,
}: {
  label: string;
  items: Record<string, unknown>[];
}) {
  return (
    <div className="block mt-3 pt-3 border-t border-gray-200">
      <dt className="flex items-center gap-2 mb-2">
        <span
          className="inline-block w-1 h-4 rounded-full"
          style={{ background: C_PRIMARY }}
        />
        <span className="text-sm font-bold" style={{ color: C_PRIMARY }}>
          {label}
        </span>
        <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 rounded-full px-1.5 py-0.5">
          {items.length}
        </span>
      </dt>
      <dd>
        <ul className="space-y-2.5">
          {items.map((item, i) => {
            // Headline: a defense name (שם_ההגנה) or a publication platform
            // (פלטפורמה) / source — the lead of the row.
            const title = pickByKeyHint(item, [
              "שם_ההגנה",
              "שם_הטענה",
              "כותרת",
              "פלטפורמה",
              "מקור",
              "שם",
            ]);
            const clause = pickByKeyHint(item, ["סעיף_בחוק", "סעיף"]);
            const reason = pickByKeyHint(item, [
              "נימוק",
              "הסבר",
              "תיאור",
              "פירוט",
            ]);
            // String acceptance status (defenses) + boolean flag pills
            // (publications: נקבע_כלשון_הרע, חלו_הגנות).
            const status = rowStatusFromValue(
              pickByKeyHint(item, ["התקבלה", "תוצאה", "סטטוס"]),
            );
            const pills = [...(status ? [status] : []), ...boolPillsFor(item)];
            const accent = pills.length
              ? ROW_STATUS_STYLE[pills[0].kind].accent
              : "#e5e7eb";
            const hasAnyPart = title || clause || reason || pills.length;
            return (
              <li
                key={i}
                className="rounded-lg border border-gray-200 border-r-[3px] bg-gray-50 px-3 py-2"
                style={{ borderRightColor: accent }}
              >
                {hasAnyPart ? (
                  <>
                    <div className="flex items-center gap-2 flex-wrap">
                      {pills.map((p, pi) => {
                        const style = ROW_STATUS_STYLE[p.kind];
                        return (
                          <span
                            key={pi}
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2 py-0.5 ${style.pill}`}
                          >
                            <span
                              className="inline-block w-1.5 h-1.5 rounded-full"
                              style={{ background: style.dot }}
                            />
                            {p.label}
                          </span>
                        );
                      })}
                      {title != null && title !== "" && (
                        <span className="font-semibold text-gray-800">
                          {formatFieldValue(title)}
                        </span>
                      )}
                      {clause != null && clause !== "" && (
                        <span className="text-[11px] font-mono text-gray-600 bg-gray-100 rounded px-1.5 py-0.5">
                          ס׳ {formatFieldValue(clause)}
                        </span>
                      )}
                    </div>
                    {reason != null && reason !== "" && (
                      <p className="text-xs text-gray-500 leading-relaxed mt-0.5">
                        {formatFieldValue(reason)}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {formatFieldValue(item)}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </dd>
    </div>
  );
}

function RulingCard({
  ruling,
  displayFields,
}: {
  ruling: Ruling;
  displayFields?: string[];
}) {
  const [open, setOpen] = useState(false);
  const hasLongSummary = (ruling.summary || "").length > 220;
  const useCustomLayout = Array.isArray(displayFields) && displayFields.length > 0;

  // When the admin configured displayFields, the card content is exactly that
  // list — no auto-injected court badge, date badge, title, or subtitle. The
  // first listed field becomes the prominent header. Missing values show "—"
  // so the admin can see at a glance which configured fields aren't populated
  // by TAG-IT (instead of silently disappearing).
  if (useCustomLayout) {
    const [headerKey, ...rest] = displayFields!;
    const headerValue = ruling.fields?.[headerKey];
    return (
      <article
        className="relative rounded-xl shadow-md border border-gray-200 bg-white p-5 hover:shadow-lg transition flex flex-col"
        dir="rtl"
      >
        <h3
          className="text-base font-bold leading-snug mb-2"
          style={{ color: C_PRIMARY }}
        >
          {headerValue != null && headerValue !== ""
            ? formatFieldValue(headerValue)
            : "—"}
        </h3>

        <dl className="text-sm text-gray-700 mb-3 space-y-1.5">
          {rest.map((key) => {
            const value = ruling.fields?.[key];
            // Array-of-objects (a table inside the case, e.g. defenses claimed)
            // gets its own elegant status-row renderer instead of being
            // flattened to "[object Object]" text.
            if (isObjectArray(value)) {
              return (
                <StructuredFieldRows
                  key={key}
                  label={fieldKeyToLabel(key)}
                  items={value}
                />
              );
            }
            const isEmpty = value == null || value === "";
            const formatted = isEmpty ? "" : formatFieldValue(value);
            // Long free-text fields (e.g. AI summary / תקציר) read much better
            // as a full-width paragraph than a cramped inline label:value row.
            const isLongText = formatted.length > 90;
            if (isLongText) {
              return (
                <div key={key} className="block">
                  <dt className="font-semibold mb-0.5">
                    {fieldKeyToLabel(key)}
                  </dt>
                  <dd className="text-gray-700 leading-relaxed">{formatted}</dd>
                </div>
              );
            }
            return (
              <div key={key} className="flex gap-1.5">
                <dt className="font-semibold whitespace-nowrap">
                  {fieldKeyToLabel(key)}:
                </dt>
                <dd className={isEmpty ? "text-gray-400" : "text-gray-700"}>
                  {isEmpty ? "—" : formatted}
                </dd>
              </div>
            );
          })}
        </dl>

        <div className="mt-auto pt-3 flex items-center justify-end gap-2">
          <a
            href={ruling.documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold rounded-md px-3 py-1.5 text-white transition"
            style={{ background: C_PRIMARY }}
          >
            צפייה במסמך
          </a>
        </div>
      </article>
    );
  }

  // Default layout — used when displayFields is empty.
  return (
    <article
      className="relative rounded-xl shadow-md border border-gray-200 bg-white p-5 hover:shadow-lg transition flex flex-col"
      dir="rtl"
    >
      <div className="flex items-start gap-2 mb-2 flex-wrap">
        {ruling.court ? (
          <Badge color={C_PD} bg="#e1ecf3">
            {ruling.court}
          </Badge>
        ) : null}
        {ruling.date ? (
          <Badge color={C_MUTED} bg="#eef0f3">
            {fmtDate(ruling.date)}
          </Badge>
        ) : null}
      </div>

      <h3
        className="text-base font-bold leading-snug mb-2"
        style={{ color: C_PRIMARY }}
      >
        {ruling.caseName || "ללא שם תיק"}
      </h3>

      {ruling.title && ruling.title !== ruling.caseName ? (
        <div className="text-sm font-medium text-gray-700 mb-2">{ruling.title}</div>
      ) : null}

      {Array.isArray(ruling.judges) && ruling.judges.length > 0 ? (
        <div className="text-sm text-gray-700 mb-2">
          <span className="font-semibold">שופטים:</span> {ruling.judges.join(", ")}
        </div>
      ) : null}

      {ruling.summary ? (
        <p
          className={
            open
              ? "text-sm text-gray-700 leading-relaxed mb-3"
              : "text-sm text-gray-700 leading-relaxed mb-3 line-clamp-4"
          }
        >
          {ruling.summary}
        </p>
      ) : null}

      <div className="mt-auto pt-3 flex items-center justify-between gap-2">
        {!useCustomLayout && hasLongSummary ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-xs font-semibold rounded-md px-3 py-1.5 border transition"
            style={{ color: C_PRIMARY, borderColor: C_PRIMARY }}
          >
            {open ? "צמצם" : "תקציר מלא"}
          </button>
        ) : (
          <span />
        )}
        <a
          href={ruling.documentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold rounded-md px-3 py-1.5 text-white transition"
          style={{ background: C_PRIMARY }}
        >
          צפייה במסמך
        </a>
      </div>
    </article>
  );
}

/* ── User filter bar ── */

// Friendly label for a select option value — booleans read as כן/לא.
function optionLabel(o: string): string {
  if (o === "true") return "כן";
  if (o === "false") return "לא";
  return o;
}

function isFilterActive(v: UserFilterValue | undefined): boolean {
  if (v == null) return false;
  if (typeof v === "string") return v.trim() !== "";
  if (typeof v === "object") return Object.values(v).some((x) => x != null && x !== "");
  return false;
}

function FilterBar({
  fields,
  options,
  draft,
  setDraft,
  onApply,
  onClear,
}: {
  fields: FilterField[];
  options: Record<string, string[]>;
  draft: Record<string, UserFilterValue>;
  setDraft: (next: Record<string, UserFilterValue>) => void;
  onApply: () => void;
  onClear: () => void;
}) {
  const setField = (key: string, value: UserFilterValue) =>
    setDraft({ ...draft, [key]: value });

  const anyActive = fields.some((f) => isFilterActive(draft[f.key]));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {fields.map((f) => {
          const v = draft[f.key];
          if (f.control === "text") {
            return (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  {f.label}
                </label>
                <input
                  type="text"
                  value={typeof v === "string" ? v : ""}
                  onChange={(e) => setField(f.key, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onApply();
                  }}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
            );
          }
          if (f.control === "select" || f.control === "boolean") {
            // Boolean fields use a fixed כן/לא option set; selects use the
            // distinct values discovered server-side.
            const opts =
              f.control === "boolean" ? ["true", "false"] : options[f.key] || [];
            return (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  {f.label}
                </label>
                <select
                  value={typeof v === "string" ? v : ""}
                  onChange={(e) => setField(f.key, e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-2 py-2 text-sm bg-white"
                >
                  <option value="">הכל</option>
                  {opts.map((o) => (
                    <option key={o} value={o}>
                      {optionLabel(o)}
                    </option>
                  ))}
                </select>
              </div>
            );
          }
          if (f.control === "number") {
            const range = (typeof v === "object" ? v : {}) as {
              min?: number;
              max?: number;
            };
            return (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  {f.label}
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    placeholder="מ-"
                    value={range.min ?? ""}
                    onChange={(e) =>
                      setField(f.key, {
                        ...range,
                        min: e.target.value === "" ? undefined : Number(e.target.value),
                      })
                    }
                    className="w-full border border-gray-300 rounded-md px-2 py-2 text-sm"
                    dir="ltr"
                  />
                  <span className="text-gray-400">–</span>
                  <input
                    type="number"
                    placeholder="עד"
                    value={range.max ?? ""}
                    onChange={(e) =>
                      setField(f.key, {
                        ...range,
                        max: e.target.value === "" ? undefined : Number(e.target.value),
                      })
                    }
                    className="w-full border border-gray-300 rounded-md px-2 py-2 text-sm"
                    dir="ltr"
                  />
                </div>
              </div>
            );
          }
          // date range
          const range = (typeof v === "object" ? v : {}) as {
            from?: string;
            to?: string;
          };
          return (
            <div key={f.key}>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                {f.label}
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={range.from ?? ""}
                  onChange={(e) =>
                    setField(f.key, { ...range, from: e.target.value || undefined })
                  }
                  className="w-full border border-gray-300 rounded-md px-2 py-2 text-sm"
                  dir="ltr"
                />
                <span className="text-gray-400">–</span>
                <input
                  type="date"
                  value={range.to ?? ""}
                  onChange={(e) =>
                    setField(f.key, { ...range, to: e.target.value || undefined })
                  }
                  className="w-full border border-gray-300 rounded-md px-2 py-2 text-sm"
                  dir="ltr"
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-2 mt-4">
        <button
          type="button"
          onClick={onClear}
          disabled={!anyActive}
          className="text-sm font-semibold rounded-md px-3 py-1.5 border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
        >
          ניקוי
        </button>
        <button
          type="button"
          onClick={onApply}
          className="text-sm font-semibold rounded-md px-4 py-1.5 text-white"
          style={{ background: C_PRIMARY }}
        >
          סינון
        </button>
      </div>
    </div>
  );
}

export function RulingsList({
  category,
}: {
  category: "foi" | "defamation" | "foi-judgments" | "foi-costs";
}) {
  const [data, setData] = useState<RulingsResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Draft = what the user is typing; applied = what's been sent to the API.
  const [draftFilters, setDraftFilters] = useState<Record<string, UserFilterValue>>({});
  const [appliedFilters, setAppliedFilters] = useState<Record<string, UserFilterValue>>({});

  // Sort state. Empty sortKey = let the server pick its default (first
  // configured sort field, or built-in date-desc).
  const [sortKey, setSortKey] = useState<string>("");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const fetchData = useCallback(
    async (
      cat: string,
      p: number,
      filters: Record<string, UserFilterValue>,
      sKey: string,
      sDir: SortDir,
    ) => {
      setLoading(true);
      setError(null);
      try {
        // Page size is admin-controlled server-side — we no longer send a
        // `limit`; the API echoes the size it used back as `size`.
        const params = new URLSearchParams({
          category: cat,
          page: String(p),
        });
        const activeEntries = Object.entries(filters).filter(([, v]) =>
          isFilterActive(v),
        );
        if (activeEntries.length > 0) {
          params.set("userFilters", JSON.stringify(Object.fromEntries(activeEntries)));
        }
        if (sKey) {
          params.set("sort", sKey);
          params.set("dir", sDir);
        }
        const res = await fetch(`/api/rulings?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as RulingsResponse;
        setData(json);
      } catch (e) {
        console.error(e);
        setError("שגיאה בטעינת פסיקה. נסו שוב מאוחר יותר.");
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchData(category, page, appliedFilters, sortKey, sortDir);
  }, [fetchData, category, page, appliedFilters, sortKey, sortDir]);

  const applyFilters = () => {
    setPage(1);
    setAppliedFilters(draftFilters);
  };
  const clearFilters = () => {
    setDraftFilters({});
    setPage(1);
    setAppliedFilters({});
  };

  const filterFields = data?.filterFields ?? [];
  const filterOptions = data?.filterOptions ?? {};
  const sortFields = data?.sortFields ?? [];
  // The control reflects the active sort: explicit user choice, or the
  // server's default (first configured field) when the user hasn't picked.
  const activeSortKey = sortKey || sortFields[0]?.key || "";

  const total = data?.total ?? 0;
  // The server is authoritative on page size (admin-configurable). Fall back
  // to the built-in default before the first response arrives.
  const size = data?.size && data.size > 0 ? data.size : PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const canPrev = page > 1;
  const canNext = page < totalPages;
  const pageStart = total === 0 ? 0 : (page - 1) * size + 1;
  const pageEnd = Math.min(page * size, total);

  return (
    <div dir="rtl">
      {filterFields.length > 0 ? (
        <FilterBar
          fields={filterFields}
          options={filterOptions}
          draft={draftFilters}
          setDraft={setDraftFilters}
          onApply={applyFilters}
          onClear={clearFilters}
        />
      ) : null}

      {/* Results header + sort control */}
      <div className="flex items-center justify-between gap-3 mb-3 text-sm text-gray-600">
        <div>
          {loading ? (
            <span>בטעינה…</span>
          ) : error ? (
            <span className="text-red-600">{error}</span>
          ) : total === 0 ? (
            <span>לא נמצאו פסקי דין</span>
          ) : (
            <span>
              מציג פסקי דין {pageStart}–{pageEnd} מתוך{" "}
              {total.toLocaleString("he-IL")}
            </span>
          )}
        </div>

        {sortFields.length > 0 ? (
          <div className="flex items-center gap-2 shrink-0">
            <label htmlFor="rulings-sort" className="text-xs text-gray-600">
              מיון:
            </label>
            <select
              id="rulings-sort"
              value={activeSortKey}
              onChange={(e) => {
                setSortKey(e.target.value);
                setPage(1);
              }}
              className="border border-gray-300 rounded-md px-2 py-1 text-xs bg-white"
            >
              {sortFields.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                setSortDir((d) => (d === "desc" ? "asc" : "desc"));
                setPage(1);
              }}
              title={sortDir === "desc" ? "מהגבוה לנמוך / מהחדש לישן" : "מהנמוך לגבוה / מהישן לחדש"}
              className="border border-gray-300 rounded-md px-2 py-1 text-xs bg-white hover:bg-gray-50"
            >
              {sortDir === "desc" ? "יורד ↓" : "עולה ↑"}
            </button>
          </div>
        ) : null}
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : data?.rulings.map((r) => (
              <RulingCard
                key={r.id}
                ruling={r}
                displayFields={data?.displayFields}
              />
            ))}
      </div>

      {/* Pagination */}
      {!loading && !error && totalPages > 1 ? (
        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            type="button"
            disabled={!canPrev}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="text-sm font-semibold rounded-md px-4 py-2 border disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ color: C_PRIMARY, borderColor: C_PRIMARY }}
          >
            הקודם
          </button>
          <span className="text-sm text-gray-600">
            עמוד {page} מתוך {totalPages}
          </span>
          <button
            type="button"
            disabled={!canNext}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="text-sm font-semibold rounded-md px-4 py-2 text-white disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: C_PRIMARY }}
          >
            הבא
          </button>
        </div>
      ) : null}

      <p className="text-xs text-gray-700 mt-8 leading-relaxed">
        המידע נשאב ממאגר TAG-IT. שם תיק, בית משפט, שופטים ותקציר חולצו על-ידי AI ויכולים
        לכלול שגיאות — יש לוודא מול המסמך המקורי.
      </p>
    </div>
  );
}
