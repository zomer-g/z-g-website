"use client";

import Link from "next/link";
import { Input, Textarea } from "@/components/ui/input";
import { SectionCard } from "./section-card";
import { Sparkles, LayoutGrid, Info, Newspaper, Megaphone, Plus, Trash2, ExternalLink, Code2, Scale, Search } from "lucide-react";
import { AiWriterButton } from "@/components/admin/ai-writer-button";
import type { HomePageContent } from "@/types/content";

interface HomeEditorsProps {
  content: HomePageContent;
  onChange: (content: HomePageContent) => void;
}

export function HomeEditors({ content, onChange }: HomeEditorsProps) {
  const update = <K extends keyof HomePageContent>(
    section: K,
    data: Partial<HomePageContent[K]>
  ) => {
    onChange({
      ...content,
      [section]: { ...content[section], ...data },
    });
  };

  return (
    <div className="space-y-3">
      {/* ── Hero Section ── */}
      <SectionCard title="באנר ראשי (Hero)" icon={Sparkles} defaultOpen>
        <div className="space-y-3">
          <Input
            label="כותרת"
            value={content.hero.title}
            onChange={(e) => update("hero", { title: e.target.value })}
            dir="rtl"
          />
          <Input
            label="כותרת מודגשת (שורה שנייה)"
            value={content.hero.titleAccent}
            onChange={(e) => update("hero", { titleAccent: e.target.value })}
            dir="rtl"
          />
          <div className="relative">
            <Textarea
              label="תיאור"
              value={content.hero.description}
              onChange={(e) => update("hero", { description: e.target.value })}
              rows={3}
              dir="rtl"
            />
            <div className="absolute top-0 left-0">
              <AiWriterButton
                value={content.hero.description}
                onResult={(text) => update("hero", { description: text })}
                fieldLabel="תיאור באנר ראשי"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="טקסט כפתור ראשי"
              value={content.hero.ctaText}
              onChange={(e) => update("hero", { ctaText: e.target.value })}
              dir="rtl"
            />
            <Input
              label="קישור כפתור ראשי"
              value={content.hero.ctaLink}
              onChange={(e) => update("hero", { ctaLink: e.target.value })}
              dir="ltr"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="טקסט כפתור משני"
              value={content.hero.secondaryCtaText}
              onChange={(e) => update("hero", { secondaryCtaText: e.target.value })}
              dir="rtl"
            />
            <Input
              label="קישור כפתור משני"
              value={content.hero.secondaryCtaLink}
              onChange={(e) => update("hero", { secondaryCtaLink: e.target.value })}
              dir="ltr"
            />
          </div>
        </div>
      </SectionCard>

      {/* ── Services Section ── */}
      <SectionCard title="תחומי עיסוק" icon={LayoutGrid}>
        <div className="space-y-3">
          <Input
            label="כותרת הסעיף"
            value={content.services.title}
            onChange={(e) => update("services", { title: e.target.value })}
            dir="rtl"
          />
          <Input
            label="תת-כותרת"
            value={content.services.subtitle}
            onChange={(e) => update("services", { subtitle: e.target.value })}
            dir="rtl"
          />
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-700">
              תחומי העיסוק מנוהלים בעמוד ניהול תחומי העיסוק.
            </p>
            <Link
              href="/admin/services"
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
            >
              <ExternalLink size={14} />
              עבור לניהול תחומי עיסוק
            </Link>
          </div>
        </div>
      </SectionCard>

      {/* ── About Preview ── */}
      <SectionCard title="תצוגה מקדימה - אודות" icon={Info}>
        <div className="space-y-3">
          <Input
            label="כותרת"
            value={content.aboutPreview.title}
            onChange={(e) => update("aboutPreview", { title: e.target.value })}
            dir="rtl"
          />
          {content.aboutPreview.paragraphs.map((p, idx) => (
            <div key={idx} className="flex gap-2">
              <div className="relative flex-1">
                <Textarea
                  label={`פסקה ${idx + 1}`}
                  value={p}
                  onChange={(e) => {
                    const paragraphs = [...content.aboutPreview.paragraphs];
                    paragraphs[idx] = e.target.value;
                    update("aboutPreview", { paragraphs });
                  }}
                  rows={2}
                  dir="rtl"
                />
                <div className="absolute top-0 left-0">
                  <AiWriterButton
                    value={p}
                    onResult={(text) => {
                      const paragraphs = [...content.aboutPreview.paragraphs];
                      paragraphs[idx] = text;
                      update("aboutPreview", { paragraphs });
                    }}
                    fieldLabel="פסקת אודות - תצוגה מקדימה"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const paragraphs = content.aboutPreview.paragraphs.filter((_, i) => i !== idx);
                  update("aboutPreview", { paragraphs });
                }}
                className="mt-6 text-red-400 hover:text-red-600 transition-colors self-start"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              const paragraphs = [...content.aboutPreview.paragraphs, ""];
              update("aboutPreview", { paragraphs });
            }}
            className="flex items-center gap-1.5 text-sm text-primary hover:text-accent transition-colors"
          >
            <Plus size={14} /> הוסף פסקה
          </button>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="טקסט כפתור"
              value={content.aboutPreview.ctaText}
              onChange={(e) => update("aboutPreview", { ctaText: e.target.value })}
              dir="rtl"
            />
            <Input
              label="קישור"
              value={content.aboutPreview.ctaLink}
              onChange={(e) => update("aboutPreview", { ctaLink: e.target.value })}
              dir="ltr"
            />
          </div>
        </div>
      </SectionCard>

      {/* ── Articles Section ── */}
      <SectionCard title="מאמרים ועדכונים" icon={Newspaper}>
        <div className="space-y-3">
          <Input
            label="כותרת הסעיף"
            value={content.articles.title}
            onChange={(e) => update("articles", { title: e.target.value })}
            dir="rtl"
          />
          <Input
            label="תת-כותרת"
            value={content.articles.subtitle}
            onChange={(e) => update("articles", { subtitle: e.target.value })}
            dir="rtl"
          />
          <Input
            label="טקסט כפתור"
            value={content.articles.ctaText}
            onChange={(e) => update("articles", { ctaText: e.target.value })}
            dir="rtl"
          />
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-700">
              המאמרים מנוהלים בעמוד ניהול מאמרים. 3 המאמרים האחרונים שפורסמו יוצגו כאן אוטומטית.
            </p>
            <Link
              href="/admin/posts"
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
            >
              <ExternalLink size={14} />
              עבור לניהול מאמרים
            </Link>
          </div>
        </div>
      </SectionCard>

      {/* ── Projects Preview Section ── */}
      <SectionCard title="מיזמים" icon={Code2}>
        <div className="space-y-3">
          <Input
            label="כותרת הסעיף"
            value={content.projectsPreview?.title ?? ""}
            onChange={(e) => update("projectsPreview", { title: e.target.value })}
            dir="rtl"
          />
          <Input
            label="תת-כותרת"
            value={content.projectsPreview?.subtitle ?? ""}
            onChange={(e) => update("projectsPreview", { subtitle: e.target.value })}
            dir="rtl"
          />
          <Input
            label="טקסט כפתור"
            value={content.projectsPreview?.ctaText ?? ""}
            onChange={(e) => update("projectsPreview", { ctaText: e.target.value })}
            dir="rtl"
          />
          <Input
            label="קישור כפתור"
            value={content.projectsPreview?.ctaLink ?? "/projects"}
            onChange={(e) => update("projectsPreview", { ctaLink: e.target.value })}
            dir="ltr"
          />
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-700">
              המיזמים עצמם מנוהלים בעמוד מיזמים. 3 המיזמים הראשונים יוצגו כאן אוטומטית.
            </p>
            <Link
              href="/admin/site-editor/projects"
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
            >
              <ExternalLink size={14} />
              עבור לניהול מיזמים
            </Link>
          </div>
        </div>
      </SectionCard>

      {/* ── Lawyers Callout Section ── */}
      <SectionCard title="בוקסה לעורכי דין" icon={Scale}>
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <input
              type="checkbox"
              checked={content.lawyersCallout?.enabled ?? true}
              onChange={(e) => update("lawyersCallout", { enabled: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            הצג את הבוקסה בדף הבית
          </label>
          <Input
            label="תווית עליונה (eyebrow)"
            value={content.lawyersCallout?.eyebrow ?? ""}
            onChange={(e) => update("lawyersCallout", { eyebrow: e.target.value })}
            dir="rtl"
          />
          <Input
            label="כותרת"
            value={content.lawyersCallout?.title ?? ""}
            onChange={(e) => update("lawyersCallout", { title: e.target.value })}
            dir="rtl"
          />
          {(content.lawyersCallout?.paragraphs ?? []).map((p, idx) => (
            <div key={idx} className="flex gap-2">
              <div className="relative flex-1">
                <Textarea
                  label={`פסקה ${idx + 1}`}
                  value={p}
                  onChange={(e) => {
                    const paragraphs = [...(content.lawyersCallout?.paragraphs ?? [])];
                    paragraphs[idx] = e.target.value;
                    update("lawyersCallout", { paragraphs });
                  }}
                  rows={3}
                  dir="rtl"
                />
                <div className="absolute top-0 left-0">
                  <AiWriterButton
                    value={p}
                    onResult={(text) => {
                      const paragraphs = [...(content.lawyersCallout?.paragraphs ?? [])];
                      paragraphs[idx] = text;
                      update("lawyersCallout", { paragraphs });
                    }}
                    fieldLabel="פסקה בבוקסה לעורכי דין"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const paragraphs = (content.lawyersCallout?.paragraphs ?? []).filter((_, i) => i !== idx);
                  update("lawyersCallout", { paragraphs });
                }}
                className="mt-6 text-red-400 hover:text-red-600 transition-colors self-start"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              const paragraphs = [...(content.lawyersCallout?.paragraphs ?? []), ""];
              update("lawyersCallout", { paragraphs });
            }}
            className="flex items-center gap-1.5 text-sm text-primary hover:text-accent transition-colors"
          >
            <Plus size={14} /> הוסף פסקה
          </button>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="טקסט כפתור"
              value={content.lawyersCallout?.ctaText ?? ""}
              onChange={(e) => update("lawyersCallout", { ctaText: e.target.value })}
              dir="rtl"
            />
            <Input
              label="קישור כפתור"
              value={content.lawyersCallout?.ctaLink ?? "/contact"}
              onChange={(e) => update("lawyersCallout", { ctaLink: e.target.value })}
              dir="ltr"
            />
          </div>
        </div>
      </SectionCard>

      {/* ── SEO (per-page) Section ── */}
      <SectionCard title="SEO — דף הבית" icon={Search}>
        <div className="space-y-3">
          <p className="text-xs text-muted">
            מטא-נתונים של דף הבית עצמו (כותרת ה-tab בדפדפן, תיאור ל-Google ולרשתות חברתיות).
            ה-SEO הגלובלי של האתר נמצא בעמוד נפרד &quot;SEO — האתר&quot; ברשימת העמודים.
          </p>
          <Input
            label="כותרת (Title)"
            value={content.seo?.title ?? ""}
            onChange={(e) => update("seo", { title: e.target.value })}
            dir="rtl"
          />
          <div className="relative">
            <Textarea
              label="תיאור (Description)"
              value={content.seo?.description ?? ""}
              onChange={(e) => update("seo", { description: e.target.value })}
              rows={3}
              dir="rtl"
            />
            <div className="absolute top-0 left-0">
              <AiWriterButton
                value={content.seo?.description ?? ""}
                onResult={(text) => update("seo", { description: text })}
                fieldLabel="תיאור SEO לדף הבית"
              />
            </div>
          </div>
          <Textarea
            label="מילות מפתח (כל מילה בשורה נפרדת)"
            value={(content.seo?.keywords ?? []).join("\n")}
            onChange={(e) =>
              update("seo", {
                keywords: e.target.value
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            rows={6}
            dir="rtl"
          />
        </div>
      </SectionCard>

      {/* ── CTA Section ── */}
      <SectionCard title="קריאה לפעולה (CTA)" icon={Megaphone}>
        <div className="space-y-3">
          <Input
            label="כותרת"
            value={content.cta.title}
            onChange={(e) => update("cta", { title: e.target.value })}
            dir="rtl"
          />
          <div className="relative">
            <Textarea
              label="תיאור"
              value={content.cta.description}
              onChange={(e) => update("cta", { description: e.target.value })}
              rows={2}
              dir="rtl"
            />
            <div className="absolute top-0 left-0">
              <AiWriterButton
                value={content.cta.description}
                onResult={(text) => update("cta", { description: text })}
                fieldLabel="תיאור קריאה לפעולה"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="טקסט כפתור"
              value={content.cta.ctaText}
              onChange={(e) => update("cta", { ctaText: e.target.value })}
              dir="rtl"
            />
            <Input
              label="קישור"
              value={content.cta.ctaLink}
              onChange={(e) => update("cta", { ctaLink: e.target.value })}
              dir="ltr"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="טלפון"
              value={content.cta.phone}
              onChange={(e) => update("cta", { phone: e.target.value })}
              dir="ltr"
            />
            <Input
              label="קישור טלפון"
              value={content.cta.phoneHref}
              onChange={(e) => update("cta", { phoneHref: e.target.value })}
              dir="ltr"
            />
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
