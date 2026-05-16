"use client";

import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SectionCard } from "./section-card";
import {
  Sparkles,
  Hash,
  ScrollText,
  Layers,
  Globe,
  Megaphone,
  Plus,
  Trash2,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  LeamPageContent,
  LeamSiteItem,
  LeamStat,
} from "@/types/content";

interface LeamEditorsProps {
  content: LeamPageContent;
  onChange: (content: LeamPageContent) => void;
}

export function LeamEditors({ content, onChange }: LeamEditorsProps) {
  /* ── Generic section updater ──────────────────────────────────────── */

  const update = <K extends keyof LeamPageContent>(
    key: K,
    value: LeamPageContent[K],
  ) => {
    onChange({ ...content, [key]: value });
  };

  const updateNested = <
    K extends "hero" | "manifesto" | "sitesSection" | "cta",
  >(
    section: K,
    data: Partial<LeamPageContent[K]>,
  ) => {
    onChange({
      ...content,
      [section]: { ...content[section], ...data },
    });
  };

  /* ── Stats ────────────────────────────────────────────────────────── */

  const updateStat = (index: number, data: Partial<LeamStat>) => {
    const next = [...content.stats];
    next[index] = { ...next[index], ...data };
    update("stats", next);
  };
  const addStat = () => {
    update("stats", [
      ...content.stats,
      { k: "00", v: "תווית", srK: "" },
    ]);
  };
  const removeStat = (index: number) => {
    update(
      "stats",
      content.stats.filter((_, i) => i !== index),
    );
  };

  /* ── Sites ────────────────────────────────────────────────────────── */

  const updateSite = (index: number, data: Partial<LeamSiteItem>) => {
    const next = [...content.sites];
    next[index] = { ...next[index], ...data };
    update("sites", next);
  };
  const updateSiteTags = (index: number, tagString: string) => {
    const tags = tagString
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    updateSite(index, { tags });
  };
  const addSite = () => {
    const nextIndex = String(content.sites.length + 1).padStart(2, "0");
    update("sites", [
      ...content.sites,
      {
        index: nextIndex,
        name: "אתר חדש",
        tagline: "תיאור קצר",
        description: "תיאור מפורט של האתר.",
        domain: "example.org.il",
        url: "https://",
        icon: "Globe",
        tags: [],
      },
    ]);
  };
  const removeSite = (index: number) => {
    update(
      "sites",
      content.sites.filter((_, i) => i !== index),
    );
  };

  return (
    <div className="space-y-3">
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <SectionCard title="באנר עליון" icon={Sparkles} defaultOpen>
        <div className="space-y-3">
          <Input
            label="תווית עליונה (מעל הכותרת)"
            value={content.metaStrip}
            onChange={(e) => update("metaStrip", e.target.value)}
            dir="rtl"
            placeholder="טכנולוגיה אזרחית · גרסה 1.0"
          />
          <Input
            label="כותרת ראשית"
            value={content.hero.title}
            onChange={(e) => updateNested("hero", { title: e.target.value })}
            dir="rtl"
          />
          <Textarea
            label="תת-כותרת (פסקה תחת הכותרת)"
            value={content.hero.subtitle}
            onChange={(e) =>
              updateNested("hero", { subtitle: e.target.value })
            }
            dir="rtl"
            rows={3}
          />
        </div>
      </SectionCard>

      {/* ── Stats counter strip ──────────────────────────────────────── */}
      <SectionCard title="רצועת נתונים" icon={Hash}>
        <div className="space-y-3">
          <p className="text-xs text-muted leading-relaxed">
            ערך מספרי או סימן (כמו ∞) ולצידו תווית. במקרה של סימן שאינו קריא
            לקוראי מסך — מלאי גם «טקסט חלופי לקוראי מסך».
          </p>

          {content.stats.map((stat, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-border bg-muted-bg/30 p-3 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GripVertical size={14} className="text-muted" />
                  <span className="text-xs font-semibold text-foreground">
                    תא {idx + 1}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeStat(idx)}
                  className="text-red-500 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="ערך"
                  value={stat.k}
                  onChange={(e) => updateStat(idx, { k: e.target.value })}
                  dir="ltr"
                  placeholder="04 / 49+ / ∞ / 100%"
                />
                <Input
                  label="תווית"
                  value={stat.v}
                  onChange={(e) => updateStat(idx, { v: e.target.value })}
                  dir="rtl"
                />
              </div>
              <Input
                label="טקסט חלופי לקוראי מסך (לערכים לא-טקסטואליים)"
                value={stat.srK ?? ""}
                onChange={(e) => updateStat(idx, { srK: e.target.value })}
                dir="rtl"
                placeholder='לדוגמה: עבור "∞" כתבי "ללא הגבלה"'
              />
            </div>
          ))}

          <Button
            variant="ghost"
            onClick={addStat}
            className="w-full border border-dashed border-border text-sm text-muted hover:bg-muted-bg/50"
          >
            <Plus size={16} />
            הוסיפי תא
          </Button>
        </div>
      </SectionCard>

      {/* ── Manifesto ────────────────────────────────────────────────── */}
      <SectionCard title="הצהרת כוונות" icon={ScrollText}>
        <div className="space-y-3">
          <Input
            label="כותרת"
            value={content.manifesto.title}
            onChange={(e) =>
              updateNested("manifesto", { title: e.target.value })
            }
            dir="rtl"
          />
          <Textarea
            label="גוף הפסקה"
            value={content.manifesto.body}
            onChange={(e) =>
              updateNested("manifesto", { body: e.target.value })
            }
            dir="rtl"
            rows={6}
          />
        </div>
      </SectionCard>

      {/* ── Sites section heading + CTA label ────────────────────────── */}
      <SectionCard title="כותרות לאזור האתרים" icon={Layers}>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label='תווית קטנה ("האתרים")'
              value={content.sitesSection.eyebrow}
              onChange={(e) =>
                updateNested("sitesSection", { eyebrow: e.target.value })
              }
              dir="rtl"
            />
            <Input
              label="כותרת האזור"
              value={content.sitesSection.title}
              onChange={(e) =>
                updateNested("sitesSection", { title: e.target.value })
              }
              dir="rtl"
            />
          </div>
          <Input
            label="טקסט כפתור הכניסה בכל כרטיס"
            value={content.ctaSiteLabel}
            onChange={(e) => update("ctaSiteLabel", e.target.value)}
            dir="rtl"
            placeholder="כניסה לאתר"
          />
        </div>
      </SectionCard>

      {/* ── Sites cards ──────────────────────────────────────────────── */}
      <SectionCard title="כרטיסי האתרים" icon={Globe} defaultOpen>
        <div className="space-y-4">
          {content.sites.map((site, idx) => (
            <div
              key={idx}
              className={cn(
                "rounded-lg border border-border bg-muted-bg/30 p-4",
                "space-y-3",
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GripVertical size={16} className="text-muted" />
                  <span className="text-sm font-semibold text-foreground">
                    {site.name || `כרטיס ${idx + 1}`}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSite(idx)}
                  className="text-red-500 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={14} />
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Input
                  label='מספר סידורי ("01")'
                  value={site.index}
                  onChange={(e) => updateSite(idx, { index: e.target.value })}
                  dir="ltr"
                />
                <Input
                  label="שם האתר"
                  value={site.name}
                  onChange={(e) => updateSite(idx, { name: e.target.value })}
                  dir="rtl"
                />
                <Input
                  label="אייקון (שם מ-Lucide)"
                  value={site.icon}
                  onChange={(e) => updateSite(idx, { icon: e.target.value })}
                  dir="ltr"
                  placeholder="Database / History / Calendar / Network..."
                />
              </div>

              <Input
                label="תת-כותרת קצרה"
                value={site.tagline}
                onChange={(e) => updateSite(idx, { tagline: e.target.value })}
                dir="rtl"
              />

              <Textarea
                label="תיאור מלא"
                value={site.description}
                onChange={(e) =>
                  updateSite(idx, { description: e.target.value })
                }
                dir="rtl"
                rows={4}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="דומיין להצגה"
                  value={site.domain}
                  onChange={(e) => updateSite(idx, { domain: e.target.value })}
                  dir="ltr"
                  placeholder="odata.org.il"
                />
                <Input
                  label="קישור מלא"
                  value={site.url}
                  onChange={(e) => updateSite(idx, { url: e.target.value })}
                  dir="ltr"
                  placeholder="https://..."
                />
              </div>

              <Input
                label="תגיות (מופרדות בפסיק)"
                value={site.tags.join(", ")}
                onChange={(e) => updateSiteTags(idx, e.target.value)}
                dir="rtl"
                placeholder="מידע פתוח, שקיפות, אחריותיות"
              />
            </div>
          ))}

          <Button
            variant="ghost"
            onClick={addSite}
            className="w-full border border-dashed border-border text-sm text-muted hover:bg-muted-bg/50"
          >
            <Plus size={16} />
            הוסיפי כרטיס אתר
          </Button>
        </div>
      </SectionCard>

      {/* ── Closing CTA ──────────────────────────────────────────────── */}
      <SectionCard title="קריאה לפעולה" icon={Megaphone}>
        <div className="space-y-3">
          <Input
            label="כותרת"
            value={content.cta.title}
            onChange={(e) => updateNested("cta", { title: e.target.value })}
            dir="rtl"
          />
          <Textarea
            label="תיאור"
            value={content.cta.description}
            onChange={(e) =>
              updateNested("cta", { description: e.target.value })
            }
            dir="rtl"
            rows={3}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="טקסט כפתור ראשי"
              value={content.cta.primaryCtaText}
              onChange={(e) =>
                updateNested("cta", { primaryCtaText: e.target.value })
              }
              dir="rtl"
            />
            <Input
              label="קישור כפתור ראשי"
              value={content.cta.primaryCtaLink}
              onChange={(e) =>
                updateNested("cta", { primaryCtaLink: e.target.value })
              }
              dir="ltr"
              placeholder="/contact"
            />
            <Input
              label="טקסט כפתור משני (להשאיר ריק כדי להסתיר)"
              value={content.cta.secondaryCtaText}
              onChange={(e) =>
                updateNested("cta", { secondaryCtaText: e.target.value })
              }
              dir="rtl"
            />
            <Input
              label="קישור כפתור משני"
              value={content.cta.secondaryCtaLink}
              onChange={(e) =>
                updateNested("cta", { secondaryCtaLink: e.target.value })
              }
              dir="ltr"
              placeholder="/projects"
            />
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
