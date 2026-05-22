"use client";

// Admin listing for timeline projects. Mirrors /admin/whatsapp.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  Calendar,
  Users,
  Copy,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ProjectRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { layers: number; access: number };
}

export default function AdminTimelineListPage() {
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [creating, setCreating] = useState(false);
  const [newSlug, setNewSlug] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/timeline/projects", { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      const json = (await res.json()) as { projects: ProjectRow[] };
      setRows(json.projects);
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
      const res = await fetch("/api/timeline/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: newSlug.trim(), title: newTitle.trim() }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
      setFeedback({ type: "success", message: "פרויקט נוצר" });
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

  const handleDelete = async (row: ProjectRow) => {
    const ok = window.confirm(
      `למחוק את "${row.title}" וכל ${row._count.layers} השכבות שלו? פעולה זו לא הפיכה.`,
    );
    if (!ok) return;
    try {
      const res = await fetch(`/api/timeline/projects/${row.id}`, {
        method: "DELETE",
      });
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
      await navigator.clipboard.writeText(`${window.location.origin}/timeline/${slug}`);
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
        <h1 className="text-2xl font-bold text-primary-dark">ציר זמן — פרויקטים</h1>
        {!creating ? (
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            פרויקט חדש
          </Button>
        ) : null}
      </div>

      <p className="text-sm text-gray-700 leading-relaxed">
        כל פרויקט הוא דף נסתר תחת{" "}
        <code className="font-mono bg-gray-100 px-1 rounded">/timeline/&lt;slug&gt;</code>{" "}
        שגישה אליו מותרת רק לרשימת הדוא״ל שתגדירו ולכם (ADMIN). פרויקט מכיל
        מספר שכבות, וכל שכבה מכילה אירועים (פעולות, חיפושים, שיחות,
        פגישות, הערות) על ציר הזמן.
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
                label='slug — מופיע ב-URL ("/timeline/<slug>")'
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                dir="ltr"
                placeholder="case-2026-05"
              />
              <Input
                label="כותרת"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                dir="rtl"
                placeholder="תיק חקירה 2026-05"
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
          טרם נוצרו פרויקטי ציר זמן. לחצי על &quot;פרויקט חדש&quot; כדי להתחיל.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <Card key={r.id} className="h-full">
              <CardContent className="p-4 flex flex-col gap-3 h-full">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/admin/timeline/${r.id}`}
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
                    <Calendar className="h-3 w-3 me-1" />
                    {r._count.layers}
                  </Badge>
                  <Badge variant="muted">
                    <Users className="h-3 w-3 me-1" />
                    {r._count.access}
                  </Badge>
                </div>
                <code className="text-xs font-mono text-gray-600 truncate">
                  /timeline/{r.slug}
                </code>
                <div className="mt-auto flex items-center gap-2">
                  <Link
                    href={`/admin/timeline/${r.id}`}
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-transparent px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted-bg/60"
                  >
                    נהלי
                  </Link>
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
