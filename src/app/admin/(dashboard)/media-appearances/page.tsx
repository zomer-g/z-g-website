"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
  BookOpen,
  Upload,
} from "lucide-react";

/* ─── Types ─── */

type MediaType = "video" | "article" | "podcast" | "academic";

interface MediaAppearanceItem {
  id: string;
  title: string;
  description: string;
  type: string;
  source: string;
  date: string;
  url: string | null;
  thumbnailUrl: string | null;
  order: number;
  isActive: boolean;
}

interface MediaAppearanceForm {
  title: string;
  description: string;
  type: MediaType;
  source: string;
  date: string;
  url: string;
  thumbnailUrl: string;
  order: number;
  isActive: boolean;
}

const EMPTY_FORM: MediaAppearanceForm = {
  title: "",
  description: "",
  type: "article",
  source: "",
  date: "",
  url: "",
  thumbnailUrl: "",
  order: 0,
  isActive: true,
};

const TYPE_OPTIONS: { value: MediaType; label: string; icon: React.ElementType; tab: "press" | "academic" }[] = [
  { value: "article",  label: "כתבה",          icon: Newspaper, tab: "press"    },
  { value: "video",    label: "וידאו",          icon: Play,      tab: "press"    },
  { value: "podcast",  label: "פודקאסט",        icon: Mic,       tab: "press"    },
  { value: "academic", label: "מחקר / אקדמיה",  icon: BookOpen,  tab: "academic" },
];

function typeIcon(type: string): React.ElementType {
  return TYPE_OPTIONS.find((o) => o.value === type)?.icon ?? Tv;
}
function typeLabel(type: string): string {
  return TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}
function typeTab(type: string): "press" | "academic" {
  return TYPE_OPTIONS.find((o) => o.value === type)?.tab ?? "press";
}

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
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  /* ── Thumbnail Upload ── */

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingThumb(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("alt", form.title || "thumbnail");

      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("שגיאה בהעלאת התמונה");

      const data = await res.json();
      setForm((prev) => ({ ...prev, thumbnailUrl: data.url }));
    } catch {
      setFeedback({ type: "error", message: "שגיאה בהעלאת התמונה" });
    } finally {
      setUploadingThumb(false);
      if (thumbInputRef.current) thumbInputRef.current.value = "";
    }
  };

  /* ── Fetch ── */

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/media-appearances");
      if (!res.ok) throw new Error("שגיאה בטעינת הפרסומים");
      const data = await res.json();
      setItems(data);
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "שגיאה בטעינת הפרסומים",
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
      type: (item.type as MediaType) ?? "article",
      source: item.source,
      date: item.date,
      url: item.url || "",
      thumbnailUrl: item.thumbnailUrl || "",
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
          thumbnailUrl: form.thumbnailUrl || undefined,
          order: form.order,
          isActive: form.isActive,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "שגיאה בשמירת הפרסום");
      }

      setFeedback({
        type: "success",
        message: editingId ? "הפרסום עודכן בהצלחה" : "הפרסום נוצר בהצלחה",
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
      if (!res.ok) throw new Error("שגיאה במחיקת הפרסום");

      setDeleteConfirm(null);
      setFeedback({ type: "success", message: "הפרסום נמחק בהצלחה" });
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

  /* ── Split items for the list view ── */
  const pressItems    = items.filter((i) => typeTab(i.type) === "press");
  const academicItems = items.filter((i) => typeTab(i.type) === "academic");

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary-dark">ניהול פרסומים</h1>
          <p className="mt-0.5 text-sm text-muted">
            {pressItems.length} תקשורת · {academicItems.length} אקדמיה
          </p>
        </div>

        {!showForm && (
          <Button onClick={openNewForm}>
            <Plus size={16} />
            הוסף פרסום
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
                {editingId ? "עריכת פרסום" : "הוספת פרסום חדש"}
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

            {/* ── Type selector (full-width row, 4 options) ── */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-foreground">סוג פרסום</label>
              <div className="flex flex-wrap gap-2">
                {TYPE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isAcademic = opt.tab === "academic";
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, type: opt.value }))}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                        form.type === opt.value
                          ? isAcademic
                            ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                            : "border-primary bg-primary/5 text-primary"
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
              label="כותרת"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder={form.type === "academic" ? "שם המאמר / הספר" : "ראיון בערוץ 12"}
              required
              dir="rtl"
            />

            <div className="flex flex-col gap-1.5">
              <Textarea
                label={form.type === "academic" ? "תיאור (שורה ריקה = הערת שוליים)" : "תיאור"}
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder={
                  form.type === "academic"
                    ? "תיאור המחקר...\n\nהערת שוליים תופיע כאן (שורה ריקה מפרידה)"
                    : "תיאור קצר של הכתבה..."
                }
                rows={form.type === "academic" ? 6 : 3}
                required
                dir="rtl"
              />
              {form.type === "academic" && (
                <p className="text-xs text-muted">
                  שורה ריקה (Enter פעמיים) בתיאור יוצרת הערת שוליים מודגשת בדף הציבורי.
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="מקור"
                value={form.source}
                onChange={(e) => setForm((prev) => ({ ...prev, source: e.target.value }))}
                placeholder={form.type === "academic" ? "שם כתב העת / המוסד" : "ערוץ 12"}
                required
                dir="rtl"
              />

              <Input
                label="תאריך"
                value={form.date}
                onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                placeholder="2025-03-27"
                required
                dir="ltr"
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

            {/* ── Thumbnail Upload (only for non-academic) ── */}
            {form.type !== "academic" && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">
                  תמונה ממוזערת (אופציונלי)
                </label>
                {form.thumbnailUrl ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={form.thumbnailUrl}
                      alt="תצוגה מקדימה"
                      className="h-20 w-32 rounded-lg border border-border object-cover"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setForm((prev) => ({ ...prev, thumbnailUrl: "" }))}
                      className="text-red-500 hover:bg-red-50 hover:text-red-600"
                    >
                      <X size={14} />
                      הסר
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <input
                      ref={thumbInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleThumbnailUpload}
                      className="hidden"
                    />
                    <Button
                      variant="ghost"
                      onClick={() => thumbInputRef.current?.click()}
                      disabled={uploadingThumb}
                      className="border border-dashed border-border"
                    >
                      {uploadingThumb ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Upload size={16} />
                      )}
                      {uploadingThumb ? "מעלה..." : "העלה תמונה"}
                    </Button>
                    <span className="text-xs text-muted">
                      מומלץ: צילום מסך של כותרת הכתבה + לוגו המקור
                    </span>
                  </div>
                )}
              </div>
            )}

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
                <p className="text-muted">אין פרסומים עדיין</p>
                <Button onClick={openNewForm} variant="ghost" className="mt-4">
                  <Plus size={16} />
                  הוסף פרסום ראשון
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* תקשורת group */}
              {pressItems.length > 0 && (
                <div className="space-y-2">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-muted">
                    <Newspaper size={14} />
                    תקשורת
                    <span className="rounded-full bg-muted-bg px-2 py-0.5 text-xs font-medium">
                      {pressItems.length}
                    </span>
                  </h2>
                  <ItemGroup items={pressItems} onEdit={openEditForm} onToggle={toggleActive} onDelete={handleDelete} deleteConfirm={deleteConfirm} setDeleteConfirm={setDeleteConfirm} />
                </div>
              )}

              {/* אקדמיה group */}
              {academicItems.length > 0 && (
                <div className="space-y-2">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-muted">
                    <BookOpen size={14} />
                    אקדמיה
                    <span className="rounded-full bg-muted-bg px-2 py-0.5 text-xs font-medium">
                      {academicItems.length}
                    </span>
                  </h2>
                  <ItemGroup items={academicItems} onEdit={openEditForm} onToggle={toggleActive} onDelete={handleDelete} deleteConfirm={deleteConfirm} setDeleteConfirm={setDeleteConfirm} />
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─── ItemGroup sub-component ─── */

function ItemGroup({
  items,
  onEdit,
  onToggle,
  onDelete,
  deleteConfirm,
  setDeleteConfirm,
}: {
  items: MediaAppearanceItem[];
  onEdit: (item: MediaAppearanceItem) => void;
  onToggle: (item: MediaAppearanceItem) => void;
  onDelete: (id: string) => void;
  deleteConfirm: string | null;
  setDeleteConfirm: (id: string | null) => void;
}) {
  return (
    <div className="grid gap-2">
      {items.map((item) => {
        const TypeIcon = typeIcon(item.type);
        const label = typeLabel(item.type);
        const isAcademic = typeTab(item.type) === "academic";

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
                  <div className="flex flex-wrap items-center gap-2">
                    <TypeIcon
                      size={16}
                      className={cn(
                        "shrink-0",
                        isAcademic ? "text-emerald-600" : "text-primary",
                      )}
                    />
                    <h3 className="truncate font-semibold text-foreground">
                      {item.title}
                    </h3>
                    <Badge
                      variant={isAcademic ? "muted" : "muted"}
                      className={cn(
                        "text-xs",
                        isAcademic
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-blue-200 bg-blue-50 text-blue-700",
                      )}
                    >
                      {label}
                    </Badge>
                    <Badge variant={item.isActive ? "success" : "muted"}>
                      {item.isActive ? "פעיל" : "לא פעיל"}
                    </Badge>
                  </div>
                  <p className="truncate text-sm text-muted mt-0.5">
                    {item.source} | {item.date}
                    {item.url && (
                      <> | <a href={item.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">{item.url.replace(/^https?:\/\//, "").substring(0, 40)}</a></>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => onToggle(item)}
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
                  onClick={() => onEdit(item)}
                  className="rounded-lg p-2 text-muted hover:bg-gray-100 hover:text-foreground transition-colors"
                  aria-label="ערוך"
                >
                  <Pencil size={16} />
                </button>

                {deleteConfirm === item.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onDelete(item.id)}
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
  );
}
