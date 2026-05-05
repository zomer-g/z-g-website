"use client";

import { useState } from "react";
import Link from "next/link";
import type {
  ClassActionDocument,
  ClassActionCase,
} from "@/types/class-action";
import { ShareLinkButton } from "@/components/ui/share-link-button";

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

function classifyDocs(docs: ClassActionDocument[]) {
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

interface DocTab {
  doc: ClassActionDocument;
  label: string;
}

function buildTabs(docs: ClassActionDocument[]): DocTab[] {
  const { motion, claim, other } = classifyDocs(docs);
  const out: DocTab[] = [];
  motion.forEach((d) =>
    out.push({
      doc: d,
      label:
        motion.length > 1
          ? `בקשה לאישור (${fmtDate(d.document_date)})`
          : "בקשה לאישור",
    }),
  );
  claim.forEach((d) =>
    out.push({
      doc: d,
      label:
        claim.length > 1
          ? `כתב תביעה (${fmtDate(d.document_date)})`
          : "כתב תביעה",
    }),
  );
  other.forEach((d) =>
    out.push({
      doc: d,
      label: d.document_title || `מסמך ${fmtDate(d.document_date)}`,
    }),
  );
  return out;
}

export function ClassActionDetail({ caseItem }: { caseItem: ClassActionCase }) {
  const tabs = buildTabs(caseItem.documents);
  const [activeIdx, setActiveIdx] = useState(0);
  const active = tabs[activeIdx];

  return (
    <div dir="rtl" className="space-y-6">
      {/* Top bar: back link + share */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link
          href="/class-actions"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-gray-900"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {/* RTL "back" arrow points right. */}
            <path d="M5 12h14" />
            <path d="M12 5l7 7-7 7" />
          </svg>
          <span>חזרה לרשימת התובענות</span>
        </Link>
        <ShareLinkButton
          title={caseItem.case_name || "תובענה ייצוגית"}
          text={
            caseItem.case_name
              ? `תובענה ייצוגית: ${caseItem.case_name}`
              : undefined
          }
        />
      </div>

      {/* Header */}
      <header className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-start gap-2 mb-3 flex-wrap">
          <span
            className="inline-block text-xs font-semibold rounded-md px-2 py-0.5"
            style={{ color: C_PD, background: "#e1ecf3" }}
          >
            {caseItem.case_number}
          </span>
          {caseItem.is_appeal ? (
            <span
              className="inline-block text-xs font-semibold rounded-md px-2 py-0.5"
              style={{ color: C_OTHER, background: "#fbe9e0" }}
            >
              ערעור
            </span>
          ) : null}
          <span
            className="inline-block text-xs font-semibold rounded-md px-2 py-0.5"
            style={{ color: C_MUTED, background: "#eef0f3" }}
          >
            {caseItem.documents.length === 1
              ? "מסמך אחד"
              : `${caseItem.documents.length} מסמכים`}
          </span>
        </div>
        <h1
          className="text-2xl sm:text-3xl font-bold leading-snug mb-2"
          style={{ color: C_PRIMARY }}
        >
          {caseItem.case_name || "ללא שם תיק"}
        </h1>
        <div className="text-sm text-gray-700">
          <span className="font-semibold">בית משפט:</span>{" "}
          {caseItem.court_name || "—"} ·{" "}
          <span className="font-semibold">תאריך הגשה אחרון:</span>{" "}
          {fmtDate(caseItem.latest_document_date)}
        </div>
      </header>

      {/* Metadata block — full details, always expanded */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold mb-4" style={{ color: C_PRIMARY }}>
          פרטי התיק
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="font-semibold text-gray-700">פתיחת תיק</dt>
            <dd className="text-gray-800">{fmtDate(caseItem.case_open_date)}</dd>
          </div>
          <div>
            <dt className="font-semibold text-gray-700">סכום תביעה</dt>
            <dd className="text-gray-800">{fmtAmount(caseItem.claim_amount)}</dd>
          </div>
          {caseItem.class_definition ? (
            <div className="sm:col-span-2">
              <dt className="font-semibold text-gray-700 mb-0.5">הגדרת קבוצה</dt>
              <dd className="text-gray-700 leading-relaxed whitespace-pre-line">
                {caseItem.class_definition}
              </dd>
            </div>
          ) : null}
          {caseItem.legal_question ? (
            <div className="sm:col-span-2">
              <dt className="font-semibold text-gray-700 mb-0.5">שאלה משפטית</dt>
              <dd className="text-gray-700 leading-relaxed whitespace-pre-line">
                {caseItem.legal_question}
              </dd>
            </div>
          ) : null}
          {caseItem.requested_aid ? (
            <div className="sm:col-span-2">
              <dt className="font-semibold text-gray-700 mb-0.5">סעד מבוקש</dt>
              <dd className="text-gray-700 leading-relaxed whitespace-pre-line">
                {caseItem.requested_aid}
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      {/* Documents — tabs + iframe */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <h2 className="text-lg font-bold mb-4" style={{ color: C_PRIMARY }}>
          מסמכי התיק
        </h2>
        {tabs.length === 0 ? (
          <p className="text-sm text-gray-700">אין מסמכים זמינים בתיק זה.</p>
        ) : (
          <>
            <div
              role="tablist"
              aria-label="מסמכי תיק"
              className="flex flex-wrap gap-2 mb-4"
            >
              {tabs.map((t, i) => {
                const active = i === activeIdx;
                return (
                  <button
                    key={t.doc.id}
                    role="tab"
                    aria-selected={active}
                    type="button"
                    onClick={() => setActiveIdx(i)}
                    className="text-sm font-semibold rounded-md px-3 py-1.5 border transition"
                    style={
                      active
                        ? { background: C_PRIMARY, color: "white", borderColor: C_PRIMARY }
                        : { color: C_PRIMARY, borderColor: "#d1d5db", background: "white" }
                    }
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            <div
              className="border border-gray-200 rounded-md overflow-hidden bg-gray-50"
              style={{ height: "min(80vh, 900px)" }}
            >
              {/* The iframe loads our proxy route, which forces inline
                  Content-Disposition so the browser renders the PDF instead
                  of downloading it. */}
              <iframe
                key={active.doc.id /* force reload when the user switches tab */}
                src={`/api/class-actions/documents/${active.doc.id}/file`}
                title={active.label}
                className="w-full h-full"
                // dir=ltr because PDFs themselves don't honor RTL.
                dir="ltr"
              />
            </div>

            <div className="mt-3 flex items-center justify-end gap-2 text-sm">
              <a
                href={`/api/class-actions/documents/${active.doc.id}/file`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold rounded-md px-3 py-1.5 border"
                style={{ color: C_PRIMARY, borderColor: C_PRIMARY }}
              >
                פתח בלשונית חדשה
              </a>
            </div>
          </>
        )}
      </section>

      <p className="text-xs text-gray-700 leading-relaxed">
        המידע נשאב מפנקס תובענות ייצוגיות ומוצג כמות שהוא, ללא סינון או עיבוד נוסף.
        הקישור לכתבי הטענות הוא לקובץ ה-PDF המקורי כפי שהתפרסם בפנקס.
      </p>
    </div>
  );
}
