"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  usePathname,
  useRouter,
  useSearchParams,
  type ReadonlyURLSearchParams,
} from "next/navigation";
import type { ComptrollerReport } from "@/types/comptroller-report";
import { DateInputIL } from "@/components/ui/date-input-il";
import { ShareLinkButton } from "@/components/ui/share-link-button";

// 12 = LCM(1, 2, 3) × 2 — keeps every full page row-aligned across the
// 1-col / 2-col / 3-col breakpoints so there's never a half-row at the end.
// Capped at 12 (not 24) because scope-13's sorted "new shape" projection on
// TAG-IT scales ~2.2s/doc: size 24 + sort=-meta.document_date takes ~54s and
// times out (502), while size 12 completes in ~17s. Pending a TAG-IT-side fix
// (index/project the sort field like meta.foi_costs_shekels), keep this at 12.
const PAGE_SIZE = 12;

const C_PRIMARY = "#1a365d";
const C_PD = "#2a6f97";

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

interface SourceFacet {
  label: string;
  count?: number;
}

interface SearchResponse {
  total: number;
  skip: number;
  limit: number;
  items: ComptrollerReport[];
  snippets?: string[];
  relevance?: number[];
  facets?: { sources: SourceFacet[] };
  // Admin-configured extras (optional).
  filterFields?: { key: string; label: string; control: "text" | "select" | "number" | "date" | "yearrange" | "boolean" }[];
  sortFields?: { key: string; label: string }[];
  displayFields?: string[];
  filterOptions?: Record<string, string[]>;
}

/* ── Admin-configured user-filter values ── */
type SortDir = "asc" | "desc";
type UserFilterValue =
  | string
  | { min?: number; max?: number }
  | { from?: string; to?: string };

function isUserFilterActive(v: UserFilterValue | undefined): boolean {
  if (v == null) return false;
  if (typeof v === "string") return v.trim() !== "";
  if (typeof v === "object") return Object.values(v).some((x) => x != null && x !== "");
  return false;
}

function fmtGFieldValue(v: unknown): string {
  if (v == null || v === "") return "—";
  if (Array.isArray(v)) return v.map(fmtGFieldValue).join(", ");
  if (typeof v === "number") return v.toLocaleString("he-IL");
  if (typeof v === "boolean") return v ? "כן" : "לא";
  return String(v);
}

function gFieldLabel(key: string): string {
  const tail = key.includes(".") ? key.split(".").slice(1).join(".") : key;
  return tail.replace(/_/g, " ");
}

function gOptionLabel(o: string): string {
  if (o === "true") return "כן";
  if (o === "false") return "לא";
  return o;
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

/* ── URL ⇄ filter helpers ── applied filters live in the page URL so a copied
   address bar reproduces the same view (query, dates, source picks, page). */

function filtersFromSearchParams(sp: ReadonlyURLSearchParams): Filters {
  return {
    q: sp.get("q") ?? "",
    date_from: sp.get("date_from") ?? "",
    date_to: sp.get("date_to") ?? "",
    sources: sp.getAll("source").filter(Boolean),
  };
}

function skipFromSearchParams(sp: ReadonlyURLSearchParams): number {
  const n = Number(sp.get("skip"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function filtersToSearchParams(f: Filters, s: number): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set("q", f.q.trim());
  if (f.date_from) p.set("date_from", f.date_from);
  if (f.date_to) p.set("date_to", f.date_to);
  for (const x of f.sources) p.append("source", x);
  if (s > 0) p.set("skip", String(s));
  return p;
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

// Render the snippet with matched terms highlighted. TAG-IT's full-text search
// already wraps matches in «…» guillemets — when present we convert those to
// <mark>. Otherwise we fall back to highlighting the query terms ourselves.
function HighlightedSnippet({ text, query }: { text: string; query: string }) {
  if (!text) return null;
  if (text.includes("«")) {
    const parts = text.split(/(«[^»]*»)/g);
    return (
      <>
        {parts.map((part, i) =>
          /^«[^»]*»$/.test(part) ? (
            <mark key={i} className="bg-yellow-100 text-inherit px-0.5 rounded">
              {part.slice(1, -1)}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          ),
        )}
      </>
    );
  }
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

// Tier colors tuned for AAA (>= 7:1 contrast vs. white text).
function relevanceTier(score: number): { bg: string; text: string; label: string } {
  if (score >= 75) return { bg: "#14532d", text: "#ffffff", label: "התאמה גבוהה" };
  if (score >= 55) return { bg: "#166534", text: "#ffffff", label: "התאמה טובה" };
  if (score >= 35) return { bg: "#92400e", text: "#ffffff", label: "התאמה בינונית" };
  return { bg: "#374151", text: "#ffffff", label: "התאמה חלשה" };
}

function ReportCard({
  doc,
  snippet,
  query,
  relevance,
  displayFields = [],
}: {
  doc: ComptrollerReport;
  snippet?: string;
  query?: string;
  relevance?: number;
  displayFields?: string[];
}) {
  // Admin-configured extra display fields (read from the flat doc).
  const docRec = doc as unknown as Record<string, unknown>;
  const extraFields = displayFields
    .map((key) => {
      const raw = key.includes(".") ? key.split(".").slice(1).join(".") : key;
      return { key, label: gFieldLabel(key), value: docRec[raw] };
    })
    .filter((f) => f.value != null && f.value !== "");

  const detailHref = `/comptroller-reports/${doc.id}`;
  const title = doc.document_title || doc.filename || "ללא כותרת";

  return (
    <article
      className="relative rounded-xl shadow-md border border-gray-200 bg-white p-5 hover:shadow-lg transition flex flex-col"
      dir="rtl"
    >
      {/* Stretched link covers the whole card; inner interactive elements carry
          relative z-10 so they stay clickable above it. */}
      <Link
        href={detailHref}
        aria-label={`פרטי דוח: ${title}`}
        className="absolute inset-0 z-0 rounded-xl focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        style={{ outlineColor: C_PRIMARY }}
      />

      <div className="relative z-10 flex items-start gap-2 mb-2 flex-wrap">
        {doc.source_label ? (
          <Badge color={C_PD} bg="#e1ecf3">
            {doc.source_label}
          </Badge>
        ) : null}
        {doc.report_type ? <Badge>{doc.report_type}</Badge> : null}
        {typeof relevance === "number" ? (
          (() => {
            const tier = relevanceTier(relevance);
            return (
              <span
                className="inline-flex items-center gap-1 text-xs font-semibold rounded-md px-2 py-0.5"
                style={{ background: tier.bg, color: tier.text }}
                title={`${tier.label} — ${relevance}/100`}
              >
                <span>{tier.label}</span>
                <span className="opacity-80">{relevance}</span>
              </span>
            );
          })()
        ) : null}
        <ShareLinkButton
          url={detailHref}
          title={title}
          text={doc.document_title ? `דוח מבקר המדינה: ${doc.document_title}` : undefined}
          compact
          className="ms-auto"
        />
      </div>

      <h3
        className="relative z-10 text-base font-bold leading-snug mb-2 pointer-events-none"
        style={{ color: C_PRIMARY }}
      >
        {title}
      </h3>

      <div className="relative z-10 text-sm text-gray-700 mb-1 pointer-events-none">
        <span className="font-semibold">תאריך פרסום:</span> {fmtDate(doc.document_date)}
      </div>
      {doc.series ? (
        <div className="relative z-10 text-sm text-gray-700 mb-1 pointer-events-none">
          <span className="font-semibold">סדרת הדוח:</span> {doc.series}
        </div>
      ) : null}
      {doc.report_group && doc.report_group.length > 0 ? (
        <div className="relative z-10 text-sm text-gray-700 mb-1 pointer-events-none">
          <span className="font-semibold">גוף מבוקר:</span> {doc.report_group.join(", ")}
        </div>
      ) : null}
      {doc.topic ? (
        <div className="relative z-10 text-sm text-gray-700 mb-1 pointer-events-none">
          <span className="font-semibold">נושא:</span> {doc.topic}
        </div>
      ) : null}
      {extraFields.length > 0 ? (
        <div className="relative z-10 text-sm text-gray-700 mb-1 space-y-0.5 pointer-events-none">
          {extraFields.map((f) => (
            <div key={f.key}>
              <span className="font-semibold">{f.label}:</span>{" "}
              {fmtGFieldValue(f.value)}
            </div>
          ))}
        </div>
      ) : null}
      {doc.summary ? (
        <p className="relative z-10 text-sm text-gray-600 leading-relaxed mt-2 line-clamp-3 pointer-events-none">
          {doc.summary}
        </p>
      ) : null}

      {snippet ? (
        <div className="relative z-10 mt-3 rounded-md bg-amber-50 border-r-2 border-amber-300 px-3 py-2 text-xs leading-relaxed text-gray-800 pointer-events-none">
          <div className="text-[10px] font-semibold text-amber-700 mb-1 uppercase tracking-wide">
            התאמה בטקסט
          </div>
          <HighlightedSnippet text={snippet} query={query ?? ""} />
        </div>
      ) : null}

      <div className="relative z-10 mt-auto pt-4 flex items-center gap-3 flex-wrap">
        <a
          href={`/api/rulings/documents/${doc.id}/file`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-sm font-semibold rounded-md px-3 py-1.5 text-white transition"
          style={{ background: C_PRIMARY }}
        >
          קובץ PDF
        </a>
        <Link
          href={detailHref}
          onClick={(e) => e.stopPropagation()}
          className="text-sm font-semibold rounded-md px-3 py-1.5 text-gray-600 hover:text-gray-900 transition mr-auto"
        >
          לדוח המלא
        </Link>
      </div>
    </article>
  );
}

export function ComptrollerDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(() => filtersFromSearchParams(searchParams), [searchParams]);
  const skip = useMemo(() => skipFromSearchParams(searchParams), [searchParams]);

  const [draft, setDraft] = useState<Filters>(filters);
  const draftHydratedRef = useRef(false);
  useEffect(() => {
    if (!draftHydratedRef.current) {
      setDraft(filters);
      draftHydratedRef.current = true;
    }
  }, [filters]);

  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Admin-configured extras — local state (not URL).
  const [userFiltersDraft, setUserFiltersDraft] = useState<Record<string, UserFilterValue>>({});
  const [userFilters, setUserFilters] = useState<Record<string, UserFilterValue>>({});
  const [configSort, setConfigSort] = useState<{ key: string; dir: SortDir } | null>(null);

  const fetchData = useCallback(
    async (
      f: Filters,
      s: number,
      uf: Record<string, UserFilterValue>,
      cs: { key: string; dir: SortDir } | null,
    ) => {
      setLoading(true);
      setError(null);
      try {
        // Single endpoint handles both the full-text search (when the user
        // typed a query — forwarded to TAG-IT's text_query) and the plain
        // listing (empty query).
        let qs = buildQs(f, s);
        const activeUf = Object.entries(uf).filter(([, v]) => isUserFilterActive(v));
        if (activeUf.length > 0) {
          qs += `&userFilters=${encodeURIComponent(
            JSON.stringify(Object.fromEntries(activeUf)),
          )}`;
        }
        if (cs) qs += `&sort=${encodeURIComponent(cs.key)}&dir=${cs.dir}`;
        const res = await fetch(`/api/comptroller-reports/documents?${qs}`);
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error || `HTTP ${res.status}`);
        }
        const json = (await res.json()) as SearchResponse;
        setData(json);
      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : "שגיאה בטעינת הדוחות.");
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchData(filters, skip, userFilters, configSort);
  }, [fetchData, filters, skip, userFilters, configSort]);

  const navigate = useCallback(
    (f: Filters, s: number) => {
      const qs = filtersToSearchParams(f, s).toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  const applyFilters = () => navigate(draft, 0);
  const clearFilters = () => {
    setDraft(EMPTY_FILTERS);
    navigate(EMPTY_FILTERS, 0);
  };

  // Admin-configured extras pulled from the response.
  const extraFilterFields = data?.filterFields ?? [];
  const extraSortFields = data?.sortFields ?? [];
  const extraDisplayFields = data?.displayFields ?? [];
  const gFilterOptions = data?.filterOptions ?? {};
  const applyUserFilters = () => {
    setUserFilters(userFiltersDraft);
    navigate(filters, 0);
  };
  const clearUserFilters = () => {
    setUserFiltersDraft({});
    setUserFilters({});
    navigate(filters, 0);
  };
  const setUf = (key: string, value: UserFilterValue) =>
    setUserFiltersDraft((d) => ({ ...d, [key]: value }));

  const toggleSourceImmediate = (s: string) => {
    const next = filters.sources.includes(s)
      ? filters.sources.filter((x) => x !== s)
      : [...filters.sources, s];
    navigate({ ...filters, sources: next }, 0);
  };
  const clearAllSourcesImmediate = () => {
    navigate({ ...filters, sources: [] }, 0);
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
          <label
            htmlFor="comptroller-q"
            className="block text-xs font-semibold text-gray-700 mb-1"
          >
            חיפוש חופשי בתוך הדוחות
          </label>
          <input
            id="comptroller-q"
            type="text"
            placeholder="חיפוש בכותרת ובתוכן דוחות המבקר"
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
            <label htmlFor="cr-date-from" className="block text-xs font-semibold text-gray-700 mb-1">
              מתאריך
            </label>
            <DateInputIL
              id="cr-date-from"
              value={draft.date_from}
              onChange={(iso) => setDraft((d) => ({ ...d, date_from: iso }))}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label htmlFor="cr-date-to" className="block text-xs font-semibold text-gray-700 mb-1">
              עד תאריך
            </label>
            <DateInputIL
              id="cr-date-to"
              value={draft.date_to}
              onChange={(iso) => setDraft((d) => ({ ...d, date_to: iso }))}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
            />
          </div>
        </div>

        {/* Source facet pills — derived from current results, applied instantly. */}
        {facetSources.length > 0 || filters.sources.length > 0 ? (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
              <label className="block text-xs font-semibold text-gray-600">
                סוגי דוחות (לחיצה לסינון)
              </label>
              {filters.sources.length > 0 ? (
                <button
                  type="button"
                  onClick={clearAllSourcesImmediate}
                  className="text-xs font-semibold text-gray-600 hover:underline"
                >
                  ניקוי סינון סוג
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
                        ? { background: C_PRIMARY, color: "white", borderColor: C_PRIMARY }
                        : { color: C_PRIMARY, borderColor: "#d1d5db", background: "white" }
                    }
                  >
                    <span>{f.label}</span>
                    {f.count != null ? (
                      <span
                        className="rounded-full px-1.5 text-[10px] tabular-nums"
                        style={active ? { background: "rgba(255,255,255,0.2)" } : { background: "#eef2f7" }}
                      >
                        {f.count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
              {filters.sources
                .filter((s) => !facetSources.some((f) => f.label === s))
                .map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => toggleSourceImmediate(label)}
                    aria-pressed
                    className="text-xs font-semibold rounded-full px-3 py-1 border transition inline-flex items-center gap-1.5"
                    style={{ background: C_PRIMARY, color: "white", borderColor: C_PRIMARY }}
                  >
                    <span>{label}</span>
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
            ניקוי
          </button>
          <button
            type="button"
            onClick={applyFilters}
            className="text-sm font-semibold rounded-md px-4 py-1.5 text-white"
            style={{ background: C_PRIMARY }}
          >
            סינון
          </button>
        </div>
      </div>

      {/* Admin-configured extra filters (additive). Hidden when none set. */}
      {extraFilterFields.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {extraFilterFields.map((f) => {
              const v = userFiltersDraft[f.key];
              if (f.control === "text") {
                return (
                  <div key={f.key}>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">{f.label}</label>
                    <input type="text" value={typeof v === "string" ? v : ""}
                      onChange={(e) => setUf(f.key, e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") applyUserFilters(); }}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                  </div>
                );
              }
              if (f.control === "select") {
                return (
                  <div key={f.key}>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">{f.label}</label>
                    <select value={typeof v === "string" ? v : ""}
                      onChange={(e) => setUf(f.key, e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-2 py-2 text-sm bg-white">
                      <option value="">הכל</option>
                      {(gFilterOptions[f.key] || []).map((o) => (<option key={o} value={o}>{gOptionLabel(o)}</option>))}
                    </select>
                  </div>
                );
              }
              if (f.control === "number") {
                const r = (typeof v === "object" ? v : {}) as { min?: number; max?: number };
                return (
                  <div key={f.key}>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">{f.label}</label>
                    <div className="flex items-center gap-1.5">
                      <input type="number" placeholder="מ-" value={r.min ?? ""} dir="ltr"
                        onChange={(e) => setUf(f.key, { ...r, min: e.target.value === "" ? undefined : Number(e.target.value) })}
                        className="w-full border border-gray-300 rounded-md px-2 py-2 text-sm" />
                      <span className="text-gray-400">–</span>
                      <input type="number" placeholder="עד" value={r.max ?? ""} dir="ltr"
                        onChange={(e) => setUf(f.key, { ...r, max: e.target.value === "" ? undefined : Number(e.target.value) })}
                        className="w-full border border-gray-300 rounded-md px-2 py-2 text-sm" />
                    </div>
                  </div>
                );
              }
              const r = (typeof v === "object" ? v : {}) as { from?: string; to?: string };
              return (
                <div key={f.key}>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{f.label}</label>
                  <div className="flex items-center gap-1.5">
                    <input type="date" value={r.from ?? ""} dir="ltr"
                      onChange={(e) => setUf(f.key, { ...r, from: e.target.value || undefined })}
                      className="w-full border border-gray-300 rounded-md px-2 py-2 text-sm" />
                    <span className="text-gray-400">–</span>
                    <input type="date" value={r.to ?? ""} dir="ltr"
                      onChange={(e) => setUf(f.key, { ...r, to: e.target.value || undefined })}
                      className="w-full border border-gray-300 rounded-md px-2 py-2 text-sm" />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-end gap-2 mt-4">
            <button type="button" onClick={clearUserFilters}
              className="text-sm font-semibold rounded-md px-3 py-1.5 border border-gray-300 text-gray-700 hover:bg-gray-50">ניקוי</button>
            <button type="button" onClick={applyUserFilters}
              className="text-sm font-semibold rounded-md px-4 py-1.5 text-white" style={{ background: C_PRIMARY }}>סינון</button>
          </div>
        </div>
      ) : null}

      {/* Results header */}
      <div className="flex items-center justify-between mb-3 text-sm text-gray-600">
        <div>
          {loading ? (
            <span>בטעינה…</span>
          ) : error ? (
            <span className="text-red-600">{error}</span>
          ) : (
            <span>
              {total === 0
                ? "לא נמצאו דוחות התואמים את הסינון"
                : `מציג דוחות ${pageStart}–${pageEnd} מתוך ${total}`}
            </span>
          )}
        </div>
        {extraSortFields.length > 0 ? (
          <div className="flex items-center gap-2 shrink-0">
            <label className="text-xs text-gray-600">סדר:</label>
            <select
              value={configSort ? configSort.key : ""}
              onChange={(e) => {
                const val = e.target.value;
                setConfigSort(val ? { key: val, dir: "desc" } : null);
                navigate(filters, 0);
              }}
              className="border border-gray-300 rounded-md px-2 py-1 text-xs bg-white"
            >
              <option value="">ברירת מחדל</option>
              {extraSortFields.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
            {configSort ? (
              <button type="button"
                onClick={() => setConfigSort((c) => (c ? { ...c, dir: c.dir === "desc" ? "asc" : "desc" } : c))}
                className="border border-gray-300 rounded-md px-2 py-1 text-xs bg-white hover:bg-gray-50">
                {configSort.dir === "desc" ? "יורד ↓" : "עולה ↑"}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : data?.items.map((doc, i) => (
              <ReportCard
                key={doc.id}
                doc={doc}
                snippet={data.snippets?.[i]}
                query={filters.q}
                relevance={data.relevance?.[i]}
                displayFields={extraDisplayFields}
              />
            ))}
      </div>

      {/* Pagination */}
      {!loading && total > PAGE_SIZE ? (
        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            type="button"
            disabled={!canPrev}
            onClick={() => navigate(filters, Math.max(0, skip - PAGE_SIZE))}
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
            onClick={() => navigate(filters, skip + PAGE_SIZE)}
            className="text-sm font-semibold rounded-md px-4 py-2 text-white disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: C_PRIMARY }}
          >
            הבא
          </button>
        </div>
      ) : null}

      <p className="text-xs text-gray-700 mt-8 leading-relaxed">
        המידע נשאב ממאגר דוחות מבקר המדינה ומוצג כמות שהוא. הקישורים מובילים לקובץ
        ה-PDF המקורי כפי שפורסם.
      </p>
    </div>
  );
}
