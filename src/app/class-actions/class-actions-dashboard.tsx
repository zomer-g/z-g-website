"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  usePathname,
  useRouter,
  useSearchParams,
  type ReadonlyURLSearchParams,
} from "next/navigation";
import type {
  ClassActionDocument,
  ClassActionCase,
  CasesListResponse,
} from "@/types/class-action";
import { DateInputIL } from "@/components/ui/date-input-il";
import { ShareLinkButton } from "@/components/ui/share-link-button";

// 24 = LCM(1, 2, 3) × 4 — keeps every full page row-aligned across the
// 1-col / 2-col / 3-col breakpoints so there's never a half-row at the end.
const PAGE_SIZE = 24;

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

type SortOrder =
  | "date_desc"
  | "date_asc"
  | "amount_desc"
  | "amount_asc"
  | "case_name_asc"
  | "case_name_desc";

/* ── Admin-configured user-filter values (mirror of the server shape) ── */
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

function fmtFieldValue(v: unknown): string {
  if (v == null || v === "") return "—";
  if (Array.isArray(v)) return v.map(fmtFieldValue).join(", ");
  if (typeof v === "number") return v.toLocaleString("he-IL");
  if (typeof v === "boolean") return v ? "כן" : "לא";
  return String(v);
}

function fieldLabel(key: string): string {
  const tail = key.includes(".") ? key.split(".").slice(1).join(".") : key;
  return tail.replace(/_/g, " ");
}

function optionLabel(o: string): string {
  if (o === "true") return "כן";
  if (o === "false") return "לא";
  return o;
}

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: "date_desc", label: "מהחדש לישן" },
  { value: "date_asc", label: "מהישן לחדש" },
  { value: "amount_desc", label: "סכום תביעה — גבוה לנמוך" },
  { value: "amount_asc", label: "סכום תביעה — נמוך לגבוה" },
  { value: "case_name_asc", label: "שם תיק — א׳-ת׳" },
  { value: "case_name_desc", label: "שם תיק — ת׳-א׳" },
];

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

function buildQs(filters: Filters, skip: number, sort: SortOrder) {
  const p = new URLSearchParams();
  p.set("limit", String(PAGE_SIZE));
  p.set("skip", String(skip));
  p.set("sort", sort);
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

/* ── URL ⇄ state helpers ──
   Mirror the guidelines dashboard: filters/sort/skip live in the page URL so
   a copied address bar reproduces the same view. URLSearchParams handles
   percent-encoding, so a query like `?q=פרטיות&sort=amount_desc&skip=24`
   round-trips cleanly across share/clipboard. */

const DEFAULT_SORT: SortOrder = "date_desc";
const SORT_VALUES = new Set<SortOrder>(SORT_OPTIONS.map((o) => o.value));

function isAppealValue(v: string): v is Filters["is_appeal"] {
  return v === "" || v === "true" || v === "false";
}

function filtersFromSearchParams(sp: ReadonlyURLSearchParams): Filters {
  const ia = sp.get("is_appeal") ?? "";
  const it = sp.get("is_attachment") ?? "";
  return {
    q: sp.get("q") ?? "",
    date_from: sp.get("date_from") ?? "",
    date_to: sp.get("date_to") ?? "",
    court: sp.get("court") ?? "",
    case_number: sp.get("case_number") ?? "",
    is_appeal: isAppealValue(ia) ? ia : "",
    is_attachment: isAppealValue(it) ? it : "",
    claim_min: sp.get("claim_min") ?? "",
    claim_max: sp.get("claim_max") ?? "",
  };
}

function skipFromSearchParams(sp: ReadonlyURLSearchParams): number {
  const n = Number(sp.get("skip"));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function sortFromSearchParams(sp: ReadonlyURLSearchParams): SortOrder {
  const raw = sp.get("sort");
  return raw && SORT_VALUES.has(raw as SortOrder) ? (raw as SortOrder) : DEFAULT_SORT;
}

function stateToSearchParams(
  f: Filters,
  s: number,
  ord: SortOrder,
): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set("q", f.q.trim());
  if (f.date_from) p.set("date_from", f.date_from);
  if (f.date_to) p.set("date_to", f.date_to);
  if (f.court.trim()) p.set("court", f.court.trim());
  if (f.case_number.trim()) p.set("case_number", f.case_number.trim());
  if (f.is_appeal) p.set("is_appeal", f.is_appeal);
  if (f.is_attachment) p.set("is_attachment", f.is_attachment);
  if (f.claim_min) p.set("claim_min", f.claim_min);
  if (f.claim_max) p.set("claim_max", f.claim_max);
  if (ord !== DEFAULT_SORT) p.set("sort", ord);
  if (s > 0) p.set("skip", String(s));
  return p;
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

function classifyDocs(docs: ClassActionDocument[]): {
  motion: ClassActionDocument[];
  claim: ClassActionDocument[];
  other: ClassActionDocument[];
} {
  const motion: ClassActionDocument[] = [];
  const claim: ClassActionDocument[] = [];
  const other: ClassActionDocument[] = [];
  for (const d of docs) {
    const t = (d.document_title || "").trim();
    if (t.includes("בקשה לאישור")) motion.push(d);
    else if (t.includes("כתב תביעה")) claim.push(d);
    else other.push(d);
  }
  return { motion, claim, other };
}

function DocSlot({
  label,
  docs,
  emptyHint = "אין מסמך זמין",
  primary = false,
}: {
  label: string;
  docs: ClassActionDocument[];
  emptyHint?: string;
  primary?: boolean;
}) {
  if (docs.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-3 py-2">
        <div className="text-xs font-semibold text-gray-700 mb-0.5">{label}</div>
        <div className="text-xs text-gray-700">{emptyHint}</div>
      </div>
    );
  }
  return (
    <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
      <div className="text-xs font-semibold text-gray-600 mb-1.5">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {docs.map((doc) => {
          const dateLabel = fmtDate(doc.document_date);
          return (
            // relative z-10 keeps these clickable above the stretched link
            // that covers the whole card.
            <a
              key={doc.id}
              href={`/api/class-actions/documents/${doc.id}/file`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="relative z-10 inline-flex items-center gap-1.5 text-xs font-semibold rounded-md px-2.5 py-1 transition"
              style={
                primary
                  ? { background: C_PRIMARY, color: "white" }
                  : { color: C_PRIMARY, border: `1px solid ${C_PRIMARY}` }
              }
              title={
                doc.document_title
                  ? `${doc.document_title} • ${dateLabel}`
                  : dateLabel
              }
            >
              <span>קובץ PDF</span>
              {docs.length > 1 ? (
                <span className="opacity-80">({dateLabel})</span>
              ) : null}
            </a>
          );
        })}
      </div>
    </div>
  );
}

function CaseCard({
  caseItem,
  displayFields = [],
}: {
  caseItem: ClassActionCase;
  displayFields?: string[];
}) {
  const [open, setOpen] = useState(false);
  const slots = classifyDocs(caseItem.documents);

  // Admin-configured fields to surface on the card. Read from the case object
  // first, falling back to the first document (case-level fields live on both).
  const caseRec = caseItem as unknown as Record<string, unknown>;
  const firstDoc = (caseItem.documents[0] || {}) as unknown as Record<string, unknown>;
  const extraFields = displayFields
    .map((key) => {
      const raw = key.includes(".") ? key.split(".").slice(1).join(".") : key;
      const val = caseRec[raw] ?? firstDoc[raw];
      return { key, label: fieldLabel(key), value: val };
    })
    .filter((f) => f.value != null && f.value !== "");

  // Cases without a case_number aren't addressable as a standalone page
  // (the route key is the case_number) — fall back to a non-clickable card.
  const hasCaseNumber = !!caseItem.case_number?.trim();
  const detailHref = hasCaseNumber
    ? `/class-actions/${encodeURIComponent(caseItem.case_number.trim())}`
    : null;

  return (
    <article
      className="relative rounded-xl shadow-md border border-gray-200 bg-white p-5 hover:shadow-lg transition flex flex-col"
      dir="rtl"
    >
      {/* Stretched link: covers the whole card, navigates to the dedicated
          detail page when clicked. Inner interactive elements use
          `relative z-10` so they stay clickable above this. */}
      {detailHref ? (
        <Link
          href={detailHref}
          aria-label={`פרטי תיק: ${caseItem.case_name || caseItem.case_number}`}
          className="absolute inset-0 z-0 rounded-xl focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          style={{ outlineColor: C_PRIMARY }}
        />
      ) : null}

      <div className="relative z-10 flex items-start gap-2 mb-2 flex-wrap">
        <Badge color={C_PD} bg="#e1ecf3">
          {caseItem.case_number || "—"}
        </Badge>
        {caseItem.is_appeal ? (
          <Badge color={C_OTHER} bg="#fbe9e0">
            ערעור
          </Badge>
        ) : null}
        <Badge color={C_MUTED} bg="#eef0f3">
          {caseItem.documents.length === 1
            ? "מסמך אחד"
            : `${caseItem.documents.length} מסמכים`}
        </Badge>
        {/* Push the share button to the end of the badge row. */}
        {detailHref ? (
          <ShareLinkButton
            url={detailHref}
            title={caseItem.case_name || `תובענה ${caseItem.case_number}`}
            text={
              caseItem.case_name
                ? `תובענה ייצוגית: ${caseItem.case_name}`
                : undefined
            }
            compact
            className="ms-auto"
          />
        ) : null}
      </div>

      <h3
        className="relative z-10 text-base font-bold leading-snug mb-2 pointer-events-none"
        style={{ color: C_PRIMARY }}
      >
        {caseItem.case_name || "ללא שם תיק"}
      </h3>

      <div className="relative z-10 text-sm text-gray-700 mb-1 pointer-events-none">
        <span className="font-semibold">בית משפט:</span> {caseItem.court_name || "—"}
      </div>
      <div className="relative z-10 text-sm text-gray-700 mb-3 pointer-events-none">
        <span className="font-semibold">תאריך הגשה אחרון:</span>{" "}
        {fmtDate(caseItem.latest_document_date)}
      </div>

      {/* Admin-configured extra display fields */}
      {extraFields.length > 0 ? (
        <div className="relative z-10 text-sm text-gray-700 mb-3 space-y-1 pointer-events-none">
          {extraFields.map((f) => (
            <div key={f.key}>
              <span className="font-semibold">{f.label}:</span>{" "}
              {fmtFieldValue(f.value)}
            </div>
          ))}
        </div>
      ) : null}

      {open ? (
        <div className="relative z-10 border-t border-gray-100 pt-3 mt-1 space-y-2 text-sm text-gray-800 pointer-events-none">
          <div>
            <span className="font-semibold">פתיחת תיק:</span>{" "}
            {fmtDate(caseItem.case_open_date)}
          </div>
          <div>
            <span className="font-semibold">סכום תביעה:</span>{" "}
            {fmtAmount(caseItem.claim_amount)}
          </div>
          {caseItem.class_definition ? (
            <div>
              <span className="font-semibold">הגדרת קבוצה:</span>{" "}
              <span className="text-gray-700">{caseItem.class_definition}</span>
            </div>
          ) : null}
          {caseItem.legal_question ? (
            <div>
              <span className="font-semibold">שאלה משפטית:</span>{" "}
              <span className="text-gray-700">{caseItem.legal_question}</span>
            </div>
          ) : null}
          {caseItem.requested_aid ? (
            <div>
              <span className="font-semibold">סעד מבוקש:</span>{" "}
              <span className="text-gray-700">{caseItem.requested_aid}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Document slots — `<a>` children inside DocSlot are relative z-10 so
          PDF clicks don't trigger the stretched link. */}
      <div className="relative z-10 mt-3 space-y-2 pointer-events-none">
        {/* The wrappers stay non-interactive; only the <a> buttons inside
            re-enable pointer events via `relative z-10` (which also gets
            pointer-events: auto from default browser styling on z-positioned
            elements with `relative`). */}
        <div className="pointer-events-auto">
          <DocSlot
            label="בקשה לאישור תובענה ייצוגית"
            docs={slots.motion}
            primary
          />
        </div>
        <div className="pointer-events-auto">
          <DocSlot label="כתב תביעה" docs={slots.claim} primary />
        </div>
        {slots.other.length > 0 ? (
          <div className="pointer-events-auto">
            <DocSlot label="מסמכים נוספים" docs={slots.other} />
          </div>
        ) : null}
      </div>

      <div className="relative z-10 mt-auto pt-4 flex items-center justify-end">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen((v) => !v);
          }}
          className="text-sm font-semibold rounded-md px-3 py-1.5 border transition"
          style={{ color: C_PRIMARY, borderColor: C_PRIMARY }}
        >
          {open ? "צמצם" : "פרטים נוספים"}
        </button>
      </div>
    </article>
  );
}

export function ClassActionsDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Applied filters / sort / current page are derived from the URL — so a
  // copied address bar reproduces the same view on someone else's screen.
  const filters = useMemo(
    () => filtersFromSearchParams(searchParams),
    [searchParams],
  );
  const skip = useMemo(() => skipFromSearchParams(searchParams), [searchParams]);
  const sort = useMemo(() => sortFromSearchParams(searchParams), [searchParams]);

  // Draft state lives only for the inputs that wait for the user to press
  // "סינון". Sort and pagination commit instantly so they don't need a
  // draft. Seed draft from the URL on first render so a shared link
  // visibly pre-fills the inputs, then leave it under the user's exclusive
  // control after that.
  const [draft, setDraft] = useState<Filters>(filters);
  const draftHydratedRef = useRef(false);
  useEffect(() => {
    if (!draftHydratedRef.current) {
      setDraft(filters);
      draftHydratedRef.current = true;
    }
  }, [filters]);

  const [data, setData] = useState<CasesListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Admin-configured extras live in local state (not the URL) so they don't
  // disturb the existing share-link machinery. Empty = no effect.
  const [userFiltersDraft, setUserFiltersDraft] = useState<
    Record<string, UserFilterValue>
  >({});
  const [userFilters, setUserFilters] = useState<Record<string, UserFilterValue>>(
    {},
  );
  // A chosen admin sort field overrides the native sort when set.
  const [configSort, setConfigSort] = useState<{ key: string; dir: SortDir } | null>(
    null,
  );

  const fetchData = useCallback(
    async (
      f: Filters,
      s: number,
      ord: SortOrder,
      uf: Record<string, UserFilterValue>,
      cs: { key: string; dir: SortDir } | null,
    ) => {
      setLoading(true);
      setError(null);
      try {
        let qs = buildQs(f, s, ord);
        const activeUf = Object.entries(uf).filter(([, v]) => isUserFilterActive(v));
        if (activeUf.length > 0) {
          qs += `&userFilters=${encodeURIComponent(
            JSON.stringify(Object.fromEntries(activeUf)),
          )}`;
        }
        if (cs) {
          // Override the native sort param with the configured field + dir.
          qs = qs.replace(/(^|&)sort=[^&]*/, "");
          qs += `&sort=${encodeURIComponent(cs.key)}&dir=${cs.dir}`;
        }
        const res = await fetch(`/api/class-actions/documents?${qs}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as CasesListResponse;
        setData(json);
      } catch (e) {
        console.error(e);
        setError("שגיאה בטעינת התובענות. נסו שוב מאוחר יותר.");
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchData(filters, skip, sort, userFilters, configSort);
  }, [fetchData, filters, skip, sort, userFilters, configSort]);

  // Single channel for changing applied state: write to the URL, the
  // memos pick it up, the fetch effect re-runs. `router.replace` keeps
  // each filter change off the browser history stack so the back button
  // still works for actual navigation.
  const navigate = useCallback(
    (f: Filters, s: number, ord: SortOrder) => {
      const qs = stateToSearchParams(f, s, ord).toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  const applyFilters = () => navigate(draft, 0, sort);
  const clearFilters = () => {
    setDraft(EMPTY_FILTERS);
    navigate(EMPTY_FILTERS, 0, DEFAULT_SORT);
  };

  // Admin-configured extras pulled from the response.
  const extraFilterFields = data?.filterFields ?? [];
  const extraSortFields = data?.sortFields ?? [];
  const extraDisplayFields = data?.displayFields ?? [];
  const filterOptions = data?.filterOptions ?? {};

  const applyUserFilters = () => {
    setUserFilters(userFiltersDraft);
    navigate(filters, 0, sort); // reset to first page
  };
  const clearUserFilters = () => {
    setUserFiltersDraft({});
    setUserFilters({});
    navigate(filters, 0, sort);
  };
  const setUf = (key: string, value: UserFilterValue) =>
    setUserFiltersDraft((d) => ({ ...d, [key]: value }));

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
                    <input
                      type="text"
                      value={typeof v === "string" ? v : ""}
                      onChange={(e) => setUf(f.key, e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") applyUserFilters(); }}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                  </div>
                );
              }
              if (f.control === "select") {
                return (
                  <div key={f.key}>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">{f.label}</label>
                    <select
                      value={typeof v === "string" ? v : ""}
                      onChange={(e) => setUf(f.key, e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-2 py-2 text-sm bg-white"
                    >
                      <option value="">הכל</option>
                      {(filterOptions[f.key] || []).map((o) => (
                        <option key={o} value={o}>{optionLabel(o)}</option>
                      ))}
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
              className="text-sm font-semibold rounded-md px-3 py-1.5 border border-gray-300 text-gray-700 hover:bg-gray-50">
              ניקוי
            </button>
            <button type="button" onClick={applyUserFilters}
              className="text-sm font-semibold rounded-md px-4 py-1.5 text-white" style={{ background: C_PRIMARY }}>
              סינון
            </button>
          </div>
        </div>
      ) : null}

      {/* Results header */}
      <div className="flex items-center justify-between gap-3 mb-3 text-sm text-gray-600">
        <div>
          {loading ? (
            <span>בטעינה…</span>
          ) : error ? (
            <span className="text-red-600">{error}</span>
          ) : (
            <span>
              {total === 0
                ? "לא נמצאו תובענות בטווח שנבחר"
                : `מציג תיקים ${pageStart}–${pageEnd} מתוך ${total}`}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <label htmlFor="ca-sort" className="text-xs text-gray-600">
            סדר:
          </label>
          <select
            id="ca-sort"
            value={configSort ? `cfg:${configSort.key}` : sort}
            onChange={(e) => {
              const val = e.target.value;
              if (val.startsWith("cfg:")) {
                setConfigSort({ key: val.slice(4), dir: "desc" });
                navigate(filters, 0, sort);
              } else {
                setConfigSort(null);
                navigate(filters, 0, val as SortOrder);
              }
            }}
            className="border border-gray-300 rounded-md px-2 py-1 text-xs bg-white"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
            {extraSortFields.map((s) => (
              <option key={s.key} value={`cfg:${s.key}`}>
                {s.label}
              </option>
            ))}
          </select>
          {configSort ? (
            <button
              type="button"
              onClick={() => {
                setConfigSort((c) => (c ? { ...c, dir: c.dir === "desc" ? "asc" : "desc" } : c));
              }}
              className="border border-gray-300 rounded-md px-2 py-1 text-xs bg-white hover:bg-gray-50"
              title={configSort.dir === "desc" ? "יורד" : "עולה"}
            >
              {configSort.dir === "desc" ? "יורד ↓" : "עולה ↑"}
            </button>
          ) : null}
        </div>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : data?.cases.map((c) => (
              <CaseCard
                key={c.case_number}
                caseItem={c}
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
            onClick={() => navigate(filters, Math.max(0, skip - PAGE_SIZE), sort)}
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
            onClick={() => navigate(filters, skip + PAGE_SIZE, sort)}
            className="text-sm font-semibold rounded-md px-4 py-2 text-white disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: C_PRIMARY }}
          >
            הבא
          </button>
        </div>
      ) : null}

      <p className="text-xs text-gray-700 mt-8 leading-relaxed">
        המידע נשאב מפנקס תובענות ייצוגיות ומוצג כמות שהוא, ללא סינון או עיבוד נוסף.
        הקישור לכתבי הטענות הוא לקובץ ה-PDF המקורי כפי שהתפרסם בפנקס.
      </p>
    </div>
  );
}
