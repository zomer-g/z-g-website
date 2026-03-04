"use client";

import { Input, Textarea } from "@/components/ui/input";
import { SectionCard } from "./section-card";
import { Sparkles, BookOpen, User, Heart, Megaphone, Plus, Trash2 } from "lucide-react";
import type { AboutPageContent } from "@/types/content";

interface AboutEditorsProps {
  content: AboutPageContent;
  onChange: (content: AboutPageContent) => void;
}

export function AboutEditors({ content, onChange }: AboutEditorsProps) {
  const update = <K extends keyof AboutPageContent>(
    section: K,
    data: Partial<AboutPageContent[K]>
  ) => {
    onChange({
      ...content,
      [section]: { ...content[section], ...data },
    });
  };

  return (
    <div className="space-y-3">
      {/* ── Hero Banner ── */}
      <SectionCard title="באנר עליון" icon={Sparkles} defaultOpen>
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
            rows={2}
            dir="rtl"
          />
        </div>
      </SectionCard>

      {/* ── Firm Story ── */}
      <SectionCard title="הסיפור שלנו" icon={BookOpen}>
        <div className="space-y-3">
          <Input
            label="כותרת"
            value={content.firmStory.title}
            onChange={(e) => update("firmStory", { title: e.target.value })}
            dir="rtl"
          />
          <Input
            label="תת-כותרת"
            value={content.firmStory.subtitle}
            onChange={(e) => update("firmStory", { subtitle: e.target.value })}
            dir="rtl"
          />
          {content.firmStory.paragraphs.map((p, idx) => (
            <div key={idx} className="flex gap-2">
              <Textarea
                label={`פסקה ${idx + 1}`}
                value={p}
                onChange={(e) => {
                  const paragraphs = [...content.firmStory.paragraphs];
                  paragraphs[idx] = e.target.value;
                  update("firmStory", { paragraphs });
                }}
                rows={3}
                dir="rtl"
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => {
                  const paragraphs = content.firmStory.paragraphs.filter((_, i) => i !== idx);
                  update("firmStory", { paragraphs });
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
              update("firmStory", { paragraphs: [...content.firmStory.paragraphs, ""] });
            }}
            className="flex items-center gap-1.5 text-sm text-primary hover:text-accent transition-colors"
          >
            <Plus size={14} /> הוסף פסקה
          </button>
        </div>
      </SectionCard>

      {/* ── Attorney Profile ── */}
      <SectionCard title="פרופיל עורך הדין" icon={User}>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="שם"
              value={content.attorney.name}
              onChange={(e) => update("attorney", { name: e.target.value })}
              dir="rtl"
            />
            <Input
              label="תפקיד"
              value={content.attorney.role}
              onChange={(e) => update("attorney", { role: e.target.value })}
              dir="rtl"
            />
          </div>
          <p className="text-xs font-medium text-muted">ביוגרפיה</p>
          {content.attorney.bio.map((p, idx) => (
            <div key={idx} className="flex gap-2">
              <Textarea
                label={`פסקה ${idx + 1}`}
                value={p}
                onChange={(e) => {
                  const bio = [...content.attorney.bio];
                  bio[idx] = e.target.value;
                  update("attorney", { bio });
                }}
                rows={2}
                dir="rtl"
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => {
                  const bio = content.attorney.bio.filter((_, i) => i !== idx);
                  update("attorney", { bio });
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
              update("attorney", { bio: [...content.attorney.bio, ""] });
            }}
            className="flex items-center gap-1.5 text-sm text-primary hover:text-accent transition-colors"
          >
            <Plus size={14} /> הוסף פסקה
          </button>

          <p className="text-xs font-medium text-muted mt-4">תעודות והסמכות</p>
          {content.attorney.credentials.map((cred, idx) => (
            <div key={idx} className="flex gap-2 items-end">
              <Input
                label="אייקון"
                value={cred.icon}
                onChange={(e) => {
                  const credentials = [...content.attorney.credentials];
                  credentials[idx] = { ...credentials[idx], icon: e.target.value };
                  update("attorney", { credentials });
                }}
                dir="ltr"
                className="w-32"
              />
              <Input
                label="טקסט"
                value={cred.text}
                onChange={(e) => {
                  const credentials = [...content.attorney.credentials];
                  credentials[idx] = { ...credentials[idx], text: e.target.value };
                  update("attorney", { credentials });
                }}
                dir="rtl"
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => {
                  const credentials = content.attorney.credentials.filter((_, i) => i !== idx);
                  update("attorney", { credentials });
                }}
                className="mb-1 text-red-400 hover:text-red-600 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              update("attorney", { credentials: [...content.attorney.credentials, { icon: "Award", text: "" }] });
            }}
            className="flex items-center gap-1.5 text-sm text-primary hover:text-accent transition-colors"
          >
            <Plus size={14} /> הוסף הסמכה
          </button>
        </div>
      </SectionCard>

      {/* ── Values ── */}
      <SectionCard title="הערכים שלנו" icon={Heart}>
        <div className="space-y-3">
          <Input
            label="כותרת"
            value={content.values.title}
            onChange={(e) => update("values", { title: e.target.value })}
            dir="rtl"
          />
          <Input
            label="תת-כותרת"
            value={content.values.subtitle}
            onChange={(e) => update("values", { subtitle: e.target.value })}
            dir="rtl"
          />
          {content.values.items.map((item, idx) => (
            <div key={idx} className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted">ערך #{idx + 1}</span>
                <button
                  type="button"
                  onClick={() => {
                    const items = content.values.items.filter((_, i) => i !== idx);
                    update("values", { items });
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
                    const items = [...content.values.items];
                    items[idx] = { ...items[idx], title: e.target.value };
                    update("values", { items });
                  }}
                  dir="rtl"
                />
                <Input
                  label="אייקון"
                  value={item.icon}
                  onChange={(e) => {
                    const items = [...content.values.items];
                    items[idx] = { ...items[idx], icon: e.target.value };
                    update("values", { items });
                  }}
                  dir="ltr"
                />
              </div>
              <Textarea
                label="תיאור"
                value={item.description}
                onChange={(e) => {
                  const items = [...content.values.items];
                  items[idx] = { ...items[idx], description: e.target.value };
                  update("values", { items });
                }}
                rows={2}
                dir="rtl"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              update("values", { items: [...content.values.items, { icon: "Star", title: "", description: "" }] });
            }}
            className="flex items-center gap-1.5 text-sm text-primary hover:text-accent transition-colors"
          >
            <Plus size={14} /> הוסף ערך
          </button>
        </div>
      </SectionCard>

      {/* ── CTA ── */}
      <SectionCard title="קריאה לפעולה" icon={Megaphone}>
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
            rows={2}
            dir="rtl"
          />
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
