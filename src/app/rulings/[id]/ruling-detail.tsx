"use client";

import { StructuredFieldRows } from "../rulings-list";
import { ShareLinkButton } from "@/components/ui/share-link-button";

const C_PRIMARY = "#1a365d";

export interface DetailRuling {
  id: number;
  caseName: string;
  court: string;
  date: string;
  judges: string[];
  summary: string;
  title: string;
  compensation: number | string | null;
  platform: string;
  defenses: Record<string, unknown>[];
  publications: Record<string, unknown>[];
  documentUrl: string;
}

function fmtDate(s: string): string {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return new Intl.DateTimeFormat("he-IL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-block text-xs font-semibold rounded-md px-2 py-0.5"
      style={{ color: "#2a6f97", background: "#e1ecf3" }}
    >
      {children}
    </span>
  );
}

export function RulingDetail({ ruling }: { ruling: DetailRuling }) {
  const comp =
    typeof ruling.compensation === "number"
      ? ruling.compensation.toLocaleString("he-IL") + " ₪"
      : ruling.compensation || "";

  return (
    <article dir="rtl" className="max-w-3xl mx-auto">
      <div className="mb-4">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="text-sm text-gray-500 hover:text-gray-800"
        >
          → חזרה
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-md p-6">
        <div className="flex items-start gap-2 mb-3 flex-wrap">
          {ruling.court ? <Badge>{ruling.court}</Badge> : null}
          {ruling.date ? <Badge>{fmtDate(ruling.date)}</Badge> : null}
        </div>

        <h1
          className="text-xl font-bold leading-snug mb-3"
          style={{ color: C_PRIMARY }}
        >
          {ruling.caseName || "ללא שם תיק"}
        </h1>

        {ruling.title && ruling.title !== ruling.caseName ? (
          <div className="text-sm font-medium text-gray-700 mb-3">
            {ruling.title}
          </div>
        ) : null}

        <dl className="text-sm text-gray-700 space-y-1.5">
          {ruling.judges.length > 0 ? (
            <div className="flex gap-1.5">
              <dt className="font-semibold whitespace-nowrap">שופטים:</dt>
              <dd>{ruling.judges.join(", ")}</dd>
            </div>
          ) : null}
          {comp ? (
            <div className="flex gap-1.5">
              <dt className="font-semibold whitespace-nowrap">
                סכום פיצוי שנפסק:
              </dt>
              <dd>{comp}</dd>
            </div>
          ) : null}
          {ruling.platform ? (
            <div className="flex gap-1.5">
              <dt className="font-semibold whitespace-nowrap">פלטפורמה:</dt>
              <dd>{ruling.platform}</dd>
            </div>
          ) : null}
        </dl>

        {ruling.summary ? (
          <div className="mt-3">
            <dt className="font-semibold text-sm text-gray-700 mb-0.5">תקציר</dt>
            <p className="text-sm text-gray-700 leading-relaxed">
              {ruling.summary}
            </p>
          </div>
        ) : null}

        <dl className="text-sm text-gray-700">
          {ruling.publications.length > 0 ? (
            <StructuredFieldRows
              label="רשימת פרסומים"
              items={ruling.publications}
            />
          ) : null}
          {ruling.defenses.length > 0 ? (
            <StructuredFieldRows label="הגנות שנטענו" items={ruling.defenses} />
          ) : null}
        </dl>

        <div className="mt-5 pt-4 border-t border-gray-200 flex items-center justify-between gap-3 flex-wrap">
          <ShareLinkButton title={ruling.caseName} />
          <a
            href={ruling.documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold rounded-md px-4 py-1.5 text-white transition"
            style={{ background: C_PRIMARY }}
          >
            צפייה במסמך (PDF)
          </a>
        </div>
      </div>
    </article>
  );
}
