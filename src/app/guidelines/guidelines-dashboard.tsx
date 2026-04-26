"use client";

import { useCallback, useEffect, useState } from "react";
import type { Guideline } from "@/types/guideline";

const PAGE_SIZE = 20;

const C_PRIMARY = "#1a365d";
const C_PD = "#2a6f97";
const C_OTHER = "#e07b54";

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
  smart: boolean;
}

const EMPTY_FILTERS: Filters = {
  q: "",
  date_from: "",
  date_to: "",
  sources: [],
  smart: true, // Hybrid AI is the new default — gives much better results.
};

interface SourceFacet {
  label: string;
  count: number;
}

interface SearchResponse {
  total: number;
  skip: number;
  limit: number;
  items: Guideline[];
  snippets?: string[];
  facets?: { sources: SourceFacet[] };
}

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

// Keys we render explicitly (or that are duplicated as top-level fields). Anything
// in csv_row that doesn't appear here gets shown generically in the metadata block.
const CSV_ROW_SKIP = new Set([
  "_id",
  "rank",
]);

function isDisplayableValue(value: unknown): value is string | number | boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "boolean") return true;
  return false;
}

function fmtValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "כן" : "לא";
  if (typeof value === "number") return value.toLocaleString("he-IL");
  return String(value);
}

// Wrap each query term inside the snippet with a highlight span so the user
// sees why this card was returned. Falls back to a plain text node when there
// are no terms to highlight.
function HighlightedSnippet({ text, query }: { text: string; query: string }) {
  if (!text) return null;
  const terms = query
    .split(/\s+/)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .filter((t) => t.length >= 2);
  if (terms.length === 0) return <>{text}</>;
  const re = new RegExp(`(${terms.join("|")})`, "gi");
  const parts = text.split(re);
  return (
    <>
      {parts.map((part, i) =>
        re.test(part) ? (
          <mark key={i} className="bg-yellow-100 text-inherit px-0.5 rounded">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function GuidelineCard({
  doc,
  snippet,
  query,
}: {
  doc: Guideline;
  snippet?: string;
  query?: string;
}) {
  const [open, setOpen] = useState(false);
  const supersedesText = Array.isArray(doc.supersedes)
    ? doc.supersedes.join(", ")
    : doc.supersedes || "";

  const csvRowEntries = Object.entries(doc.csv_row || {})
    .filter(([key, value]) => {
      if (CSV_ROW_SKIP.has(key)) return false;
      if (!isDisplayableValue(value)) return false;
      const str = String(value).trim();
      // Skip giant text fields (likely OCR/text dumps that bloat the card).
      if (str.length > 600) return false;
      return true;
    });

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

      {snippet ? (
        <div className="mt-3 rounded-md bg-amber-50 border-r-2 border-amber-300 px-3 py-2 text-xs leading-relaxed text-gray-800">
          <div className="text-[10px] font-semibold text-amber-700 mb-1 uppercase tracking-wide">
            התאמה בטקסט
          </div>
          <HighlightedSnippet text={snippet} query={query ?? ""} />
        </div>
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

          {csvRowEntries.length > 0 ? (
            <div className="border-t border-gray-100 pt-2 mt-2">
              <div className="text-xs font-semibold text-gray-500 mb-1.5">
                מטא-דאטה נוספת
              </div>
              <dl className="grid grid-cols-1 gap-1">
                {csvRowEntries.map(([key, value]) => (
                  <div key={key} className="text-sm">
                    <dt className="inline font-semibold text-gray-700">{key}:</dt>{" "}
                    <dd className="inline text-gray-700">{fmtValue(value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}

          {doc.over_collected_at || doc.over_imported_at || doc.over_version_number ? (
            <div className="border-t border-gray-100 pt-2 mt-2 text-xs text-gray-500 space-y-1">
              {doc.over_version_number != null ? (
                <div>גרסת מאגר: {doc.over_version_number}</div>
              ) : null}
              {doc.over_collected_at ? (
                <div>נאסף מאתר הממשלה: {fmtDate(doc.over_collected_at)}</div>
              ) : null}
              {doc.over_imported_at ? (
                <div>יובא למערכת: {fmtDate(doc.over_imported_at)}</div>
              ) : null}
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
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (f: Filters, s: number) => {
    setLoading(true);
    setError(null);
    try {
      // Smart search needs a query; without one, fall back to the standard
      // documents endpoint so the page lists everything.
      const useSmart = f.smart && f.q.trim().length > 0;
      const url = useSmart
        ? `/api/guidelines/search?${buildQs(f, s)}`
        : `/api/guidelines/documents?${buildQs(f, s)}`;
      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      const json = (await res.json()) as SearchResponse;
      setData(json);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "שגיאה בטעינת ההנחיות.");
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

  // Source pills are an "active" filter — toggling applies immediately and
  // resets pagination, no need to press "סנן".
  const toggleSourceImmediate = (s: string) => {
    const next = filters.sources.includes(s)
      ? filters.sources.filter((x) => x !== s)
      : [...filters.sources, s];
    setSkip(0);
    setFilters((f) => ({ ...f, sources: next }));
    setDraft((d) => ({ ...d, sources: next }));
  };
  const clearAllSourcesImmediate = () => {
    setSkip(0);
    setFilters((f) => ({ ...f, sources: [] }));
    setDraft((d) => ({ ...d, sources: [] }));
  };

  const facetSources: SourceFacet[] = data?.facets?.sources ?? [];

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
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-gray-600">
              חיפוש חופשי
            </label>
            <label className="inline-flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.smart}
                onChange={(e) => setDraft((d) => ({ ...d, smart: e.target.checked }))}
                className="h-3.5 w-3.5"
              />
              <span className="font-semibold">חיפוש חכם (Hybrid AI)</span>
            </label>
          </div>
          <input
            type="text"
            placeholder={
              draft.smart
                ? "תארו במילים שלכם מה אתם מחפשים — שילוב סמנטי + מילולי, סובלני לעברית"
                : "חיפוש מילולי בלבד בכותרת ובתוכן..."
            }
            value={draft.q}
            onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyFilters();
            }}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          {draft.smart ? (
            <div className="mt-1 text-xs text-gray-500 leading-relaxed space-y-1">
              <p>
                חיפוש משלב משמעות (vector embeddings) ומילולי (BM25-like על
                חלקי טקסט) באמצעות Reciprocal Rank Fusion, וטיפול אוטומטי
                בקידומות עבריות (ה/ב/ל/מ/ש/ו/כ).
              </p>
              <p>
                <span className="font-semibold text-gray-700">אופרטורים: </span>
                <code className="text-[10px] bg-gray-100 px-1 rounded">&quot;ביטוי מדויק&quot;</code>{" "}
                לציטוט מילולי,{" "}
                <code className="text-[10px] bg-gray-100 px-1 rounded">A OR B</code>{" "}
                (או <code className="text-[10px] bg-gray-100 px-1 rounded">A או B</code>) לבחירה,
                ו-<code className="text-[10px] bg-gray-100 px-1 rounded">(A OR B) C</code>{" "}
                לקיבוץ עם סוגריים.
              </p>
            </div>
          ) : null}
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

        {/* Source facet pills — derived from current results, applied instantly. */}
        {facetSources.length > 0 || filters.sources.length > 0 ? (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
              <label className="block text-xs font-semibold text-gray-600">
                מקורות בתוצאות הנוכחיות (לחיצה מסננת מיד)
              </label>
              {filters.sources.length > 0 ? (
                <button
                  type="button"
                  onClick={clearAllSourcesImmediate}
                  className="text-xs font-semibold text-gray-600 hover:underline"
                >
                  נקה סינון מקור
                </button>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {facetSources.map((f) => {
                const active = filters.sources.includes(f.label);
                return (
                  <button
                    key={f.label}
                    type="button"
                    onClick={() => toggleSourceImmediate(f.label)}
                    aria-pressed={active}
                    className="text-xs font-semibold rounded-full px-3 py-1 border transition inline-flex items-center gap-1.5"
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
                    <span>{f.label}</span>
                    <span
                      className="rounded-full px-1.5 text-[10px] tabular-nums"
                      style={
                        active
                          ? { background: "rgba(255,255,255,0.2)" }
                          : { background: "#eef2f7" }
                      }
                    >
                      {f.count}
                    </span>
                  </button>
                );
              })}
              {/* Selected sources that aren't in facets (e.g. result for that
                  source is now zero) — keep them visible as a "stuck" toggle
                  so the user understands why results are empty. */}
              {filters.sources
                .filter((s) => !facetSources.some((f) => f.label === s))
                .map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => toggleSourceImmediate(label)}
                    aria-pressed
                    className="text-xs font-semibold rounded-full px-3 py-1 border transition inline-flex items-center gap-1.5"
                    style={{
                      background: C_PRIMARY,
                      color: "white",
                      borderColor: C_PRIMARY,
                    }}
                  >
                    <span>{label}</span>
                    <span
                      className="rounded-full px-1.5 text-[10px] tabular-nums"
                      style={{ background: "rgba(255,255,255,0.2)" }}
                    >
                      0
                    </span>
                  </button>
                ))}
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
          : data?.items.map((doc, i) => (
              <GuidelineCard
                key={doc.id}
                doc={doc}
                snippet={data.snippets?.[i]}
                query={filters.q}
              />
            ))}
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
        לקובץ ה-PDF המקורי כפי שפורסם.
      </p>
    </div>
  );
}
