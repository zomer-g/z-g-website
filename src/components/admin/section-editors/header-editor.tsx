"use client";

import { Input } from "@/components/ui/input";
import { SectionCard } from "./section-card";
import { Type, Navigation, MousePointer, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import type { HeaderContent } from "@/types/content";

interface HeaderEditorProps {
  content: HeaderContent;
  onChange: (content: HeaderContent) => void;
}

export function HeaderEditor({ content, onChange }: HeaderEditorProps) {
  return (
    <div className="space-y-3">
      <SectionCard title="לוגו" icon={Type} defaultOpen>
        <div className="space-y-3">
          <Input
            label="טקסט לוגו"
            value={content.logoText}
            onChange={(e) => onChange({ ...content, logoText: e.target.value })}
            dir="rtl"
          />
          <Input
            label="תת-כותרת לוגו"
            value={content.logoSubtext}
            onChange={(e) => onChange({ ...content, logoSubtext: e.target.value })}
            dir="rtl"
          />
        </div>
      </SectionCard>

      <SectionCard title="תפריט ניווט" icon={Navigation}>
        <div className="space-y-3">
          {content.navItems.map((item, idx) => (
            <div key={idx} className="flex gap-2 items-end">
              <Input
                label="תווית"
                value={item.label}
                onChange={(e) => {
                  const navItems = [...content.navItems];
                  navItems[idx] = { ...navItems[idx], label: e.target.value };
                  onChange({ ...content, navItems });
                }}
                dir="rtl"
                className="flex-1"
              />
              <Input
                label="קישור"
                value={item.href}
                onChange={(e) => {
                  const navItems = [...content.navItems];
                  navItems[idx] = { ...navItems[idx], href: e.target.value };
                  onChange({ ...content, navItems });
                }}
                dir="ltr"
                className="flex-1"
              />
              <div className="mb-1 flex flex-col gap-0.5">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => {
                    const navItems = [...content.navItems];
                    [navItems[idx - 1], navItems[idx]] = [navItems[idx], navItems[idx - 1]];
                    onChange({ ...content, navItems });
                  }}
                  className="text-muted hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="הזז למעלה"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  type="button"
                  disabled={idx === content.navItems.length - 1}
                  onClick={() => {
                    const navItems = [...content.navItems];
                    [navItems[idx], navItems[idx + 1]] = [navItems[idx + 1], navItems[idx]];
                    onChange({ ...content, navItems });
                  }}
                  className="text-muted hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="הזז למטה"
                >
                  <ArrowDown size={14} />
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  const navItems = content.navItems.filter((_, i) => i !== idx);
                  onChange({ ...content, navItems });
                }}
                className="mb-1 text-red-400 hover:text-red-600 transition-colors"
                title="מחק"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              onChange({ ...content, navItems: [...content.navItems, { label: "", href: "/" }] });
            }}
            className="flex items-center gap-1.5 text-sm text-primary hover:text-accent transition-colors"
          >
            <Plus size={14} /> הוסף קישור
          </button>
        </div>
      </SectionCard>

      <SectionCard title="כפתור קריאה לפעולה" icon={MousePointer}>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="טקסט כפתור"
              value={content.ctaText}
              onChange={(e) => onChange({ ...content, ctaText: e.target.value })}
              dir="rtl"
            />
            <Input
              label="קישור"
              value={content.ctaLink}
              onChange={(e) => onChange({ ...content, ctaLink: e.target.value })}
              dir="ltr"
            />
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
