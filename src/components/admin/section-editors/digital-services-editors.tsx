"use client";

import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SectionCard } from "./section-card";
import { Sparkles, FolderOpen, Megaphone, Plus, Trash2, Award, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DigitalServicesPageContent, DigitalServiceItem } from "@/types/content";

interface DigitalServicesEditorsProps {
  content: DigitalServicesPageContent;
  onChange: (content: DigitalServicesPageContent) => void;
}

export function DigitalServicesEditors({ content, onChange }: DigitalServicesEditorsProps) {
  const update = <K extends keyof DigitalServicesPageContent>(
    section: K,
    data: Partial<DigitalServicesPageContent[K]>,
  ) => {
    onChange({
      ...content,
      [section]: { ...content[section], ...data },
    });
  };

  const updateItem = (index: number, data: Partial<DigitalServiceItem>) => {
    const items = [...content.items];
    items[index] = { ...items[index], ...data };
    onChange({ ...content, items });
  };

  const addItem = () => {
    onChange({
      ...content,
      items: [
        ...content.items,
        { title: "", subtitle: "", description: "", icon: "Code2", tags: [] },
      ],
    });
  };

  const removeItem = (index: number) => {
    onChange({
      ...content,
      items: content.items.filter((_, i) => i !== index),
    });
  };

  const updateCredential = (index: number, value: string) => {
    const items = [...content.credentials.items];
    items[index] = value;
    onChange({ ...content, credentials: { ...content.credentials, items } });
  };

  const addCredential = () => {
    onChange({
      ...content,
      credentials: { ...content.credentials, items: [...content.credentials.items, ""] },
    });
  };

  const removeCredential = (index: number) => {
    onChange({
      ...content,
      credentials: {
        ...content.credentials,
        items: content.credentials.items.filter((_, i) => i !== index),
      },
    });
  };

  const updateIntroParagraph = (index: number, value: string) => {
    const paragraphs = [...content.intro.paragraphs];
    paragraphs[index] = value;
    onChange({ ...content, intro: { ...content.intro, paragraphs } });
  };

  const addIntroParagraph = () => {
    onChange({
      ...content,
      intro: { ...content.intro, paragraphs: [...content.intro.paragraphs, ""] },
    });
  };

  const removeIntroParagraph = (index: number) => {
    onChange({
      ...content,
      intro: {
        ...content.intro,
        paragraphs: content.intro.paragraphs.filter((_, i) => i !== index),
      },
    });
  };

  return (
    <div className="space-y-3">
      {/* ── Hero ── */}
      <SectionCard title="באנר עליון (Hero)" icon={Sparkles} defaultOpen>
        <div className="space-y-3">
          <Input
            label="כותרת"
            value={content.hero.title}
            onChange={(e) => update("hero", { title: e.target.value })}
            dir="rtl"
          />
          <Textarea
            label="תת-כותרת"
            value={content.hero.subtitle}
            onChange={(e) => update("hero", { subtitle: e.target.value })}
            dir="rtl"
          />
        </div>
      </SectionCard>

      {/* ── Intro ── */}
      <SectionCard title="מבוא" icon={FileText} defaultOpen>
        <div className="space-y-3">
          <Input
            label="כותרת"
            value={content.intro.title}
            onChange={(e) => update("intro", { title: e.target.value } as Partial<DigitalServicesPageContent["intro"]>)}
            dir="rtl"
          />
          {content.intro.paragraphs.map((p, i) => (
            <div key={i} className="relative">
              <Textarea
                label={`פסקה ${i + 1}`}
                value={p}
                onChange={(e) => updateIntroParagraph(i, e.target.value)}
                dir="rtl"
              />
              <button
                type="button"
                onClick={() => removeIntroParagraph(i)}
                className={cn(
                  "absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full",
                  "bg-red-100 text-red-600 hover:bg-red-200 transition-colors",
                )}
                title="מחק פסקה"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={addIntroParagraph}
            className="gap-1.5"
          >
            <Plus size={14} />
            הוסף פסקה
          </Button>
        </div>
      </SectionCard>

      {/* ── Services/Items ── */}
      <SectionCard title="שירותים" icon={FolderOpen} defaultOpen>
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

          <div className="mt-4 space-y-6">
            {content.items.map((item, i) => (
              <div
                key={i}
                className="relative rounded-lg border border-border bg-white p-4"
              >
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className={cn(
                    "absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full",
                    "bg-red-100 text-red-600 hover:bg-red-200 transition-colors",
                  )}
                  title="מחק שירות"
                >
                  <Trash2 size={12} />
                </button>
                <div className="space-y-2">
                  <Input
                    label="שם השירות"
                    value={item.title}
                    onChange={(e) => updateItem(i, { title: e.target.value })}
                    dir="rtl"
                  />
                  <Input
                    label="כותרת משנה"
                    value={item.subtitle}
                    onChange={(e) => updateItem(i, { subtitle: e.target.value })}
                    dir="rtl"
                  />
                  <Textarea
                    label="תיאור"
                    value={item.description}
                    onChange={(e) => updateItem(i, { description: e.target.value })}
                    dir="rtl"
                  />
                  <Input
                    label="אייקון (Lucide)"
                    value={item.icon}
                    onChange={(e) => updateItem(i, { icon: e.target.value })}
                    dir="ltr"
                    placeholder="e.g. Database, Eye, Scale"
                  />
                  <Input
                    label="תגיות (מופרדות בפסיקים)"
                    value={item.tags.join(", ")}
                    onChange={(e) =>
                      updateItem(i, {
                        tags: e.target.value
                          .split(",")
                          .map((t) => t.trim())
                          .filter(Boolean),
                      })
                    }
                    dir="rtl"
                  />
                </div>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={addItem}
            className="gap-1.5"
          >
            <Plus size={14} />
            הוסף שירות
          </Button>
        </div>
      </SectionCard>

      {/* ── Credentials ── */}
      <SectionCard title="הסמכות ורקע" icon={Award}>
        <div className="space-y-3">
          <Input
            label="כותרת"
            value={content.credentials.title}
            onChange={(e) => update("credentials", { title: e.target.value } as Partial<DigitalServicesPageContent["credentials"]>)}
            dir="rtl"
          />
          {content.credentials.items.map((item, i) => (
            <div key={i} className="relative">
              <Input
                label={`הסמכה ${i + 1}`}
                value={item}
                onChange={(e) => updateCredential(i, e.target.value)}
                dir="rtl"
              />
              <button
                type="button"
                onClick={() => removeCredential(i)}
                className={cn(
                  "absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full",
                  "bg-red-100 text-red-600 hover:bg-red-200 transition-colors",
                )}
                title="מחק"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={addCredential}
            className="gap-1.5"
          >
            <Plus size={14} />
            הוסף הסמכה
          </Button>
        </div>
      </SectionCard>

      {/* ── CTA ── */}
      <SectionCard title="קריאה לפעולה (CTA)" icon={Megaphone}>
        <div className="space-y-3">
          <Input
            label="כותרת"
            value={content.cta.title}
            onChange={(e) => update("cta", { title: e.target.value })}
            dir="rtl"
          />
          <Textarea
            label="תיאור"
            value={content.cta.description}
            onChange={(e) => update("cta", { description: e.target.value })}
            dir="rtl"
          />
          <Input
            label="טקסט כפתור"
            value={content.cta.ctaText}
            onChange={(e) => update("cta", { ctaText: e.target.value })}
            dir="rtl"
          />
          <Input
            label="קישור כפתור"
            value={content.cta.ctaLink}
            onChange={(e) => update("cta", { ctaLink: e.target.value })}
            dir="ltr"
          />
        </div>
      </SectionCard>
    </div>
  );
}
