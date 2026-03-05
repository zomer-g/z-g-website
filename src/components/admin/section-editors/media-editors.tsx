"use client";

import { Input } from "@/components/ui/input";
import { SectionCard } from "./section-card";
import { Sparkles, LayoutGrid, Tag } from "lucide-react";
import type { MediaPageContent } from "@/types/content";

interface MediaEditorsProps {
  content: MediaPageContent;
  onChange: (content: MediaPageContent) => void;
}

export function MediaEditors({ content, onChange }: MediaEditorsProps) {
  const update = <K extends keyof MediaPageContent>(
    section: K,
    data: Partial<MediaPageContent[K]>
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
      <SectionCard title="רשת מדיה" icon={LayoutGrid}>
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
            label="הודעת מצב ריק"
            value={content.grid.emptyState}
            onChange={(e) => update("grid", { emptyState: e.target.value })}
            dir="rtl"
          />
        </div>
      </SectionCard>

      {/* ── Type Labels ── */}
      <SectionCard title="תוויות סוגי מדיה" icon={Tag}>
        <div className="space-y-3">
          <Input
            label='תווית "וידאו"'
            value={content.typeLabels.video}
            onChange={(e) => update("typeLabels", { video: e.target.value })}
            dir="rtl"
          />
          <Input
            label='תווית "כתבה"'
            value={content.typeLabels.article}
            onChange={(e) => update("typeLabels", { article: e.target.value })}
            dir="rtl"
          />
          <Input
            label='תווית "פודקאסט"'
            value={content.typeLabels.podcast}
            onChange={(e) => update("typeLabels", { podcast: e.target.value })}
            dir="rtl"
          />
        </div>
      </SectionCard>
    </div>
  );
}
