"use client";

import { Input, Textarea } from "@/components/ui/input";
import { SectionCard } from "./section-card";
import { Sparkles, LayoutGrid, Megaphone } from "lucide-react";
import { AiWriterButton } from "@/components/admin/ai-writer-button";
import type { ArticlesPageContent } from "@/types/content";

interface ArticlesEditorsProps {
  content: ArticlesPageContent;
  onChange: (content: ArticlesPageContent) => void;
}

export function ArticlesEditors({ content, onChange }: ArticlesEditorsProps) {
  const update = <K extends keyof ArticlesPageContent>(
    section: K,
    data: Partial<ArticlesPageContent[K]>
  ) => {
    onChange({
      ...content,
      [section]: { ...content[section], ...data },
    });
  };

  return (
    <div className="space-y-3">
      {/* ── Hero Section ── */}
      <SectionCard title="באנר עליון (Hero)" icon={Sparkles} defaultOpen>
        <div className="space-y-3">
          <Input
            label="כותרת"
            value={content.hero.title}
            onChange={(e) => update("hero", { title: e.target.value })}
            dir="rtl"
          />
          <Input
            label="תת-כותרת"
            value={content.hero.subtitle}
            onChange={(e) => update("hero", { subtitle: e.target.value })}
            dir="rtl"
          />
        </div>
      </SectionCard>

      {/* ── Grid Section ── */}
      <SectionCard title="רשת מאמרים" icon={LayoutGrid}>
        <div className="space-y-3">
          <Input
            label="כותרת הסעיף"
            value={content.grid.title}
            onChange={(e) => update("grid", { title: e.target.value })}
            dir="rtl"
          />
          <Input
            label="תת-כותרת"
            value={content.grid.subtitle}
            onChange={(e) => update("grid", { subtitle: e.target.value })}
            dir="rtl"
          />
          <Input
            label="הודעת מצב ריק — כותרת"
            value={content.grid.emptyStateTitle}
            onChange={(e) => update("grid", { emptyStateTitle: e.target.value })}
            dir="rtl"
          />
          <Input
            label="הודעת מצב ריק — תת-כותרת"
            value={content.grid.emptyStateSubtitle}
            onChange={(e) => update("grid", { emptyStateSubtitle: e.target.value })}
            dir="rtl"
          />
          <Input
            label='טקסט "קרא עוד"'
            value={content.grid.readMoreText}
            onChange={(e) => update("grid", { readMoreText: e.target.value })}
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
                fieldLabel="תיאור קריאה לפעולה — מאמרים"
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
        </div>
      </SectionCard>
    </div>
  );
}
