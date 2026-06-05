"use client";

import { useRef, useState } from "react";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SectionCard } from "./section-card";
import {
  Sparkles,
  FolderOpen,
  Megaphone,
  Plus,
  Trash2,
  Award,
  FileText,
  History,
  Puzzle,
  Upload,
  Loader2,
  X,
  Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  DigitalServicesPageContent,
  DigitalServiceItem,
  DigitalExtensionItem,
  CareerTimelineEntry,
} from "@/types/content";

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

  /* ── Career timeline helpers ── */
  const timeline = content.careerTimeline || {
    title: "",
    subtitle: "",
    entries: [],
  };

  const updateTimelineMeta = (
    data: Partial<Pick<DigitalServicesPageContent["careerTimeline"], "title" | "subtitle">>,
  ) => {
    onChange({
      ...content,
      careerTimeline: { ...timeline, ...data },
    });
  };

  const updateTimelineEntry = (
    index: number,
    data: Partial<CareerTimelineEntry>,
  ) => {
    const entries = [...timeline.entries];
    entries[index] = { ...entries[index], ...data };
    onChange({ ...content, careerTimeline: { ...timeline, entries } });
  };

  const addTimelineEntry = () => {
    onChange({
      ...content,
      careerTimeline: {
        ...timeline,
        entries: [
          ...timeline.entries,
          { period: "", role: "", organization: "", description: "" },
        ],
      },
    });
  };

  const removeTimelineEntry = (index: number) => {
    onChange({
      ...content,
      careerTimeline: {
        ...timeline,
        entries: timeline.entries.filter((_, i) => i !== index),
      },
    });
  };

  const moveTimelineEntry = (index: number, dir: -1 | 1) => {
    const entries = [...timeline.entries];
    const target = index + dir;
    if (target < 0 || target >= entries.length) return;
    [entries[index], entries[target]] = [entries[target], entries[index]];
    onChange({ ...content, careerTimeline: { ...timeline, entries } });
  };

  /* ── Extensions section helpers ── */
  const extensions = content.extensions || {
    title: "",
    subtitle: "",
    paragraphs: [],
    items: [],
  };

  const updateExtensionsMeta = (
    data: Partial<Pick<DigitalServicesPageContent["extensions"], "title" | "subtitle">>,
  ) => {
    onChange({ ...content, extensions: { ...extensions, ...data } });
  };

  const updateExtensionParagraph = (index: number, value: string) => {
    const paragraphs = [...extensions.paragraphs];
    paragraphs[index] = value;
    onChange({ ...content, extensions: { ...extensions, paragraphs } });
  };

  const addExtensionParagraph = () => {
    onChange({
      ...content,
      extensions: { ...extensions, paragraphs: [...extensions.paragraphs, ""] },
    });
  };

  const removeExtensionParagraph = (index: number) => {
    onChange({
      ...content,
      extensions: {
        ...extensions,
        paragraphs: extensions.paragraphs.filter((_, i) => i !== index),
      },
    });
  };

  const updateExtensionItem = (index: number, data: Partial<DigitalExtensionItem>) => {
    const items = [...extensions.items];
    items[index] = { ...items[index], ...data };
    onChange({ ...content, extensions: { ...extensions, items } });
  };

  const addExtensionItem = () => {
    onChange({
      ...content,
      extensions: {
        ...extensions,
        items: [
          ...extensions.items,
          {
            title: "",
            subtitle: "",
            description: "",
            icon: "Puzzle",
            tags: [],
            screenshotUrl: "",
            screenshotAlt: "",
          },
        ],
      },
    });
  };

  const removeExtensionItem = (index: number) => {
    onChange({
      ...content,
      extensions: {
        ...extensions,
        items: extensions.items.filter((_, i) => i !== index),
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

      {/* ── Extensions on existing systems ── */}
      <SectionCard title="הוספת יכולות במערכות קיימות" icon={Puzzle}>
        <div className="space-y-3">
          <Input
            label="כותרת הסקציה"
            value={extensions.title}
            onChange={(e) => updateExtensionsMeta({ title: e.target.value })}
            dir="rtl"
          />
          <Input
            label="תת-כותרת"
            value={extensions.subtitle}
            onChange={(e) => updateExtensionsMeta({ subtitle: e.target.value })}
            dir="rtl"
          />

          {extensions.paragraphs.map((p, i) => (
            <div key={i} className="relative">
              <Textarea
                label={`פסקת מבוא ${i + 1}`}
                value={p}
                onChange={(e) => updateExtensionParagraph(i, e.target.value)}
                dir="rtl"
                rows={3}
              />
              <button
                type="button"
                onClick={() => removeExtensionParagraph(i)}
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
            onClick={addExtensionParagraph}
            className="gap-1.5"
          >
            <Plus size={14} />
            הוסף פסקת מבוא
          </Button>

          <div className="mt-4 space-y-6">
            {extensions.items.map((item, i) => (
              <ExtensionItemEditor
                key={i}
                index={i}
                item={item}
                onChange={(data) => updateExtensionItem(i, data)}
                onRemove={() => removeExtensionItem(i)}
              />
            ))}
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={addExtensionItem}
            className="gap-1.5"
          >
            <Plus size={14} />
            הוסף תוסף
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

      {/* ── Career Timeline ── */}
      <SectionCard title="ציר זמן מקצועי" icon={History}>
        <div className="space-y-3">
          <Input
            label="כותרת הסקציה"
            value={timeline.title}
            onChange={(e) => updateTimelineMeta({ title: e.target.value })}
            dir="rtl"
          />
          <Textarea
            label="תת-כותרת"
            value={timeline.subtitle}
            onChange={(e) => updateTimelineMeta({ subtitle: e.target.value })}
            dir="rtl"
            rows={2}
          />

          <div className="mt-4 space-y-6">
            {timeline.entries.map((entry, i) => (
              <div
                key={i}
                className="relative rounded-lg border border-border bg-white p-4"
              >
                <button
                  type="button"
                  onClick={() => removeTimelineEntry(i)}
                  className={cn(
                    "absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full",
                    "bg-red-100 text-red-600 hover:bg-red-200 transition-colors",
                  )}
                  title="מחק תחנה"
                >
                  <Trash2 size={12} />
                </button>

                <div className="space-y-2">
                  <Input
                    label='תקופה (לדוגמה: "2018–2020" או "2023–היום")'
                    value={entry.period}
                    onChange={(e) =>
                      updateTimelineEntry(i, { period: e.target.value })
                    }
                    dir="rtl"
                  />
                  <Input
                    label="תפקיד"
                    value={entry.role}
                    onChange={(e) =>
                      updateTimelineEntry(i, { role: e.target.value })
                    }
                    dir="rtl"
                  />
                  <Input
                    label="ארגון / מקום"
                    value={entry.organization}
                    onChange={(e) =>
                      updateTimelineEntry(i, { organization: e.target.value })
                    }
                    dir="rtl"
                  />
                  <Textarea
                    label="תיאור (אופציונלי)"
                    value={entry.description || ""}
                    onChange={(e) =>
                      updateTimelineEntry(i, { description: e.target.value })
                    }
                    dir="rtl"
                    rows={2}
                  />
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => moveTimelineEntry(i, -1)}
                    disabled={i === 0}
                    className="text-xs"
                    title="הזז למעלה"
                  >
                    ↑ למעלה
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => moveTimelineEntry(i, 1)}
                    disabled={i === timeline.entries.length - 1}
                    className="text-xs"
                    title="הזז למטה"
                  >
                    ↓ למטה
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={addTimelineEntry}
            className="gap-1.5"
          >
            <Plus size={14} />
            הוסף תחנה
          </Button>

          <p className="text-xs text-muted leading-relaxed">
            הסדר בעורך = הסדר בדף. אם הרשימה ריקה — הסקציה כולה לא תוצג.
          </p>
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

/* ─── Sub-component: a single extension item with screenshot upload ─── */

interface ExtensionItemEditorProps {
  index: number;
  item: DigitalExtensionItem;
  onChange: (data: Partial<DigitalExtensionItem>) => void;
  onRemove: () => void;
}

function ExtensionItemEditor({ index, item, onChange, onRemove }: ExtensionItemEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("alt", item.screenshotAlt || item.title || "screenshot");

      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "שגיאה בהעלאת התמונה");
      }

      const data = await res.json();
      onChange({ screenshotUrl: data.url });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "שגיאה בהעלאת התמונה");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="relative rounded-lg border border-border bg-white p-4">
      <button
        type="button"
        onClick={onRemove}
        className={cn(
          "absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full",
          "bg-red-100 text-red-600 hover:bg-red-200 transition-colors",
        )}
        title="מחק תוסף"
      >
        <Trash2 size={12} />
      </button>

      <div className="mb-3 text-xs font-semibold text-muted">תוסף {index + 1}</div>

      <div className="space-y-2">
        <Input
          label="שם התוסף"
          value={item.title}
          onChange={(e) => onChange({ title: e.target.value })}
          dir="rtl"
        />
        <Input
          label="כותרת משנה"
          value={item.subtitle}
          onChange={(e) => onChange({ subtitle: e.target.value })}
          dir="rtl"
        />
        <Textarea
          label="תיאור"
          value={item.description}
          onChange={(e) => onChange({ description: e.target.value })}
          dir="rtl"
          rows={4}
        />
        <Input
          label="אייקון (Lucide)"
          value={item.icon}
          onChange={(e) => onChange({ icon: e.target.value })}
          dir="ltr"
          placeholder="e.g. Calendar, Download, FileDown, Puzzle"
        />
        <Input
          label="תגיות (מופרדות בפסיקים)"
          value={item.tags.join(", ")}
          onChange={(e) =>
            onChange({
              tags: e.target.value
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean),
            })
          }
          dir="rtl"
        />

        {/* ── Screenshot upload ── */}
        <div className="space-y-2 pt-2">
          <label className="text-sm font-semibold text-foreground">
            צילום מסך
          </label>

          {item.screenshotUrl ? (
            <div className="flex items-start gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.screenshotUrl}
                alt={item.screenshotAlt || "צילום מסך"}
                className="h-24 w-40 rounded-lg border border-border object-cover"
              />
              <div className="flex flex-col gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange({ screenshotUrl: "" })}
                  className="text-red-500 hover:bg-red-50 hover:text-red-600 gap-1"
                >
                  <X size={14} />
                  הסר תמונה
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="gap-1"
                >
                  <Upload size={14} />
                  החלף תמונה
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="gap-1.5 border border-dashed border-border"
              >
                {uploading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <ImageIcon size={16} />
                )}
                {uploading ? "מעלה..." : "העלה צילום מסך"}
              </Button>
              <span className="text-xs text-muted">PNG / JPG / WebP — עד 10MB</span>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleScreenshotUpload}
            className="hidden"
          />

          {uploadError ? (
            <p className="text-xs text-red-600">{uploadError}</p>
          ) : null}

          <Input
            label="טקסט חלופי (alt)"
            value={item.screenshotAlt}
            onChange={(e) => onChange({ screenshotAlt: e.target.value })}
            dir="rtl"
            placeholder="תיאור קצר של מה שרואים בצילום המסך"
          />
        </div>
      </div>
    </div>
  );
}
