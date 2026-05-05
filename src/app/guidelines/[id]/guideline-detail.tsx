"use client";

import Link from "next/link";
import type { Guideline } from "@/types/guideline";
import { ShareLinkButton } from "@/components/ui/share-link-button";

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

const CSV_ROW_SKIP = new Set(["_id", "rank"]);

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

export function GuidelineDetail({ doc }: { doc: Guideline }) {
  const supersedesText = Array.isArray(doc.supersedes)
    ? doc.supersedes.join(", ")
    : doc.supersedes || "";

  // Same filtering rules as the list-card metadata block, so what the user
  // saw on the card is exactly what they see here (just always expanded).
  const csvRowEntries = Object.entries(doc.csv_row || {}).filter(
    ([key, value]) => {
      if (CSV_ROW_SKIP.has(key)) return false;
      if (!isDisplayableValue(value)) return false;
      const str = String(value).trim();
      if (str.length > 600) return false;
      return true;
    },
  );

  return (
    <div dir="rtl" className="space-y-6">
      {/* Top bar: back link + share */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link
          href="/guidelines"
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
            <path d="M5 12h14" />
            <path d="M12 5l7 7-7 7" />
          </svg>
          <span>חזרה למאגר ההנחיות</span>
        </Link>
        <ShareLinkButton
          title={doc.document_title || doc.filename || "הנחיה"}
          text={
            doc.document_title
              ? `הנחיה: ${doc.document_title}`
              : undefined
          }
        />
      </div>

      {/* Header */}
      <header className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-start gap-2 mb-3 flex-wrap">
          {doc.source_label ? (
            <span
              className="inline-block text-xs font-semibold rounded-md px-2 py-0.5"
              style={{ color: C_PD, background: "#e1ecf3" }}
            >
              {doc.source_label}
            </span>
          ) : null}
          {doc.directive_number ? (
            <span
              className="inline-block text-xs font-semibold rounded-md px-2 py-0.5"
              style={{ color: C_OTHER, background: "#fbe9e0" }}
            >
              הנחיה {doc.directive_number}
            </span>
          ) : null}
        </div>
        <h1
          className="text-2xl sm:text-3xl font-bold leading-snug mb-2"
          style={{ color: C_PRIMARY }}
        >
          {doc.document_title || doc.filename || "ללא כותרת"}
        </h1>
        <div className="text-sm text-gray-700">
          <span className="font-semibold">תאריך פרסום:</span>{" "}
          {fmtDate(doc.document_date)}
          {doc.topic ? (
            <>
              {" · "}
              <span className="font-semibold">תחום:</span> {doc.topic}
            </>
          ) : null}
        </div>
        {doc.summary ? (
          <p className="text-sm text-gray-600 leading-relaxed mt-4 whitespace-pre-line">
            {doc.summary}
          </p>
        ) : null}
      </header>

      {/* Metadata block */}
      {doc.effective_date ||
      supersedesText ||
      csvRowEntries.length > 0 ||
      doc.over_collected_at ||
      doc.over_imported_at ||
      doc.over_version_number ? (
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold mb-4" style={{ color: C_PRIMARY }}>
            פרטי ההנחיה
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {doc.effective_date ? (
              <div>
                <dt className="font-semibold text-gray-700">תחילת תוקף</dt>
                <dd className="text-gray-800">{fmtDate(doc.effective_date)}</dd>
              </div>
            ) : null}
            {supersedesText ? (
              <div className="sm:col-span-2">
                <dt className="font-semibold text-gray-700 mb-0.5">מחליף את</dt>
                <dd className="text-gray-700 leading-relaxed">{supersedesText}</dd>
              </div>
            ) : null}
            {csvRowEntries.map(([key, value]) => (
              <div key={key} className="sm:col-span-2">
                <dt className="font-semibold text-gray-700 inline">{key}:</dt>{" "}
                <dd className="text-gray-700 inline">{fmtValue(value)}</dd>
              </div>
            ))}
            {doc.over_version_number != null ? (
              <div>
                <dt className="font-semibold text-gray-700">גרסת מאגר</dt>
                <dd className="text-gray-800">{doc.over_version_number}</dd>
              </div>
            ) : null}
            {doc.over_collected_at ? (
              <div>
                <dt className="font-semibold text-gray-700">נאסף מאתר הממשלה</dt>
                <dd className="text-gray-800">{fmtDate(doc.over_collected_at)}</dd>
              </div>
            ) : null}
            {doc.over_imported_at ? (
              <div>
                <dt className="font-semibold text-gray-700">יובא למערכת</dt>
                <dd className="text-gray-800">{fmtDate(doc.over_imported_at)}</dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : null}

      {/* PDF iframe */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <h2 className="text-lg font-bold mb-4" style={{ color: C_PRIMARY }}>
          קובץ ההנחיה
        </h2>
        <div
          className="border border-gray-200 rounded-md overflow-hidden bg-gray-50"
          style={{ height: "min(80vh, 900px)" }}
        >
          {/* The iframe loads our proxy route, which forces inline
              Content-Disposition so the browser renders the PDF instead of
              downloading it. */}
          <iframe
            src={`/api/guidelines/documents/${doc.id}/file`}
            title={doc.document_title || doc.filename || "הנחיה"}
            className="w-full h-full"
            dir="ltr"
          />
        </div>
        <div className="mt-3 flex items-center justify-end gap-2 text-sm">
          <a
            href={`/api/guidelines/documents/${doc.id}/file`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold rounded-md px-3 py-1.5 border"
            style={{ color: C_PRIMARY, borderColor: C_PRIMARY }}
          >
            פתח בלשונית חדשה
          </a>
        </div>
      </section>

      <p className="text-xs text-gray-700 leading-relaxed">
        המידע נשאב מ-over.org.il ומוצג כמות שהוא, ללא עיבוד נוסף. הקובץ המוצג
        הוא קובץ ה-PDF המקורי כפי שפורסם.
      </p>
    </div>
  );
}
