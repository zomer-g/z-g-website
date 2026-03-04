"use client";

import { Input, Textarea } from "@/components/ui/input";
import { SectionCard } from "./section-card";
import { Sparkles, LayoutGrid, Info, Newspaper, Megaphone, Plus, Trash2 } from "lucide-react";
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
          <div className="space-y-2">
            <p className="text-xs text-muted">פריטי תחומי העיסוק ({content.services.items.length})</p>
            {content.services.items.map((item, idx) => (
              <div key={idx} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted">#{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const items = content.services.items.filter((_, i) => i !== idx);
                      update("services", { items });
                    }}
                    className="text-red-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    label="כותרת"
                    value={item.title}
                    onChange={(e) => {
                      const items = [...content.services.items];
                      items[idx] = { ...items[idx], title: e.target.value };
                      update("services", { items });
                    }}
                    dir="rtl"
                  />
                  <Input
                    label="אייקון"
                    value={item.icon}
                    onChange={(e) => {
                      const items = [...content.services.items];
                      items[idx] = { ...items[idx], icon: e.target.value };
                      update("services", { items });
                    }}
                    dir="ltr"
                  />
                </div>
                <div className="relative">
                  <Textarea
                    label="תיאור"
                    value={item.description}
                    onChange={(e) => {
                      const items = [...content.services.items];
                      items[idx] = { ...items[idx], description: e.target.value };
                      update("services", { items });
                    }}
                    rows={2}
                    dir="rtl"
                  />
                  <div className="absolute top-0 left-0">
                    <AiWriterButton
                      value={item.description}
                      onResult={(text) => {
                        const items = [...content.services.items];
                        items[idx] = { ...items[idx], description: text };
                        update("services", { items });
                      }}
                      fieldLabel={`תיאור תחום עיסוק: ${item.title}`}
                    />
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                const items = [...content.services.items, { icon: "Briefcase", title: "", description: "", href: "/services" }];
                update("services", { items });
              }}
              className="flex items-center gap-1.5 text-sm text-primary hover:text-accent transition-colors"
            >
              <Plus size={14} /> הוסף תחום
            </button>
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
          <p className="text-xs text-muted">מאמרים לתצוגה ({content.articles.items.length})</p>
          {content.articles.items.map((item, idx) => (
            <div key={idx} className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted">מאמר #{idx + 1}</span>
                <button
                  type="button"
                  onClick={() => {
                    const items = content.articles.items.filter((_, i) => i !== idx);
                    update("articles", { items });
                  }}
                  className="text-red-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <Input
                label="כותרת"
                value={item.title}
                onChange={(e) => {
                  const items = [...content.articles.items];
                  items[idx] = { ...items[idx], title: e.target.value };
                  update("articles", { items });
                }}
                dir="rtl"
              />
              <Textarea
                label="תקציר"
                value={item.excerpt}
                onChange={(e) => {
                  const items = [...content.articles.items];
                  items[idx] = { ...items[idx], excerpt: e.target.value };
                  update("articles", { items });
                }}
                rows={2}
                dir="rtl"
              />
              <Input
                label="תאריך"
                value={item.date}
                onChange={(e) => {
                  const items = [...content.articles.items];
                  items[idx] = { ...items[idx], date: e.target.value };
                  update("articles", { items });
                }}
                dir="rtl"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              const items = [...content.articles.items, { title: "", excerpt: "", date: "", href: "/articles" }];
              update("articles", { items });
            }}
            className="flex items-center gap-1.5 text-sm text-primary hover:text-accent transition-colors"
          >
            <Plus size={14} /> הוסף מאמר
          </button>
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
