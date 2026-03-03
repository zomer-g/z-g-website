"use client";

import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Upload,
  Trash2,
  Copy,
  CheckCircle,
  AlertCircle,
  ImageIcon,
  X,
} from "lucide-react";

/* ─── Types ─── */

interface MediaItem {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  alt: string | null;
  createdAt: string;
}

/* ─── Helpers ─── */

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ─── Media Library Page ─── */

export default function AdminMediaPage() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  /* ── Upload form state ── */
  const [altText, setAltText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Fetch media ── */

  const fetchMedia = async () => {
    try {
      const res = await fetch("/api/media");
      if (!res.ok) throw new Error("שגיאה בטעינת המדיה");
      const data = await res.json();
      setMedia(data);
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "שגיאה בטעינת המדיה",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  /* ── Upload ── */

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setFeedback({ type: "error", message: "לא נבחר קובץ להעלאה" });
      return;
    }

    setUploading(true);
    setFeedback(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (altText.trim()) {
        formData.append("alt", altText.trim());
      }

      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "שגיאה בהעלאת הקובץ");
      }

      setFeedback({ type: "success", message: "הקובץ הועלה בהצלחה" });
      setAltText("");
      if (fileInputRef.current) fileInputRef.current.value = "";

      await fetchMedia();

      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "שגיאה בהעלאת הקובץ",
      });
    } finally {
      setUploading(false);
    }
  };

  /* ── Copy URL ── */

  const copyUrl = async (item: MediaItem) => {
    try {
      const fullUrl = `${window.location.origin}${item.url}`;
      await navigator.clipboard.writeText(fullUrl);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setFeedback({ type: "error", message: "שגיאה בהעתקת הקישור" });
    }
  };

  /* ── Delete ── */

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/media/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("שגיאה במחיקת הקובץ");

      setDeleteConfirm(null);
      setFeedback({ type: "success", message: "הקובץ נמחק בהצלחה" });
      setMedia((prev) => prev.filter((m) => m.id !== id));

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
      <h1 className="text-2xl font-bold text-primary-dark">ספריית מדיה</h1>

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

      {/* ── Upload Area ── */}
      <Card>
        <CardContent className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">העלאת קובץ</h2>

          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="mb-1.5 block text-sm font-semibold text-foreground">
                בחירת קובץ
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,application/pdf"
                className={cn(
                  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm",
                  "file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1",
                  "file:text-sm file:font-medium file:text-primary file:cursor-pointer",
                  "hover:border-primary/40 transition-colors",
                )}
              />
            </div>

            <div className="flex-1 min-w-[200px]">
              <Input
                label="טקסט חלופי (alt)"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="תיאור התמונה לנגישות"
                dir="rtl"
              />
            </div>

            <Button
              onClick={handleUpload}
              loading={uploading}
              disabled={uploading}
              className="shrink-0"
            >
              <Upload size={16} />
              העלאה
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Media Grid ── */}
      {media.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ImageIcon className="mx-auto mb-3 h-10 w-10 text-muted" />
            <p className="text-muted">אין קבצים בספריית המדיה</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {media.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              {/* ── Thumbnail ── */}
              <div className="relative aspect-square bg-gray-100">
                {item.mimeType.startsWith("image/") ? (
                  <img
                    src={item.url}
                    alt={item.alt || item.filename}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ImageIcon size={48} className="text-gray-300" />
                  </div>
                )}

                {/* ── Overlay Actions ── */}
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 transition-all hover:bg-black/40 hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => copyUrl(item)}
                    className="rounded-lg bg-white/90 p-2 text-foreground shadow hover:bg-white transition-colors"
                    aria-label="העתק קישור"
                  >
                    {copiedId === item.id ? (
                      <CheckCircle size={18} className="text-green-600" />
                    ) : (
                      <Copy size={18} />
                    )}
                  </button>

                  {deleteConfirm === item.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="rounded-lg bg-red-500 px-3 py-2 text-xs font-medium text-white hover:bg-red-600 transition-colors"
                      >
                        אישור
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirm(null)}
                        className="rounded-lg bg-white/90 p-2 text-foreground shadow hover:bg-white transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm(item.id)}
                      className="rounded-lg bg-white/90 p-2 text-red-500 shadow hover:bg-white transition-colors"
                      aria-label="מחק"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>

              {/* ── File Info ── */}
              <CardContent className="p-3">
                <p className="truncate text-sm font-medium text-foreground" title={item.filename}>
                  {item.filename}
                </p>
                <div className="mt-1 flex items-center justify-between text-xs text-muted">
                  <span>{formatFileSize(item.size)}</span>
                  <span>{formatDate(item.createdAt)}</span>
                </div>
                {item.alt && (
                  <p className="mt-1 truncate text-xs text-muted" title={item.alt}>
                    alt: {item.alt}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
