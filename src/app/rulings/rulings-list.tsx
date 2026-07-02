"use client";

import { useCallback, useEffect, useState } from "react";
import type { LegislationLink } from "@/types/content";
import { LegislationMenu } from "@/components/ui/legislation-menu";
import { ShareLinkButton } from "@/components/ui/share-link-button";

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

type FilterControl = "text" | "select" | "multiselect" | "number" | "date" | "yearrange" | "boolean";

interface FilterField {
  key: string;
  label: string;
  control: FilterControl;
  // Optional accordion-group label; grouped filters collapse together.
  group?: string;
  // Display-only labels per option value (select / multiselect). The stored/sent
  // value stays the raw option; missing keys fall back to the raw value.
  optionLabels?: Record<string, string>;
}

// Sidecar draft key carrying a multiselect's AND/OR mode (e.g.
// "meta.drug_ordinance_sections::mode" → "and"). Kept separate so the option
// array value stays a plain string[].
const MS_MODE_SUFFIX = "::mode";

// Reserved userFilters key carrying the cascading law/section selection.
const LAW_SECTION_KEY = "__lawSection";

interface LawSectionSel {
  law?: string;
  sections?: string[];
  mode?: "or" | "and";
}

// Cascading law→section filter config sent by the API (closed dropdown lists).
interface LawSectionFilterCfg {
  label: string;
  map: Record<string, string[]>;
  // Law display order (most-cited first); falls back to map key order.
  lawOrder?: string[];
}

// User filter selections, keyed by field key.
type UserFilterValue =
  | string
  | string[]
  | { min?: number; max?: number }
  | { from?: string; to?: string }
  | LawSectionSel;

function isLawSectionSel(v: unknown): v is LawSectionSel {
  return (
    !!v &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    ("law" in v || "sections" in v || "mode" in v) &&
    !("min" in v) &&
    !("from" in v)
  );
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
  // User-facing filter controls configured by the admin.
  filterFields?: FilterField[];
  // Distinct values for each "select" control, computed server-side.
  filterOptions?: Record<string, string[]>;
  // User-facing sort options (first = default).
  sortFields?: { key: string; label: string; defaultDir?: SortDir }[];
  // Cascading law→section filter config (FOI). Absent = not shown.
  lawSectionFilter?: LawSectionFilterCfg;
  // When true, show a free-text content search box (TAG-IT text_query).
  fullTextSearch?: boolean;
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

// Small icon button that copies arbitrary text (not a URL) to the clipboard,
// with a 1.5s checkmark confirmation. Used next to the case title.
function CopyTextButton({ text, label = "העתק" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* ignore */
      }
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      type="button"
      onClick={onCopy}
      title={copied ? "הועתק" : label}
      aria-label={copied ? "הועתק" : label}
      className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-md border transition"
      style={
        copied
          ? { borderColor: "#16a34a", color: "#16a34a", background: "#f0fdf4" }
          : { borderColor: "#cbd5e1", color: C_MUTED, background: "#fff" }
      }
    >
      {copied ? (
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
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

// Map an acceptance value to a status pill. Accepts both the string form
// ("כן"/"לא"/"לא נדונה"/…) used by defamation's הגנות_שנטענו and the boolean
// form (true/false) used by FOI's טענות_סעיפי_חוק_שנדונו.האם_הטענה_התקבלה.
function rowStatusFromValue(raw: unknown): RowStatus | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "boolean")
    return raw
      ? { kind: "accepted", label: "כן" }
      : { kind: "rejected", label: "לא" };
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
// A boolean that is itself the row's acceptance status (האם_הטענה_התקבלה) is
// skipped here — it's already shown by the כן/לא status pill, so we don't
// double-render it as a "לא האם הטענה התקבלה" flag.
function boolPillsFor(item: Record<string, unknown>): RowStatus[] {
  const norm = (s: string) => s.replace(/[\s_]/g, "");
  const STATUS_HINTS = ["התקבלה", "תוצאה", "סטטוס"];
  return Object.keys(item)
    .filter((k) => typeof item[k] === "boolean")
    .filter((k) => !STATUS_HINTS.some((h) => norm(k).includes(norm(h))))
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

// A clear accepted(✓כן)/rejected(✗לא)/na pill for a claim's status — used by
// the law-claims table so the reader sees at a glance whether a legal ground
// was upheld or rejected.
function StatusPill({ status }: { status: RowStatus | null }) {
  if (!status) return <span className="text-gray-400">—</span>;
  const style = ROW_STATUS_STYLE[status.kind];
  const glyph =
    status.kind === "accepted" ? "✓" : status.kind === "rejected" ? "✗" : "•";
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2 py-0.5 ${style.pill}`}
    >
      <span aria-hidden="true">{glyph}</span>
      {status.label}
    </span>
  );
}

// Renders an array-of-objects field as a real table — one row per item, with
// columns for the law, the section, its description, and an accepted/rejected
// status pill. Tuned for FOI's "טענות סעיפי חוק שנדונו" so the layout mirrors
// the source viewer and the reader can scan which grounds were upheld/rejected.
export function LawClaimsTable({
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
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full table-fixed text-xs border-collapse">
            <colgroup>
              <col className="w-[22%]" />
              <col className="w-[22%]" />
              <col className="w-[34%]" />
              <col className="w-[22%]" />
            </colgroup>
            <thead>
              <tr className="bg-gray-50 text-gray-500">
                <th className="text-right font-semibold py-1.5 px-2">שם החוק</th>
                <th className="text-right font-semibold py-1.5 px-2">סעיף</th>
                <th className="text-right font-semibold py-1.5 px-2">
                  תיאור הסעיף
                </th>
                <th className="text-center font-semibold py-1.5 px-2">
                  התקבלה?
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const lawName = pickByKeyHint(item, ["שם_החוק", "שם_חוק", "שם"]);
                const clause = pickByKeyHint(item, ["סעיף_החוק", "סעיף"]);
                const desc = pickByKeyHint(item, [
                  "תיאור_הסעיף",
                  "תיאור",
                  "הסבר",
                  "נימוק",
                ]);
                const status = rowStatusFromValue(
                  pickByKeyHint(item, [
                    "האם_הטענה_התקבלה",
                    "התקבלה",
                    "תוצאה",
                    "סטטוס",
                  ]),
                );
                return (
                  <tr
                    key={i}
                    className="border-t border-gray-200 align-top"
                  >
                    <td className="py-1.5 px-2 text-gray-700 break-words">
                      {lawName != null && lawName !== ""
                        ? formatFieldValue(lawName)
                        : "—"}
                    </td>
                    <td className="py-1.5 px-2 break-words">
                      {clause != null && clause !== "" ? (
                        <span
                          className="inline-block font-mono font-bold text-sm rounded-md px-1.5 py-0.5"
                          style={{ color: C_PRIMARY, background: "#e1ecf3" }}
                        >
                          {formatFieldValue(clause)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-gray-600 leading-relaxed break-words">
                      {desc != null && desc !== "" ? formatFieldValue(desc) : "—"}
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      <StatusPill status={status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </dd>
    </div>
  );
}

// Coerce a value to an array of plain objects (for nested sub-tables).
function objArray(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v)
    ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x))
    : [];
}

// Shared section header (accent bar + bold label + count badge).
function FieldSectionHead({ label, count }: { label: string; count: number }) {
  return (
    <dt className="flex items-center gap-2 mb-2">
      <span className="inline-block w-1 h-4 rounded-full" style={{ background: C_PRIMARY }} />
      <span className="text-sm font-bold" style={{ color: C_PRIMARY }}>{label}</span>
      <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 rounded-full px-1.5 py-0.5">
        {count}
      </span>
    </dt>
  );
}

// FOI/drug-style fixed table shell with a header row.
function MiniTable({
  cols,
  rows,
}: {
  cols: { label: string; w: string; center?: boolean }[];
  rows: React.ReactNode[][];
}) {
  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <table className="w-full table-fixed text-xs border-collapse">
        <colgroup>
          {cols.map((c, i) => (
            <col key={i} style={{ width: c.w }} />
          ))}
        </colgroup>
        <thead>
          <tr className="bg-gray-50 text-gray-500">
            {cols.map((c, i) => (
              <th
                key={i}
                className={`${c.center ? "text-center" : "text-right"} font-semibold py-1.5 px-2`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="border-t border-gray-200 align-top">
              {r.map((cell, ci) => (
                <td
                  key={ci}
                  className={`py-1.5 px-2 break-words ${cols[ci]?.center ? "text-center" : ""} text-gray-700`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Per-drug list (FOI scope-1 "פירוט עבירות סמים"): one row per substance —
// offense type / drug / quantity / unit.
export function DrugOffensesTable({
  label,
  items,
}: {
  label: string;
  items: Record<string, unknown>[];
}) {
  return (
    <div className="block mt-3 pt-3 border-t border-gray-200">
      <FieldSectionHead label={label} count={items.length} />
      <dd>
        <MiniTable
          cols={[
            { label: "סוג העבירה", w: "40%" },
            { label: "סוג הסם", w: "26%" },
            { label: "כמות", w: "18%", center: true },
            { label: "יחידה", w: "16%", center: true },
          ]}
          rows={items.map((it) => {
            const off = pickByKeyHint(it, ["סוג_העבירה", "עבירה"]);
            const drug = pickByKeyHint(it, ["סוג_הסם", "סם"]);
            const amt = pickByKeyHint(it, ["מספר_כמות", "כמות"]);
            const unit = pickByKeyHint(it, ["יחידת_מידה", "יחידה"]);
            return [
              off != null && off !== "" ? formatFieldValue(off) : "—",
              drug != null && drug !== "" ? (
                <span className="font-semibold text-gray-800">{formatFieldValue(drug)}</span>
              ) : (
                "—"
              ),
              amt != null && amt !== "" ? formatFieldValue(amt) : "—",
              unit != null && unit !== "" ? formatFieldValue(unit) : "—",
            ];
          })}
        />
      </dd>
    </div>
  );
}

// Per-defendant list (scope-1 "נאשמים"): name + plea/outcome flags, then nested
// convictions (הרשעות) and punishment (פירוט_ענישה) sub-tables.
// Renders a text_query snippet, turning TAG-IT's «…» match markers into
// highlighted <mark> spans.
function HighlightedSnippet({ text }: { text: string }) {
  if (!text) return null;
  const parts = text.split(/(«[^»]*»)/g);
  return (
    <>
      {parts.map((part, i) =>
        /^«[^»]*»$/.test(part) ? (
          <mark key={i} className="bg-yellow-200 text-inherit px-0.5 rounded">
            {part.slice(1, -1)}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

// A מתחם bound (מתחם_מינימום / מתחם_מקסימום) is an object
// { ערך, יחידה, טקסט_מקור, סוג_הרכיב }. Compose each bound from its OWN value +
// unit + kind (e.g. "6 חודשים מאסר בפועל") so the min and max show their
// distinct numbers. We deliberately do NOT use טקסט_מקור — it's frequently the
// full range sentence ("...בין 6 ל-18 חודשי מאסר") repeated identically on both
// bounds, which made min and max look duplicated. Falls back to טקסט_מקור only
// when no structured value exists.
function fmtRangeBound(x: unknown): string {
  if (x == null || x === "") return "—";
  if (typeof x === "object" && !Array.isArray(x)) {
    const o = x as Record<string, unknown>;
    const numUnit = [o["ערך"], o["יחידה"]]
      .filter((v) => v != null && v !== "")
      .join(" ");
    const kind = o["סוג_הרכיב"];
    const composed = [numUnit, kind]
      .filter((v) => v != null && v !== "")
      .join(" ");
    if (composed) return composed;
    const txt = o["טקסט_מקור"];
    return txt != null && txt !== "" ? String(txt) : "—";
  }
  return formatFieldValue(x);
}

export function DefendantsList({
  label,
  items,
  ranges,
}: {
  label: string;
  items: Record<string, unknown>[];
  // Doc-level punishment ranges (sql.מתחמי_ענישה) — display only, shown inside
  // each defendant block between the convictions and the punishment detail.
  ranges?: Record<string, unknown>[];
}) {
  const FLAGS: [string, string][] = [
    ["הודה_באשמה", "הודה באשמה"],
    ["עונש_מוסכם", "עונש מוסכם"],
    ["ביטול_הרשעה", "ביטול הרשעה"],
    ["סטייה_משיקולי_שיקום", "סטייה משיקולי שיקום"],
  ];
  // Tri-state binary tags: [field, label-when-true, label-when-false]. Unlike
  // FLAGS (shown only when true), these reflect the cataloged yes/no value, so
  // "no criminal record" / "court didn't deviate" are surfaced too. They render
  // only when the field is actually present (boolean), since they're newly
  // cataloged and absent from most documents.
  const TRISTATE: [string, string, string][] = [
    ["עבר_פלילי_מוזכר", "עבר פלילי", "ללא עבר פלילי"],
    ["הגנה_ביקשה_חריגה_ממתחם", "ההגנה ביקשה חריגה ממתחם", "ההגנה לא ביקשה חריגה"],
    ["ביהמש_חרג_ממתחם", 'ביהמ"ש חרג ממתחם', 'ביהמ"ש לא חרג ממתחם'],
  ];
  return (
    <div className="block mt-3 pt-3 border-t border-gray-200">
      <FieldSectionHead label={label} count={items.length} />
      <dd>
        <ul className="space-y-3">
          {items.map((def, i) => {
            const name = pickByKeyHint(def, ["שם"]);
            const convictions = objArray(def["הרשעות"]);
            const punishment = objArray(def["פירוט_ענישה"]);
            return (
              <li key={i} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="font-bold text-gray-800">
                    {name != null && name !== "" ? formatFieldValue(name) : `נאשם ${i + 1}`}
                  </span>
                  {(() => {
                    // The defendant's primary/most-severe punishment as TAG-IT
                    // computed it (sql.נאשמים[]._ענישה_עיקרית_סוג). Useful on its
                    // own, and lets you eyeball whether the case-level
                    // primary_punishment_type / severity_score picked the right
                    // (harshest) defendant.
                    const main = def["_ענישה_עיקרית_סוג"];
                    return main != null && main !== "" ? (
                      <span
                        className="inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200"
                        title="העונש העיקרי/החמור ביותר של נאשם זה (מ-TAG-IT)"
                      >
                        עונש עיקרי: {formatFieldValue(main)}
                      </span>
                    ) : null;
                  })()}
                  {FLAGS.filter(([k]) => def[k] === true).map(([k, lbl]) => (
                    <span
                      key={k}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200"
                    >
                      <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: "#f59e0b" }} />
                      {lbl}
                    </span>
                  ))}
                  {/* Newly-cataloged binary tags (sparse — not in every doc). Shown
                      whenever the field is present (boolean), reflecting yes/no:
                      colored pill when true, muted gray when false. */}
                  {TRISTATE.filter(([k]) => typeof def[k] === "boolean").map(([k, onLbl, offLbl]) => {
                    const on = def[k] === true;
                    return (
                      <span
                        key={k}
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2 py-0.5 border ${
                          on
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-gray-100 text-gray-500 border-gray-200"
                        }`}
                      >
                        <span
                          className="inline-block w-1.5 h-1.5 rounded-full"
                          style={{ background: on ? "#e11d48" : "#9ca3af" }}
                        />
                        {on ? onLbl : offLbl}
                      </span>
                    );
                  })}
                </div>
                {convictions.length > 0 ? (
                  <div className="mb-2">
                    <div className="text-[11px] font-semibold text-gray-500 mb-1">הרשעות</div>
                    <MiniTable
                      cols={[
                        { label: "שם החוק", w: "26%" },
                        { label: "סעיף", w: "16%" },
                        { label: "תיאור העבירה", w: "40%" },
                        { label: "עבירות", w: "18%", center: true },
                      ]}
                      rows={convictions.map((c) => {
                        const law = pickByKeyHint(c, ["שם_החוק", "שם_חוק_רשמי"]);
                        const sec = pickByKeyHint(c, ["סעיף_מהותי", "סעיף"]);
                        const extra = c["סעיפים_נלווים"];
                        const desc = pickByKeyHint(c, ["תיאור_העבירה", "תיאור"]);
                        const n = pickByKeyHint(c, ["מספר_עבירות"]);
                        return [
                          law != null && law !== "" ? formatFieldValue(law) : "—",
                          sec != null && sec !== "" ? (
                            <span className="font-mono font-bold text-[11px] rounded px-1.5 py-0.5" style={{ color: C_PRIMARY, background: "#e1ecf3" }}>
                              {formatFieldValue(sec)}
                              {Array.isArray(extra) && extra.length ? " +" + formatFieldValue(extra) : ""}
                            </span>
                          ) : (
                            "—"
                          ),
                          desc != null && desc !== "" ? formatFieldValue(desc) : "—",
                          n != null && n !== "" ? formatFieldValue(n) : "—",
                        ];
                      })}
                    />
                  </div>
                ) : null}
                {ranges && ranges.length > 0 ? (
                  <div className="mb-2">
                    <div className="text-[11px] font-semibold text-gray-500 mb-1">מתחמי ענישה</div>
                    <MiniTable
                      cols={[
                        { label: "קבוצת עבירות", w: "52%" },
                        { label: "מתחם מינימום", w: "24%", center: true },
                        { label: "מתחם מקסימום", w: "24%", center: true },
                      ]}
                      rows={ranges.map((r) => {
                        const grp = pickByKeyHint(r, ["קבוצת_עבירות", "קבוצה"]);
                        return [
                          grp != null && grp !== "" ? formatFieldValue(grp) : "—",
                          fmtRangeBound(r["מתחם_מינימום"]),
                          fmtRangeBound(r["מתחם_מקסימום"]),
                        ];
                      })}
                    />
                  </div>
                ) : null}
                {punishment.length > 0 ? (
                  <div>
                    <div className="text-[11px] font-semibold text-gray-500 mb-1">פירוט ענישה</div>
                    <MiniTable
                      cols={[
                        { label: "סוג העונש", w: "50%" },
                        { label: "ערך", w: "28%", center: true },
                        { label: "יחידה", w: "22%", center: true },
                      ]}
                      rows={punishment.map((p) => {
                        const kind = pickByKeyHint(p, ["סוג_העונש", "סוג_הרכיב"]);
                        const val = pickByKeyHint(p, ["ערך"]);
                        const unit = pickByKeyHint(p, ["יחידה"]);
                        return [
                          kind != null && kind !== "" ? (
                            <span className="font-semibold text-gray-800">{formatFieldValue(kind)}</span>
                          ) : (
                            "—"
                          ),
                          val != null && val !== "" ? formatFieldValue(val) : "—",
                          unit != null && unit !== "" ? formatFieldValue(unit) : "—",
                        ];
                      })}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </dd>
    </div>
  );
}

// Renders an array-of-objects field as elegant status rows. Tuned for the
// "defenses claimed" table (status pill + name + clause badge + reasoning) but
// degrades gracefully for any object-array: it shows whatever of those parts
// it can find, falling back to a compact JSON line per item if none match.
export function StructuredFieldRows({
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
        {(() => {
          const name =
            headerValue != null && headerValue !== ""
              ? formatFieldValue(headerValue)
              : "—";
          const dateStr = ruling.date ? fmtDate(ruling.date) : "";
          const titleText = dateStr ? `${name} (${dateStr})` : name;
          return (
            <div className="flex items-start gap-2 mb-2">
              <h3
                className="text-base font-bold leading-snug flex-1"
                style={{ color: C_PRIMARY }}
              >
                {name}
                {dateStr ? (
                  <span className="font-semibold text-gray-500"> ({dateStr})</span>
                ) : null}
              </h3>
              <CopyTextButton text={titleText} label="העתק כותרת ותאריך" />
            </div>
          );
        })()}

        {(() => {
          const snip = ruling.fields?.["meta.snippet"];
          return typeof snip === "string" && snip.trim() ? (
            <div className="mb-3 rounded-md bg-amber-50 border-r-2 border-amber-300 px-3 py-2 text-xs leading-relaxed text-gray-800">
              <div className="text-[10px] font-semibold text-amber-700 mb-1 uppercase tracking-wide">
                התאמה בטקסט
              </div>
              <HighlightedSnippet text={snip} />
            </div>
          ) : null;
        })()}

        <dl className="text-sm text-gray-700 mb-3 space-y-1.5">
          {rest.map((key) => {
            const value = ruling.fields?.[key];
            // Array-of-objects (a table inside the case, e.g. defenses claimed)
            // gets its own elegant status-row renderer instead of being
            // flattened to "[object Object]" text.
            if (isObjectArray(value)) {
              // The FOI "טענות סעיפי חוק שנדונו" list reads far better as a real
              // table (law / section / description / accepted?) than as stacked
              // status rows — it mirrors the source viewer's layout.
              const tail = key.split(".").slice(1).join(".");
              if (tail === "טענות_סעיפי_חוק_שנדונו") {
                return (
                  <LawClaimsTable
                    key={key}
                    label={fieldKeyToLabel(key)}
                    items={value}
                  />
                );
              }
              // Drug-sentencing (scope 1): per-drug + per-defendant lists get
              // dedicated nested-table renderers.
              if (tail === "פירוט_עבירות_סמים") {
                return (
                  <DrugOffensesTable
                    key={key}
                    label={fieldKeyToLabel(key)}
                    items={value}
                  />
                );
              }
              if (tail === "נאשמים") {
                return (
                  <DefendantsList
                    key={key}
                    label={fieldKeyToLabel(key)}
                    items={value}
                    ranges={objArray(ruling.fields?.["sql.מתחמי_ענישה"])}
                  />
                );
              }
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
          <ShareLinkButton compact url={`/rulings/${ruling.id}`} />
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
        <div className="flex items-center gap-2">
          <ShareLinkButton compact url={`/rulings/${ruling.id}`} />
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
      </div>
    </article>
  );
}

/* ── User filter bar ── */

// Friendly label for a select option value — booleans read as כן/לא; an
// optional per-field map supplies richer labels (e.g. ordinance section titles).
function optionLabel(o: string, labels?: Record<string, string>): string {
  if (labels && labels[o]) return labels[o];
  if (o === "true") return "כן";
  if (o === "false") return "לא";
  return o;
}

function isFilterActive(v: UserFilterValue | undefined): boolean {
  if (v == null) return false;
  if (typeof v === "string") return v.trim() !== "";
  if (Array.isArray(v)) return v.length > 0;
  if (isLawSectionSel(v)) {
    return !!(v.law && v.law.trim()) || (Array.isArray(v.sections) && v.sections.length > 0);
  }
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
  legislation,
  lawSectionFilter,
}: {
  fields: FilterField[];
  options: Record<string, string[]>;
  draft: Record<string, UserFilterValue>;
  setDraft: (next: Record<string, UserFilterValue>) => void;
  onApply: () => void;
  onClear: () => void;
  legislation?: LegislationLink[];
  lawSectionFilter?: LawSectionFilterCfg;
}) {
  const setField = (key: string, value: UserFilterValue) =>
    setDraft({ ...draft, [key]: value });

  const anyActive =
    fields.some((f) => isFilterActive(draft[f.key])) ||
    isFilterActive(draft[LAW_SECTION_KEY]);

  // Current law/section selection (normalised).
  const lsRaw = draft[LAW_SECTION_KEY];
  const ls: LawSectionSel = isLawSectionSel(lsRaw)
    ? lsRaw
    : { law: "", sections: [], mode: "or" };
  const lsSections = ls.sections ?? [];
  const lsMode = ls.mode ?? "or";
  const lawList = lawSectionFilter
    ? lawSectionFilter.lawOrder &&
      lawSectionFilter.lawOrder.length > 0
      ? lawSectionFilter.lawOrder.filter((l) => l in lawSectionFilter.map)
      : Object.keys(lawSectionFilter.map)
    : [];
  const sectionList =
    lawSectionFilter && ls.law ? lawSectionFilter.map[ls.law] ?? [] : [];
  const setLs = (next: LawSectionSel) => setField(LAW_SECTION_KEY, next);
  const toggleSection = (sec: string) => {
    const has = lsSections.includes(sec);
    setLs({
      ...ls,
      sections: has
        ? lsSections.filter((s) => s !== sec)
        : [...lsSections, sec],
      mode: lsMode,
    });
  };

  // ── Accordion grouping ──
  // Filters that share a `group` collapse together inside a section (so a long
  // filter set isn't all on screen). Ungrouped filters stay always-visible.
  const ungroupedFields = fields.filter((f) => !f.group);
  const groupNames = fields
    .filter((f) => f.group)
    .reduce<string[]>(
      (acc, f) => (acc.includes(f.group!) ? acc : [...acc, f.group!]),
      [],
    );
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () =>
      new Set(
        // Open any group that already has an active filter (e.g. from a shared
        // link), so the user sees their active selections.
        groupNames.filter((g) =>
          fields.some((f) => f.group === g && isFilterActive(draft[f.key])),
        ),
      ),
  );
  const toggleGroup = (g: string) =>
    setOpenGroups((prev) => {
      const n = new Set(prev);
      if (n.has(g)) n.delete(g);
      else n.add(g);
      return n;
    });

  // Which long multiselects are expanded (showing all options vs just the top
  // few). Tags are pre-sorted by frequency, so the common ones show by default.
  const [expandedMs, setExpandedMs] = useState<Set<string>>(new Set());
  const toggleMs = (k: string) =>
    setExpandedMs((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const renderField = (f: FilterField) => {
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
    if (f.control === "multiselect") {
      const opts = options[f.key] || [];
      const sel = Array.isArray(v) ? v : [];
      const toggle = (o: string) =>
        setField(f.key, sel.includes(o) ? sel.filter((x) => x !== o) : [...sel, o]);
      // AND/OR mode carried in the sidecar draft key. Default "or" (any-of).
      const modeKey = f.key + MS_MODE_SUFFIX;
      const msMode = draft[modeKey] === "and" ? "and" : "or";
      const setMode = (m: "or" | "and") => setField(modeKey, m);
      // Long lists (e.g. drug-ordinance sections) collapse to the most-common
      // few; the rest are behind a "show more" toggle. Selected options stay
      // visible even when collapsed.
      const COLLAPSE_AT = 12;
      const VISIBLE = 8;
      const collapsible = opts.length > COLLAPSE_AT;
      const collapsed = collapsible && !expandedMs.has(f.key);
      const shown = collapsed
        ? opts.filter((o, i) => i < VISIBLE || sel.includes(o))
        : opts;
      return (
        // Full-width within the filter grid so the chip list gets its own row.
        <div key={f.key} className="sm:col-span-2 lg:col-span-3">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <label className="text-xs font-semibold text-gray-600">
              {f.label}
              {sel.length > 0 ? ` (${sel.length})` : ""}
            </label>
            {/* AND/OR toggle — only meaningful once 2+ options are picked. */}
            {sel.length > 1 ? (
              <div className="inline-flex rounded-md border border-gray-300 overflow-hidden text-[11px]">
                <button
                  type="button"
                  onClick={() => setMode("or")}
                  className="px-2 py-0.5 font-semibold transition"
                  style={
                    msMode === "or"
                      ? { background: C_PRIMARY, color: "#fff" }
                      : { background: "#fff", color: C_PRIMARY }
                  }
                  title="תוצאות שמכילות לפחות אחד מהערכים שנבחרו (או)"
                >
                  או
                </button>
                <button
                  type="button"
                  onClick={() => setMode("and")}
                  className="px-2 py-0.5 font-semibold transition border-r border-gray-300"
                  style={
                    msMode === "and"
                      ? { background: C_PRIMARY, color: "#fff" }
                      : { background: "#fff", color: C_PRIMARY }
                  }
                  title="תוצאות שמכילות את כל הערכים שנבחרו (גם וגם)"
                >
                  גם
                </button>
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-1.5 p-1 border border-gray-300 rounded-md">
            {opts.length === 0 ? (
              <span className="text-xs text-gray-400 px-1">—</span>
            ) : (
              <>
                {shown.map((o) => {
                  const on = sel.includes(o);
                  return (
                    <button
                      key={o}
                      type="button"
                      onClick={() => toggle(o)}
                      className="text-xs rounded-md px-2 py-1 border transition"
                      style={
                        on
                          ? { background: C_PRIMARY, color: "#fff", borderColor: C_PRIMARY }
                          : { background: "#fff", color: C_PRIMARY, borderColor: "#cbd5e1" }
                      }
                    >
                      {optionLabel(o, f.optionLabels)}
                    </button>
                  );
                })}
                {collapsible ? (
                  <button
                    type="button"
                    onClick={() => toggleMs(f.key)}
                    className="text-xs rounded-md px-2 py-1 border border-dashed transition"
                    style={{ background: "#f8fafc", color: C_PD, borderColor: "#cbd5e1" }}
                  >
                    {collapsed ? `+ עוד ${opts.length - VISIBLE}` : "− הצג פחות"}
                  </button>
                ) : null}
              </>
            )}
          </div>
        </div>
      );
    }
    if (f.control === "select" || f.control === "boolean") {
      // Boolean fields use a fixed כן/לא option set; selects use the distinct
      // values discovered server-side.
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
                {optionLabel(o, f.optionLabels)}
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
    if (f.control === "yearrange") {
      const r = (typeof v === "object" ? v : {}) as { from?: string; to?: string };
      const fromYear = r.from ? r.from.slice(0, 4) : "";
      const toYear = r.to ? r.to.slice(0, 4) : "";
      const nowY = new Date().getFullYear();
      const years: number[] = [];
      for (let y = nowY; y >= 2000; y--) years.push(y);
      return (
        <div key={f.key}>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            {f.label}
          </label>
          <div className="flex items-center gap-1.5">
            <select
              value={fromYear}
              onChange={(e) =>
                setField(f.key, {
                  ...r,
                  from: e.target.value ? `${e.target.value}-01-01` : undefined,
                })
              }
              className="w-full border border-gray-300 rounded-md px-2 py-2 text-sm bg-white"
              dir="ltr"
            >
              <option value="">משנת</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <span className="text-gray-400">–</span>
            <select
              value={toYear}
              onChange={(e) =>
                setField(f.key, {
                  ...r,
                  to: e.target.value ? `${e.target.value}-12-31` : undefined,
                })
              }
              className="w-full border border-gray-300 rounded-md px-2 py-2 text-sm bg-white"
              dir="ltr"
            >
              <option value="">עד שנת</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
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
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
      {lawSectionFilter ? (
        <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <span className="text-xs font-semibold text-gray-700">
              {lawSectionFilter.label}
            </span>
            {lsSections.length > 1 ? (
              <div className="inline-flex rounded-md border border-gray-300 overflow-hidden text-[11px]">
                <button
                  type="button"
                  onClick={() => setLs({ ...ls, mode: "or", sections: lsSections })}
                  className="px-2 py-1 font-semibold transition"
                  style={
                    lsMode === "or"
                      ? { background: C_PRIMARY, color: "#fff" }
                      : { background: "#fff", color: C_PRIMARY }
                  }
                  title="פסקי דין שדנו לפחות באחד מהסעיפים שנבחרו"
                >
                  אחד מהם
                </button>
                <button
                  type="button"
                  onClick={() => setLs({ ...ls, mode: "and", sections: lsSections })}
                  className="px-2 py-1 font-semibold transition border-r border-gray-300"
                  style={
                    lsMode === "and"
                      ? { background: C_PRIMARY, color: "#fff" }
                      : { background: "#fff", color: C_PRIMARY }
                  }
                  title="פסקי דין שדנו בכל הסעיפים שנבחרו"
                >
                  כולם
                </button>
              </div>
            ) : null}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                שם החוק
              </label>
              <select
                value={ls.law ?? ""}
                onChange={(e) =>
                  setLs({ law: e.target.value, sections: [], mode: lsMode })
                }
                className="w-full border border-gray-300 rounded-md px-2 py-2 text-sm bg-white"
              >
                <option value="">בחר/י חוק…</option>
                {lawList.map((law) => (
                  <option key={law} value={law}>
                    {law}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {ls.law && sectionList.length > 0 ? (
            <div className="mt-2">
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                סעיפים{lsSections.length > 0 ? ` (${lsSections.length} נבחרו)` : ""}
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto p-0.5">
                {sectionList.map((sec) => {
                  const on = lsSections.includes(sec);
                  return (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => toggleSection(sec)}
                      className="font-mono text-xs rounded-md px-2 py-1 border transition"
                      style={
                        on
                          ? { background: C_PRIMARY, color: "#fff", borderColor: C_PRIMARY }
                          : { background: "#fff", color: C_PRIMARY, borderColor: "#cbd5e1" }
                      }
                    >
                      {sec}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {ungroupedFields.map((f) => renderField(f))}
      </div>
      {groupNames.map((g) => {
        const gFields = fields.filter((f) => f.group === g);
        const activeCount = gFields.filter((f) =>
          isFilterActive(draft[f.key]),
        ).length;
        const open = openGroups.has(g);
        return (
          <div key={g} className="mt-3 rounded-lg border border-gray-200">
            <button
              type="button"
              onClick={() => toggleGroup(g)}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              aria-expanded={open}
            >
              <span className="text-gray-400 text-[11px] w-3 inline-block">
                {open ? "▾" : "◂"}
              </span>
              <span>{g}</span>
              {activeCount > 0 ? (
                <span
                  className="text-[11px] font-semibold text-white rounded-full px-1.5"
                  style={{ background: C_PRIMARY }}
                >
                  {activeCount}
                </span>
              ) : null}
            </button>
            {open ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 px-3 pb-3">
                {gFields.map((f) => renderField(f))}
              </div>
            ) : null}
          </div>
        );
      })}

      <div className="flex items-center justify-between gap-2 mt-4">
        <LegislationMenu items={legislation} align="start" />
        <div className="flex items-center gap-2">
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
    </div>
  );
}

// ── Shareable URL state ──
// Filters/sort/page live in the query string so a searched view can be copied
// from the address bar and sent to someone. Read once on mount; mirrored back
// with replaceState on change — no navigation, no extra requests.
function readUrlState(): {
  filters: Record<string, UserFilterValue>;
  sortKey: string;
  sortDir: SortDir;
  page: number;
  text: string;
} {
  const empty = {
    filters: {} as Record<string, UserFilterValue>,
    sortKey: "",
    sortDir: "desc" as SortDir,
    page: 1,
    text: "",
  };
  if (typeof window === "undefined") return empty;
  const sp = new URLSearchParams(window.location.search);
  let filters: Record<string, UserFilterValue> = {};
  const raw = sp.get("filters");
  if (raw) {
    try {
      const o = JSON.parse(raw);
      if (o && typeof o === "object") filters = o as Record<string, UserFilterValue>;
    } catch {
      // ignore malformed ?filters=
    }
  }
  const sortKey = sp.get("sort") || "";
  const sortDir: SortDir = sp.get("dir") === "asc" ? "asc" : "desc";
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10) || 1);
  const text = sp.get("text") || "";
  return { filters, sortKey, sortDir, page, text };
}

export function RulingsList({
  category,
  legislation,
}: {
  category: "foi" | "defamation" | "foi-judgments" | "foi-costs" | "drug-sentencing";
  legislation?: LegislationLink[];
}) {
  // Seed once from the URL so a shared link restores the exact searched view.
  const [urlSeed] = useState(readUrlState);
  const [data, setData] = useState<RulingsResponse | null>(null);
  // Filter/sort CONFIG, fetched first (?meta=1) so the filter bar renders
  // immediately while the (possibly slow) results load separately.
  const [config, setConfig] = useState<RulingsResponse | null>(null);
  const [page, setPage] = useState(urlSeed.page);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Draft = what the user is typing; applied = what's been sent to the API.
  const [draftFilters, setDraftFilters] = useState<Record<string, UserFilterValue>>(
    urlSeed.filters,
  );
  const [appliedFilters, setAppliedFilters] = useState<Record<string, UserFilterValue>>(
    urlSeed.filters,
  );

  // Sort state. Empty sortKey = let the server pick its default (first
  // configured sort field, or built-in date-desc).
  const [sortKey, setSortKey] = useState<string>(urlSeed.sortKey);
  const [sortDir, setSortDir] = useState<SortDir>(urlSeed.sortDir);

  // Free-text content search (TAG-IT text_query). Draft = the input; applied =
  // what's been sent to the API.
  const [textDraft, setTextDraft] = useState<string>(urlSeed.text);
  const [textApplied, setTextApplied] = useState<string>(urlSeed.text);

  // "Copied" feedback for the share-link button.
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(
    async (
      cat: string,
      p: number,
      filters: Record<string, UserFilterValue>,
      sKey: string,
      sDir: SortDir,
      text: string,
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
        const activeEntries = Object.entries(filters).filter(([k, v]) => {
          // A multiselect mode sidecar (`<field>::mode`) rides along only when
          // its base field is actually active — so a stale mode never counts as
          // a filter on its own (would wrongly flip initialPageSize → pageSize).
          if (k.endsWith(MS_MODE_SUFFIX)) {
            return isFilterActive(filters[k.slice(0, -MS_MODE_SUFFIX.length)]);
          }
          return isFilterActive(v);
        });
        if (activeEntries.length > 0) {
          params.set("userFilters", JSON.stringify(Object.fromEntries(activeEntries)));
        }
        if (sKey) {
          params.set("sort", sKey);
          params.set("dir", sDir);
        }
        if (text) params.set("text", text);
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
    fetchData(category, page, appliedFilters, sortKey, sortDir, textApplied);
  }, [fetchData, category, page, appliedFilters, sortKey, sortDir, textApplied]);

  // Fetch the filter/sort CONFIG up front (fast — no TAG-IT document query) so
  // the filter bar appears immediately, before the (possibly slow) results.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/rulings?category=${encodeURIComponent(category)}&meta=1`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!cancelled && j) setConfig(j as RulingsResponse);
      })
      .catch(() => {
        /* fall back to config from the results response */
      });
    return () => {
      cancelled = true;
    };
  }, [category]);

  // Mirror the applied search into the URL so the address bar can be shared.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams();
    const active = Object.entries(appliedFilters).filter(([k, v]) => {
      // Keep a multiselect mode sidecar only when its base field is active
      // (mirrors the fetch serialization), so shared URLs stay clean.
      if (k.endsWith(MS_MODE_SUFFIX)) {
        return isFilterActive(appliedFilters[k.slice(0, -MS_MODE_SUFFIX.length)]);
      }
      return isFilterActive(v);
    });
    if (active.length > 0) {
      sp.set("filters", JSON.stringify(Object.fromEntries(active)));
    }
    if (sortKey) {
      sp.set("sort", sortKey);
      sp.set("dir", sortDir);
    }
    if (textApplied) sp.set("text", textApplied);
    if (page > 1) sp.set("page", String(page));
    const qs = sp.toString();
    window.history.replaceState(
      null,
      "",
      qs ? `${window.location.pathname}?${qs}` : window.location.pathname,
    );
  }, [appliedFilters, sortKey, sortDir, page, textApplied]);

  const applyFilters = () => {
    setPage(1);
    setAppliedFilters(draftFilters);
  };
  const clearFilters = () => {
    setDraftFilters({});
    setPage(1);
    setAppliedFilters({});
  };
  const applyText = () => {
    setPage(1);
    setTextApplied(textDraft.trim());
  };
  const clearText = () => {
    setTextDraft("");
    setTextApplied("");
    setPage(1);
  };

  // Copy the current (search-synced) URL so it can be shared.
  const copyShareLink = async () => {
    if (typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable (e.g. insecure context) — silently ignore
    }
  };

  // Filter/sort config comes from the fast `?meta=1` response when available,
  // so the bar shows before results; falls back to the results response.
  const filterFields = config?.filterFields ?? data?.filterFields ?? [];
  const filterOptions = config?.filterOptions ?? data?.filterOptions ?? {};
  const sortFields = config?.sortFields ?? data?.sortFields ?? [];
  const lawSectionFilter = config?.lawSectionFilter ?? data?.lawSectionFilter;
  const showFilterBar = filterFields.length > 0 || !!lawSectionFilter;
  const fullTextSearch =
    (config?.fullTextSearch ?? data?.fullTextSearch) === true;
  // The control reflects the active sort: explicit user choice, or the
  // server's default (first configured field) when the user hasn't picked.
  const activeSortKey = sortKey || sortFields[0]?.key || "";
  // Direction shown/active: the user's choice if they picked a sort, else the
  // default field's configured direction (which the server applies on load).
  const activeSortDir: SortDir = sortKey
    ? sortDir
    : sortFields[0]?.defaultDir ?? "desc";

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
      {fullTextSearch ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
          <label
            htmlFor="rulings-fulltext"
            className="block text-xs font-semibold text-gray-700 mb-1"
          >
            חיפוש חופשי בכל תוכן המסמך
          </label>
          <div className="flex items-center gap-2">
            <input
              id="rulings-fulltext"
              type="text"
              value={textDraft}
              onChange={(e) => setTextDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyText();
              }}
              placeholder='חיפוש מילים בתוך גזרי הדין (תומך "ביטוי מדויק")'
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={applyText}
              className="text-sm font-semibold rounded-md px-4 py-2 text-white shrink-0"
              style={{ background: C_PRIMARY }}
            >
              חיפוש
            </button>
            {textApplied ? (
              <button
                type="button"
                onClick={clearText}
                className="text-sm font-semibold rounded-md px-3 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 shrink-0"
              >
                ניקוי
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      {showFilterBar ? (
        <FilterBar
          fields={filterFields}
          options={filterOptions}
          draft={draftFilters}
          setDraft={setDraftFilters}
          onApply={applyFilters}
          onClear={clearFilters}
          legislation={legislation}
          lawSectionFilter={lawSectionFilter}
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

        <div className="flex items-center gap-2 shrink-0">
          {!showFilterBar ? (
            <LegislationMenu items={legislation} align="end" />
          ) : null}
          <button
            type="button"
            onClick={copyShareLink}
            title="העתק קישור לתצוגה הנוכחית (כולל החיפוש)"
            className="border border-gray-300 rounded-md px-2 py-1 text-xs bg-white hover:bg-gray-50"
          >
            {copied ? "הועתק ✓" : "העתק קישור"}
          </button>
          {sortFields.length > 0 ? (
            <>
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
                  // On the (server-applied) default sort, the user hasn't set an
                  // explicit sortKey yet — promote it so the toggle takes effect.
                  if (!sortKey) {
                    setSortKey(activeSortKey);
                    setSortDir(activeSortDir === "desc" ? "asc" : "desc");
                  } else {
                    setSortDir((d) => (d === "desc" ? "asc" : "desc"));
                  }
                  setPage(1);
                }}
                title={activeSortDir === "desc" ? "מהגבוה לנמוך / מהחדש לישן" : "מהנמוך לגבוה / מהישן לחדש"}
                className="border border-gray-300 rounded-md px-2 py-1 text-xs bg-white hover:bg-gray-50"
              >
                {activeSortDir === "desc" ? "יורד ↓" : "עולה ↑"}
              </button>
            </>
          ) : null}
        </div>
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
