"use client";

import { Input } from "@/components/ui/input";
import { SectionCard } from "./section-card";
import { Sparkles, LayoutGrid } from "lucide-react";
import type { ServicesPageContent } from "@/types/content";

interface ServicesEditorsProps {
  content: ServicesPageContent;
  onChange: (content: ServicesPageContent) => void;
}

export function ServicesEditors({ content, onChange }: ServicesEditorsProps) {
  const update = <K extends keyof ServicesPageContent>(
    section: K,
    data: Partial<ServicesPageContent[K]>
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
      <SectionCard title="רשת שירותים" icon={LayoutGrid}>
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
          <Input
            label='טקסט "קרא עוד"'
            value={content.grid.readMoreText}
            onChange={(e) => update("grid", { readMoreText: e.target.value })}
            dir="rtl"
          />
        </div>
      </SectionCard>
    </div>
  );
}
