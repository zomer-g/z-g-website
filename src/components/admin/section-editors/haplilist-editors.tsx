"use client";

import { Input } from "@/components/ui/input";
import { SectionCard } from "./section-card";
import { Sparkles, LayoutGrid } from "lucide-react";
import type { HaplilistPageContent } from "@/types/content";

interface HaplilistEditorsProps {
  content: HaplilistPageContent;
  onChange: (content: HaplilistPageContent) => void;
}

export function HaplilistEditors({ content, onChange }: HaplilistEditorsProps) {
  const update = <K extends keyof HaplilistPageContent>(
    section: K,
    data: Partial<HaplilistPageContent[K]>,
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
      <SectionCard title="רשת הפוסטים" icon={LayoutGrid}>
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
            onChange={(e) =>
              update("grid", { emptyStateTitle: e.target.value })
            }
            dir="rtl"
          />
          <Input
            label="הודעת מצב ריק — תת-כותרת"
            value={content.grid.emptyStateSubtitle}
            onChange={(e) =>
              update("grid", { emptyStateSubtitle: e.target.value })
            }
            dir="rtl"
          />
          <Input
            label='טקסט "קראו עוד"'
            value={content.grid.readMoreText}
            onChange={(e) => update("grid", { readMoreText: e.target.value })}
            dir="rtl"
          />
        </div>
      </SectionCard>
    </div>
  );
}
