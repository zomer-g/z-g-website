"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  Calendar,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Unified admin screen for פח המשפט. Replaces the standalone admin from
 * pah.org.il — the same operator (the site's logged-in admin) now manages
 * status reports, comments, and system messages from one place, with
 * NextAuth session auth instead of the old shared-password flow.
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

function fmt(s: string) {
  const d = s.endsWith("Z") || /\+\d|\-\d\d:?\d\d$/.test(s) ? new Date(s) : new Date(s + "Z");
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

export default function PachAdminPage() {
  const [tab, setTab] = useState<"messages" | "reports" | "comments" | "schedule">(
    "messages",
  );
  const [reports, setReports] = useState<Report[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [messages, setMessages] = useState<SystemMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, c, m] = await Promise.all([
        fetch("/api/pach-hamishpat/reports?limit=200", { cache: "no-store" }).then(
          (res) => (res.ok ? (res.json() as Promise<Report[]>) : []),
        ),
        fetch("/api/pach-hamishpat/comments?limit=200", { cache: "no-store" }).then(
          (res) => (res.ok ? (res.json() as Promise<Comment[]>) : []),
        ),
        fetch("/api/pach-hamishpat/messages?limit=200", { cache: "no-store" }).then(
          (res) => (res.ok ? (res.json() as Promise<SystemMessage[]>) : []),
        ),
      ]);
      setReports(r);
      setComments(c);
      setMessages(m);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary-dark">פח המשפט</h1>
          <p className="text-sm text-muted">
            ניהול דיווחי סטטוס, תגובות והודעות מערכת לעמוד /pach-hamishpat.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-semibold hover:bg-muted-bg disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          רענון
        </button>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border">
        {[
          { id: "messages" as const, label: "הודעות מערכת" },
          { id: "reports" as const, label: "דיווחים" },
          { id: "comments" as const, label: "תגובות" },
          { id: "schedule" as const, label: "תזמון השבתה" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "px-4 py-2 text-sm font-semibold border-b-2 transition-colors -mb-px",
              tab === t.id
                ? "border-primary text-primary-dark"
                : "border-transparent text-muted hover:text-foreground",
            )}
            aria-pressed={tab === t.id}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "messages" ? (
        <MessagesTab messages={messages} onChange={load} />
      ) : null}
      {tab === "reports" ? <ReportsTab reports={reports} onChange={load} /> : null}
      {tab === "comments" ? <CommentsTab comments={comments} onChange={load} /> : null}
      {tab === "schedule" ? <ScheduleTab onScheduled={load} /> : null}
    </div>
  );
}

/* ───────── Messages tab ───────── */

function MessagesTab({
  messages,
  onChange,
}: {
  messages: SystemMessage[];
  onChange: () => void | Promise<void>;
}) {
  const [editing, setEditing] = useState<SystemMessage | null>(null);
  const [draft, setDraft] = useState<{
    title: string;
    content: string;
    image_url: string;
  }>({ title: "", content: "", image_url: "" });
  const [busy, setBusy] = useState(false);

  const openNew = () => {
    setEditing(null);
    setDraft({ title: "", content: "", image_url: "" });
  };
  const openEdit = (m: SystemMessage) => {
    setEditing(m);
    setDraft({
      title: m.title ?? "",
      content: m.content ?? "",
      image_url: m.image_url ?? "",
    });
  };

  const save = async () => {
    setBusy(true);
    try {
      if (editing) {
        await fetch(`/api/pach-hamishpat/messages/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: draft.title || null,
            content: draft.content || null,
            image_url: draft.image_url || null,
          }),
        });
      } else {
        const minOrder = messages.reduce(
          (m, x) => Math.min(m, x.order_index ?? 0),
          0,
        );
        await fetch("/api/pach-hamishpat/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: draft.title || null,
            content: draft.content || null,
            image_url: draft.image_url || null,
            order_index: minOrder - 1,
          }),
        });
      }
      setEditing(null);
      setDraft({ title: "", content: "", image_url: "" });
      await onChange();
    } finally {
      setBusy(false);
    }
  };

  const toggleArchive = async (m: SystemMessage) => {
    await fetch(`/api/pach-hamishpat/messages/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_archived: !m.is_archived }),
    });
    await onChange();
  };

  const move = async (m: SystemMessage, dir: -1 | 1) => {
    const sibling = messages
      .filter((x) => x.is_archived === m.is_archived)
      .sort((a, b) => a.order_index - b.order_index)
      .find((x) =>
        dir === -1 ? x.order_index < m.order_index : x.order_index > m.order_index,
      );
    if (!sibling) return;
    await Promise.all([
      fetch(`/api/pach-hamishpat/messages/${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_index: sibling.order_index }),
      }),
      fetch(`/api/pach-hamishpat/messages/${sibling.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_index: m.order_index }),
      }),
    ]);
    await onChange();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {editing ? `עריכת הודעה #${editing.id}` : "הודעה חדשה"}
          </h2>
          {editing ? (
            <button
              type="button"
              onClick={openNew}
              className="text-sm text-muted hover:underline"
            >
              ביטול עריכה
            </button>
          ) : null}
        </div>
        <input
          type="text"
          placeholder="כותרת"
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          dir="rtl"
          className="w-full rounded border border-border px-3 py-2 text-right"
        />
        <textarea
          placeholder="תוכן"
          value={draft.content}
          rows={4}
          onChange={(e) => setDraft({ ...draft, content: e.target.value })}
          dir="rtl"
          className="w-full rounded border border-border px-3 py-2 text-right"
        />
        <input
          type="url"
          placeholder="כתובת תמונה (אופציונלי)"
          value={draft.image_url}
          dir="ltr"
          onChange={(e) => setDraft({ ...draft, image_url: e.target.value })}
          className="w-full rounded border border-border px-3 py-2 text-left"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={save}
            disabled={busy || (!draft.title && !draft.content && !draft.image_url)}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary text-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {editing ? "לעדכון" : "להוספה"}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {messages.length === 0 ? (
          <p className="text-sm text-muted text-center py-6">אין הודעות מערכת.</p>
        ) : null}
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "rounded-lg border p-4 flex flex-wrap items-start justify-between gap-3",
              m.is_archived
                ? "border-amber-200 bg-amber-50"
                : "border-border bg-card",
            )}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-xs text-muted mb-1">
                <span>#{m.id}</span>
                <span>·</span>
                <span>{fmt(m.created_date)}</span>
                <span>·</span>
                <span>order {m.order_index}</span>
                {m.is_archived ? (
                  <span className="rounded-full bg-amber-200 text-amber-900 px-2 py-0.5 font-semibold">
                    בארכיון
                  </span>
                ) : null}
              </div>
              {m.title ? (
                <p className="font-semibold text-primary-dark mb-1">{m.title}</p>
              ) : null}
              {m.content ? (
                <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                  {m.content}
                </p>
              ) : null}
              {m.image_url ? (
                <a
                  href={m.image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline mt-1 inline-block break-all"
                >
                  {m.image_url}
                </a>
              ) : null}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => move(m, -1)}
                className="rounded p-1.5 hover:bg-muted-bg"
                aria-label="העלאה ברשימה"
                title="העלאה ברשימה"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(m, 1)}
                className="rounded p-1.5 hover:bg-muted-bg"
                aria-label="הורדה ברשימה"
                title="הורדה ברשימה"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => openEdit(m)}
                className="rounded p-1.5 hover:bg-muted-bg"
                aria-label="לעריכה"
                title="לעריכה"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => toggleArchive(m)}
                className="rounded p-1.5 hover:bg-muted-bg"
                aria-label={m.is_archived ? "לשחזור" : "לארכוב"}
                title={m.is_archived ? "לשחזור" : "לארכוב"}
              >
                {m.is_archived ? (
                  <ArchiveRestore className="h-4 w-4" />
                ) : (
                  <Archive className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────── Reports tab ───────── */

function ReportsTab({
  reports,
  onChange,
}: {
  reports: Report[];
  onChange: () => void | Promise<void>;
}) {
  const toggleHidden = async (r: Report) => {
    await fetch(`/api/pach-hamishpat/reports/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_hidden: !r.is_hidden }),
    });
    await onChange();
  };

  return (
    <div className="space-y-2">
      {reports.length === 0 ? (
        <p className="text-sm text-muted text-center py-6">אין דיווחים.</p>
      ) : null}
      {reports.map((r) => (
        <div
          key={r.id}
          className={cn(
            "rounded-lg border p-3 flex flex-wrap items-center justify-between gap-3",
            r.is_hidden ? "opacity-60 bg-gray-50" : "bg-card",
            "border-border",
          )}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span
              className={cn(
                "inline-block w-3 h-3 rounded-full shrink-0",
                r.status === "red"
                  ? "bg-red-500"
                  : r.status === "orange"
                    ? "bg-orange-400"
                    : "bg-green-500",
              )}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-sm font-medium">
                <span className="text-muted">#{r.id}</span>{" "}
                <span className="font-semibold">{r.status}</span>{" "}
                <span className="text-muted">({r.reporter_type})</span>{" "}
                {r.is_scheduled ? (
                  <span className="ml-2 rounded bg-purple-100 text-purple-800 px-2 py-0.5 text-xs">
                    מתוזמן
                  </span>
                ) : null}
              </p>
              <p className="text-xs text-muted truncate">
                {fmt(r.created_date)}
                {r.description ? ` · ${r.description}` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => toggleHidden(r)}
            className="inline-flex items-center gap-1 rounded border border-border bg-card px-3 py-1 text-xs font-semibold hover:bg-muted-bg"
            aria-label={r.is_hidden ? "לחשיפה" : "להסתרה"}
          >
            {r.is_hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            {r.is_hidden ? "לחשיפה" : "להסתרה"}
          </button>
        </div>
      ))}
    </div>
  );
}

/* ───────── Comments tab ───────── */

function CommentsTab({
  comments,
  onChange,
}: {
  comments: Comment[];
  onChange: () => void | Promise<void>;
}) {
  const toggleHidden = async (c: Comment) => {
    await fetch(`/api/pach-hamishpat/comments/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_hidden: !c.is_hidden }),
    });
    await onChange();
  };

  return (
    <div className="space-y-2">
      {comments.length === 0 ? (
        <p className="text-sm text-muted text-center py-6">אין תגובות.</p>
      ) : null}
      {comments.map((c) => (
        <div
          key={c.id}
          className={cn(
            "rounded-lg border p-3 flex flex-wrap items-start justify-between gap-3",
            c.is_hidden ? "opacity-60 bg-gray-50" : "bg-card",
            "border-border",
          )}
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted mb-1">
              #{c.id} · {fmt(c.created_date)} ·{" "}
              <span className="font-semibold">{c.author_name}</span>
              {c.is_admin ? (
                <span className="mr-2 rounded bg-blue-100 text-blue-800 px-2 py-0.5 text-xs">
                  מנהל
                </span>
              ) : null}
            </p>
            <p className="text-sm text-foreground whitespace-pre-wrap break-words">
              {c.content}
            </p>
          </div>
          <button
            type="button"
            onClick={() => toggleHidden(c)}
            className="inline-flex items-center gap-1 rounded border border-border bg-card px-3 py-1 text-xs font-semibold hover:bg-muted-bg"
            aria-label={c.is_hidden ? "לחשיפה" : "להסתרה"}
          >
            {c.is_hidden ? <Eye className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
            {c.is_hidden ? "לחשיפה" : "להסתרה"}
          </button>
        </div>
      ))}
    </div>
  );
}

/* ───────── Scheduled downtime tab ───────── */

function ScheduleTab({ onScheduled }: { onScheduled: () => void | Promise<void> }) {
  const [status, setStatus] = useState<"red" | "orange">("red");
  const [hours, setHours] = useState("48");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const schedule = async () => {
    const h = Number(hours);
    if (!Number.isFinite(h) || h <= 0) return;
    setBusy(true);
    try {
      const now = new Date();
      const until = new Date(now.getTime() + h * 60 * 60_000);
      const res = await fetch("/api/pach-hamishpat/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          description:
            description || `השבתה מתוכננת למשך ${h} שעות`,
          is_scheduled: true,
          scheduled_from: now.toISOString(),
          scheduled_until: until.toISOString(),
          expires_at: until.toISOString(),
          is_hidden: false,
        }),
      });
      if (res.ok) {
        setFeedback("ההשבתה תוזמנה בהצלחה.");
        setDescription("");
        await onScheduled();
      } else {
        setFeedback("שגיאה בתזמון.");
      }
    } finally {
      setBusy(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3 max-w-xl">
      <div className="flex items-center gap-2 mb-1">
        <Calendar className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">תזמון השבתה מתוכננת</h2>
      </div>
      <label className="block">
        <span className="text-sm font-semibold text-foreground">סוג הסטטוס</span>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as "red" | "orange")}
          className="mt-1 w-full rounded border border-border px-3 py-2 text-right"
          dir="rtl"
        >
          <option value="red">🔴 המערכת קרסה</option>
          <option value="orange">🟠 תקלה חלקית</option>
        </select>
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-foreground">משך (שעות)</span>
        <input
          type="number"
          min={1}
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          className="mt-1 w-full rounded border border-border px-3 py-2 text-right"
          dir="rtl"
        />
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-foreground">תיאור (אופציונלי)</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded border border-border px-3 py-2 text-right"
          dir="rtl"
        />
      </label>
      <p className="text-xs text-muted">
        ההשבתה תתחיל מיד ותימשך{" "}
        {Number.isFinite(Number(hours)) && Number(hours) > 0
          ? new Date(Date.now() + Number(hours) * 60 * 60_000).toLocaleString(
              "he-IL",
              { dateStyle: "short", timeStyle: "short" },
            )
          : "—"}
        .
      </p>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={schedule}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary text-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
          {busy ? "בתזמון..." : "לתזמון השבתה"}
        </button>
      </div>
      {feedback ? (
        <p className="text-sm text-primary-dark font-semibold">{feedback}</p>
      ) : null}
    </div>
  );
}
