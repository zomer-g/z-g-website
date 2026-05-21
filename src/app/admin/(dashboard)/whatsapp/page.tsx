"use client";

// Admin listing for WhatsApp workspaces. Top-level admin destination
// — pressed via the sidebar entry "ווטסאפ". From here the admin can:
//   - create a new workspace (slug + title)
//   - open an existing workspace to manage its allowlist + chats
//   - delete a workspace (cascades to all its chats + media)

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  MessageCircle,
  Users,
  Copy,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface WorkspaceRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { chats: number; access: number };
}

export default function AdminWhatsappListPage() {
  const [rows, setRows] = useState<WorkspaceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [creating, setCreating] = useState(false);
  const [newSlug, setNewSlug] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/whatsapp/workspaces", { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      const json = (await res.json()) as { workspaces: WorkspaceRow[] };
      setRows(json.workspaces);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בטעינה");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleCreate = async () => {
    if (!newSlug.trim() || !newTitle.trim()) {
      setFeedback({ type: "error", message: "יש למלא slug וכותרת" });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/whatsapp/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: newSlug.trim(), title: newTitle.trim() }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
      setFeedback({ type: "success", message: "אזור עבודה נוצר" });
      setNewSlug("");
      setNewTitle("");
      setCreating(false);
      await refresh();
    } catch (err) {
      setFeedback({ type: "error", message: err instanceof Error ? err.message : "שגיאה" });
    } finally {
      setSubmitting(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const handleDelete = async (row: WorkspaceRow) => {
    const ok = window.confirm(
      `למחוק את "${row.title}" וכל ${row._count.chats} השיחות שלו? פעולה זו לא הפיכה.`,
    );
    if (!ok) return;
    try {
      const res = await fetch(`/api/whatsapp/workspaces/${row.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      setFeedback({ type: "success", message: "נמחק" });
      await refresh();
    } catch (err) {
      setFeedback({ type: "error", message: err instanceof Error ? err.message : "שגיאה" });
    } finally {
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const copyShareUrl = async (slug: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/whatsapp/${slug}`);
      setFeedback({ type: "success", message: "הקישור הועתק" });
    } catch {
      setFeedback({ type: "error", message: "ההעתקה נכשלה" });
    } finally {
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-primary-dark">אזורי עבודה — ווטסאפ</h1>
        {!creating ? (
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            אזור חדש
          </Button>
        ) : null}
      </div>

      <p className="text-sm text-gray-700 leading-relaxed">
        כל אזור עבודה הוא דף נסתר תחת <code className="font-mono bg-gray-100 px-1 rounded">/whatsapp/&lt;slug&gt;</code>{" "}
        שגישה אליו מותרת רק לרשימת הדוא״ל שתגדירו כאן ולכם (ADMIN). אזור הוא
        קונטיינר לכמה ZIPים של שיחות ווטסאפ.
      </p>

      {feedback ? (
        <div
          className={
            "rounded-lg border p-3 text-sm flex items-center gap-2 " +
            (feedback.type === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700")
          }
          role="alert"
        >
          {feedback.type === "success" ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <span>{feedback.message}</span>
        </div>
      ) : null}

      {creating ? (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <Input
                label='slug — מופיע ב-URL ("/whatsapp/<slug>")'
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                dir="ltr"
                placeholder="client-a"
              />
              <Input
                label="כותרת"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                dir="rtl"
                placeholder="לקוח א'"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                className="border border-border"
                onClick={() => setCreating(false)}
                disabled={submitting}
              >
                ביטול
              </Button>
              <Button onClick={handleCreate} loading={submitting} disabled={submitting}>
                <Plus className="h-4 w-4" />
                צרי
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-gray-700">
          טרם נוצרו אזורי עבודה. לחצי על &quot;אזור חדש&quot; כדי להתחיל.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <Card key={r.id} className="h-full">
              <CardContent className="p-4 flex flex-col gap-3 h-full">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/admin/whatsapp/${r.id}`}
                    className="text-base font-bold text-primary-dark hover:underline truncate"
                  >
                    {r.title}
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(r)}
                    className="text-red-500 hover:bg-red-50 p-1 rounded"
                    aria-label="מחיקה"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="muted">
                    <MessageCircle className="h-3 w-3 me-1" />
                    {r._count.chats}
                  </Badge>
                  <Badge variant="muted">
                    <Users className="h-3 w-3 me-1" />
                    {r._count.access}
                  </Badge>
                </div>
                <code className="text-xs font-mono text-gray-600 truncate">/whatsapp/{r.slug}</code>
                <div className="mt-auto flex items-center gap-2">
                  <Button asChild variant="ghost" size="sm" className="border border-border">
                    <Link href={`/admin/whatsapp/${r.id}`}>נהלי</Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="border border-border"
                    onClick={() => copyShareUrl(r.slug)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    העתקת קישור
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
