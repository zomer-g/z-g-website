"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import dynamic from "next/dynamic";
const Editor = dynamic(() => import("@/components/admin/editor").then(m => m.Editor), { ssr: false });
import SitePreview from "@/components/admin/site-preview";
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
  Briefcase,
} from "lucide-react";

/* ─── Types ─── */

interface ServiceItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  content: Record<string, unknown> | null;
  icon: string | null;
  order: number;
  isActive: boolean;
  seoTitle?: string | null;
  seoDesc?: string | null;
}

interface ServiceForm {
  title: string;
  slug: string;
  description: string;
  content: Record<string, unknown> | null;
  icon: string;
  order: number;
  isActive: boolean;
}

const EMPTY_FORM: ServiceForm = {
  title: "",
  slug: "",
  description: "",
  content: null,
  icon: "",
  order: 0,
  isActive: true,
};

/* ─── Services Management Page ─── */

export default function AdminServicesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted" /></div>}>
      <AdminServicesContent />
    </Suspense>
  );
}

function AdminServicesContent() {
  const searchParams = useSearchParams();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  /* ── Form State ── */
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceForm>(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  /* ── Fetch Services ── */

  const fetchServices = useCallback(async () => {
    try {
      const res = await fetch("/api/services");
      if (!res.ok) throw new Error("שגיאה בטעינת תחומי העיסוק");
      const data = await res.json();
      setServices(data);
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "שגיאה בטעינת תחומי העיסוק",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  /* ── Auto-open service from ?edit=slug ── */

  useEffect(() => {
    const editSlug = searchParams.get("edit");
    if (editSlug && services.length > 0 && !editingId) {
      const service = services.find((s) => s.slug === editSlug);
      if (service) {
        openEditForm(service);
      }
    }
  }, [searchParams, services]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Auto-generate slug from title ── */

  const handleTitleChange = (title: string) => {
    setForm((prev) => ({
      ...prev,
      title,
      slug:
        editingId !== null
          ? prev.slug
          : title
              .toLowerCase()
              .replace(/[^\w\s\u0590-\u05FF-]/g, "")
              .replace(/[\s]+/g, "-")
              .replace(/^-+|-+$/g, ""),
    }));
  };

  /* ── Open new form ── */

  const openNewForm = () => {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      order: services.length > 0 ? Math.max(...services.map((s) => s.order)) + 1 : 0,
    });
    setShowForm(true);
    setFeedback(null);
  };

  /* ── Open edit form ── */

  const openEditForm = (service: ServiceItem) => {
    setEditingId(service.id);
    setForm({
      title: service.title,
      slug: service.slug,
      description: service.description,
      content: service.content ? JSON.parse(JSON.stringify(service.content)) : null,
      icon: service.icon || "",
      order: service.order,
      isActive: service.isActive,
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

  /* ── Handle editor change ── */

  const handleEditorChange = useCallback((json: Record<string, unknown>) => {
    setForm((prev) => ({ ...prev, content: json }));
  }, []);

  /* ── Save (Create / Update) ── */

  const handleSave = async () => {
    if (!form.title.trim() || !form.slug.trim() || !form.description.trim()) {
      setFeedback({ type: "error", message: "כותרת, slug ותיאור הם שדות חובה" });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const url = editingId ? `/api/services/${editingId}` : "/api/services";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          slug: form.slug,
          description: form.description,
          content: form.content,
          icon: form.icon || undefined,
          order: form.order,
          isActive: form.isActive,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "שגיאה בשמירת תחום העיסוק");
      }

      setFeedback({
        type: "success",
        message: editingId ? "תחום העיסוק עודכן בהצלחה" : "תחום העיסוק נוצר בהצלחה",
      });

      setRefreshKey((k) => k + 1);
      closeForm();
      await fetchServices();

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

  /* ── Toggle Active Status ── */

  const toggleActive = async (service: ServiceItem) => {
    try {
      const res = await fetch(`/api/services/${service.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !service.isActive }),
      });

      if (!res.ok) throw new Error("שגיאה בעדכון הסטטוס");

      setServices((prev) =>
        prev.map((s) =>
          s.id === service.id ? { ...s, isActive: !s.isActive } : s,
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
      const res = await fetch(`/api/services/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("שגיאה במחיקת תחום העיסוק");

      setDeleteConfirm(null);
      setFeedback({ type: "success", message: "תחום העיסוק נמחק בהצלחה" });
      await fetchServices();

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

  /* ── Preview URL: show detail page when editing existing, listing otherwise ── */
  const previewUrl = showForm && editingId && form.slug
    ? `/services/${form.slug}`
    : "/services";

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-primary-dark">ניהול תחומי עיסוק</h1>

        {!showForm && (
          <Button onClick={openNewForm}>
            <Plus size={16} />
            הוסף תחום
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

      {/* ── Side-by-Side Layout (preview always visible on xl) ── */}
      <div className="flex gap-4 min-h-[calc(100vh-220px)]">
        {/* Preview (Left - 60%) */}
        <div className="hidden xl:block xl:w-[60%] shrink-0">
          <div className="sticky top-20">
            <SitePreview
              url={previewUrl}
              refreshKey={refreshKey}
            />
          </div>
        </div>

        {/* Content (Right - 40%) */}
        <div className="flex-1 min-w-0">
          {showForm ? (
            /* ── Create / Edit Form ── */
            <Card>
              <CardContent className="space-y-5 p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">
                    {editingId ? "עריכת תחום עיסוק" : "הוספת תחום עיסוק חדש"}
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

                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="כותרת"
                    value={form.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="דיני עבודה"
                    required
                    dir="rtl"
                  />

                  <Input
                    label="Slug (כתובת URL)"
                    value={form.slug}
                    onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                    placeholder="labor-law"
                    required
                    dir="ltr"
                  />
                </div>

                <Textarea
                  label="תיאור קצר"
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="תיאור קצר של תחום העיסוק..."
                  rows={3}
                  required
                  dir="rtl"
                />

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">תוכן מפורט</label>
                  <Editor key={editingId ?? "new"} initialContent={form.content ?? undefined} onChange={handleEditorChange} />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <Input
                    label="אייקון (שם lucide)"
                    value={form.icon}
                    onChange={(e) => setForm((prev) => ({ ...prev, icon: e.target.value }))}
                    placeholder="scale"
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
          ) : (
            /* ── Services List ── */
            <>
              {services.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Briefcase className="mx-auto mb-3 h-10 w-10 text-muted" />
                    <p className="text-muted">אין תחומי עיסוק עדיין</p>
                    <Button onClick={openNewForm} variant="ghost" className="mt-4">
                      <Plus size={16} />
                      הוסף תחום ראשון
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {services.map((service) => (
                    <Card key={service.id}>
                      <CardContent className="flex items-center justify-between gap-4 p-4">
                        {/* ── Info ── */}
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          <div className="flex items-center gap-2 shrink-0 text-muted">
                            <GripVertical size={16} />
                            <span className="text-xs font-medium tabular-nums w-6 text-center">
                              {service.order}
                            </span>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="truncate font-semibold text-foreground">
                                {service.title}
                              </h3>
                              <Badge variant={service.isActive ? "success" : "muted"}>
                                {service.isActive ? "פעיל" : "לא פעיל"}
                              </Badge>
                            </div>
                            <p className="truncate text-sm text-muted">
                              /{service.slug}
                            </p>
                          </div>
                        </div>

                        {/* ── Actions ── */}
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Toggle Active */}
                          <button
                            type="button"
                            onClick={() => toggleActive(service)}
                            className={cn(
                              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                              service.isActive ? "bg-green-500" : "bg-gray-300",
                            )}
                            role="switch"
                            aria-checked={service.isActive}
                            aria-label={service.isActive ? "כבה" : "הפעל"}
                          >
                            <span
                              className={cn(
                                "inline-block h-4 w-4 rounded-full bg-white transition-transform shadow-sm",
                                service.isActive ? "-translate-x-5" : "-translate-x-1",
                              )}
                            />
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => openEditForm(service)}
                            className="rounded-lg p-2 text-muted hover:bg-gray-100 hover:text-foreground transition-colors"
                            aria-label="ערוך"
                          >
                            <Pencil size={16} />
                          </button>

                          {/* Delete */}
                          {deleteConfirm === service.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleDelete(service.id)}
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
                              onClick={() => setDeleteConfirm(service.id)}
                              className="rounded-lg p-2 text-muted hover:bg-red-50 hover:text-red-500 transition-colors"
                              aria-label="מחק"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
