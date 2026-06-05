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

type FilterControl = "text" | "select" | "number" | "date";

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
}

// 12 = LCM(1,2,3) × 2 — keeps every full page row-aligned across the
// 1-col / 2-col / 3-col breakpoints. Half the load of 24 to stay under
// the serverless timeout, since each doc triggers a metadata round-trip.
const PAGE_SIZE = 12;

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
        <div className="text-[11px] text-gray-500 mb-3 font-mono">
          {fieldKeyToLabel(headerKey)}
        </div>

        <dl className="text-sm text-gray-700 mb-3 space-y-1.5">
          {rest.map((key) => {
            const value = ruling.fields?.[key];
            const isEmpty = value == null || value === "";
            return (
              <div key={key} className="flex gap-1.5">
                <dt className="font-semibold whitespace-nowrap">
                  {fieldKeyToLabel(key)}:
                </dt>
                <dd className={isEmpty ? "text-gray-400" : "text-gray-700"}>
                  {isEmpty ? "—" : formatFieldValue(value)}
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
          if (f.control === "select") {
            const opts = options[f.key] || [];
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
                      {o}
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

  const fetchData = useCallback(
    async (cat: string, p: number, filters: Record<string, UserFilterValue>) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          category: cat,
          limit: String(PAGE_SIZE),
          page: String(p),
        });
        const activeEntries = Object.entries(filters).filter(([, v]) =>
          isFilterActive(v),
        );
        if (activeEntries.length > 0) {
          params.set("userFilters", JSON.stringify(Object.fromEntries(activeEntries)));
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
    fetchData(category, page, appliedFilters);
  }, [fetchData, category, page, appliedFilters]);

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

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canPrev = page > 1;
  const canNext = page < totalPages;
  const pageStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(page * PAGE_SIZE, total);

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

      {/* Results header */}
      <div className="mb-3 text-sm text-gray-600">
        {loading ? (
          <span>בטעינה…</span>
        ) : error ? (
          <span className="text-red-600">{error}</span>
        ) : total === 0 ? (
          <span>לא נמצאו פסקי דין</span>
        ) : (
          <span>
            מציג פסקי דין {pageStart}–{pageEnd} מתוך {total.toLocaleString("he-IL")}
          </span>
        )}
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
