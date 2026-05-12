"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  History,
  Info,
  MessageSquare,
  Plus,
  Trash2,
  Users,
} from "lucide-react";

/**
 * Public dashboard for /pach-hamishpat — community status reporting for
 * נט המשפט. Ported from the standalone pah.org.il React app and merged
 * into the main z-g.co.il React tree so it shares the site header,
 * footer, admin, and Postgres database.
 *
 * Polling every 10s mirrors the original — the system is small enough
 * that a websocket would be overkill, and polling keeps the page simple
 * to reason about (no stale connection edge cases).
 */

type Status = "green" | "orange" | "red";

interface Report {
  id: number;
  status: Status;
  description: string | null;
  reporter_type: string;
  created_date: string;
  expires_at: string | null;
  is_hidden: boolean;
  is_scheduled: boolean;
  scheduled_from: string | null;
  scheduled_until: string | null;
}

interface Comment {
  id: number;
  content: string;
  author_name: string;
  is_admin: boolean;
  is_hidden: boolean;
  created_date: string;
}

interface SystemMessage {
  id: number;
  title: string | null;
  content: string | null;
  image_url: string | null;
  order_index: number;
  is_archived: boolean;
  created_date: string;
}

const STATUS_TEXT: Record<Status, string> = {
  green: "המערכת תקינה",
  orange: "תקלה חלקית במערכת",
  red: "המערכת קרסה",
};

// Original asset URLs from pah.org.il's Supabase bucket. They're public,
// CDN-served, and serve the brand identity for the trash-can graphic.
const TRASH_IMAGE: Record<Status, string> = {
  green:
    "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/d4101aa8b_GREEN.png",
  orange:
    "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/ec3d73726_ORANGE.png",
  red: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6ea5658d9_red.png",
};

const MUSHROOM_RED =
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/5d255b9c7_bRED.png";
const MUSHROOM_ORANGE =
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/1c543ee76_bORANGE.png";
const EXTINGUISHER =
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/e3a39eb95_ChatGPTImageJul30202504_22_23PM.png";

const POLL_MS = 10_000;

function fmtIsraeliTime(s: string): string {
  // Force UTC interpretation when no offset is present, mirroring the
  // original logic — Postgres ISO timestamps already include "Z".
  const d =
    s.endsWith("Z") || s.includes("+") || /[\-+]\d\d:?\d\d$/.test(s)
      ? new Date(s)
      : new Date(s + "Z");
  return d.toLocaleString("he-IL", {
    timeZone: "Asia/Jerusalem",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Walks the visible report list newest-first and picks the first one
 *  that's actually in effect right now. Mirrors the original Home.jsx. */
function computeCurrentStatus(reports: Report[]): Status {
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
      if (!r.expires_at || new Date(r.expires_at).getTime() > now) {
        return r.status;
      }
    }
  }
  return "green";
}

export function PachDashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [messages, setMessages] = useState<SystemMessage[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [daysToShow, setDaysToShow] = useState(1);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [newComment, setNewComment] = useState({ content: "", author_name: "" });

  const loadAll = useCallback(async () => {
    try {
      const [r, c, m] = await Promise.all([
        fetch("/api/pach-hamishpat/reports?is_hidden=false&limit=500", {
          cache: "no-store",
        }).then((res) => (res.ok ? (res.json() as Promise<Report[]>) : [])),
        fetch("/api/pach-hamishpat/comments?is_hidden=false&limit=500", {
          cache: "no-store",
        }).then((res) => (res.ok ? (res.json() as Promise<Comment[]>) : [])),
        fetch("/api/pach-hamishpat/messages?is_archived=false&limit=200", {
          cache: "no-store",
        }).then((res) => (res.ok ? (res.json() as Promise<SystemMessage[]>) : [])),
      ]);
      setReports(r);
      setComments(c);
      setMessages(m);
    } catch (e) {
      console.error("Pach dashboard fetch failed", e);
    }
  }, []);

  useEffect(() => {
    void loadAll();
    const t = setInterval(() => void loadAll(), POLL_MS);
    return () => clearInterval(t);
  }, [loadAll]);

  const currentStatus = useMemo(() => computeCurrentStatus(reports), [reports]);
  const statusText = STATUS_TEXT[currentStatus];

  const submitReport = useCallback(
    async (status: Status) => {
      if (submitting) return;
      setSubmitting(true);
      try {
        const now = Date.now();
        let expires: string | null = null;
        if (status === "red" || status === "orange") {
          // Escalate duration if many same-status reports landed in the last
          // 30 minutes — repeated reports = real outage, hold the indicator
          // longer so it doesn't flip green prematurely.
          const halfHourAgo = now - 30 * 60_000;
          const recentSame = reports.filter(
            (r) =>
              r.status === status &&
              !r.is_hidden &&
              new Date(r.created_date).getTime() >= halfHourAgo,
          );
          const minutes = recentSame.length >= 5 ? 60 : 30;
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
        await loadAll();
      } finally {
        setSubmitting(false);
      }
    },
    [reports, submitting, loadAll],
  );

  const submitComment = useCallback(async () => {
    const content = newComment.content.trim();
    if (!content) return;
    setSubmitting(true);
    try {
      await fetch("/api/pach-hamishpat/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          author_name: newComment.author_name.trim() || "אנונימי",
        }),
      });
      setNewComment({ content: "", author_name: "" });
      setShowCommentForm(false);
      await loadAll();
    } finally {
      setSubmitting(false);
    }
  }, [newComment, loadAll]);

  /** Merged timeline of reports + comments, filtered by the days-back window. */
  const timeline = useMemo(() => {
    const since = Date.now() - daysToShow * 24 * 60 * 60_000;
    type Item =
      | (Report & { _type: "report" })
      | (Comment & { _type: "comment" });
    const items: Item[] = [
      ...reports
        .filter((r) => new Date(r.created_date).getTime() >= since)
        .map((r) => ({ ...r, _type: "report" as const })),
      ...comments
        .filter((c) => new Date(c.created_date).getTime() >= since)
        .map((c) => ({ ...c, _type: "comment" as const })),
    ];
    items.sort(
      (a, b) =>
        new Date(b.created_date).getTime() - new Date(a.created_date).getTime(),
    );
    return items;
  }, [reports, comments, daysToShow]);

  return (
    <div dir="rtl" className="grid lg:grid-cols-4 gap-8">
      {/* Main column: status indicator + report controls + timeline */}
      <div className="lg:col-span-3 space-y-10">
        <StatusBanner status={currentStatus} text={statusText} />

        <div className="flex flex-col items-center gap-4">
          <p className="text-lg font-medium text-gray-800">לדיווח על תקלה</p>
          <div className="flex items-end justify-center gap-12 md:gap-20 mt-2">
            <MushroomButton
              type="orange"
              label="תקלה חלקית"
              description="לא ניתן לצפות בהחלטות או להגיש בקשות"
              imageUrl={MUSHROOM_ORANGE}
              disabled={submitting}
              onClick={() => void submitReport("orange")}
            />
            <MushroomButton
              type="red"
              label="המערכת קרסה"
              description="אין בכלל אפשרות לגשת לאתר"
              imageUrl={MUSHROOM_RED}
              disabled={submitting}
              onClick={() => void submitReport("red")}
            />
          </div>
        </div>

        {(currentStatus === "red" || currentStatus === "orange") && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => void submitReport("green")}
              disabled={submitting}
              className="flex flex-col items-center gap-3 text-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none"
              aria-label="לדיווח שהמערכת חזרה לפעול תקין"
            >
              <img
                src={EXTINGUISHER}
                alt="מטף — איפוס המערכת"
                className="w-28 h-28 sm:w-32 sm:h-32 object-contain drop-shadow-lg hover:drop-shadow-xl"
              />
              <span className="text-green-600 font-bold">
                {submitting ? "מאפס..." : "הכל תקין"}
              </span>
            </button>
          </div>
        )}

        <Timeline
          items={timeline}
          daysToShow={daysToShow}
          onLoadMore={() => setDaysToShow((d) => d + 7)}
          showForm={showCommentForm}
          onToggleForm={() => setShowCommentForm((v) => !v)}
          newComment={newComment}
          onChangeComment={setNewComment}
          onSubmitComment={submitComment}
          submitting={submitting}
        />
      </div>

      {/* Sidebar: system messages */}
      <div className="lg:col-span-1">
        <SystemMessagesPanel messages={messages} />
      </div>
    </div>
  );
}

/* ─── Components ─── */

function StatusBanner({ status, text }: { status: Status; text: string }) {
  return (
    <div className="text-center">
      <h2 className="text-3xl sm:text-4xl font-bold text-primary mb-1">{text}</h2>
      {status === "red" ? (
        <p className="text-lg text-red-600 mt-1 font-bold animate-pulse">
          מת המשפט
        </p>
      ) : null}
      <div className="flex justify-center mt-4">
        <div className="relative w-56 h-56 sm:w-72 sm:h-72 md:w-80 md:h-80 drop-shadow-2xl select-none">
          <img
            src={TRASH_IMAGE[status]}
            alt={`פח זבל במצב ${status}`}
            className="w-full h-full object-contain"
            draggable={false}
          />
        </div>
      </div>
      <div className="bg-primary/5 p-5 max-w-lg mx-auto mt-6 rounded-lg shadow-sm">
        <p className="text-gray-800 font-medium text-base sm:text-lg leading-relaxed text-center">
          במקום לשאול &quot;תגידי, נט המשפט עובד לך?&quot;
          <br />
          מהיום, נכנסים, מדווחים, וכולם רואים.
        </p>
      </div>
    </div>
  );
}

function MushroomButton({
  type,
  label,
  description,
  imageUrl,
  disabled,
  onClick,
}: {
  type: "orange" | "red";
  label: string;
  description: string;
  imageUrl: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={`לדיווח על ${label}`}
        className="group transition-all duration-300 transform hover:-translate-y-2 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none"
      >
        <div className="relative w-20 h-20 md:w-24 md:h-24">
          <img
            src={imageUrl}
            alt={`כפתור דיווח ${type}`}
            className="w-full h-full object-contain drop-shadow-lg group-hover:drop-shadow-xl transition-all duration-300"
          />
        </div>
      </button>
      <p className="mt-3 text-center font-semibold text-gray-700 text-sm md:text-base">
        {label}
      </p>
      <p className="mt-1 text-center text-xs md:text-sm text-gray-500 max-w-32 leading-tight">
        {description}
      </p>
    </div>
  );
}

function Timeline({
  items,
  daysToShow,
  onLoadMore,
  showForm,
  onToggleForm,
  newComment,
  onChangeComment,
  onSubmitComment,
  submitting,
}: {
  items: Array<
    | (Report & { _type: "report" })
    | (Comment & { _type: "comment" })
  >;
  daysToShow: number;
  onLoadMore: () => void;
  showForm: boolean;
  onToggleForm: () => void;
  newComment: { content: string; author_name: string };
  onChangeComment: (v: { content: string; author_name: string }) => void;
  onSubmitComment: () => void;
  submitting: boolean;
}) {
  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden border border-gray-200 max-w-2xl mx-auto">
      <div className="bg-primary text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          <h3 className="text-xl font-bold">עדכונים אחרונים</h3>
        </div>
        <button
          type="button"
          onClick={onToggleForm}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent text-primary-dark hover:bg-accent/90 px-3 py-1.5 text-sm font-semibold transition"
        >
          <Plus className="w-4 h-4" />
          להוספת הערה
        </button>
      </div>

      <div className="p-4">
        {showForm ? (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
            <input
              type="text"
              placeholder="השם שלך (אופציונלי)"
              value={newComment.author_name}
              dir="rtl"
              onChange={(e) =>
                onChangeComment({ ...newComment, author_name: e.target.value })
              }
              className="w-full rounded border border-gray-300 px-3 py-2 text-right"
            />
            <textarea
              placeholder="שיתוף החוויה או מידע נוסף..."
              value={newComment.content}
              dir="rtl"
              rows={3}
              onChange={(e) =>
                onChangeComment({ ...newComment, content: e.target.value })
              }
              className="w-full rounded border border-gray-300 px-3 py-2 text-right min-h-[80px]"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onToggleForm}
                disabled={submitting}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={onSubmitComment}
                disabled={submitting || !newComment.content.trim()}
                className="rounded-md bg-accent text-primary-dark hover:bg-accent/90 px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
              >
                {submitting ? "בשליחה..." : "לשליחת הערה"}
              </button>
            </div>
          </div>
        ) : null}

        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {items.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">
                אין עדכונים ב-{daysToShow === 1 ? "24 שעות" : `${daysToShow} ימים`}{" "}
                האחרונים
              </p>
              <p className="text-sm">דיווחים והערות יופיעו כאן</p>
            </div>
          ) : null}

          {items.map((item) =>
            item._type === "report" ? (
              <ReportRow key={`r-${item.id}`} report={item} />
            ) : (
              <CommentRow key={`c-${item.id}`} comment={item} />
            ),
          )}
        </div>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={onLoadMore}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <History className="w-4 h-4" />
            דיווחים מהשבוע האחרון
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportRow({ report }: { report: Report }) {
  const bg =
    report.status === "red"
      ? "bg-red-50 border-red-200"
      : report.status === "orange"
        ? "bg-orange-50 border-orange-200"
        : "bg-green-50 border-green-200";
  const Icon =
    report.status === "red"
      ? AlertCircle
      : report.status === "orange"
        ? Info
        : CheckCircle;
  const color =
    report.status === "red"
      ? "text-red-500"
      : report.status === "orange"
        ? "text-orange-500"
        : "text-green-500";
  const message =
    report.status === "red"
      ? "דיווח: המערכת קרסה"
      : report.status === "orange"
        ? "דיווח: תקלה חלקית"
        : "מנהל עדכן: המערכת חזרה לפעול תקין";
  return (
    <div className={`p-3 rounded-lg border ${bg} flex justify-between items-center`}>
      <div className="flex items-center gap-2">
        <Icon className={`w-5 h-5 ${color}`} />
        <span className="text-sm font-medium text-gray-800">{message}</span>
      </div>
      <span className="text-xs text-gray-500">
        {fmtIsraeliTime(report.created_date)}
      </span>
    </div>
  );
}

function CommentRow({ comment }: { comment: Comment }) {
  return (
    <div className="p-3 rounded-lg border bg-blue-50 border-blue-200">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-medium text-gray-800">
            {comment.author_name}
            {comment.is_admin ? (
              <span className="mr-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                מנהל
              </span>
            ) : null}
            <span className="mr-1">הוסיף/ה הערה</span>
          </span>
        </div>
        <span className="text-xs text-gray-500">
          {fmtIsraeliTime(comment.created_date)}
        </span>
      </div>
      <p className="text-sm text-gray-700 mr-6 bg-white/70 p-2 rounded border border-gray-200 whitespace-pre-wrap">
        {comment.content}
      </p>
    </div>
  );
}

function SystemMessagesPanel({ messages }: { messages: SystemMessage[] }) {
  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden border border-gray-200 sticky top-4">
      <div className="bg-primary text-white p-4">
        <h3 className="text-xl font-bold">הודעות מערכת</h3>
      </div>
      <div className="p-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">אין הודעות מערכת</div>
        ) : (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            {messages.map((m) => (
              <article key={m.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                <p className="text-xs text-gray-600 font-medium mb-2">
                  {new Date(m.created_date).toLocaleDateString("he-IL")}
                </p>
                {m.title ? (
                  <h4 className="text-sm text-primary font-semibold mb-1">
                    {m.title}
                  </h4>
                ) : null}
                {m.content ? (
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">
                    {m.content}
                  </p>
                ) : null}
                {m.image_url ? (
                  <img
                    src={m.image_url}
                    alt={m.title ?? ""}
                    className="w-full h-auto max-h-64 object-contain mt-2 rounded"
                  />
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* Unused import shim — Trash2 referenced only by future admin variant */
export const __keep = Trash2;
