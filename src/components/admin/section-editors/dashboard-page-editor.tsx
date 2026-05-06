"use client";

import { useEffect, useState } from "react";
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
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";

type EmbedFeedback = { type: "success" | "error"; message: string };

interface SourceCount {
  label: string;
  count: number;
}

interface EmbedResponse {
  total?: number;
  docsRebuilt?: number;
  embedded?: number;
  skipped?: number;
  failed?: number;
  durationMs?: number;
  stoppedEarly?: boolean;
  runStartedAt?: string;
  firstError?: { stage: string; status?: number; message: string };
  error?: string;
}

// Drives the server-side embed/import loop for one target (all docs or one
// source). Each server invocation returns stoppedEarly=true when a soft
// deadline was hit; we keep posting until the run is genuinely done. The
// caller gets live progress via onProgress so multiple buttons (global +
// per-source) can render their own feedback strips.
async function runEmbedLoop(
  url: string,
  onProgress: (feedback: EmbedFeedback) => void,
): Promise<EmbedFeedback> {
  let totalRebuilt = 0;
  let totalSkipped = 0;
  let totalFailed = 0;
  let totalSeconds = 0;
  let runs = 0;
  let totalDocs = 0;
  // Anchor returned by the server on round 1; passed back as ?since= in
  // every subsequent round so the server skips docs already rebuilt in
  // this run. Without this, a force rebuild restarts from doc #1 each
  // round and burns OpenAI credit re-embedding the same first batch.
  let runStartedAt: string | null = null;

  while (true) {
    const sep: string = url.includes("?") ? "&" : "?";
    const fullUrl: string = runStartedAt
      ? `${url}${sep}since=${encodeURIComponent(runStartedAt)}`
      : url;
    const res: Response = await fetch(fullUrl, { method: "POST" });
    const data: EmbedResponse = (await res.json()) as EmbedResponse;
    if (!res.ok) throw new Error(data.error || "שגיאה בבניית האינדקס");
    if (typeof data.runStartedAt === "string" && !runStartedAt) {
      runStartedAt = data.runStartedAt;
    }
    runs += 1;
    totalRebuilt += data.docsRebuilt ?? data.embedded ?? 0;
    totalSkipped += data.skipped ?? 0;
    totalFailed += data.failed ?? 0;
    totalSeconds += Math.round((data.durationMs ?? 0) / 1000);
    totalDocs = data.total ?? totalDocs;

    const liveParts = [`סבב ${runs}`, `אומבדו: ${totalRebuilt}/${totalDocs}`];
    if (totalFailed > 0) liveParts.push(`כשלים: ${totalFailed}`);
    if (data.firstError) {
      const errLabel = data.firstError.status
        ? `שגיאה (${data.firstError.stage} ${data.firstError.status}): ${data.firstError.message}`
        : `שגיאה (${data.firstError.stage}): ${data.firstError.message}`;
      liveParts.push(errLabel);
    }
    // Bail when every wave is failing — re-running won't help if the
    // underlying call is broken (bad API key, quota exhausted, etc.).
    // Decided BEFORE we tag "ממשיך אוטומטית…" so the final message doesn't
    // claim we're continuing when we just stopped.
    const fatalFailure = data.firstError && totalRebuilt === 0;
    if (data.stoppedEarly && !fatalFailure) liveParts.push("ממשיך אוטומטית…");
    onProgress({
      type: fatalFailure ? "error" : "success",
      message: liveParts.join(" • "),
    });

    if (fatalFailure) {
      return {
        type: "error",
        message: liveParts.join(" • "),
      };
    }
    if (!data.stoppedEarly) break;
  }

  const finalParts = [
    `הושלם בעבור ${runs} סבבים`,
    `אומבדו: ${totalRebuilt}/${totalDocs}`,
    `דולגו: ${totalSkipped}`,
  ];
  if (totalFailed > 0) finalParts.push(`כשלים: ${totalFailed}`);
  finalParts.push(`זמן כולל: ${totalSeconds} שניות`);
  return { type: "success", message: finalParts.join(" • ") };
}

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
  const [embedFeedback, setEmbedFeedback] = useState<EmbedFeedback | null>(null);

  const handleEmbed = async () => {
    if (!embedAction) return;
    setEmbedding(true);
    setEmbedFeedback(null);
    const url = embedForce
      ? `${embedAction.endpoint}?force=1`
      : embedAction.endpoint;
    try {
      const final = await runEmbedLoop(url, setEmbedFeedback);
      setEmbedFeedback(final);
    } catch (err) {
      setEmbedFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "שגיאה בבניית האינדקס",
      });
    } finally {
      setEmbedding(false);
      setTimeout(() => setEmbedFeedback(null), 30000);
    }
  };

  // Per-source list state. Lazily fetched on mount when the embed panel is
  // available. Tracks one running source at a time + per-source feedback so
  // each row can render its own progress strip.
  const [sources, setSources] = useState<SourceCount[] | null>(null);
  const [sourcesError, setSourcesError] = useState<string | null>(null);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [runningSource, setRunningSource] = useState<string | null>(null);
  const [sourceFeedback, setSourceFeedback] = useState<
    Record<string, EmbedFeedback | undefined>
  >({});

  const loadSources = async () => {
    setSourcesLoading(true);
    setSourcesError(null);
    try {
      const res = await fetch("/api/guidelines/sources");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה בטעינת מקורות");
      const list: SourceCount[] = Array.isArray(data.sourceCounts)
        ? data.sourceCounts
        : Array.isArray(data.sources)
          ? data.sources.map((label: string) => ({ label, count: 0 }))
          : [];
      setSources(list);
    } catch (err) {
      setSourcesError(err instanceof Error ? err.message : "שגיאה בטעינת מקורות");
    } finally {
      setSourcesLoading(false);
    }
  };

  // Auto-load sources once when the embed panel is rendered (guidelines page
  // only). Refresh button below also triggers loadSources.
  useEffect(() => {
    if (!embedAction) return;
    if (sources !== null || sourcesLoading) return;
    void loadSources();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedAction]);

  const handleEmbedSource = async (label: string) => {
    if (!embedAction) return;
    if (runningSource) return;
    setRunningSource(label);
    setSourceFeedback((prev) => ({ ...prev, [label]: undefined }));
    const url = `${embedAction.endpoint}?force=1&source=${encodeURIComponent(label)}`;
    try {
      const final = await runEmbedLoop(url, (f) =>
        setSourceFeedback((prev) => ({ ...prev, [label]: f })),
      );
      setSourceFeedback((prev) => ({ ...prev, [label]: final }));
    } catch (err) {
      setSourceFeedback((prev) => ({
        ...prev,
        [label]: {
          type: "error",
          message: err instanceof Error ? err.message : "שגיאה בייבוא המקור",
        },
      }));
    } finally {
      setRunningSource(null);
      setTimeout(
        () => setSourceFeedback((prev) => ({ ...prev, [label]: undefined })),
        30000,
      );
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

      {embedAction ? (
        <SectionCard title="ייבוא לפי מקור" icon={Database}>
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs text-muted leading-relaxed">
                כל לחיצה על &quot;ייבא מחדש&quot; שולפת את המסמכים של אותו
                מקור מהמערכת המקורית, מחלקת לקטעים ובונה אינדקס סמנטי.
                שימושי כשעדכנו רק מקור מסוים — הרבה יותר מהיר מבנייה מלאה.
              </p>
              <Button
                type="button"
                onClick={loadSources}
                loading={sourcesLoading}
                disabled={sourcesLoading}
                variant="ghost"
                size="sm"
                className="border border-border whitespace-nowrap"
              >
                <RefreshCcw size={14} />
                רענן רשימה
              </Button>
            </div>

            {sourcesError ? (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700"
              >
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span className="leading-relaxed">{sourcesError}</span>
              </div>
            ) : null}

            {sources && sources.length === 0 && !sourcesLoading ? (
              <p className="text-xs text-muted">אין מקורות זמינים.</p>
            ) : null}

            {sources && sources.length > 0 ? (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {sources.map((s) => {
                  const fb = sourceFeedback[s.label];
                  const isThisRunning = runningSource === s.label;
                  const isOtherRunning =
                    runningSource !== null && runningSource !== s.label;
                  return (
                    <li key={s.label} className="p-3 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">
                            {s.label}
                          </div>
                          <div className="text-xs text-muted">
                            {s.count} מסמכים
                          </div>
                        </div>
                        <Button
                          type="button"
                          onClick={() => handleEmbedSource(s.label)}
                          loading={isThisRunning}
                          disabled={isThisRunning || isOtherRunning}
                          variant="ghost"
                          size="sm"
                          className="border border-border whitespace-nowrap"
                        >
                          <Brain size={14} />
                          ייבא מחדש
                        </Button>
                      </div>
                      {fb ? (
                        <div
                          role="alert"
                          className={cn(
                            "flex items-start gap-2 rounded-lg border p-2 text-xs",
                            fb.type === "success"
                              ? "border-green-200 bg-green-50 text-green-700"
                              : "border-red-200 bg-red-50 text-red-700",
                          )}
                        >
                          {fb.type === "success" ? (
                            <CheckCircle size={12} className="shrink-0 mt-0.5" />
                          ) : (
                            <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                          )}
                          <span className="leading-relaxed">{fb.message}</span>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
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
