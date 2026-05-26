"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type {
  ConditionalArrangement,
  ArrangementsResponse,
  ArrangementSource,
} from "@/types/conditional-arrangement";
import { DateInputIL } from "@/components/ui/date-input-il";

// 24 = LCM(1, 2, 3) × 4 — keeps every full page row-aligned across the
// 1-col / 2-col / 3-col breakpoints so there's never a half-row at the end.
const PAGE_SIZE = 24;

const C_POLICE = "#1a365d";
const C_PROSECUTOR = "#6b21a8";

const dateFmt = new Intl.DateTimeFormat("he-IL", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const ilsFmt = new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "ILS",
  maximumFractionDigits: 0,
});

function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return dateFmt.format(d);
}

function fmtAmount(n: number | null) {
  if (!n || n <= 0) return null;
  return ilsFmt.format(n);
}

/* ─── Source label / colour ─────────────────────────────────────── */

const SOURCE_LABEL: Record<ArrangementSource, string> = {
  police: "משטרה",
  prosecutor: "פרקליטות",
};

const SOURCE_COLOR: Record<ArrangementSource, { text: string; bg: string }> = {
  police: { text: C_POLICE, bg: "#dbeafe" },
  prosecutor: { text: C_PROSECUTOR, bg: "#f3e8ff" },
};

/* ─── Types ─────────────────────────────────────────────────────── */

type SortOrder = "date_desc" | "date_asc";

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: "date_desc", label: "מהחדש לישן" },
  { value: "date_asc", label: "מהישן לחדש" },
];

type SourceFilter = "all" | ArrangementSource;

interface Filters {
  source: SourceFilter;
  q: string;
  date_from: string;
  date_to: string;
  district: string;
  offense: string;
}

const EMPTY_FILTERS: Filters = {
  source: "all",
  q: "",
  date_from: "",
  date_to: "",
  district: "",
  offense: "",
};

const DEFAULT_SORT: SortOrder = "date_desc";

/* ─── URL ⇄ state helpers ────────────────────────────────────────
   All filters, sort, and pagination live in the URL so a copied link
   reproduces the exact same view. */

function isSourceFilter(v: string): v is SourceFilter {
  return v === "all" || v === "police" || v === "prosecutor";
}

function filtersFromSearchParams(sp: URLSearchParams): Filters {
  const src = sp.get("source") ?? "all";
  return {
    source: isSourceFilter(src) ? src : "all",
    q: sp.get("q") ?? "",
    date_from: sp.get("date_from") ?? "",
    date_to: sp.get("date_to") ?? "",
    district: sp.get("district") ?? "",
    offense: sp.get("offense") ?? "",
  };
}

function skipFromSearchParams(sp: URLSearchParams): number {
  const n = Number(sp.get("skip"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function sortFromSearchParams(sp: URLSearchParams): SortOrder {
  const raw = sp.get("sort");
  return raw === "date_asc" ? "date_asc" : "date_desc";
}

function buildQs(filters: Filters, skip: number, sort: SortOrder): string {
  const p = new URLSearchParams();
  p.set("limit", String(PAGE_SIZE));
  p.set("skip", String(skip));
  p.set("sort", sort);
  if (filters.source !== "all") p.set("source", filters.source);
  if (filters.q.trim()) p.set("q", filters.q.trim());
  if (filters.date_from) p.set("date_from", filters.date_from);
  if (filters.date_to) p.set("date_to", filters.date_to);
  if (filters.district.trim()) p.set("district", filters.district.trim());
  if (filters.offense.trim()) p.set("offense", filters.offense.trim());
  return p.toString();
}

function stateToSearchParams(f: Filters, s: number, ord: SortOrder): URLSearchParams {
  const p = new URLSearchParams();
  if (f.source !== "all") p.set("source", f.source);
  if (f.q.trim()) p.set("q", f.q.trim());
  if (f.date_from) p.set("date_from", f.date_from);
  if (f.date_to) p.set("date_to", f.date_to);
  if (f.district.trim()) p.set("district", f.district.trim());
  if (f.offense.trim()) p.set("offense", f.offense.trim());
  if (ord !== DEFAULT_SORT) p.set("sort", ord);
  if (s > 0) p.set("skip", String(s));
  return p;
}

/* ─── Skeleton card ─────────────────────────────────────────────── */

function SkeletonCard() {
  return (
    <div className="rounded-xl shadow-md border border-gray-200 bg-white p-5 animate-pulse">
      <div className="flex gap-2 mb-3">
        <div className="h-5 w-16 bg-gray-200 rounded-full" />
        <div className="h-5 w-12 bg-gray-200 rounded-full" />
      </div>
      <div className="h-4 w-3/4 bg-gray-200 rounded mb-3" />
      <div className="h-3 w-1/2 bg-gray-200 rounded mb-2" />
      <div className="h-3 w-2/3 bg-gray-200 rounded" />
    </div>
  );
}

/* ─── Badge ─────────────────────────────────────────────────────── */

function Badge({
  children,
  color,
  bg,
}: {
  children: React.ReactNode;
  color: string;
  bg: string;
}) {
  return (
    <span
      className="inline-block text-xs font-semibold rounded-full px-2.5 py-0.5"
      style={{ color, background: bg }}
    >
      {children}
    </span>
  );
}

/* ─── ArrangementCard ────────────────────────────────────────────── */

// Fields shown prominently in the card body — excluded from the secondary
// accordion so values are not duplicated. "תיאור" is NOT here: it is shown
// as a snippet in the card, and the accordion fetches the full text on demand.
const PRIMARY_FIELDS = new Set([
  "שלוחה",       // police district
  "יחידה",       // prosecutor district
  "תאריך",      // police date
  "תאריך עברי", // redundant with Gregorian date
  "מספר תיק",   // case number
]);

type DetailState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; text: string }
  | { status: "error" };

function ArrangementCard({ item }: { item: ConditionalArrangement }) {
  const [detail, setDetail] = useState<DetailState>({ status: "idle" });
  const { text: sourceText, bg: sourceBg } = SOURCE_COLOR[item.source];

  const caseNo = item.raw["מספר תיק"];
  const descText = item.raw["תיאור"];
  const descSnippet = descText
    ? descText.slice(0, 220).trimEnd() + (descText.length > 220 ? "…" : "")
    : null;
  const districtLabel = item.source === "police" ? "שלוחה" : "יחידה";

  // CKAN numeric ID extracted from "_id" like "police:1234"
  const ckanId = item._id.split(":")[1];

  const isOpen = detail.status === "done" || detail.status === "loading" || detail.status === "error";

  async function loadDetail() {
    if (detail.status !== "idle") {
      // toggle closed
      setDetail({ status: "idle" });
      return;
    }
    setDetail({ status: "loading" });
    try {
      const res = await fetch(
        `/api/conditional-arrangements/detail?source=${item.source}&id=${ckanId}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { description: string };
      setDetail({ status: "done", text: json.description });
    } catch {
      setDetail({ status: "error" });
    }
  }

  return (
    <article
      className="rounded-xl shadow-md border border-gray-200 bg-white p-5 hover:shadow-lg transition flex flex-col"
      dir="rtl"
    >
      {/* Top badge row */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <Badge color={sourceText} bg={sourceBg}>
          {SOURCE_LABEL[item.source]}
        </Badge>
        {caseNo ? (
          <span className="text-xs text-gray-500 font-mono">{caseNo}</span>
        ) : null}
        {item.date ? (
          <span className="ms-auto text-xs text-gray-500 shrink-0">{fmtDate(item.date)}</span>
        ) : null}
      </div>

      {/* Offense — statute heading */}
      {item.offense ? (
        <h3 className="text-sm font-bold leading-snug mb-2 text-gray-900">
          {item.offense}
        </h3>
      ) : null}

      {/* Description snippet */}
      {descSnippet ? (
        <p className="text-xs text-gray-600 mb-2 leading-relaxed line-clamp-3">
          {descSnippet}
        </p>
      ) : null}

      {/* District */}
      {item.district ? (
        <div className="text-sm text-gray-700 mb-1">
          <span className="font-semibold">{districtLabel}:</span> {item.district}
        </div>
      ) : null}

      {/* Fine / compensation */}
      {fmtAmount(item.fine) ? (
        <div className="text-sm text-gray-700 mb-1">
          <span className="font-semibold">קנס:</span> {fmtAmount(item.fine)}
        </div>
      ) : null}
      {fmtAmount(item.compensation) ? (
        <div className="text-sm text-gray-700 mb-1">
          <span className="font-semibold">פיצוי:</span> {fmtAmount(item.compensation)}
        </div>
      ) : null}

      {/* Full-text detail panel — fetched on demand */}
      {isOpen ? (
        <div className="border-t border-gray-100 mt-3 pt-3">
          {detail.status === "loading" ? (
            <div className="text-xs text-gray-400 animate-pulse">טוען פרטים מלאים…</div>
          ) : detail.status === "error" ? (
            <div className="text-xs text-red-500">שגיאה בטעינת הפרטים. נסו שוב.</div>
          ) : detail.status === "done" ? (
            <div className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
              {detail.text}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Toggle button */}
      <div className="mt-auto pt-3 flex justify-end">
        <button
          type="button"
          onClick={loadDetail}
          className="text-xs font-semibold rounded-md px-3 py-1 border transition"
          style={{ color: C_POLICE, borderColor: C_POLICE }}
        >
          {isOpen ? "סגור" : "פרטים מלאים"}
        </button>
      </div>
    </article>
  );
}

/* ─── Main Dashboard ─────────────────────────────────────────────── */

export function ConditionalArrangementsDashboard() {
  const pathname = usePathname();

  // ── Applied state (drives the fetch; NOT re-derived from URL after mount) ──
  // Using local state instead of URL-derived useMemo avoids the Next.js App
  // Router concurrent-navigation delay: router.replace is an async transition,
  // so useSearchParams lags behind the click. With local state fetchData is
  // called synchronously in the same event that changes the filter.
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [skip, setSkip] = useState(0);
  const [sort, setSort] = useState<SortOrder>(DEFAULT_SORT);

  // Draft state for text inputs that wait for the "סינון" button.
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);

  const [data, setData] = useState<ArrangementsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // AbortController — cancel the in-flight request when a newer one starts.
  const abortRef = useRef<AbortController | null>(null);

  // Auto-retry timer for 503 "sync in progress" responses.
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(
    async (f: Filters, s: number, ord: SortOrder) => {
      abortRef.current?.abort();
      // Clear any pending auto-retry before starting a new request.
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      const controller = new AbortController();
      abortRef.current = controller;

      setData(null);
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/conditional-arrangements/records?${buildQs(f, s, ord)}`,
          { signal: controller.signal },
        );
        if (res.status === 503) {
          // Initial DB sync is in progress — show friendly message and auto-retry.
          if (!controller.signal.aborted) {
            setError("הנתונים נטענים לראשונה, אנא המתינו…");
            setLoading(false);
            retryTimerRef.current = setTimeout(() => {
              retryTimerRef.current = null;
              fetchData(f, s, ord);
            }, 15_000);
          }
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as ArrangementsResponse;
        setData(json);
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        console.error(e);
        setError("שגיאה בטעינת ההסדרים. נסו שוב מאוחר יותר.");
        setData(null);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [],
  );

  // Initialise from URL params exactly once on mount.
  // We read window.location.search directly instead of useSearchParams() so that
  // this component is NOT subscribed to the Next.js router's search-param context.
  // useSearchParams() causes Next.js to wrap the component in a Suspense boundary;
  // any URL change (router.replace or replaceState) then re-triggers that Suspense,
  // unmounting and remounting the component and stacking duplicate grids in the DOM.
  // Reading from window.location.search is safe here because useEffect only runs
  // client-side, after hydration, when window is always available.
  const mountedRef = useRef(false);
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    const sp = new URLSearchParams(window.location.search);
    const f = filtersFromSearchParams(sp);
    const s = skipFromSearchParams(sp);
    const ord = sortFromSearchParams(sp);
    setFilters(f);
    setSkip(s);
    setSort(ord);
    setDraft(f);
    fetchData(f, s, ord);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — run once on mount

  // Sync URL for shareability using window.history.replaceState.
  // This is safe now that the component no longer calls useSearchParams():
  // without a search-param subscription, replaceState is a pure browser
  // history update — Next.js does not intercept it to trigger a navigation,
  // so no Suspense re-triggers, no remount, and no duplicate grid instances.
  const syncUrl = useCallback(
    (f: Filters, s: number, ord: SortOrder) => {
      const qs = stateToSearchParams(f, s, ord).toString();
      window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname],
  );

  // Single entry-point for every state change: update local state, fetch, sync URL.
  const applyState = useCallback(
    (f: Filters, s: number, ord: SortOrder) => {
      setFilters(f);
      setSkip(s);
      setSort(ord);
      fetchData(f, s, ord);
      syncUrl(f, s, ord);
    },
    [fetchData, syncUrl],
  );

  const applyFilters = () => applyState(draft, 0, sort);
  const clearFilters = () => {
    setDraft(EMPTY_FILTERS);
    applyState(EMPTY_FILTERS, 0, DEFAULT_SORT);
  };

  const total = data?.total ?? 0;
  const pageStart = total === 0 ? 0 : skip + 1;
  const pageEnd = Math.min(skip + PAGE_SIZE, total);
  const canPrev = skip > 0;
  const canNext = skip + PAGE_SIZE < total;

  // Dynamic facet options (from last successful response)
  const districts = data?.facets.districts ?? [];
  const offenses = data?.facets.offenses ?? [];

  return (
    <div dir="rtl">
      {/* ── Filters ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">

        {/* Source chips */}
        <div className="mb-4">
          <div className="text-xs font-semibold text-gray-600 mb-2">מקור</div>
          <div className="flex gap-2 flex-wrap">
            {(
              [
                { value: "all", label: "כל המקורות" },
                { value: "police", label: "משטרה" },
                { value: "prosecutor", label: "פרקליטות" },
              ] as { value: SourceFilter; label: string }[]
            ).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  const next = { ...draft, source: value };
                  setDraft(next);
                  applyState(next, 0, sort);
                }}
                className="rounded-full px-4 py-1.5 text-sm font-semibold transition border"
                style={
                  filters.source === value
                    ? { background: C_POLICE, color: "white", borderColor: C_POLICE }
                    : { color: C_POLICE, borderColor: C_POLICE }
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Free-text search */}
        <div className="mb-3">
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            חיפוש חופשי
          </label>
          <input
            type="text"
            placeholder="חיפוש בכל שדות ההסדר — מספר מילים = AND (כל המילים חייבות להופיע)..."
            value={draft.q}
            onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyFilters();
            }}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>

        {/* Secondary filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label htmlFor="ca-date-from" className="block text-xs font-semibold text-gray-700 mb-1">
              מתאריך
            </label>
            <DateInputIL
              id="ca-date-from"
              value={draft.date_from}
              onChange={(iso) => setDraft((d) => ({ ...d, date_from: iso }))}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label htmlFor="ca-date-to" className="block text-xs font-semibold text-gray-700 mb-1">
              עד תאריך
            </label>
            <DateInputIL
              id="ca-date-to"
              value={draft.date_to}
              onChange={(iso) => setDraft((d) => ({ ...d, date_to: iso }))}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">מחוז / שלוחה</label>
            <select
              value={draft.district}
              onChange={(e) => setDraft((d) => ({ ...d, district: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm bg-white"
            >
              <option value="">כל המחוזות</option>
              {districts.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">עבירה</label>
            <select
              value={draft.offense}
              onChange={(e) => setDraft((d) => ({ ...d, offense: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm bg-white"
            >
              <option value="">כל העבירות</option>
              {offenses.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={clearFilters}
            className="text-sm font-semibold rounded-md px-3 py-1.5 border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            ניקוי
          </button>
          <button
            type="button"
            onClick={applyFilters}
            className="text-sm font-semibold rounded-md px-4 py-1.5 text-white"
            style={{ background: C_POLICE }}
          >
            סינון
          </button>
        </div>
      </div>

      {/* ── Results header ── */}
      <div className="flex items-center justify-between gap-3 mb-3 text-sm text-gray-600">
        <div>
          {loading ? (
            <span>בטעינה…</span>
          ) : error ? (
            <span className="text-red-600">{error}</span>
          ) : (
            <span>
              {total === 0
                ? "לא נמצאו הסדרים בתנאים שנבחרו"
                : `מציג ${pageStart}–${pageEnd} מתוך ${total.toLocaleString("he-IL")} הסדרים`}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <label htmlFor="ca-sort" className="text-xs text-gray-600">
            סדר:
          </label>
          <select
            id="ca-sort"
            value={sort}
            onChange={(e) => applyState(filters, 0, e.target.value as SortOrder)}
            className="border border-gray-300 rounded-md px-2 py-1 text-xs bg-white"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Cards grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : (data?.records ?? []).map((r) => <ArrangementCard key={r._id} item={r} />)}
      </div>

      {/* ── Pagination ── */}
      {!loading && total > PAGE_SIZE ? (
        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            type="button"
            disabled={!canPrev}
            onClick={() => applyState(filters, Math.max(0, skip - PAGE_SIZE), sort)}
            className="text-sm font-semibold rounded-md px-4 py-2 border disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ color: C_POLICE, borderColor: C_POLICE }}
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
            onClick={() => applyState(filters, skip + PAGE_SIZE, sort)}
            className="text-sm font-semibold rounded-md px-4 py-2 text-white disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: C_POLICE }}
          >
            הבא
          </button>
        </div>
      ) : null}

      <p className="text-xs text-gray-500 mt-8 leading-relaxed">
        המידע נשאב ממאגרי הסדרים מותנים של המשטרה והפרקליטות כפי שמפורסמים באתר הממשלה,
        ומוצג כמות שהוא ללא סינון נוסף. הנתונים מתעדכנים אוטומטית בהתאם לעדכוני המקור.
      </p>
    </div>
  );
}
