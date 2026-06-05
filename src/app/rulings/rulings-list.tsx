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

interface RulingsResponse {
  total: number;
  page: number;
  size: number;
  rulings: Ruling[];
  // Ordered list of field keys (e.g. "ai.שם_התיק", "sql.הוצאות_משפט") set
  // by the admin in the Site Editor. Empty array = render the built-in
  // default block (court, judges, summary).
  displayFields?: string[];
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

export function RulingsList({
  category,
}: {
  category: "foi" | "defamation" | "foi-judgments" | "foi-costs";
}) {
  const [data, setData] = useState<RulingsResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (cat: string, p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/rulings?category=${cat}&limit=${PAGE_SIZE}&page=${p}`,
      );
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
  }, []);

  useEffect(() => {
    fetchData(category, page);
  }, [fetchData, category, page]);

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canPrev = page > 1;
  const canNext = page < totalPages;
  const pageStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(page * PAGE_SIZE, total);

  return (
    <div dir="rtl">
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
