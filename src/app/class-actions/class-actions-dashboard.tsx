"use client";

import { useCallback, useEffect, useState } from "react";
import type { ClassActionDocument, ClassActionListResponse } from "@/types/class-action";

const PAGE_SIZE = 20;

const C_PRIMARY = "#1a365d";
const C_PD = "#2a6f97";
const C_OTHER = "#e07b54";
const C_MUTED = "#4b5563";

const ilsFmt = new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "ILS",
  maximumFractionDigits: 0,
});
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

function fmtAmount(n: number) {
  if (!n || n <= 0) return "לא צוין";
  return ilsFmt.format(n);
}

interface Filters {
  q: string;
  date_from: string;
  date_to: string;
  court: string;
  case_number: string;
  is_appeal: "" | "true" | "false";
  is_attachment: "" | "true" | "false";
  claim_min: string;
  claim_max: string;
}

const EMPTY_FILTERS: Filters = {
  q: "",
  date_from: "",
  date_to: "",
  court: "",
  case_number: "",
  is_appeal: "",
  is_attachment: "",
  claim_min: "",
  claim_max: "",
};

function buildQs(filters: Filters, skip: number) {
  const p = new URLSearchParams();
  p.set("limit", String(PAGE_SIZE));
  p.set("skip", String(skip));
  if (filters.q.trim()) p.set("q", filters.q.trim());
  if (filters.date_from) p.set("date_from", filters.date_from);
  if (filters.date_to) p.set("date_to", filters.date_to);
  if (filters.court.trim()) p.set("court", filters.court.trim());
  if (filters.case_number.trim()) p.set("case_number", filters.case_number.trim());
  if (filters.is_appeal) p.set("is_appeal", filters.is_appeal);
  if (filters.is_attachment) p.set("is_attachment", filters.is_attachment);
  if (filters.claim_min) p.set("claim_min", filters.claim_min);
  if (filters.claim_max) p.set("claim_max", filters.claim_max);
  return p.toString();
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

function CardItem({ doc }: { doc: ClassActionDocument }) {
  const [open, setOpen] = useState(false);
  return (
    <article
      className="rounded-xl shadow-md border border-gray-200 bg-white p-5 hover:shadow-lg transition flex flex-col"
      dir="rtl"
    >
      <div className="flex items-start gap-2 mb-2 flex-wrap">
        <Badge color={C_PD} bg="#e1ecf3">
          {doc.case_number || "—"}
        </Badge>
        {doc.is_appeal ? (
          <Badge color={C_OTHER} bg="#fbe9e0">
            ערעור
          </Badge>
        ) : null}
        {doc.is_attachment ? (
          <Badge color={C_MUTED} bg="#eef0f3">
            נספח
          </Badge>
        ) : null}
      </div>

      <h3
        className="text-base font-bold leading-snug mb-2"
        style={{ color: C_PRIMARY }}
      >
        {doc.case_name || "ללא שם תיק"}
      </h3>

      <div className="text-sm text-gray-700 mb-1">
        <span className="font-semibold">בית משפט:</span> {doc.court_name || "—"}
      </div>
      <div className="text-sm text-gray-700 mb-1">
        <span className="font-semibold">סוג מסמך:</span>{" "}
        {doc.document_title || doc.document_type || "—"}
      </div>
      <div className="text-sm text-gray-700 mb-3">
        <span className="font-semibold">תאריך הגשה:</span> {fmtDate(doc.document_date)}
      </div>

      {open ? (
        <div className="border-t border-gray-100 pt-3 mt-1 space-y-2 text-sm text-gray-800">
          <div>
            <span className="font-semibold">פתיחת תיק:</span>{" "}
            {fmtDate(doc.case_open_date)}
          </div>
          <div>
            <span className="font-semibold">סכום תביעה:</span>{" "}
            {fmtAmount(doc.claim_amount)}
          </div>
          {doc.class_definition ? (
            <div>
              <span className="font-semibold">הגדרת קבוצה:</span>{" "}
              <span className="text-gray-700">{doc.class_definition}</span>
            </div>
          ) : null}
          {doc.legal_question ? (
            <div>
              <span className="font-semibold">שאלה משפטית:</span>{" "}
              <span className="text-gray-700">{doc.legal_question}</span>
            </div>
          ) : null}
          {doc.requested_aid ? (
            <div>
              <span className="font-semibold">סעד מבוקש:</span>{" "}
              <span className="text-gray-700">{doc.requested_aid}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-auto pt-4 flex items-center gap-3">
        <a
          href={`/api/class-actions/documents/${doc.id}/file`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold rounded-md px-3 py-1.5 text-white transition"
          style={{ background: C_PRIMARY }}
        >
          פתח PDF
        </a>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-sm font-semibold rounded-md px-3 py-1.5 border transition"
          style={{ color: C_PRIMARY, borderColor: C_PRIMARY }}
        >
          {open ? "צמצם" : "הצג עוד"}
        </button>
      </div>
    </article>
  );
}

export function ClassActionsDashboard() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [skip, setSkip] = useState(0);
  const [data, setData] = useState<ClassActionListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (f: Filters, s: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/class-actions/documents?${buildQs(f, s)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as ClassActionListResponse;
      setData(json);
    } catch (e) {
      console.error(e);
      setError("שגיאה בטעינת התובענות. נסו שוב מאוחר יותר.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(filters, skip);
  }, [fetchData, filters, skip]);

  const applyFilters = () => {
    setSkip(0);
    setFilters(draft);
  };
  const clearFilters = () => {
    setDraft(EMPTY_FILTERS);
    setSkip(0);
    setFilters(EMPTY_FILTERS);
  };

  const total = data?.total ?? 0;
  const pageStart = total === 0 ? 0 : skip + 1;
  const pageEnd = Math.min(skip + PAGE_SIZE, total);
  const canPrev = skip > 0;
  const canNext = skip + PAGE_SIZE < total;

  return (
    <div dir="rtl">
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        {/* Free-text search row */}
        <div className="mb-3">
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            חיפוש חופשי
          </label>
          <input
            type="text"
            placeholder="חיפוש בשם תיק, הגדרת קבוצה, שאלה משפטית, סעד מבוקש..."
            value={draft.q}
            onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyFilters();
            }}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>

        {/* Primary filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              מתאריך
            </label>
            <input
              type="date"
              value={draft.date_from}
              onChange={(e) => setDraft((d) => ({ ...d, date_from: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              עד תאריך
            </label>
            <input
              type="date"
              value={draft.date_to}
              onChange={(e) => setDraft((d) => ({ ...d, date_to: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              בית משפט
            </label>
            <input
              type="text"
              placeholder="לדוגמה: מרכז"
              value={draft.court}
              onChange={(e) => setDraft((d) => ({ ...d, court: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              מספר תיק
            </label>
            <input
              type="text"
              placeholder="לדוגמה: 52308-04-26"
              value={draft.case_number}
              onChange={(e) => setDraft((d) => ({ ...d, case_number: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
              dir="ltr"
            />
          </div>
        </div>

        {/* Secondary filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              סוג הליך
            </label>
            <select
              value={draft.is_appeal}
              onChange={(e) =>
                setDraft((d) => ({ ...d, is_appeal: e.target.value as Filters["is_appeal"] }))
              }
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm bg-white"
            >
              <option value="">הכל</option>
              <option value="false">ראשונה</option>
              <option value="true">ערעור</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              סוג מסמך
            </label>
            <select
              value={draft.is_attachment}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  is_attachment: e.target.value as Filters["is_attachment"],
                }))
              }
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm bg-white"
            >
              <option value="">הכל</option>
              <option value="false">מסמך עיקרי</option>
              <option value="true">נספח</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              סכום תביעה (₪) — מ
            </label>
            <input
              type="number"
              min={0}
              placeholder="0"
              value={draft.claim_min}
              onChange={(e) => setDraft((d) => ({ ...d, claim_min: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              סכום תביעה (₪) — עד
            </label>
            <input
              type="number"
              min={0}
              placeholder="ללא תקרה"
              value={draft.claim_max}
              onChange={(e) => setDraft((d) => ({ ...d, claim_max: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
              dir="ltr"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={clearFilters}
            className="text-sm font-semibold rounded-md px-3 py-1.5 border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            נקה
          </button>
          <button
            type="button"
            onClick={applyFilters}
            className="text-sm font-semibold rounded-md px-4 py-1.5 text-white"
            style={{ background: C_PRIMARY }}
          >
            סנן
          </button>
        </div>
      </div>

      {/* Results header */}
      <div className="flex items-center justify-between mb-3 text-sm text-gray-600">
        {loading ? (
          <span>טוען…</span>
        ) : error ? (
          <span className="text-red-600">{error}</span>
        ) : (
          <span>
            {total === 0
              ? "לא נמצאו תובענות בטווח שנבחר"
              : `מציג ${pageStart}–${pageEnd} מתוך ${total}`}
          </span>
        )}
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : data?.items.map((doc) => <CardItem key={doc.id} doc={doc} />)}
      </div>

      {/* Pagination */}
      {!loading && total > PAGE_SIZE ? (
        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            type="button"
            disabled={!canPrev}
            onClick={() => setSkip((s) => Math.max(0, s - PAGE_SIZE))}
            className="text-sm font-semibold rounded-md px-4 py-2 border disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ color: C_PRIMARY, borderColor: C_PRIMARY }}
          >
            הקודם
          </button>
          <span className="text-sm text-gray-600">
            עמוד {Math.floor(skip / PAGE_SIZE) + 1} מתוך{" "}
            {Math.max(1, Math.ceil(total / PAGE_SIZE))}
          </span>
          <button
            type="button"
            disabled={!canNext}
            onClick={() => setSkip((s) => s + PAGE_SIZE)}
            className="text-sm font-semibold rounded-md px-4 py-2 text-white disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: C_PRIMARY }}
          >
            הבא
          </button>
        </div>
      ) : null}

      <p className="text-xs text-gray-500 mt-8 leading-relaxed">
        המידע נשאב מפנקס תובענות ייצוגיות ומוצג כמות שהוא, ללא סינון או עיבוד נוסף.
        הקישור לכתבי הטענות הוא לקובץ ה-PDF המקורי כפי שהתפרסם בפנקס.
      </p>
    </div>
  );
}
