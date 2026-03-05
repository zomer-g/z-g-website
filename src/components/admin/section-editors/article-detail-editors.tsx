"use client";

import { Input, Textarea } from "@/components/ui/input";
import { SectionCard } from "./section-card";
import { AlertTriangle, Megaphone, Type } from "lucide-react";
import { AiWriterButton } from "@/components/admin/ai-writer-button";
import type { ArticleDetailContent } from "@/types/content";

interface ArticleDetailEditorsProps {
  content: ArticleDetailContent;
  onChange: (content: ArticleDetailContent) => void;
}

export function ArticleDetailEditors({ content, onChange }: ArticleDetailEditorsProps) {
  const update = <K extends keyof ArticleDetailContent>(
    section: K,
    data: Partial<ArticleDetailContent[K]>
  ) => {
    onChange({
      ...content,
      [section]: { ...content[section], ...data },
    });
  };

  return (
    <div className="space-y-3">
      {/* ── Disclaimer ── */}
      <SectionCard title="הערת דיסקליימר" icon={AlertTriangle} defaultOpen>
        <div className="space-y-3">
          <Input
            label="תווית (לדוגמה: הערה:)"
            value={content.disclaimer.label}
            onChange={(e) => update("disclaimer", { label: e.target.value })}
            dir="rtl"
          />
          <div className="relative">
            <Textarea
              label="טקסט הערה"
              value={content.disclaimer.text}
              onChange={(e) => update("disclaimer", { text: e.target.value })}
              rows={3}
              dir="rtl"
            />
            <div className="absolute top-0 left-0">
              <AiWriterButton
                value={content.disclaimer.text}
                onResult={(text) => update("disclaimer", { text })}
                fieldLabel="טקסט דיסקליימר מאמר"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="טקסט קישור"
              value={content.disclaimer.linkText}
              onChange={(e) => update("disclaimer", { linkText: e.target.value })}
              dir="rtl"
            />
            <Input
              label="קישור"
              value={content.disclaimer.linkHref}
              onChange={(e) => update("disclaimer", { linkHref: e.target.value })}
              dir="ltr"
            />
          </div>
        </div>
      </SectionCard>

      {/* ── Sidebar CTA ── */}
      <SectionCard title="קריאה לפעולה (סרגל צד)" icon={Megaphone}>
        <div className="space-y-3">
          <Input
            label="כותרת"
            value={content.sidebarCta.title}
            onChange={(e) => update("sidebarCta", { title: e.target.value })}
            dir="rtl"
          />
          <div className="relative">
            <Textarea
              label="תיאור"
              value={content.sidebarCta.description}
              onChange={(e) => update("sidebarCta", { description: e.target.value })}
              rows={2}
              dir="rtl"
            />
            <div className="absolute top-0 left-0">
              <AiWriterButton
                value={content.sidebarCta.description}
                onResult={(text) => update("sidebarCta", { description: text })}
                fieldLabel="תיאור CTA סרגל צד — מאמר"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="טקסט כפתור"
              value={content.sidebarCta.ctaText}
              onChange={(e) => update("sidebarCta", { ctaText: e.target.value })}
              dir="rtl"
            />
            <Input
              label="קישור"
              value={content.sidebarCta.ctaLink}
              onChange={(e) => update("sidebarCta", { ctaLink: e.target.value })}
              dir="ltr"
            />
          </div>
        </div>
      </SectionCard>

      {/* ── UI Strings ── */}
      <SectionCard title="טקסטים כלליים" icon={Type}>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label='פירורי לחם — "ראשי"'
              value={content.strings.breadcrumbHome}
              onChange={(e) => update("strings", { breadcrumbHome: e.target.value })}
              dir="rtl"
            />
            <Input
              label='פירורי לחם — "מאמרים"'
              value={content.strings.breadcrumbArticles}
              onChange={(e) => update("strings", { breadcrumbArticles: e.target.value })}
              dir="rtl"
            />
          </div>
          <Input
            label="כותרת מאמרים קשורים (סרגל צד)"
            value={content.strings.sidebarRelatedTitle}
            onChange={(e) => update("strings", { sidebarRelatedTitle: e.target.value })}
            dir="rtl"
          />
          <Input
            label="כותרת מאמרים נוספים (תחתון)"
            value={content.strings.moreArticlesTitle}
            onChange={(e) => update("strings", { moreArticlesTitle: e.target.value })}
            dir="rtl"
          />
          <Input
            label='טקסט "קרא עוד"'
            value={content.strings.readMoreText}
            onChange={(e) => update("strings", { readMoreText: e.target.value })}
            dir="rtl"
          />
          <Input
            label='תבנית מחבר (השתמש ב-{category} לקטגוריה)'
            value={content.strings.authorTemplate}
            onChange={(e) => update("strings", { authorTemplate: e.target.value })}
            dir="rtl"
          />
        </div>
      </SectionCard>
    </div>
  );
}
