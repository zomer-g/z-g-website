"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";

/**
 * "אזור אישי חדש" — ported from pah.org.il's PersonalArea.jsx.
 *
 * Lives at /pach-hamishpat/personal-area. Functionally the same as the
 * main /pach-hamishpat dashboard (current status + report buttons) but
 * with the simpler emoji-based action UI and the blue background the
 * original site used to differentiate this area from the main page.
 */

type Status = "green" | "orange" | "red";

interface Report {
  id: number;
  status: Status;
  description: string | null;
  created_date: string;
  expires_at: string | null;
  is_hidden: boolean;
  is_scheduled: boolean;
  scheduled_from: string | null;
  scheduled_until: string | null;
}

const STATUS_TEXT: Record<Status, string> = {
  green: "המערכת תקינה",
  orange: "תקלה חלקית במערכת",
  red: "המערכת קרסה",
};

const TRASH_IMAGE: Record<Status, string> = {
  green:
    "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/d4101aa8b_GREEN.png",
  orange:
    "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/ec3d73726_ORANGE.png",
  red: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6ea5658d9_red.png",
};

function computeCurrent(reports: Report[]): Status {
  const now = Date.now();
  for (const r of reports) {
    if (r.is_scheduled) {
      const from = r.scheduled_from ? new Date(r.scheduled_from).getTime() : null;
      const until = r.scheduled_until ? new Date(r.scheduled_until).getTime() : null;
      if (from != null && until != null && now >= from && now <= until) {
        return r.status;
      }
      continue;
    }
    if (r.status === "green") return "green";
    if (r.status === "red" || r.status === "orange") {
      if (!r.expires_at || new Date(r.expires_at).getTime() > now) return r.status;
    }
  }
  return "green";
}

export function PersonalArea() {
  const [reports, setReports] = useState<Report[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        "/api/pach-hamishpat/reports?is_hidden=false&limit=50",
        { cache: "no-store" },
      );
      if (res.ok) setReports((await res.json()) as Report[]);
    } catch {
      /* network blip — keep showing the last known list */
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 10_000);
    return () => clearInterval(t);
  }, [load]);

  const current = useMemo(() => computeCurrent(reports), [reports]);

  const submit = useCallback(
    async (status: Status) => {
      if (busy) return;
      setBusy(true);
      try {
        const now = Date.now();
        let expires: string | null = null;
        if (status === "red" || status === "orange") {
          // Same 30/60-minute escalation rule as the main dashboard.
          const halfHourAgo = now - 30 * 60_000;
          const recent = reports.filter(
            (r) =>
              r.status === status &&
              !r.is_hidden &&
              new Date(r.created_date).getTime() >= halfHourAgo,
          );
          const minutes = recent.length >= 5 ? 60 : 30;
          expires = new Date(now + minutes * 60_000).toISOString();
        }
        await fetch("/api/pach-hamishpat/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            description: status === "green" ? "איפוס מערכת" : `דיווח ${status}`,
            expires_at: expires,
            is_hidden: false,
          }),
        });
        await load();
      } finally {
        setBusy(false);
      }
    },
    [reports, busy, load],
  );

  return (
    <div dir="rtl" className="max-w-4xl mx-auto">
      {/* Back link */}
      <div className="mb-6">
        <Link
          href="/pach-hamishpat"
          className="inline-flex items-center gap-2 text-primary hover:text-primary-dark font-semibold transition-colors"
        >
          <ArrowRight className="w-5 h-5" />
          <span>חזרה לאזור האישי הישן</span>
        </Link>
      </div>

      {/* Status headline */}
      <h2 className="text-3xl sm:text-4xl font-bold text-center text-primary mb-2">
        {STATUS_TEXT[current]}
      </h2>
      {current === "red" ? (
        <p className="text-center text-red-600 font-bold animate-pulse mb-2">
          מת המשפט
        </p>
      ) : null}

      {/* Trash can */}
      <div className="flex justify-center my-10">
        <div className="relative w-56 h-56 sm:w-72 sm:h-72 md:w-80 md:h-80 drop-shadow-2xl select-none">
          <img
            src={TRASH_IMAGE[current]}
            alt={`פח זבל במצב ${current}`}
            className="w-full h-full object-contain"
            draggable={false}
          />
        </div>
      </div>

      {/* Actions card */}
      <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
        <h3 className="text-xl sm:text-2xl font-bold text-center mb-6">פעולות</h3>
        <div className="flex justify-center items-center flex-wrap gap-8 sm:gap-12">
          <button
            type="button"
            onClick={() => void submit("orange")}
            disabled={busy}
            className="flex flex-col items-center gap-3 transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none"
            aria-label="לדיווח על תקלה חלקית"
          >
            <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center shadow-md hover:shadow-lg">
              <span className="text-4xl" aria-hidden="true">
                🟠
              </span>
            </div>
            <span className="text-sm font-medium text-gray-800">תקלה חלקית</span>
          </button>

          <button
            type="button"
            onClick={() => void submit("red")}
            disabled={busy}
            className="flex flex-col items-center gap-3 transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none"
            aria-label="לדיווח שהמערכת קרסה"
          >
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center shadow-md hover:shadow-lg">
              <span className="text-4xl" aria-hidden="true">
                🔴
              </span>
            </div>
            <span className="text-sm font-medium text-gray-800">המערכת קרסה</span>
          </button>

          {current === "red" || current === "orange" ? (
            <button
              type="button"
              onClick={() => void submit("green")}
              disabled={busy}
              className="flex flex-col items-center gap-3 transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none"
              aria-label="לדיווח שהמערכת תקינה"
            >
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center shadow-md hover:shadow-lg">
                <span className="text-4xl" aria-hidden="true">
                  🧯
                </span>
              </div>
              <span className="text-sm font-medium text-gray-800">הכל תקין</span>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
