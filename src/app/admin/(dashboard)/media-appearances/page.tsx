"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  CheckCircle,
  AlertCircle,
  GripVertical,
  Tv,
  Play,
  Newspaper,
  Mic,
} from "lucide-react";

/* ─── Types ─── */

interface MediaAppearanceItem {
  id: string;
  title: string;
  description: string;
  type: string;
  source: string;
  date: string;
  url: string | null;
  order: number;
  isActive: boolean;
}

interface MediaAppearanceForm {
  title: string;
  description: string;
  type: "video" | "article" | "podcast";
  source: string;
  date: string;
  url: string;
  order: number;
  isActive: boolean;
}

const EMPTY_FORM: MediaAppearanceForm = {
  title: "",
  description: "",
  type: "video",
  source: "",
  date: "",
  url: "",
  order: 0,
  isActive: true,
};

const TYPE_OPTIONS = [
  { value: "video", label: "וידאו", icon: Play },
  { value: "article", label: "כתבה", icon: Newspaper },
  { value: "podcast", label: "פודקאסט", icon: Mic },
] as const;

/* ─── Media Appearances Management Page ─── */

export default function AdminMediaAppearancesPage() {
  const [items, setItems] = useState<MediaAppearanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MediaAppearanceForm>(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  /* ── Fetch ── */

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/media-appearances");
      if (!res.ok) throw new Error("שגיאה בטעינת הופעות המדיה");
      const data = await res.json();
      setItems(data);
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "שגיאה בטעינת הופעות המדיה",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  /* ── Open new form ── */

  const openNewForm = () => {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      order: items.length > 0 ? Math.max(...items.map((i) => i.order)) + 1 : 0,
    });
    setShowForm(true);
    setFeedback(null);
  };

  /* ── Open edit form ── */

  const openEditForm = (item: MediaAppearanceItem) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      description: item.description,
      type: item.type as "video" | "article" | "podcast",
      source: item.source,
      date: item.date,
      url: item.url || "",
      order: item.order,
      isActive: item.isActive,
    });
    setShowForm(true);
    setFeedback(null);
  };

  /* ── Close form ── */

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  /* ── Save ── */

  const handleSave = async () => {
    if (!form.title.trim() || !form.description.trim() || !form.source.trim() || !form.date.trim()) {
      setFeedback({ type: "error", message: "כותרת, תיאור, מקור ותאריך הם שדות חובה" });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const url = editingId ? `/api/media-appearances/${editingId}` : "/api/media-appearances";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          type: form.type,
          source: form.source,
          date: form.date,
          url: form.url || undefined,
          order: form.order,
          isActive: form.isActive,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "שגיאה בשמירת הופעת המדיה");
      }

      setFeedback({
        type: "success",
        message: editingId ? "הופעת המדיה עודכנה בהצלחה" : "הופעת המדיה נוצרה בהצלחה",
      });

      closeForm();
      await fetchItems();

      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "שגיאה בשמירה",
      });
    } finally {
      setSaving(false);
    }
  };

  /* ── Toggle Active ── */

  const toggleActive = async (item: MediaAppearanceItem) => {
    try {
      const res = await fetch(`/api/media-appearances/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !item.isActive }),
      });

      if (!res.ok) throw new Error("שגיאה בעדכון הסטטוס");

      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, isActive: !i.isActive } : i,
        ),
      );
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "שגיאה בעדכון הסטטוס",
      });
    }
  };

  /* ── Delete ── */

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/media-appearances/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("שגיאה במחיקת הופעת המדיה");

      setDeleteConfirm(null);
      setFeedback({ type: "success", message: "הופעת המדיה נמחקה בהצלחה" });
      await fetchItems();

      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "שגיאה במחיקה",
      });
    }
  };

  /* ── Loading ── */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-primary-dark">ניהול הופעות מדיה</h1>

        {!showForm && (
          <Button onClick={openNewForm}>
            <Plus size={16} />
            הוסף הופעה
          </Button>
        )}
      </div>

      {/* ── Feedback ── */}
      {feedback && (
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg border p-4 text-sm",
            feedback.type === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700",
          )}
          role="alert"
        >
          {feedback.type === "success" ? (
            <CheckCircle size={18} className="shrink-0" />
          ) : (
            <AlertCircle size={18} className="shrink-0" />
          )}
          {feedback.message}
        </div>
      )}

      {/* ── Create / Edit Form ── */}
      {showForm && (
        <Card>
          <CardContent className="space-y-5 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                {editingId ? "עריכת הופעת מדיה" : "הוספת הופעת מדיה חדשה"}
              </h2>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg p-1 text-muted hover:bg-gray-100 hover:text-foreground"
                aria-label="סגור טופס"
              >
                <X size={20} />
              </button>
            </div>

            <Input
              label="כותרת"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="ראיון בערוץ 12"
              required
              dir="rtl"
            />

            <Textarea
              label="תיאור"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="תיאור קצר של ההופעה..."
              rows={3}
              required
              dir="rtl"
            />

            <div className="grid gap-4 sm:grid-cols-3">
              {/* Type Select */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-foreground">סוג</label>
                <div className="flex gap-2">
                  {TYPE_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, type: opt.value }))}
                        className={cn(
                          "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                          form.type === opt.value
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border text-muted hover:bg-gray-50",
                        )}
                      >
                        <Icon size={14} />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Input
                label="מקור"
                value={form.source}
                onChange={(e) => setForm((prev) => ({ ...prev, source: e.target.value }))}
                placeholder="ערוץ 12"
                required
                dir="rtl"
              />

              <Input
                label="תאריך"
                value={form.date}
                onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                placeholder="ינואר 2025"
                required
                dir="rtl"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="קישור (אופציונלי)"
                value={form.url}
                onChange={(e) => setForm((prev) => ({ ...prev, url: e.target.value }))}
                placeholder="https://..."
                dir="ltr"
              />

              <Input
                label="סדר תצוגה"
                type="number"
                value={form.order}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, order: parseInt(e.target.value, 10) || 0 }))
                }
                dir="ltr"
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-foreground">סטטוס</label>
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, isActive: !prev.isActive }))}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
                    form.isActive
                      ? "border-green-300 bg-green-50 text-green-700"
                      : "border-gray-300 bg-gray-50 text-gray-500",
                  )}
                >
                  <span
                    className={cn(
                      "h-3 w-3 rounded-full",
                      form.isActive ? "bg-green-500" : "bg-gray-400",
                    )}
                  />
                  {form.isActive ? "פעיל" : "לא פעיל"}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 border-t border-border pt-4">
              <Button onClick={handleSave} loading={saving} disabled={saving}>
                <Save size={16} />
                {editingId ? "עדכון" : "יצירה"}
              </Button>
              <Button variant="ghost" onClick={closeForm}>
                ביטול
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Items List ── */}
      {!showForm && (
        <>
          {items.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Tv className="mx-auto mb-3 h-10 w-10 text-muted" />
                <p className="text-muted">אין הופעות מדיה עדיין</p>
                <Button onClick={openNewForm} variant="ghost" className="mt-4">
                  <Plus size={16} />
                  הוסף הופעה ראשונה
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {items.map((item) => {
                const typeOpt = TYPE_OPTIONS.find((t) => t.value === item.type);
                const TypeIcon = typeOpt?.icon ?? Tv;

                return (
                  <Card key={item.id}>
                    <CardContent className="flex items-center justify-between gap-4 p-4">
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className="flex items-center gap-2 shrink-0 text-muted">
                          <GripVertical size={16} />
                          <span className="text-xs font-medium tabular-nums w-6 text-center">
                            {item.order}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <TypeIcon size={16} className="shrink-0 text-primary" />
                            <h3 className="truncate font-semibold text-foreground">
                              {item.title}
                            </h3>
                            <Badge variant={item.isActive ? "success" : "muted"}>
                              {item.isActive ? "פעיל" : "לא פעיל"}
                            </Badge>
                          </div>
                          <p className="truncate text-sm text-muted">
                            {typeOpt?.label} | {item.source} | {item.date}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleActive(item)}
                          className={cn(
                            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                            item.isActive ? "bg-green-500" : "bg-gray-300",
                          )}
                          role="switch"
                          aria-checked={item.isActive}
                          aria-label={item.isActive ? "כבה" : "הפעל"}
                        >
                          <span
                            className={cn(
                              "inline-block h-4 w-4 rounded-full bg-white transition-transform shadow-sm",
                              item.isActive ? "-translate-x-5" : "-translate-x-1",
                            )}
                          />
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditForm(item)}
                          className="rounded-lg p-2 text-muted hover:bg-gray-100 hover:text-foreground transition-colors"
                          aria-label="ערוך"
                        >
                          <Pencil size={16} />
                        </button>

                        {deleteConfirm === item.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id)}
                              className="rounded-lg px-2 py-1 text-xs font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
                            >
                              אישור
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirm(null)}
                              className="rounded-lg px-2 py-1 text-xs font-medium text-muted hover:bg-gray-100 transition-colors"
                            >
                              ביטול
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirm(item.id)}
                            className="rounded-lg p-2 text-muted hover:bg-red-50 hover:text-red-500 transition-colors"
                            aria-label="מחק"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
