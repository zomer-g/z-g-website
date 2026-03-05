"use client";

import { Input } from "@/components/ui/input";
import { SectionCard } from "./section-card";
import { Type } from "lucide-react";
import type { ServiceDetailContent } from "@/types/content";

interface ServiceDetailEditorsProps {
  content: ServiceDetailContent;
  onChange: (content: ServiceDetailContent) => void;
}

export function ServiceDetailEditors({ content, onChange }: ServiceDetailEditorsProps) {
  const update = (data: Partial<ServiceDetailContent["strings"]>) => {
    onChange({
      ...content,
      strings: { ...content.strings, ...data },
    });
  };

  return (
    <div className="space-y-3">
      <SectionCard title="טקסטים כלליים" icon={Type} defaultOpen>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label='פירורי לחם — "ראשי"'
              value={content.strings.breadcrumbHome}
              onChange={(e) => update({ breadcrumbHome: e.target.value })}
              dir="rtl"
            />
            <Input
              label='פירורי לחם — "תחומי עיסוק"'
              value={content.strings.breadcrumbServices}
              onChange={(e) => update({ breadcrumbServices: e.target.value })}
              dir="rtl"
            />
          </div>
          <Input
            label="כותרת תחומי עיסוק נוספים"
            value={content.strings.relatedServicesTitle}
            onChange={(e) => update({ relatedServicesTitle: e.target.value })}
            dir="rtl"
          />
        </div>
      </SectionCard>
    </div>
  );
}
