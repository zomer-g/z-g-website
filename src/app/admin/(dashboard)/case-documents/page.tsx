"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  FileText,
  Gavel,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/* ─── Types ─── */

type Category = "letter" | "ruling";

interface CaseDocumentItem {
  id: string;
  caseTag: string;
  category: string;
  title: string;
  description: string | null;
  docDate: string | null;
  citation: string | null;
  authority: string | null;
  fileUrl: string | null;
  sourceUrl: string | null;
  order: number;
  isActive: boolean;
}

interface FormState {
  caseTag: string;
  category: Category;
  title: string;
  description: string;
  docDate: string;
  citation: string;
  authority: string;
  fileUrl: string;
  sourceUrl: string;
  order: number;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  caseTag: "",
  category: "letter",
  title: "",
  description: "",
  docDate: "",
  citation: "",
  authority: "",
  fileUrl: "",
  sourceUrl: "",
  order: 0,
  isActive: true,
};

const CATEGORIES: {
  value: Category;
  label: string;
  icon: React.ElementType;
  citationLabel: string;
  authorityLabel: string;
}[] = [
  {
    value: "letter",
    label: "מסמך בתיק",
    icon: FileText,
    citationLabel: "מאת → אל",
    authorityLabel: "גורם שולח",
  },
  {
    value: "ruling",
    label: "פסיקה",
    icon: Gavel,
    citationLabel: "מספר ההליך",
    authorityLabel: "הערכאה",
  },
];

function categoryMeta(value: string) {
  return CATEGORIES.find((c) => c.value === value) ?? CATEGORIES[0];
}

/* ─── Page ─── */

export default function AdminCaseDocumentsPage() {
  const [items, setItems] = useState<CaseDocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Fetch ── */

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/case-documents");
      if (!res.ok) throw new Error("שגיאה בטעינת מסמכי התיקים");
      setItems(await res.json());
    } catch (err) {
      setFeedback({
        type: "error",
        message:
          err instanceof Error ? err.message : "שגיאה בטעינת מסמכי התיקים",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  /* ── PDF upload ── */

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const data = new FormData();
      data.append("file", file);
      data.append("alt", form.title || file.name);

      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: data,
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error ?? "שגיאה בהעלאת הקובץ");

      setForm((prev) => ({ ...prev, fileUrl: payload.url }));
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "שגיאה בהעלאת הקובץ",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  /* ── Form open/close ── */

  function openNewForm() {
    setEditingId(null);
    // A new document lands at the end of its case, and inherits the case tag of
    // whatever is already on screen so adding a second document is one field.
    setForm({
      ...EMPTY_FORM,
      caseTag: items[0]?.caseTag ?? "",
      order: items.length > 0 ? Math.max(...items.map((i) => i.order)) + 1 : 0,
    });
    setShowForm(true);
  }

  function openEditForm(item: CaseDocumentItem) {
    setEditingId(item.id);
    setForm({
      caseTag: item.caseTag,
      category: item.category === "ruling" ? "ruling" : "letter",
      title: item.title,
      description: item.description ?? "",
      docDate: item.docDate ?? "",
      citation: item.citation ?? "",
      authority: item.authority ?? "",
      fileUrl: item.fileUrl ?? "",
      sourceUrl: item.sourceUrl ?? "",
      order: item.order,
      isActive: item.isActive,
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  /* ── Save ── */

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch(
        editingId ? `/api/case-documents/${editingId}` : "/api/case-documents",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error ?? "שגיאה בשמירת המסמך");

      await fetchItems();
      closeForm();
      setFeedback({
        type: "success",
        message: editingId ? "המסמך עודכן בהצלחה" : "המסמך נוסף בהצלחה",
      });
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "שגיאה בשמירת המסמך",
      });
    } finally {
      setSaving(false);
    }
  }

  /* ── Delete ── */

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/case-documents/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("שגיאה במחיקת המסמך");
      setItems((prev) => prev.filter((i) => i.id !== id));
      setFeedback({ type: "success", message: "המסמך נמחק בהצלחה" });
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "שגיאה במחיקת המסמך",
      });
    } finally {
      setDeleteConfirm(null);
    }
  }

  /* ── Group by case, then category ── */

  const caseTags = Array.from(new Set(items.map((i) => i.caseTag))).sort();

  const activeMeta = categoryMeta(form.category);

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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">מסמכי תיקים</h1>
          <p className="mt-1 text-sm text-muted">
            המסמכים והפסיקה שמוצגים בתחתית פוסט שמקושר לתיק. פוסט מציג את
            המסמכים של מזהה התיק שהוגדר לו בעורך הפוסט.
          </p>
        </div>
        {!showForm && (
          <Button onClick={openNewForm}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            מסמך חדש
          </Button>
        )}
      </div>

      {/* ── Feedback ── */}
      {feedback && (
        <div
          role="status"
          className={cn(
            "flex items-center gap-2 rounded-lg border p-4 text-sm",
            feedback.type === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700",
          )}
        >
          {feedback.type === "success" ? (
            <CheckCircle className="h-4 w-4" aria-hidden="true" />
          ) : (
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
          )}
          {feedback.message}
        </div>
      )}

      {/* ── Form ── */}
      {showForm && (
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">
                {editingId ? "עריכת מסמך" : "מסמך חדש"}
              </h2>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg p-1.5 text-muted hover:bg-gray-100"
                aria-label="סגירת הטופס"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="מזהה תיק"
                  value={form.caseTag}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, caseTag: e.target.value }))
                  }
                  placeholder="better-rail"
                  dir="ltr"
                  required
                  helperText="חייב להיות זהה למזהה שהוגדר בעורך הפוסט."
                />

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="case-doc-category"
                    className="text-sm font-semibold text-foreground"
                  >
                    סוג
                  </label>
                  <select
                    id="case-doc-category"
                    value={form.category}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        category: e.target.value as Category,
                      }))
                    }
                    className="rounded-lg border border-border bg-background px-4 py-2.5 text-foreground transition-colors hover:border-primary/40"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <Input
                label="כותרת"
                value={form.title}
                onChange={(e) =>
                  setForm((p) => ({ ...p, title: e.target.value }))
                }
                required
              />

              <Textarea
                label="תיאור (אופציונלי)"
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
                rows={3}
              />

              <div className="grid gap-4 sm:grid-cols-3">
                <Input
                  label={`${activeMeta.citationLabel} (אופציונלי)`}
                  value={form.citation}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, citation: e.target.value }))
                  }
                />
                <Input
                  label={`${activeMeta.authorityLabel} (אופציונלי)`}
                  value={form.authority}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, authority: e.target.value }))
                  }
                />
                <Input
                  label="תאריך (אופציונלי)"
                  value={form.docDate}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, docDate: e.target.value }))
                  }
                  placeholder="9.8.2026"
                />
              </div>

              {/* File */}
              <div className="space-y-2 rounded-lg border border-border bg-gray-50/50 p-4">
                <span className="block text-sm font-semibold text-foreground">
                  קובץ PDF
                </span>
                {form.fileUrl ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <a
                      href={form.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-primary underline"
                      dir="ltr"
                    >
                      {form.fileUrl}
                      <span className="sr-only"> (נפתח בלשונית חדשה)</span>
                    </a>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setForm((p) => ({ ...p, fileUrl: "" }))}
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                      הסרה
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf"
                      onChange={handleUpload}
                      className="hidden"
                      id="case-doc-file"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {uploading ? (
                        <Loader2
                          className="h-4 w-4 animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <Upload className="h-4 w-4" aria-hidden="true" />
                      )}
                      העלאת PDF
                    </Button>
                    <span className="text-xs text-muted">עד 10MB</span>
                  </div>
                )}

                <Input
                  label="קישור למקור חיצוני (אופציונלי)"
                  value={form.sourceUrl}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, sourceUrl: e.target.value }))
                  }
                  placeholder="https://..."
                  dir="ltr"
                  helperText="משמש כשאין קובץ מקומי — למשל קישור לפסק הדין באתר בתי המשפט."
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="סדר תצוגה"
                  type="number"
                  value={form.order}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      order: parseInt(e.target.value, 10) || 0,
                    }))
                  }
                  dir="ltr"
                />

                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-foreground">
                    מצב
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((p) => ({ ...p, isActive: !p.isActive }))
                    }
                    aria-pressed={form.isActive}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
                      form.isActive
                        ? "border-green-300 bg-green-50 text-green-700"
                        : "border-gray-300 bg-gray-50 text-gray-500",
                    )}
                  >
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        form.isActive ? "bg-green-500" : "bg-gray-400",
                      )}
                      aria-hidden="true"
                    />
                    {form.isActive ? "מוצג באתר" : "מוסתר"}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 border-t border-border pt-4">
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <Save className="h-4 w-4" aria-hidden="true" />
                  )}
                  שמירה
                </Button>
                <Button type="button" variant="ghost" onClick={closeForm}>
                  ביטול
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── List ── */}
      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText
              className="mx-auto mb-3 h-10 w-10 text-muted"
              aria-hidden="true"
            />
            <p className="text-muted">עדיין אין מסמכי תיקים.</p>
          </CardContent>
        </Card>
      ) : (
        caseTags.map((tag) => (
          <section key={tag} className="space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
              <span dir="ltr">{tag}</span>
              <Badge variant="outline">
                {items.filter((i) => i.caseTag === tag).length}
              </Badge>
            </h2>

            {CATEGORIES.map((cat) => {
              const rows = items
                .filter((i) => i.caseTag === tag && i.category === cat.value)
                .sort((a, b) => a.order - b.order);
              if (rows.length === 0) return null;
              const Icon = cat.icon;

              return (
                <div key={cat.value} className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted">
                    {cat.label}
                  </h3>
                  {rows.map((item) => (
                    <Card key={item.id}>
                      <CardContent className="flex flex-wrap items-start gap-4 p-4">
                        <Icon
                          className="mt-1 h-5 w-5 shrink-0 text-primary"
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-foreground">
                              {item.title}
                            </span>
                            {!item.isActive && (
                              <Badge variant="muted">מוסתר</Badge>
                            )}
                            {!item.fileUrl && !item.sourceUrl && (
                              <Badge variant="error">ללא קובץ</Badge>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-muted">
                            {[item.citation, item.authority, item.docDate]
                              .filter(Boolean)
                              .join(" · ") || "—"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {deleteConfirm === item.id ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleDelete(item.id)}
                                className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-600"
                              >
                                אישור מחיקה
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirm(null)}
                                className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-gray-100"
                              >
                                ביטול
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => openEditForm(item)}
                                className="rounded-lg p-2 text-muted hover:bg-gray-100 hover:text-primary"
                                aria-label={`עריכת ${item.title}`}
                              >
                                <Pencil className="h-4 w-4" aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirm(item.id)}
                                className="rounded-lg p-2 text-muted hover:bg-red-50 hover:text-red-600"
                                aria-label={`מחיקת ${item.title}`}
                              >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                              </button>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              );
            })}
          </section>
        ))
      )}
    </div>
  );
}
