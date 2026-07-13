"use client";

import Link from "next/link";
import type { MmmDoc } from "@/types/mmm-doc";
import { ShareLinkButton } from "@/components/ui/share-link-button";

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

export function MmmDetail({ doc }: { doc: MmmDoc }) {
  const title = doc.document_title || doc.filename || "ללא כותרת";
  const fileHref = `/api/rulings/documents/${doc.id}/file`;

  return (
    <div dir="rtl" className="space-y-6">
      {/* Top bar: back link + share */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link
          href="/mmm"
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
          <span>חזרה למאגר המסמכים</span>
        </Link>
        <ShareLinkButton
          title={title}
          text={doc.document_title ? `מסמך מרכז המחקר והמידע של הכנסת: ${doc.document_title}` : undefined}
        />
      </div>

      {/* Header */}
      <header className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-start gap-2 mb-3 flex-wrap">
          {doc.doc_type ? (
            <span
              className="inline-block text-xs font-semibold rounded-md px-2 py-0.5"
              style={{ color: C_PD, background: "#e1ecf3" }}
            >
              {doc.doc_type}
            </span>
          ) : null}
        </div>
        <h1
          className="text-2xl sm:text-3xl font-bold leading-snug mb-2"
          style={{ color: C_PRIMARY }}
        >
          {title}
        </h1>
        <div className="text-sm text-gray-700">
          <span className="font-semibold">תאריך פרסום:</span>{" "}
          {fmtDate(doc.document_date)}
          {doc.topic ? (
            <>
              {" · "}
              <span className="font-semibold">נושא:</span> {doc.topic}
            </>
          ) : null}
        </div>
        {doc.author ? (
          <div className="text-sm text-gray-700 mt-1">
            <span className="font-semibold">מחבר/ת:</span> {doc.author}
          </div>
        ) : null}
        {doc.summary ? (
          <p className="text-sm text-gray-600 leading-relaxed mt-4 whitespace-pre-line">
            {doc.summary}
          </p>
        ) : null}
      </header>

      {/* PDF iframe — hidden on mobile (most mobile browsers don't render inline
          PDFs); the CTA below becomes the entry point there. */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <h2 className="text-lg font-bold mb-4" style={{ color: C_PRIMARY }}>
          קובץ המסמך
        </h2>
        <div
          className="hidden sm:block border border-gray-200 rounded-md overflow-hidden bg-gray-50"
          style={{ height: "min(80vh, 900px)" }}
        >
          <iframe src={fileHref} title={title} className="w-full h-full" dir="ltr" />
        </div>
        <p className="sm:hidden text-sm text-gray-600 leading-relaxed">
          הצגת קובץ ה-PDF בתוך הדף אינה נתמכת בכל הדפדפנים בנייד. לצפייה בקובץ
          המקורי, יש לפתוח אותו בלשונית נפרדת:
        </p>
        <div className="mt-3 flex items-center justify-center sm:justify-end gap-2 text-sm">
          <a
            href={fileHref}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold rounded-md px-4 py-2 border"
            style={{ color: C_PRIMARY, borderColor: C_PRIMARY }}
          >
            לפתיחה בלשונית נפרדת
          </a>
        </div>
      </section>

      <p className="text-xs text-gray-700 leading-relaxed">
        המידע נשאב ממאגר מסמכי מרכז המחקר והמידע של הכנסת ומוצג כמות שהוא. הקובץ
        המוצג הוא קובץ ה-PDF המקורי כפי שפורסם.
      </p>
    </div>
  );
}
