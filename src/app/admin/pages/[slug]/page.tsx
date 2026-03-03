"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Editor } from "@/components/admin/editor";
import { ArrowRight, Loader2, Save, CheckCircle, AlertCircle } from "lucide-react";

/* ─── Types ─── */

interface PageData {
  id: string;
  slug: string;
  title: string;
  content: Record<string, unknown> | null;
  seoTitle: string | null;
  seoDesc: string | null;
  updatedAt: string;
}

/* ─── Page Label Map ─── */

const PAGE_LABELS: Record<string, string> = {
  home: "עמוד הבית",
  about: "אודות",
  privacy: "מדיניות פרטיות",
  accessibility: "הצהרת נגישות",
};

/* ─── Edit Page Content ─── */

export default function EditPagePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  const [pageData, setPageData] = useState<PageData | null>(null);
  const [content, setContent] = useState<Record<string, unknown> | null>(null);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDesc, setSeoDesc] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  /* ── Fetch page data ── */

  useEffect(() => {
    async function fetchPage() {
      try {
        const res = await fetch("/api/pages");
        if (!res.ok) throw new Error("שגיאה בטעינת הדף");
        const pages: PageData[] = await res.json();
        const found = pages.find((p) => p.slug === slug);

        if (!found) {
          setFeedback({ type: "error", message: "הדף לא נמצא במערכת" });
          setLoading(false);
          return;
        }

        setPageData(found);
        setContent(found.content);
        setSeoTitle(found.seoTitle || "");
        setSeoDesc(found.seoDesc || "");
      } catch (err) {
        setFeedback({
          type: "error",
          message: err instanceof Error ? err.message : "שגיאה בטעינת הדף",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchPage();
  }, [slug]);

  /* ── Handle editor changes ── */

  const handleEditorChange = useCallback((json: Record<string, unknown>) => {
    setContent(json);
  }, []);

  /* ── Save ── */

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/pages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          title: pageData?.title,
          content,
          seoTitle: seoTitle || undefined,
          seoDesc: seoDesc || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "שגיאה בשמירת הדף");
      }

      setFeedback({ type: "success", message: "הדף נשמר בהצלחה" });

      // Clear success message after 3 seconds
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "שגיאה בשמירת הדף",
      });
    } finally {
      setSaving(false);
    }
  };

  /* ── Loading state ── */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  /* ── Page not found ── */

  if (!pageData) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/pages"
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ArrowRight size={16} />
          חזרה לניהול עמודים
        </Link>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-700">
          הדף לא נמצא במערכת
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Back Link & Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/admin/pages"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ArrowRight size={16} />
            חזרה לניהול עמודים
          </Link>
          <h1 className="text-2xl font-bold text-primary-dark">
            עריכת {PAGE_LABELS[slug] || pageData.title}
          </h1>
          <p className="text-sm text-muted">/{slug}</p>
        </div>

        <Button
          onClick={handleSave}
          loading={saving}
          disabled={saving}
          className="shrink-0"
        >
          <Save size={16} />
          שמירה
        </Button>
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

      {/* ── Content Editor ── */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="text-lg font-semibold text-foreground">תוכן הדף</h2>
          <Editor
            initialContent={pageData.content}
            onChange={handleEditorChange}
          />
        </CardContent>
      </Card>

      {/* ── SEO Settings ── */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="text-lg font-semibold text-foreground">הגדרות SEO</h2>

          <Input
            label="כותרת SEO"
            value={seoTitle}
            onChange={(e) => setSeoTitle(e.target.value)}
            placeholder="כותרת לתוצאות חיפוש (אופציונלי)"
            dir="rtl"
          />

          <Textarea
            label="תיאור SEO"
            value={seoDesc}
            onChange={(e) => setSeoDesc(e.target.value)}
            placeholder="תיאור קצר לתוצאות חיפוש (אופציונלי)"
            rows={3}
            dir="rtl"
          />
        </CardContent>
      </Card>

      {/* ── Bottom Save Button ── */}
      <div className="flex justify-start">
        <Button
          onClick={handleSave}
          loading={saving}
          disabled={saving}
        >
          <Save size={16} />
          שמירה
        </Button>
      </div>
    </div>
  );
}
