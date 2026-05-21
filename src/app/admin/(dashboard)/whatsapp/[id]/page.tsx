"use client";

// Per-workspace admin editor. Three sections:
//   1. Title / description / share URL
//   2. Allowlist of emails — add/remove rows. SSO users on this list
//      can sign in via Google and reach /whatsapp/<slug>.
//   3. Chats — upload a WhatsApp Chat Export .zip, list existing
//      chats with delete buttons.

import { useCallback, useEffect, useRef, useState, use } from "react";
import Link from "next/link";
import {
  Loader2,
  ArrowRight,
  Trash2,
  Plus,
  Copy,
  Pencil,
  AlertCircle,
  CheckCircle,
  MessageCircle,
  FileArchive,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AccessRow {
  id: string;
  email: string;
  createdAt: string;
}
interface ChatSender {
  sender: string;
  count: number;
}
interface ChatRow {
  id: string;
  contactName: string;
  // Raw sender string treated as "me" for this chat (admin-configurable).
  selfSender: string | null;
  // Distinct non-system senders + message counts, populated only when
  // the GET response is admin-tier (the server adds this for ADMIN only).
  senders?: ChatSender[];
  zipFilename: string;
  messageCount: number;
  firstAt: string | null;
  lastAt: string | null;
  uploadedAt: string;
}
interface WorkspaceDetail {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  access: AccessRow[];
  chats: ChatRow[];
}

type Feedback = { type: "success" | "error"; message: string } | null;

export default function AdminWhatsappWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [data, setData] = useState<WorkspaceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  // Title / description draft
  const [titleDraft, setTitleDraft] = useState("");
  const [descDraft, setDescDraft] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);

  // Allowlist add
  const [newEmail, setNewEmail] = useState("");
  const [addingEmail, setAddingEmail] = useState(false);

  // Upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const flash = useCallback((f: Feedback, durationMs = 4000) => {
    setFeedback(f);
    if (f) setTimeout(() => setFeedback(null), durationMs);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/whatsapp/workspaces/${id}`, { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      const json = (await res.json()) as { workspace: WorkspaceDetail };
      setData(json.workspace);
      setTitleDraft(json.workspace.title);
      setDescDraft(json.workspace.description ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveMeta = async () => {
    setSavingMeta(true);
    try {
      const res = await fetch(`/api/whatsapp/workspaces/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: titleDraft, description: descDraft }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
      flash({ type: "success", message: "נשמר" });
      await refresh();
    } catch (err) {
      flash({ type: "error", message: err instanceof Error ? err.message : "שגיאה" });
    } finally {
      setSavingMeta(false);
    }
  };

  const addEmail = async () => {
    if (!newEmail.trim()) return;
    setAddingEmail(true);
    try {
      const res = await fetch(`/api/whatsapp/workspaces/${id}/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail.trim() }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
      setNewEmail("");
      await refresh();
    } catch (err) {
      flash({ type: "error", message: err instanceof Error ? err.message : "שגיאה" });
    } finally {
      setAddingEmail(false);
    }
  };

  const removeEmail = async (email: string) => {
    if (!window.confirm(`להסיר את ${email} מהרשימה?`)) return;
    try {
      const res = await fetch(
        `/api/whatsapp/workspaces/${id}/access/${encodeURIComponent(email)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      await refresh();
    } catch (err) {
      flash({ type: "error", message: err instanceof Error ? err.message : "שגיאה" });
    }
  };

  const uploadZip = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch(`/api/whatsapp/workspaces/${id}/chats`, {
        method: "POST",
        body: form,
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
      flash({
        type: "success",
        message: `הועלה — ${body?.chat?.messageCount ?? "?"} הודעות, ${body?.chat?.mediaCount ?? 0} קבצים`,
      });
      await refresh();
    } catch (err) {
      flash({ type: "error", message: err instanceof Error ? err.message : "שגיאה" }, 12000);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const setSelfSender = async (chatId: string, value: string) => {
    try {
      const res = await fetch(`/api/whatsapp/workspaces/${id}/chats/${chatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        // Empty string → null in the API (unsets selfSender).
        body: JSON.stringify({ selfSender: value === "" ? null : value }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      await refresh();
    } catch (err) {
      flash({ type: "error", message: err instanceof Error ? err.message : "שגיאה" });
    }
  };

  const renameChat = async (chatId: string, current: string) => {
    const next = window.prompt("שם איש הקשר החדש:", current);
    if (next === null) return;            // user pressed cancel
    const trimmed = next.trim();
    if (!trimmed || trimmed === current) return;
    try {
      const res = await fetch(`/api/whatsapp/workspaces/${id}/chats/${chatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactName: trimmed }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      flash({ type: "success", message: "השם עודכן" });
      await refresh();
    } catch (err) {
      flash({ type: "error", message: err instanceof Error ? err.message : "שגיאה" });
    }
  };

  const deleteChat = async (chatId: string, contactName: string) => {
    if (!window.confirm(`למחוק את השיחה עם "${contactName}"?`)) return;
    try {
      const res = await fetch(`/api/whatsapp/workspaces/${id}/chats/${chatId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      await refresh();
    } catch (err) {
      flash({ type: "error", message: err instanceof Error ? err.message : "שגיאה" });
    }
  };

  const copyShareUrl = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/whatsapp/${data.slug}`);
      flash({ type: "success", message: "הקישור הועתק" });
    } catch {
      flash({ type: "error", message: "ההעתקה נכשלה" });
    }
  };

  // Clean-view variant: the same workspace URL with ?view=clean, which
  // renders the WhatsApp shell full-screen without the site header,
  // footer, or admin bar. Useful for handing a focused viewer link
  // to a workspace member.
  const copyCleanViewUrl = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/whatsapp/${data.slug}?view=clean`,
      );
      flash({ type: "success", message: "קישור לתצוגה נקייה הועתק" });
    } catch {
      flash({ type: "error", message: "ההעתקה נכשלה" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/whatsapp"
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ArrowRight className="h-4 w-4" />
          חזרה לרשימה
        </Link>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error ?? "לא נמצא"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/admin/whatsapp"
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ArrowRight className="h-4 w-4" />
          חזרה לרשימה
        </Link>
        <div className="flex items-center justify-between gap-3 flex-wrap mt-2">
          <h1 className="text-2xl font-bold text-primary-dark truncate">{data.title}</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="ghost" size="sm" className="border border-border" onClick={copyShareUrl}>
              <Copy className="h-3.5 w-3.5" />
              קישור מלא
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="border border-border"
              onClick={copyCleanViewUrl}
              title="פותח את האזור במסך מלא, ללא כותרת/פוטר/סרגל ניהול — מתאים לשיתוף לצפייה ממוקדת"
            >
              <Copy className="h-3.5 w-3.5" />
              קישור לתצוגה נקייה
            </Button>
          </div>
        </div>
        <div className="mt-1 text-xs font-mono text-gray-600">/whatsapp/{data.slug}</div>
      </div>

      {feedback ? (
        <div
          role="alert"
          className={
            "rounded-lg border p-3 text-sm flex items-center gap-2 " +
            (feedback.type === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700")
          }
        >
          {feedback.type === "success" ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <span>{feedback.message}</span>
        </div>
      ) : null}

      {/* ── Metadata ── */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h2 className="text-sm font-bold text-primary-dark">פרטי האזור</h2>
          <Input
            label="כותרת"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            dir="rtl"
          />
          <Textarea
            label="תיאור (לא מוצג ללקוחות)"
            value={descDraft}
            onChange={(e) => setDescDraft(e.target.value)}
            dir="rtl"
            rows={2}
          />
          <div className="flex justify-end">
            <Button onClick={saveMeta} loading={savingMeta} disabled={savingMeta}>
              שמירה
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Allowlist ── */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-sm font-bold text-primary-dark">רשימת הרשאות (SSO)</h2>
            <Badge variant="muted">{data.access.length} משתמשים</Badge>
          </div>
          <p className="text-xs text-gray-700 leading-relaxed">
            רק כתובות המופיעות כאן יוכלו להיכנס לאזור הזה. הגישה היא דרך
            Google SSO — המשתמש מתחבר באותה כתובת המייל שצורפה כאן. ADMIN
            רואים את כל האזורים בלי קשר לרשימה.
          </p>

          <div className="flex items-stretch gap-2">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void addEmail();
              }}
              placeholder="user@example.com"
              dir="ltr"
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <Button onClick={addEmail} loading={addingEmail} disabled={addingEmail}>
              <Plus className="h-4 w-4" />
              הוסיפי
            </Button>
          </div>

          {data.access.length === 0 ? (
            <p className="text-sm text-gray-500">אין כתובות ברשימה.</p>
          ) : (
            <ul className="divide-y divide-gray-100 border border-gray-200 rounded-md">
              {data.access.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="font-mono text-sm text-gray-900 truncate" dir="ltr">
                    {a.email}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeEmail(a.email)}
                    className="text-red-500 hover:bg-red-50 p-1 rounded"
                    aria-label="הסרה"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ── Chats ── */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-sm font-bold text-primary-dark">שיחות באזור</h2>
            <Badge variant="muted">
              <MessageCircle className="h-3 w-3 me-1" />
              {data.chats.length}
            </Badge>
          </div>

          <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-4">
            <p className="text-xs text-gray-700 leading-relaxed mb-2">
              העלי קובץ <code className="font-mono">ZIP</code> שיצוּא ישירות מתוך
              ווטסאפ (&quot;ייצוא צ׳אט&quot; → &quot;צרף מדיה&quot;). כל ZIP נחשב לאיש קשר בפני
              עצמו. מקסימום 300MB.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip,application/zip"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadZip(f);
              }}
              disabled={uploading}
              className="block w-full text-sm"
            />
            {uploading ? (
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-700">
                <Loader2 className="h-3 w-3 animate-spin" />
                מעלה ומפענח… (יכול לקחת דקה לקבצים גדולים)
              </div>
            ) : null}
          </div>

          {data.chats.length === 0 ? (
            <p className="text-sm text-gray-500">לא הועלו עדיין שיחות.</p>
          ) : (
            <ul className="divide-y divide-gray-100 border border-gray-200 rounded-md">
              {data.chats.map((c) => (
                <li key={c.id} className="px-3 py-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">
                        {c.contactName}
                      </div>
                      <div className="text-xs text-gray-600 flex items-center gap-2 flex-wrap">
                        <FileArchive className="h-3 w-3" aria-hidden="true" />
                        <span className="truncate" dir="ltr">{c.zipFilename}</span>
                        <span>·</span>
                        <span>{c.messageCount} הודעות</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => renameChat(c.id, c.contactName)}
                        className="text-gray-500 hover:bg-gray-100 hover:text-gray-700 p-1 rounded"
                        aria-label={`שינוי שם איש קשר: ${c.contactName}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteChat(c.id, c.contactName)}
                        className="text-red-500 hover:bg-red-50 p-1 rounded"
                        aria-label="מחיקת שיחה"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Per-chat "self sender" picker. WhatsApp exports use the
                      raw sender string (phone number / display name) on every
                      line; only ONE of those values is "me" and should render
                      green/outgoing. The admin chooses which from the distinct
                      senders observed in this chat. */}
                  {c.senders && c.senders.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-2 rounded-md bg-muted-bg/40 px-2 py-1.5">
                      <label
                        htmlFor={`self-sender-${c.id}`}
                        className="text-[11px] font-semibold text-gray-700"
                      >
                        בועות ירוקות (אני):
                      </label>
                      <select
                        id={`self-sender-${c.id}`}
                        value={c.selfSender ?? ""}
                        onChange={(e) => setSelfSender(c.id, e.target.value)}
                        className="text-xs rounded border border-gray-300 bg-white px-2 py-1 max-w-full"
                        dir="auto"
                      >
                        <option value="">— לא הוגדר —</option>
                        {c.senders.map((s) => (
                          <option key={s.sender} value={s.sender}>
                            {s.sender} ({s.count})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
