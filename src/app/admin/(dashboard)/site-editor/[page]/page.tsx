"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SitePreview from "@/components/admin/site-preview";
import { HomeEditors } from "@/components/admin/section-editors/home-editors";
import { AboutEditors } from "@/components/admin/section-editors/about-editors";
import { ContactEditors } from "@/components/admin/section-editors/contact-editors";
import { HeaderEditor } from "@/components/admin/section-editors/header-editor";
import { FooterEditor } from "@/components/admin/section-editors/footer-editor";
import { ServicesEditors } from "@/components/admin/section-editors/services-editors";
import { ArticlesEditors } from "@/components/admin/section-editors/articles-editors";
import { MediaEditors } from "@/components/admin/section-editors/media-editors";
import { ArticleDetailEditors } from "@/components/admin/section-editors/article-detail-editors";
import { ServiceDetailEditors } from "@/components/admin/section-editors/service-detail-editors";
import { ProjectsEditors } from "@/components/admin/section-editors/projects-editors";
import { DigitalServicesEditors } from "@/components/admin/section-editors/digital-services-editors";
import { DashboardPageEditor } from "@/components/admin/section-editors/dashboard-page-editor";
import {
  ArrowRight,
  Loader2,
  Save,
  Upload,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

import type { HomePageContent, AboutPageContent, ContactPageContent, HeaderContent, FooterContent, ServicesPageContent, ArticlesPageContent, MediaPageContent, ArticleDetailContent, ServiceDetailContent, ProjectsPageContent, DigitalServicesPageContent, SanegoriaPageContent, ClassActionsPageContent } from "@/types/content";

/* ─── Page Labels ─── */

const PAGE_LABELS: Record<string, string> = {
  home: "דף הבית",
  about: "אודות",
  contact: "צור קשר",
  header: "כותרת עליונה",
  footer: "כותרת תחתונה",
  services: "תחומי עיסוק",
  articles: "מאמרים",
  media: "מדיה",
  "article-detail": "עמוד מאמר (תבנית)",
  "service-detail": "עמוד שירות (תבנית)",
  projects: "מיזמים",
  "digital-services": "שירותים דיגיטליים",
  sanegoria: "דשבורד סניגוריה",
  "class-actions": "דשבורד תובענות ייצוגיות",
};

const PAGE_URLS: Record<string, string> = {
  home: "/",
  about: "/about",
  contact: "/contact",
  header: "/",
  footer: "/",
  services: "/services",
  articles: "/articles",
  media: "/media",
  "article-detail": "/articles",
  "service-detail": "/services",
  projects: "/projects",
  "digital-services": "/digital-services",
  sanegoria: "/sanegoria",
  "class-actions": "/class-actions",
};

/* ─── Page Editor ─── */

export default function SiteEditorPageEditor({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page: slug } = use(params);

  const [content, setContent] = useState<any>(null);
  const [status, setStatus] = useState<string>("DRAFT");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  /* ── Fetch content ── */

  useEffect(() => {
    async function fetchContent() {
      try {
        const res = await fetch(`/api/content/${slug}?draft=true`);
        if (!res.ok) throw new Error("שגיאה בטעינת התוכן");
        const data = await res.json();
        setContent(data.content);
        setStatus(data.status);
      } catch (err) {
        setFeedback({
          type: "error",
          message: err instanceof Error ? err.message : "שגיאה בטעינת התוכן",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchContent();
  }, [slug]);

  /* ── Save Draft ── */

  const handleSaveDraft = useCallback(async () => {
    if (!content) return;
    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/content/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "שגיאה בשמירת הטיוטה");
      }

      setStatus("DRAFT");
      setFeedback({ type: "success", message: "הטיוטה נשמרה בהצלחה" });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "שגיאה בשמירה",
      });
    } finally {
      setSaving(false);
    }
  }, [content, slug]);

  /* ── Publish ── */

  const handlePublish = useCallback(async () => {
    if (!content) return;

    // Save draft first, then publish
    setPublishing(true);
    setFeedback(null);

    try {
      // First save the current content as draft
      const saveRes = await fetch(`/api/content/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!saveRes.ok) throw new Error("שגיאה בשמירת הטיוטה");

      // Then publish
      const pubRes = await fetch(`/api/content/${slug}/publish`, {
        method: "POST",
      });

      if (!pubRes.ok) {
        const data = await pubRes.json();
        throw new Error(data.error || "שגיאה בפרסום");
      }

      setStatus("PUBLISHED");
      setRefreshKey((k) => k + 1);
      setFeedback({ type: "success", message: "התוכן פורסם בהצלחה!" });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "שגיאה בפרסום",
      });
    } finally {
      setPublishing(false);
    }
  }, [content, slug]);

  /* ── Loading ── */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!content) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/site-editor"
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ArrowRight size={16} />
          חזרה לעורך האתר
        </Link>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-700">
          התוכן לא נמצא
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Top Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <Link
            href="/admin/site-editor"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ArrowRight size={16} />
            חזרה לעורך האתר
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-primary-dark">
              {PAGE_LABELS[slug] || slug}
            </h1>
            <Badge variant={status === "PUBLISHED" ? "success" : "muted"}>
              {status === "PUBLISHED" ? "פורסם" : "טיוטה"}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleSaveDraft}
            loading={saving}
            disabled={saving || publishing}
            variant="ghost"
            className="border border-border"
          >
            <Save size={16} />
            שמור טיוטה
          </Button>
          <Button
            onClick={handlePublish}
            loading={publishing}
            disabled={saving || publishing}
          >
            <Upload size={16} />
            פרסם
          </Button>
        </div>
      </div>

      {/* ── Feedback ── */}
      {feedback && (
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg border p-3 text-sm",
            feedback.type === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          )}
          role="alert"
        >
          {feedback.type === "success" ? (
            <CheckCircle size={16} className="shrink-0" />
          ) : (
            <AlertCircle size={16} className="shrink-0" />
          )}
          {feedback.message}
        </div>
      )}

      {/* ── Side-by-Side Layout ── */}
      <div className="flex gap-4 min-h-[calc(100vh-220px)]">
        {/* Preview (Left - 60%) */}
        <div className="hidden xl:block xl:w-[60%] shrink-0">
          <div className="sticky top-20">
            <SitePreview
              url={PAGE_URLS[slug] || "/"}
              refreshKey={refreshKey}
            />
          </div>
        </div>

        {/* Editor (Right - 40%) */}
        <div className="flex-1 min-w-0">
          {slug === "home" && (
            <HomeEditors
              content={content as HomePageContent}
              onChange={setContent}
            />
          )}
          {slug === "about" && (
            <AboutEditors
              content={content as AboutPageContent}
              onChange={setContent}
            />
          )}
          {slug === "contact" && (
            <ContactEditors
              content={content as ContactPageContent}
              onChange={setContent}
            />
          )}
          {slug === "header" && (
            <HeaderEditor
              content={content as HeaderContent}
              onChange={setContent}
            />
          )}
          {slug === "footer" && (
            <FooterEditor
              content={content as FooterContent}
              onChange={setContent}
            />
          )}
          {slug === "services" && (
            <ServicesEditors
              content={content as ServicesPageContent}
              onChange={setContent}
            />
          )}
          {slug === "articles" && (
            <ArticlesEditors
              content={content as ArticlesPageContent}
              onChange={setContent}
            />
          )}
          {slug === "media" && (
            <MediaEditors
              content={content as MediaPageContent}
              onChange={setContent}
            />
          )}
          {slug === "article-detail" && (
            <ArticleDetailEditors
              content={content as ArticleDetailContent}
              onChange={setContent}
            />
          )}
          {slug === "service-detail" && (
            <ServiceDetailEditors
              content={content as ServiceDetailContent}
              onChange={setContent}
            />
          )}
          {slug === "projects" && (
            <ProjectsEditors
              content={content as ProjectsPageContent}
              onChange={setContent}
            />
          )}
          {slug === "digital-services" && (
            <DigitalServicesEditors
              content={content as DigitalServicesPageContent}
              onChange={setContent}
            />
          )}
          {slug === "sanegoria" && (
            <DashboardPageEditor<SanegoriaPageContent>
              content={content as SanegoriaPageContent}
              onChange={setContent}
              showDisclaimer
            />
          )}
          {slug === "class-actions" && (
            <DashboardPageEditor<ClassActionsPageContent>
              content={content as ClassActionsPageContent}
              onChange={setContent}
              cacheControls={{
                refreshEndpoint: "/api/class-actions/refresh",
                ttlField: "cacheTtlMinutes",
                minMinutes: 1,
                maxMinutes: 1440,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
