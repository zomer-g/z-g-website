"use client";

import { useCallback, useEffect, useState } from "react";
import type { Guideline, GuidelinesListResponse } from "@/types/guideline";

const PAGE_SIZE = 20;

const C_PRIMARY = "#1a365d";
const C_PD = "#2a6f97";
const C_OTHER = "#e07b54";
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

interface Filters {
  q: string;
  date_from: string;
  date_to: string;
  sources: string[];
}

const EMPTY_FILTERS: Filters = {
  q: "",
  date_from: "",
  date_to: "",
  sources: [],
};

function buildQs(filters: Filters, skip: number) {
  const p = new URLSearchParams();
  p.set("limit", String(PAGE_SIZE));
  p.set("skip", String(skip));
  if (filters.q.trim()) p.set("q", filters.q.trim());
  if (filters.date_from) p.set("date_from", filters.date_from);
  if (filters.date_to) p.set("date_to", filters.date_to);
  for (const s of filters.sources) p.append("source", s);
  return p.toString();
}

function SkeletonCard() {
  return (
    <div className="rounded-xl shadow-md border border-gray-200 bg-white p-5 animate-pulse">
      <div className="h-3 w-1/3 bg-gray-200 rounded mb-3" />
      <div className="h-4 w-3/4 bg-gray-200 rounded mb-2" />
      <div className="h-3 w-1/2 bg-gray-200 rounded mb-4" />
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

function GuidelineCard({ doc }: { doc: Guideline }) {
  const [open, setOpen] = useState(false);
  const supersedesText = Array.isArray(doc.supersedes)
    ? doc.supersedes.join(", ")
    : doc.supersedes || "";

  return (
    <article
      className="rounded-xl shadow-md border border-gray-200 bg-white p-5 hover:shadow-lg transition flex flex-col"
      dir="rtl"
    >
      <div className="flex items-start gap-2 mb-2 flex-wrap">
        {doc.source_label ? (
          <Badge color={C_PD} bg="#e1ecf3">
            {doc.source_label}
          </Badge>
        ) : null}
        {doc.directive_number ? (
          <Badge color={C_OTHER} bg="#fbe9e0">
            הנחיה {doc.directive_number}
          </Badge>
        ) : null}
        {doc.has_text ? null : (
          <Badge color={C_MUTED} bg="#eef0f3">
            ללא טקסט
          </Badge>
        )}
      </div>

      <h3
        className="text-base font-bold leading-snug mb-2"
        style={{ color: C_PRIMARY }}
      >
        {doc.document_title || doc.filename || "ללא כותרת"}
      </h3>

      <div className="text-sm text-gray-700 mb-1">
        <span className="font-semibold">תאריך פרסום:</span> {fmtDate(doc.document_date)}
      </div>
      {doc.topic ? (
        <div className="text-sm text-gray-700 mb-1">
          <span className="font-semibold">תחום:</span> {doc.topic}
        </div>
      ) : null}
      {doc.summary ? (
        <p className="text-sm text-gray-600 leading-relaxed mt-2 line-clamp-3">
          {doc.summary}
        </p>
      ) : null}

      {open ? (
        <div className="border-t border-gray-100 pt-3 mt-3 space-y-2 text-sm text-gray-800">
          {doc.effective_date ? (
            <div>
              <span className="font-semibold">תחילת תוקף:</span>{" "}
              {fmtDate(doc.effective_date)}
            </div>
          ) : null}
          {supersedesText ? (
            <div>
              <span className="font-semibold">מחליף את:</span>{" "}
              <span className="text-gray-700">{supersedesText}</span>
            </div>
          ) : null}
          {doc.has_text ? (
            <div className="text-xs text-gray-500">
              טקסט ההנחיה כולל {doc.text_chars.toLocaleString("he-IL")} תווים — ניתן
              לצפייה דרך כפתור &quot;טקסט מקור&quot;.
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-auto pt-4 flex items-center gap-3 flex-wrap">
        <a
          href={`/api/guidelines/documents/${doc.id}/file`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold rounded-md px-3 py-1.5 text-white transition"
          style={{ background: C_PRIMARY }}
        >
          פתח PDF
        </a>
        {doc.has_text ? (
          <a
            href={`/api/guidelines/documents/${doc.id}/text`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold rounded-md px-3 py-1.5 border transition"
            style={{ color: C_PRIMARY, borderColor: C_PRIMARY }}
          >
            טקסט מקור (MD)
          </a>
        ) : null}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-sm font-semibold rounded-md px-3 py-1.5 text-gray-600 hover:text-gray-900 transition mr-auto"
        >
          {open ? "צמצם" : "פרטים נוספים"}
        </button>
      </div>
    </article>
  );
}

export function GuidelinesDashboard() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [skip, setSkip] = useState(0);
  const [data, setData] = useState<GuidelinesListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allSources, setAllSources] = useState<string[]>([]);

  // Load list of distinct sources once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/guidelines/sources");
        if (!res.ok) return;
        const json = (await res.json()) as { sources: string[] };
        if (!cancelled) setAllSources(json.sources || []);
      } catch {
        // ignore — pills just won't render
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchData = useCallback(async (f: Filters, s: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/guidelines/documents?${buildQs(f, s)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as GuidelinesListResponse;
      setData(json);
    } catch (e) {
      console.error(e);
      setError("שגיאה בטעינת ההנחיות. נסו שוב מאוחר יותר.");
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

  const toggleSource = (s: string) => {
    setDraft((d) =>
      d.sources.includes(s)
        ? { ...d, sources: d.sources.filter((x) => x !== s) }
        : { ...d, sources: [...d.sources, s] },
    );
  };
  const selectAllSources = () => setDraft((d) => ({ ...d, sources: [...allSources] }));
  const clearAllSources = () => setDraft((d) => ({ ...d, sources: [] }));

  const total = data?.total ?? 0;
  const pageStart = total === 0 ? 0 : skip + 1;
  const pageEnd = Math.min(skip + PAGE_SIZE, total);
  const canPrev = skip > 0;
  const canNext = skip + PAGE_SIZE < total;

  return (
    <div dir="rtl">
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        {/* Free-text search */}
        <div className="mb-3">
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            חיפוש חופשי
          </label>
          <input
            type="text"
            placeholder="חיפוש בכותרת ובתוכן ההנחיות..."
            value={draft.q}
            onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyFilters();
            }}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>

        {/* Date range */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
        </div>

        {/* Source pills */}
        {allSources.length > 0 ? (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-gray-600">
                מקורות (סמן אחד או יותר; ללא בחירה = הכל)
              </label>
              <div className="flex items-center gap-3 text-xs">
                <button
                  type="button"
                  onClick={selectAllSources}
                  className="font-semibold text-blue-700 hover:underline"
                >
                  סמן הכל
                </button>
                <button
                  type="button"
                  onClick={clearAllSources}
                  className="font-semibold text-gray-600 hover:underline"
                >
                  נקה הכל
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {allSources.map((s) => {
                const active = draft.sources.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSource(s)}
                    aria-pressed={active}
                    className="text-xs font-semibold rounded-full px-3 py-1 border transition"
                    style={
                      active
                        ? {
                            background: C_PRIMARY,
                            color: "white",
                            borderColor: C_PRIMARY,
                          }
                        : {
                            color: C_PRIMARY,
                            borderColor: "#d1d5db",
                            background: "white",
                          }
                    }
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

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
              ? "לא נמצאו הנחיות התואמות את הסינון"
              : `מציג הנחיות ${pageStart}–${pageEnd} מתוך ${total}`}
          </span>
        )}
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : data?.items.map((doc) => <GuidelineCard key={doc.id} doc={doc} />)}
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
        המידע נשאב מ-over.org.il ומוצג כמות שהוא, ללא עיבוד נוסף. הקישורים מובילים
        לקובץ ה-PDF המקורי או לטקסט שחולץ ממנו (Markdown).
      </p>
    </div>
  );
}
