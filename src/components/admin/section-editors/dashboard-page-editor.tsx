"use client";

import { useState } from "react";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SectionCard } from "./section-card";
import {
  Sparkles,
  Eye,
  EyeOff,
  AlertTriangle,
  Plus,
  Trash2,
  RefreshCcw,
  Timer,
  CheckCircle,
  Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardPageContent {
  isPublic: boolean;
  hero: { title: string; subtitle: string };
  disclaimer?: { paragraphs: string[] };
  cacheTtlMinutes?: number;
}

interface CacheControls {
  refreshEndpoint: string;
  ttlField: "cacheTtlMinutes";
  minMinutes?: number;
  maxMinutes?: number;
}

interface EmbedAction {
  endpoint: string;
}

interface DashboardPageEditorProps<T extends DashboardPageContent> {
  content: T;
  onChange: (content: T) => void;
  showDisclaimer?: boolean;
  cacheControls?: CacheControls;
  embedAction?: EmbedAction;
}

export function DashboardPageEditor<T extends DashboardPageContent>({
  content,
  onChange,
  showDisclaimer = false,
  cacheControls,
  embedAction,
}: DashboardPageEditorProps<T>) {
  const isPublic = content.isPublic ?? true;
  const paragraphs = content.disclaimer?.paragraphs ?? [];

  const minTtl = cacheControls?.minMinutes ?? 1;
  const maxTtl = cacheControls?.maxMinutes ?? 1440;
  const currentTtl = Number(content.cacheTtlMinutes ?? 60);

  const [refreshing, setRefreshing] = useState(false);
  const [refreshFeedback, setRefreshFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleRefresh = async () => {
    if (!cacheControls) return;
    setRefreshing(true);
    setRefreshFeedback(null);
    try {
      const res = await fetch(cacheControls.refreshEndpoint, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה בריענון");
      setRefreshFeedback({
        type: "success",
        message: data.message || "הקאש נוקה בהצלחה",
      });
    } catch (err) {
      setRefreshFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "שגיאה בריענון",
      });
    } finally {
      setRefreshing(false);
      setTimeout(() => setRefreshFeedback(null), 5000);
    }
  };

  const [embedding, setEmbedding] = useState(false);
  const [embedForce, setEmbedForce] = useState(false);
  const [embedFeedback, setEmbedFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleEmbed = async () => {
    if (!embedAction) return;
    setEmbedding(true);
    setEmbedFeedback(null);
    try {
      const url = embedForce
        ? `${embedAction.endpoint}?force=1`
        : embedAction.endpoint;
      const res = await fetch(url, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה בבניית האינדקס");
      const seconds = Math.round((data.durationMs ?? 0) / 1000);
      const parts = [
        `סה"כ ${data.total ?? 0} מסמכים`,
        `אומבדו: ${data.docsRebuilt ?? data.embedded ?? 0}`,
        `דולגו: ${data.skipped ?? 0}`,
      ];
      if ((data.failed ?? 0) > 0) parts.push(`כשלים: ${data.failed}`);
      parts.push(`זמן: ${seconds} שניות`);
      if (data.stoppedEarly) parts.push("נעצר מוקדם — הרץ שוב כדי להמשיך");
      setEmbedFeedback({ type: "success", message: parts.join(" • ") });
    } catch (err) {
      setEmbedFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "שגיאה בבניית האינדקס",
      });
    } finally {
      setEmbedding(false);
      setTimeout(() => setEmbedFeedback(null), 15000);
    }
  };

  const updateParagraph = (idx: number, value: string) => {
    const next = [...paragraphs];
    next[idx] = value;
    onChange({
      ...content,
      disclaimer: { ...content.disclaimer, paragraphs: next },
    });
  };

  const addParagraph = () => {
    onChange({
      ...content,
      disclaimer: { ...content.disclaimer, paragraphs: [...paragraphs, ""] },
    });
  };

  const removeParagraph = (idx: number) => {
    onChange({
      ...content,
      disclaimer: {
        ...content.disclaimer,
        paragraphs: paragraphs.filter((_, i) => i !== idx),
      },
    });
  };

  return (
    <div className="space-y-3">
      <SectionCard title="נראות הדף" icon={isPublic ? Eye : EyeOff} defaultOpen>
        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-lg border border-border p-3">
            <button
              type="button"
              role="switch"
              aria-checked={isPublic}
              onClick={() => onChange({ ...content, isPublic: !isPublic })}
              className={cn(
                "relative mt-0.5 inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors",
                isPublic ? "bg-primary" : "bg-gray-300",
              )}
            >
              <span
                className={cn(
                  "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
                  isPublic ? "translate-x-1" : "translate-x-5",
                )}
              />
            </button>
            <div className="flex-1">
              <div className="text-sm font-semibold text-foreground">
                {isPublic ? "הדף פומבי" : "הדף לא פומבי"}
              </div>
              <div className="text-xs text-muted leading-relaxed">
                {isPublic
                  ? "כל מי שיגיע לכתובת יראה את הדשבורד."
                  : "כל מי שיגיע לכתובת יראה דף 404. בעלי הרשאות אדמין יראו את הדף כרגיל."}
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="באנר עליון (Hero)" icon={Sparkles} defaultOpen>
        <div className="space-y-3">
          <Input
            label="כותרת"
            value={content.hero.title}
            onChange={(e) =>
              onChange({ ...content, hero: { ...content.hero, title: e.target.value } })
            }
            dir="rtl"
          />
          <Textarea
            label="תת-כותרת"
            value={content.hero.subtitle}
            onChange={(e) =>
              onChange({ ...content, hero: { ...content.hero, subtitle: e.target.value } })
            }
            dir="rtl"
            rows={2}
          />
        </div>
      </SectionCard>

      {cacheControls ? (
        <SectionCard title="עדכון נתונים" icon={Timer} defaultOpen>
          <div className="space-y-4">
            <div>
              <Input
                label={`קצב עדכון (דקות) — בין ${minTtl} ל-${maxTtl}`}
                type="number"
                min={minTtl}
                max={maxTtl}
                value={currentTtl}
                onChange={(e) => {
                  const raw = Number(e.target.value);
                  if (!Number.isFinite(raw)) return;
                  const clamped = Math.max(minTtl, Math.min(maxTtl, Math.round(raw)));
                  onChange({
                    ...content,
                    [cacheControls.ttlField]: clamped,
                  } as T);
                }}
                dir="ltr"
              />
              <p className="mt-1.5 text-xs text-muted leading-relaxed">
                כל בקשה שגילה גדול מהערך הזה תשלוף נתונים טריים מהמקור.
                שינוי הערך נכנס לתוקף אחרי שמירת טיוטה ופרסום.
              </p>
            </div>

            <div className="border-t border-border pt-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-foreground">ריענון מיידי</div>
                  <div className="text-xs text-muted">
                    ניקוי הקאש המקומי. הבקשה הבאה תשלוף ממקור הנתונים.
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={handleRefresh}
                  loading={refreshing}
                  disabled={refreshing}
                  variant="ghost"
                  className="border border-border whitespace-nowrap"
                >
                  <RefreshCcw size={16} />
                  רענן עכשיו
                </Button>
              </div>

              {refreshFeedback ? (
                <div
                  role="alert"
                  className={cn(
                    "mt-3 flex items-start gap-2 rounded-lg border p-2.5 text-xs",
                    refreshFeedback.type === "success"
                      ? "border-green-200 bg-green-50 text-green-700"
                      : "border-red-200 bg-red-50 text-red-700",
                  )}
                >
                  {refreshFeedback.type === "success" ? (
                    <CheckCircle size={14} className="shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  )}
                  <span className="leading-relaxed">{refreshFeedback.message}</span>
                </div>
              ) : null}
            </div>
          </div>
        </SectionCard>
      ) : null}

      {embedAction ? (
        <SectionCard title="חיפוש סמנטי (AI)" icon={Brain}>
          <div className="space-y-3">
            <p className="text-xs text-muted leading-relaxed">
              בניית אינדקס embeddings על כל המסמכים מאפשרת חיפוש לפי משמעות
              במקום לפי מחרוזת. בניה ראשונה לוקחת מספר דקות; ריצות חוזרות
              מדלגות על מסמכים שלא השתנו.
            </p>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                onClick={handleEmbed}
                loading={embedding}
                disabled={embedding}
                variant="ghost"
                className="border border-border whitespace-nowrap"
              >
                <Brain size={16} />
                {embedForce ? "בנה הכל מחדש" : "עדכן אינדקס"}
              </Button>
              <label className="inline-flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={embedForce}
                  onChange={(e) => setEmbedForce(e.target.checked)}
                  className="h-3.5 w-3.5"
                />
                <span>אילוץ בנייה מלאה (מתעלם מהאש)</span>
              </label>
            </div>

            {embedFeedback ? (
              <div
                role="alert"
                className={cn(
                  "flex items-start gap-2 rounded-lg border p-2.5 text-xs",
                  embedFeedback.type === "success"
                    ? "border-green-200 bg-green-50 text-green-700"
                    : "border-red-200 bg-red-50 text-red-700",
                )}
              >
                {embedFeedback.type === "success" ? (
                  <CheckCircle size={14} className="shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                )}
                <span className="leading-relaxed">{embedFeedback.message}</span>
              </div>
            ) : null}
          </div>
        </SectionCard>
      ) : null}

      {showDisclaimer ? (
        <SectionCard title="הסתייגות (Disclaimer)" icon={AlertTriangle}>
          <div className="space-y-3">
            {paragraphs.map((p, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-border bg-muted-bg/30 p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted">
                    פסקה {idx + 1}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeParagraph(idx)}
                    className="text-red-500 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
                <Textarea
                  value={p}
                  onChange={(e) => updateParagraph(idx, e.target.value)}
                  dir="rtl"
                  rows={3}
                />
              </div>
            ))}
            <Button
              variant="ghost"
              onClick={addParagraph}
              className="w-full border border-dashed border-border text-sm text-muted hover:bg-muted-bg/50"
            >
              <Plus size={16} />
              הוסף פסקה
            </Button>
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}
