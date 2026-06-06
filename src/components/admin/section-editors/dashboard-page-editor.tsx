"use client";

import { useEffect, useRef, useState } from "react";
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
  Square,
  Filter,
  Code,
  Layout,
} from "lucide-react";
import {
  isValidFilterExpression,
  VALID_FILTER_CONTROLS,
  type RulingsPageQuery,
  type RulingsFilterField,
  type RulingsSortField,
  type FilterControl,
} from "@/types/ruling-filter";
import { cn } from "@/lib/utils";

type EmbedFeedback = { type: "success" | "error"; message: string };

interface SourceCount {
  label: string;
  count: number;
  indexed?: number;
  lastIndexedAt?: string | null;
}

// Hebrew relative-time. Used to surface "אונדקס לאחרונה: לפני 3 שעות"
// per source so the operator can see at a glance which sources need
// re-indexing after a catalog change. Falls back to a date string for
// anything older than 30 days (longer back is rarely meaningful).
function formatRelativeHebrew(iso: string | null | undefined): string {
  if (!iso) return "טרם אונדקס";
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return "טרם אונדקס";
  const diffSec = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (diffSec < 60) return "לפני פחות מדקה";
  if (diffSec < 3600) {
    const m = Math.round(diffSec / 60);
    return `לפני ${m} ${m === 1 ? "דקה" : "דקות"}`;
  }
  if (diffSec < 86400) {
    const h = Math.round(diffSec / 3600);
    return `לפני ${h} ${h === 1 ? "שעה" : "שעות"}`;
  }
  if (diffSec < 86400 * 30) {
    const d = Math.round(diffSec / 86400);
    return `לפני ${d} ${d === 1 ? "יום" : "ימים"}`;
  }
  return new Date(iso).toLocaleDateString("he-IL");
}

interface EmbedResponse {
  total?: number;
  docsRebuilt?: number;
  embedded?: number;
  skipped?: number;
  // Breakdown of docsRebuilt — see API route for definitions. Optional
  // because older server versions don't return them.
  newDocs?: number;
  changedDocs?: number;
  forcedDocs?: number;
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
// per-source) can render their own feedback strips. Pass an `abortSignal`
// to let the operator stop a long-running re-embed from the UI; aborting
// closes the in-flight fetch and exits the loop with a "נעצר" summary
// (the server-side wave currently running may still finish — Render
// doesn't tear down workers mid-request — but no more rounds are issued).
async function runEmbedLoop(
  url: string,
  onProgress: (feedback: EmbedFeedback) => void,
  abortSignal?: AbortSignal,
): Promise<EmbedFeedback> {
  let totalRebuilt = 0;
  let totalSkipped = 0;
  let totalNew = 0;
  let totalChanged = 0;
  let totalForced = 0;
  let totalFailed = 0;
  let totalSeconds = 0;
  let runs = 0;
  let totalDocs = 0;
  // Anchor returned by the server on round 1; passed back as ?since= in
  // every subsequent round so the server skips docs already rebuilt in
  // this run. Without this, a force rebuild restarts from doc #1 each
  // round and burns OpenAI credit re-embedding the same first batch.
  let runStartedAt: string | null = null;

  // Builds the same totals string we'd emit on normal completion, but with
  // a "נעצר" prefix. Used when the operator aborts.
  const buildStoppedReport = (): EmbedFeedback => {
    const parts = [
      `נעצר על-ידי משתמש לאחר ${runs} ${runs === 1 ? "סבב" : "סבבים"}`,
      `אומבדו: ${totalRebuilt}/${totalDocs}`,
    ];
    const bd: string[] = [];
    if (totalNew > 0) bd.push(`חדשים: ${totalNew}`);
    if (totalChanged > 0) bd.push(`השתנו: ${totalChanged}`);
    if (totalForced > 0) bd.push(`כפויים: ${totalForced}`);
    if (bd.length > 0) parts.push(`(${bd.join(", ")})`);
    if (totalSkipped > 0) parts.push(`דולגו: ${totalSkipped}`);
    if (totalFailed > 0) parts.push(`כשלים: ${totalFailed}`);
    if (totalSeconds > 0) parts.push(`זמן: ${totalSeconds} שניות`);
    return { type: "success", message: parts.join(" • ") };
  };

  while (true) {
    if (abortSignal?.aborted) return buildStoppedReport();
    const sep: string = url.includes("?") ? "&" : "?";
    const fullUrl: string = runStartedAt
      ? `${url}${sep}since=${encodeURIComponent(runStartedAt)}`
      : url;
    let res: Response;
    let data: EmbedResponse;
    try {
      res = await fetch(fullUrl, { method: "POST", signal: abortSignal });
      data = (await res.json()) as EmbedResponse;
    } catch (err) {
      // AbortError is what fetch throws when the signal aborts mid-flight.
      // Browsers normalise it under a few names — match by name and by the
      // signal's `aborted` flag for safety.
      const name = (err as { name?: string })?.name;
      if (name === "AbortError" || abortSignal?.aborted) {
        return buildStoppedReport();
      }
      throw err;
    }
    if (!res.ok) throw new Error(data.error || "שגיאה בבניית האינדקס");
    if (typeof data.runStartedAt === "string" && !runStartedAt) {
      runStartedAt = data.runStartedAt;
    }
    runs += 1;
    totalRebuilt += data.docsRebuilt ?? data.embedded ?? 0;
    totalSkipped += data.skipped ?? 0;
    totalNew += data.newDocs ?? 0;
    totalChanged += data.changedDocs ?? 0;
    totalForced += data.forcedDocs ?? 0;
    totalFailed += data.failed ?? 0;
    totalSeconds += Math.round((data.durationMs ?? 0) / 1000);
    totalDocs = data.total ?? totalDocs;

    const liveParts = [`סבב ${runs}`, `אומבדו: ${totalRebuilt}/${totalDocs}`];
    // Breakdown of *why* docs were rebuilt, when the server provides it.
    // Lets the operator distinguish "the corpus genuinely changed by 5%"
    // from "something is invalidating my hashes". Only render the parts
    // that are non-zero to avoid noise.
    const breakdown: string[] = [];
    if (totalNew > 0) breakdown.push(`חדשים: ${totalNew}`);
    if (totalChanged > 0) breakdown.push(`השתנו: ${totalChanged}`);
    if (totalForced > 0) breakdown.push(`כפויים: ${totalForced}`);
    if (breakdown.length > 0) {
      liveParts.push(`(${breakdown.join(", ")})`);
    }
    if (totalSkipped > 0) liveParts.push(`דולגו: ${totalSkipped}`);
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
  const finalBreakdown: string[] = [];
  if (totalNew > 0) finalBreakdown.push(`חדשים: ${totalNew}`);
  if (totalChanged > 0) finalBreakdown.push(`השתנו: ${totalChanged}`);
  if (totalForced > 0) finalBreakdown.push(`כפויים: ${totalForced}`);
  if (finalBreakdown.length > 0) {
    finalParts.push(`(${finalBreakdown.join(", ")})`);
  }
  if (totalFailed > 0) finalParts.push(`כשלים: ${totalFailed}`);
  finalParts.push(`זמן כולל: ${totalSeconds} שניות`);
  return { type: "success", message: finalParts.join(" • ") };
}

interface DashboardPageContent {
  isPublic: boolean;
  hero: { title: string; subtitle: string };
  disclaimer?: { paragraphs: string[] };
  cacheTtlMinutes?: number;
  // Optional substring-match filter (used by rulings pages). Surfaced via
  // the `docTypeFilter` editor prop. Empty array = no filtering.
  allowedDocTypes?: string[];
  // Optional structured query (used by rulings pages). Surfaced via the
  // `advancedQuery` editor prop.
  query?: RulingsPageQuery;
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

interface DocTypeFilterControls {
  // Field on the content object that holds the substring patterns. Always
  // "allowedDocTypes" today, kept configurable to match the rest of this
  // component's prop style.
  field: "allowedDocTypes";
  // Hint shown above the field. e.g. "מציג רק מסמכים שהכותרת שלהם
  // כוללת אחת מהמילים האלה."
  description?: string;
  // Pre-filled chips the admin can add/remove with one click. Each entry is
  // a substring pattern; clicking adds it if missing, otherwise removes it.
  presets?: string[];
}

interface AdvancedQueryControls {
  // Field on content that stores the RulingsPageQuery object.
  field: "query";
  // Schema-discovery URL — used by the textarea hint to point the admin to
  // available field keys. e.g. "/api/rulings/schema?category=foi".
  schemaHintUrl?: string;
  // Pre-baked example snippets the admin can click to insert.
  examples?: { label: string; json: string }[];
  // When true, show only the base-filter editor (no display/filter/sort/API
  // sections). Used by dashboards with their own native UI.
  onlyCustomQuery?: boolean;
  // When false, hide the scope/pageSize block (pages whose API ignores them).
  showApiParams?: boolean;
}

interface DashboardPageEditorProps<T extends DashboardPageContent> {
  content: T;
  onChange: (content: T) => void;
  showDisclaimer?: boolean;
  cacheControls?: CacheControls;
  embedAction?: EmbedAction;
  docTypeFilter?: DocTypeFilterControls;
  advancedQuery?: AdvancedQueryControls;
}

export function DashboardPageEditor<T extends DashboardPageContent>({
  content,
  onChange,
  showDisclaimer = false,
  cacheControls,
  embedAction,
  docTypeFilter,
  advancedQuery,
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
  // AbortController for the global embed loop. Stored in a ref so the
  // stop button can call `.abort()` without re-rendering. Cleared in
  // the handler's `finally` so the next click starts fresh.
  const embedAbortRef = useRef<AbortController | null>(null);

  const handleEmbed = async () => {
    if (!embedAction) return;
    const controller = new AbortController();
    embedAbortRef.current = controller;
    setEmbedding(true);
    setEmbedFeedback(null);
    const url = embedForce
      ? `${embedAction.endpoint}?force=1`
      : embedAction.endpoint;
    try {
      const final = await runEmbedLoop(url, setEmbedFeedback, controller.signal);
      setEmbedFeedback(final);
    } catch (err) {
      setEmbedFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "שגיאה בבניית האינדקס",
      });
    } finally {
      embedAbortRef.current = null;
      setEmbedding(false);
      setTimeout(() => setEmbedFeedback(null), 30000);
    }
  };

  const handleStopEmbed = () => {
    embedAbortRef.current?.abort();
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
  // Single controller because only one per-source embed runs at a time
  // (guard: handleEmbedSource bails early if runningSource is set).
  const sourceEmbedAbortRef = useRef<AbortController | null>(null);

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
    const controller = new AbortController();
    sourceEmbedAbortRef.current = controller;
    setRunningSource(label);
    setSourceFeedback((prev) => ({ ...prev, [label]: undefined }));
    const url = `${embedAction.endpoint}?force=1&source=${encodeURIComponent(label)}`;
    try {
      const final = await runEmbedLoop(
        url,
        (f) => setSourceFeedback((prev) => ({ ...prev, [label]: f })),
        controller.signal,
      );
      setSourceFeedback((prev) => ({ ...prev, [label]: final }));
      // Successful embed → fresh updatedAt → reload the list so the
      // "אונדקס לאחרונה" badge refreshes immediately. Don't await; the
      // current row's feedback strip is already showing the final summary.
      void loadSources();
    } catch (err) {
      setSourceFeedback((prev) => ({
        ...prev,
        [label]: {
          type: "error",
          message: err instanceof Error ? err.message : "שגיאה באינדוקס המקור",
        },
      }));
    } finally {
      sourceEmbedAbortRef.current = null;
      setRunningSource(null);
      setTimeout(
        () => setSourceFeedback((prev) => ({ ...prev, [label]: undefined })),
        30000,
      );
    }
  };

  const handleStopSourceEmbed = () => {
    sourceEmbedAbortRef.current?.abort();
  };

  // Per-source data import. Distinct from "אנדקס": this just refreshes the
  // upstream cache so the public listing reflects catalog changes
  // immediately, without spending OpenAI credit. Designed for the workflow
  // where you re-categorize a source at tag-it.biz, click ייבא to verify
  // the changes show up, then אנדקס when you're ready to spend embedding
  // budget. Independent of runningSource: importing one source while
  // another is being indexed is fine — they don't contend.
  const [importingSource, setImportingSource] = useState<string | null>(null);

  const handleImportSource = async (label: string) => {
    if (!cacheControls) return;
    if (importingSource) return;
    setImportingSource(label);
    setSourceFeedback((prev) => ({ ...prev, [label]: undefined }));
    try {
      const res = await fetch(
        `${cacheControls.refreshEndpoint}?source=${encodeURIComponent(label)}`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה בייבוא");
      setSourceFeedback((prev) => ({
        ...prev,
        [label]: { type: "success", message: data.message || "הייבוא הסתיים." },
      }));
      // Counts may have shifted upstream; refresh the list so the row
      // shows the new total alongside the old "אונדקס לאחרונה" badge.
      void loadSources();
    } catch (err) {
      setSourceFeedback((prev) => ({
        ...prev,
        [label]: {
          type: "error",
          message: err instanceof Error ? err.message : "שגיאה בייבוא",
        },
      }));
    } finally {
      setImportingSource(null);
      setTimeout(
        () => setSourceFeedback((prev) => ({ ...prev, [label]: undefined })),
        15000,
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

      {docTypeFilter ? (
        <DocTypeFilterSection
          patterns={Array.isArray(content[docTypeFilter.field])
            ? (content[docTypeFilter.field] as string[])
            : []}
          presets={docTypeFilter.presets || []}
          description={docTypeFilter.description}
          onChange={(next) =>
            onChange({ ...content, [docTypeFilter.field]: next } as T)
          }
        />
      ) : null}

      {advancedQuery ? (
        <AdvancedQuerySection
          query={
            (content[advancedQuery.field] as RulingsPageQuery | undefined) || {
              customQuery: null,
              displayFields: [],
              filterFields: [],
              sortFields: [],
              scope: 0,
              pageSize: 12,
            }
          }
          schemaHintUrl={advancedQuery.schemaHintUrl}
          examples={advancedQuery.examples || []}
          onlyCustomQuery={advancedQuery.onlyCustomQuery}
          showApiParams={advancedQuery.showApiParams !== false}
          onChange={(next) =>
            onChange({ ...content, [advancedQuery.field]: next } as T)
          }
        />
      ) : null}

      {embedAction ? (
        <SectionCard title="חיפוש סמנטי (AI)" icon={Brain}>
          <div className="space-y-3">
            <p className="text-xs text-muted leading-relaxed">
              בניית אינדקס embeddings על כל המסמכים מאפשרת חיפוש לפי משמעות
              במקום לפי מחרוזת. בניה ראשונה לוקחת מספר דקות; ריצות חוזרות
              מדלגות על מסמכים שלא השתנו.
            </p>

            <div className="flex items-center gap-3 flex-wrap">
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
              {embedding ? (
                <Button
                  type="button"
                  onClick={handleStopEmbed}
                  variant="ghost"
                  className={cn(
                    "whitespace-nowrap",
                    "border border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700",
                  )}
                  title="עצירת הריצה הנוכחית. הסבב שכבר נשלח לשרת ייתכן וישלים — אבל לא ייצא סבב חדש."
                >
                  <Square size={14} />
                  עצרי
                </Button>
              ) : null}
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
        <SectionCard title="ייבוא ואינדוקס לפי מקור" icon={Database}>
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs text-muted leading-relaxed">
                <strong>ייבא</strong> = שליפת המידע העדכני מהמערכת המקורית
                (מהיר, ללא עלות). השתמשי בזה אחרי שינוי קטלוג.
                {" "}
                <strong>אנדקס</strong> = בנייה מחדש של אינדקס החיפוש
                הסמנטי לאותו מקור (איטי יותר, צורך OpenAI). הסטטוס
                ליד כל מקור מראה מתי אונדקס לאחרונה.
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
                  const isEmbedding = runningSource === s.label;
                  const isImporting = importingSource === s.label;
                  const otherEmbedding =
                    runningSource !== null && runningSource !== s.label;
                  const indexed = s.indexed ?? 0;
                  const indexCoverage =
                    s.count > 0 ? Math.round((indexed / s.count) * 100) : 0;
                  const indexedNote =
                    indexed === 0
                      ? "טרם אונדקס"
                      : indexed === s.count
                        ? `אונדקס: ${formatRelativeHebrew(s.lastIndexedAt)}`
                        : `אונדקס חלקית (${indexed}/${s.count}, ${indexCoverage}%) · ${formatRelativeHebrew(s.lastIndexedAt)}`;
                  return (
                    <li key={s.label} className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-foreground truncate">
                            {s.label}
                          </div>
                          <div className="text-xs text-muted">
                            {s.count} מסמכים · {indexedNote}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            type="button"
                            onClick={() => handleImportSource(s.label)}
                            loading={isImporting}
                            disabled={isImporting || isEmbedding}
                            variant="ghost"
                            size="sm"
                            className="border border-border whitespace-nowrap"
                            title="שליפת המידע העדכני מהמערכת המקורית. לא צורך OpenAI."
                          >
                            <Database size={14} />
                            ייבא
                          </Button>
                          <Button
                            type="button"
                            onClick={() => handleEmbedSource(s.label)}
                            loading={isEmbedding}
                            disabled={isEmbedding || otherEmbedding || isImporting}
                            variant="ghost"
                            size="sm"
                            className="border border-border whitespace-nowrap"
                            title="בנייה מחדש של אינדקס החיפוש הסמנטי לכל המסמכים של המקור. כרוך בקריאות ל-OpenAI."
                          >
                            <Brain size={14} />
                            אנדקס
                          </Button>
                          {isEmbedding ? (
                            <Button
                              type="button"
                              onClick={handleStopSourceEmbed}
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "whitespace-nowrap",
                                "border border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700",
                              )}
                              title="עצירת האינדוקס של המקור הזה. הסבב שכבר נשלח לשרת ייתכן וישלים — אבל לא ייצא סבב חדש."
                            >
                              <Square size={14} />
                              עצרי
                            </Button>
                          ) : null}
                        </div>
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

/* ─── Document-type filter section ─────────────────────────────────────────
   Used by rulings pages (FOI / defamation) to let the admin restrict the
   displayed documents to a list of substring patterns matched against the
   AI-extracted title. Empty list = show everything. */

function DocTypeFilterSection({
  patterns,
  presets,
  description,
  onChange,
}: {
  patterns: string[];
  presets: string[];
  description?: string;
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  const add = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    if (patterns.some((p) => p === v)) return;
    onChange([...patterns, v]);
    setDraft("");
  };

  const remove = (idx: number) => {
    onChange(patterns.filter((_, i) => i !== idx));
  };

  const togglePreset = (preset: string) => {
    const idx = patterns.indexOf(preset);
    if (idx >= 0) remove(idx);
    else add(preset);
  };

  return (
    <SectionCard title="סינון לפי סוג מסמך" icon={Filter} defaultOpen>
      <div className="space-y-3">
        {description ? (
          <p className="text-xs text-muted leading-relaxed">{description}</p>
        ) : (
          <p className="text-xs text-muted leading-relaxed">
            מציג רק מסמכים שכותרת ה-AI שלהם כוללת אחת מהמילים למטה. רשימה
            ריקה = להציג הכל.
          </p>
        )}

        {/* Current patterns as removable chips */}
        {patterns.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {patterns.map((p, idx) => (
              <button
                key={`${p}-${idx}`}
                type="button"
                onClick={() => remove(idx)}
                className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-2 py-1 text-xs font-semibold text-primary hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition"
                title="הסרה"
              >
                <span>{p}</span>
                <Trash2 size={12} />
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted italic">
            אין מסננים מוגדרים — כרגע מוצגים כל סוגי המסמכים.
          </p>
        )}

        {/* Add new pattern */}
        <div className="flex items-center gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add(draft);
              }
            }}
            placeholder="לדוגמה: פסק דין"
            dir="rtl"
            className="flex-1"
          />
          <Button
            type="button"
            onClick={() => add(draft)}
            disabled={!draft.trim()}
            variant="ghost"
            size="sm"
            className="border border-border whitespace-nowrap"
          >
            <Plus size={14} />
            הוסף
          </Button>
        </div>

        {/* Preset toggles */}
        {presets.length > 0 ? (
          <div>
            <div className="text-xs font-semibold text-muted mb-1.5">
              הוספה מהירה:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((preset) => {
                const active = patterns.includes(preset);
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => togglePreset(preset)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition",
                      active
                        ? "border-primary bg-primary text-white"
                        : "border-border bg-white text-foreground hover:bg-muted-bg/30",
                    )}
                  >
                    {active ? (
                      <CheckCircle size={12} />
                    ) : (
                      <Plus size={12} />
                    )}
                    {preset}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}

// ─── Advanced query section ────────────────────────────────────────────────
// Visual builder for displayFields / filterFields / sortFields, all backed by
// a closed list of fields pulled from TAG-IT's schema endpoint. The structured
// FilterExpression (customQuery) stays a JSON textarea — it's recursive and
// not amenable to a flat row UI.

interface SchemaField {
  key: string;
  label?: string;
  type?: string;
  source?: string;
  enum_values_sample?: string[];
}

const CONTROL_LABELS: Record<FilterControl, string> = {
  text: "חיפוש חופשי",
  select: "בחירה מרשימה",
  number: "טווח מספרי",
  date: "טווח תאריכים",
};

// A searchable field combobox backed by the schema. Click to open a dropdown
// with a search box; type to filter by key or label. Any already-configured
// key that isn't in the schema is still selectable (tagged "מותאם") so an
// older config never silently loses a field.
function FieldSelect({
  value,
  onChange,
  fields,
  placeholder = "— בחר שדה —",
}: {
  value: string;
  onChange: (key: string) => void;
  fields: SchemaField[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  // Focus the search box when the dropdown opens.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const knownKeys = new Set(fields.map((f) => f.key));
  // Normalize away spaces / underscores / dots so a search like
  // "עתירת אי מתן מענה" matches the key "sql.עתירת_אי_מתן_מענה".
  const norm = (s: string) =>
    s.toLocaleLowerCase("he-IL").replace(/[\s_.]+/g, "");
  const rawSearch = search.trim();
  const nq = norm(rawSearch);
  // Match key/label, and also the field's sampled values — so searching for a
  // value (e.g. a petition type) surfaces the field that holds it.
  const matchesEnum = (f: SchemaField) =>
    Array.isArray(f.enum_values_sample) &&
    f.enum_values_sample.some((v) => norm(String(v)).includes(nq));
  const filtered = fields.filter((f) => {
    if (!nq) return true;
    return (
      norm(f.key).includes(nq) ||
      norm(f.label || "").includes(nq) ||
      matchesEnum(f)
    );
  });
  // Offer to add the typed value verbatim as a custom key when it isn't an
  // exact existing key — the schema endpoint doesn't always list every field
  // TAG-IT actually stores.
  const showCustomAdd =
    rawSearch !== "" && !knownKeys.has(rawSearch);
  // Cap the rendered list so 300+ fields don't tank the DOM; the search
  // narrows it well before the cap matters.
  const MAX_SHOWN = 100;
  const shown = filtered.slice(0, MAX_SHOWN);

  const selectKey = (key: string) => {
    onChange(key);
    setOpen(false);
    setSearch("");
  };

  const displayLabel = value
    ? knownKeys.has(value)
      ? (() => {
          const f = fields.find((x) => x.key === value);
          return f?.label && f.label !== value ? `${f.label} — ${f.key}` : value;
        })()
      : `${value} (מותאם)`
    : placeholder;

  return (
    <div ref={wrapRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        dir="ltr"
        className={cn(
          "w-full text-right border border-gray-300 rounded-md px-2 py-1.5 text-xs bg-white font-mono truncate",
          "hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-primary",
          !value && "text-gray-400",
        )}
        title={value || placeholder}
      >
        {displayLabel}
      </button>

      {open ? (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-gray-300 bg-white shadow-lg">
          <div className="p-1.5 border-b border-gray-100">
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש שדה…"
              dir="ltr"
              className="w-full border border-gray-200 rounded px-2 py-1 text-xs"
            />
          </div>
          <ul className="max-h-60 overflow-auto py-1 text-xs">
            {value ? (
              <li>
                <button
                  type="button"
                  onClick={() => selectKey("")}
                  className="w-full text-right px-2 py-1 text-gray-400 hover:bg-gray-50"
                >
                  — ניקוי בחירה —
                </button>
              </li>
            ) : null}
            {value && !knownKeys.has(value) ? (
              <li>
                <button
                  type="button"
                  onClick={() => selectKey(value)}
                  className="w-full text-right px-2 py-1 font-mono bg-amber-50 hover:bg-amber-100"
                >
                  {value} (מותאם)
                </button>
              </li>
            ) : null}
            {showCustomAdd ? (
              <li>
                <button
                  type="button"
                  onClick={() => selectKey(rawSearch)}
                  className="w-full text-right px-2 py-1 bg-amber-50 hover:bg-amber-100"
                >
                  הוסף מותאם:{" "}
                  <span className="font-mono text-gray-700">{rawSearch}</span>
                </button>
              </li>
            ) : null}
            {shown.length === 0 && !showCustomAdd ? (
              <li className="px-2 py-2 text-gray-400">לא נמצאו שדות</li>
            ) : null}
            {shown.map((f) => {
              const viaValue =
                nq !== "" &&
                !norm(f.key).includes(nq) &&
                !norm(f.label || "").includes(nq) &&
                matchesEnum(f);
              return (
                <li key={f.key}>
                  <button
                    type="button"
                    onClick={() => selectKey(f.key)}
                    className={cn(
                      "w-full text-right px-2 py-1 hover:bg-primary/5",
                      f.key === value && "bg-primary/10 font-semibold",
                    )}
                  >
                    <span className="font-mono text-gray-700">{f.key}</span>
                    {f.label && f.label !== f.key ? (
                      <span className="text-gray-400"> — {f.label}</span>
                    ) : null}
                    {viaValue ? (
                      <span className="text-amber-600"> (התאמה לפי ערך)</span>
                    ) : null}
                  </button>
                </li>
              );
            })}
            {filtered.length > MAX_SHOWN ? (
              <li className="px-2 py-1.5 text-gray-400 border-t border-gray-100">
                מוצגים {MAX_SHOWN} מתוך {filtered.length} — צמצמו עם חיפוש
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function AdvancedQuerySection({
  query,
  schemaHintUrl,
  examples,
  onChange,
  onlyCustomQuery = false,
  showApiParams = true,
}: {
  query: RulingsPageQuery;
  schemaHintUrl?: string;
  examples: { label: string; json: string }[];
  onChange: (next: RulingsPageQuery) => void;
  // When true, render only the base-filter (customQuery) editor — used by
  // dashboards that keep their own native display/filter/sort UI (class
  // actions, guidelines) and only need the admin base filter.
  onlyCustomQuery?: boolean;
  // When false, hide the scope/pageSize API-params block (used by pages whose
  // API doesn't read those — class actions, guidelines).
  showApiParams?: boolean;
}) {
  const customQueryStr = query.customQuery
    ? JSON.stringify(query.customQuery, null, 2)
    : "";
  const displayFieldsStr = (query.displayFields || []).join("\n");

  const [draft, setDraft] = useState(customQueryStr);
  const [draftErr, setDraftErr] = useState<string | null>(null);

  // Re-seed the draft only when the upstream content actually differs from
  // what we've parsed locally — otherwise typing would fight a re-render.
  useEffect(() => {
    if (draft.trim() === "" && customQueryStr === "") return;
    try {
      const parsed = draft.trim() ? JSON.parse(draft) : null;
      const sameAsContent =
        JSON.stringify(parsed) === JSON.stringify(query.customQuery);
      if (!sameAsContent) setDraft(customQueryStr);
    } catch {
      /* draft is mid-edit — leave it */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customQueryStr]);

  const commitQuery = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      setDraftErr(null);
      onChange({ ...query, customQuery: null });
      return;
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (!isValidFilterExpression(parsed)) {
        setDraftErr("מבנה לא תקין — חסר field/op או clauses לא תקינות");
        return;
      }
      setDraftErr(null);
      onChange({ ...query, customQuery: parsed });
    } catch (err) {
      setDraftErr(
        err instanceof Error ? `JSON לא תקין: ${err.message}` : "JSON לא תקין",
      );
    }
  };

  // ── API parameters (admin-controlled) ──
  const scopeValue = query.scope ?? 0;
  const pageSizeValue = query.pageSize ?? 12;

  // The schema field list depends on the scope; append the current scope to
  // the schema URL so changing it re-fetches the right field set live.
  const effectiveSchemaUrl =
    schemaHintUrl && scopeValue > 0
      ? `${schemaHintUrl}${schemaHintUrl.includes("?") ? "&" : "?"}scope=${scopeValue}`
      : schemaHintUrl;

  // ── Schema (closed field list) ──
  const [schemaFields, setSchemaFields] = useState<SchemaField[]>([]);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [schemaError, setSchemaError] = useState<string | null>(null);

  useEffect(() => {
    if (!effectiveSchemaUrl) return;
    let cancelled = false;
    setSchemaLoading(true);
    setSchemaError(null);
    fetch(effectiveSchemaUrl)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
        return json;
      })
      .then((json) => {
        if (cancelled) return;
        const fields: SchemaField[] = Array.isArray(json?.fields)
          ? json.fields
          : [];
        setSchemaFields(fields);
      })
      .catch((err) => {
        if (cancelled) return;
        setSchemaError(
          err instanceof Error ? err.message : "שגיאה בטעינת רשימת השדות",
        );
      })
      .finally(() => {
        if (!cancelled) setSchemaLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [effectiveSchemaUrl]);

  const labelForKey = (key: string): string => {
    const f = schemaFields.find((x) => x.key === key);
    if (f?.label && f.label !== key) return f.label;
    // Fall back to the trailing path segment, underscores → spaces.
    const tail = key.includes(".") ? key.split(".").slice(1).join(".") : key;
    return tail.replace(/_/g, " ");
  };

  // ── displayFields row handlers ──
  const displayFields = query.displayFields || [];
  const setDisplayFields = (list: string[]) =>
    onChange({ ...query, displayFields: list });
  const addDisplayField = () => setDisplayFields([...displayFields, ""]);
  const updateDisplayField = (i: number, key: string) => {
    const next = [...displayFields];
    next[i] = key;
    setDisplayFields(next);
  };
  const removeDisplayField = (i: number) =>
    setDisplayFields(displayFields.filter((_, idx) => idx !== i));

  // ── filterFields row handlers ──
  const filterFields = query.filterFields || [];
  const setFilterFields = (list: RulingsFilterField[]) =>
    onChange({ ...query, filterFields: list });
  const addFilterField = () =>
    setFilterFields([...filterFields, { key: "", label: "", control: "text" }]);
  const updateFilterField = (i: number, patch: Partial<RulingsFilterField>) => {
    const next = [...filterFields];
    next[i] = { ...next[i], ...patch };
    setFilterFields(next);
  };
  const removeFilterField = (i: number) =>
    setFilterFields(filterFields.filter((_, idx) => idx !== i));

  // ── sortFields row handlers ──
  const sortFields = query.sortFields || [];
  const setSortFields = (list: RulingsSortField[]) =>
    onChange({ ...query, sortFields: list });
  const addSortField = () =>
    setSortFields([...sortFields, { key: "", label: "" }]);
  const updateSortField = (i: number, patch: Partial<RulingsSortField>) => {
    const next = [...sortFields];
    next[i] = { ...next[i], ...patch };
    setSortFields(next);
  };
  const removeSortField = (i: number) =>
    setSortFields(sortFields.filter((_, idx) => idx !== i));

  const schemaStatus = schemaLoading ? (
    <span className="text-xs text-muted">טוען רשימת שדות…</span>
  ) : schemaError ? (
    <span className="text-xs text-red-600">
      שגיאה בטעינת השדות: {schemaError}
    </span>
  ) : (
    <span className="text-xs text-muted">
      {schemaFields.length} שדות זמינים מ-TAG-IT
    </span>
  );

  return (
    <SectionCard
      title={onlyCustomQuery ? "סינון בסיס (אדמין)" : "שאילתה מתקדמת + שדות תצוגה"}
      icon={Code}
    >
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted leading-relaxed">
            {onlyCustomQuery
              ? "סינון בסיס שמגביל אילו מסמכים יופיעו בדף, מעל המסננים הקיימים בדשבורד. שדה ריק = ללא סינון בסיס."
              : "הגדרת תצוגה, מסננים ומיון לדף — מתוך רשימת השדות של TAG-IT."}
          </p>
          {onlyCustomQuery ? null : schemaStatus}
        </div>

        {/* ── API parameters ── */}
        {onlyCustomQuery || !showApiParams ? null : (
        <div className="rounded-lg border border-border bg-muted-bg/20 p-3">
          <div className="text-xs font-semibold text-muted mb-2">
            פרמטרים של ה-API
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Input
                label="Scope (מזהה ב-TAG-IT)"
                type="number"
                min={1}
                value={scopeValue || ""}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  onChange({
                    ...query,
                    scope: Number.isFinite(n) && n > 0 ? Math.floor(n) : 0,
                  });
                }}
                dir="ltr"
                placeholder="ברירת מחדל לפי הקטגוריה"
              />
              <p className="mt-1 text-xs text-muted leading-relaxed">
                4 = לשון הרע · 6 = חופש מידע. ריק = ברירת המחדל של העמוד.
                שינוי כאן גם מעדכן את רשימת השדות למטה.
              </p>
            </div>
            <div>
              <Input
                label="מספר תוצאות בעמוד"
                type="number"
                min={1}
                max={50}
                value={pageSizeValue}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  onChange({
                    ...query,
                    pageSize:
                      Number.isFinite(n) && n > 0
                        ? Math.min(50, Math.floor(n))
                        : 12,
                  });
                }}
                dir="ltr"
              />
              <p className="mt-1 text-xs text-muted leading-relaxed">
                כמה כרטסות יוצגו בכל עמוד (1–50).
              </p>
            </div>
          </div>
        </div>
        )}

        {/* ── Custom query (JSON — unchanged) ── */}
        <div>
          {examples.length > 0 ? (
            <div className="mb-2">
              <div className="text-xs font-semibold text-muted mb-1.5">
                דוגמאות שאילתה מוכנות:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {examples.map((ex) => (
                  <button
                    key={ex.label}
                    type="button"
                    onClick={() => {
                      setDraft(ex.json);
                      commitQuery(ex.json);
                    }}
                    className="text-xs font-semibold rounded-md border border-border bg-white px-2 py-1 hover:bg-muted-bg/30 transition"
                  >
                    {ex.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="text-xs font-semibold text-muted mb-1.5">
            שאילתת סינון (JSON של FilterExpression)
          </div>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={(e) => commitQuery(e.target.value)}
            placeholder={
              '{\n  "op": "or",\n  "clauses": [\n    {"field":"ai.כותרת_המסמך","op":"contains","value":"החלטה"},\n    {"field":"sql.הוצאות_משפט","op":"gt","value":0}\n  ]\n}'
            }
            dir="ltr"
            rows={8}
            className="font-mono text-xs"
          />
          {draftErr ? (
            <p className="mt-1.5 text-xs text-red-600">{draftErr}</p>
          ) : (
            <p className="mt-1.5 text-xs text-muted">
              שדה ריק = ללא סינון מתקדם. השינוי נשמר בלחיצה מחוץ לטקסטבוקס.
            </p>
          )}
        </div>

        {onlyCustomQuery ? null : (
        <>
        {/* ── Display fields ── */}
        <div className="border-t border-border pt-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Layout size={12} className="text-muted" />
            <div className="text-xs font-semibold text-muted">
              שדות תצוגה בכרטסת
            </div>
          </div>
          <div className="space-y-2">
            {displayFields.map((key, i) => (
              <div key={i} className="flex items-center gap-2">
                <FieldSelect
                  value={key}
                  onChange={(k) => updateDisplayField(i, k)}
                  fields={schemaFields}
                />
                <button
                  type="button"
                  onClick={() => removeDisplayField(i)}
                  className="shrink-0 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-md p-1.5 border border-border"
                  title="הסר שדה"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addDisplayField}
            className="mt-2 border border-dashed border-border text-xs"
          >
            <Plus size={14} />
            הוסף שדה תצוגה
          </Button>
          <p className="mt-1.5 text-xs text-muted leading-relaxed">
            השדות שיוצגו בכל כרטסה, בסדר הזה. השדה הראשון מודגש ככותרת. רשימה
            ריקה = ברירת המחדל המובנית.
          </p>
        </div>

        {/* ── Filter fields ── */}
        <div className="border-t border-border pt-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Filter size={12} className="text-muted" />
            <div className="text-xs font-semibold text-muted">
              מסנני משתמש בדף
            </div>
          </div>
          <div className="space-y-2">
            {filterFields.map((f, i) => (
              <div
                key={i}
                className="rounded-lg border border-border bg-muted-bg/20 p-2.5 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <Input
                    value={f.label}
                    onChange={(e) =>
                      updateFilterField(i, { label: e.target.value })
                    }
                    placeholder="שם המסנן שיוצג למשתמש"
                    dir="rtl"
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => removeFilterField(i)}
                    className="shrink-0 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-md p-1.5 border border-border"
                    title="הסר מסנן"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <FieldSelect
                    value={f.key}
                    onChange={(k) =>
                      updateFilterField(i, {
                        key: k,
                        label: f.label || labelForKey(k),
                      })
                    }
                    fields={schemaFields}
                  />
                  <select
                    value={f.control}
                    onChange={(e) =>
                      updateFilterField(i, {
                        control: e.target.value as FilterControl,
                      })
                    }
                    className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs bg-white"
                    dir="rtl"
                  >
                    {VALID_FILTER_CONTROLS.map((c) => (
                      <option key={c} value={c}>
                        {CONTROL_LABELS[c]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addFilterField}
            className="mt-2 border border-dashed border-border text-xs"
          >
            <Plus size={14} />
            הוסף מסנן
          </Button>
          <p className="mt-1.5 text-xs text-muted leading-relaxed">
            כל מסנן: שם שיוצג למשתמש, שדה מהרשימה, וסוג פקד. רשימה ריקה = ללא
            סרגל סינון.
          </p>
        </div>

        {/* ── Sort fields ── */}
        <div className="border-t border-border pt-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Layout size={12} className="text-muted" />
            <div className="text-xs font-semibold text-muted">
              שדות מיון בדף
            </div>
          </div>
          <div className="space-y-2">
            {sortFields.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <FieldSelect
                    value={s.key}
                    onChange={(k) =>
                      updateSortField(i, {
                        key: k,
                        label: s.label || labelForKey(k),
                      })
                    }
                    fields={schemaFields}
                  />
                  <Input
                    value={s.label}
                    onChange={(e) =>
                      updateSortField(i, { label: e.target.value })
                    }
                    placeholder="תווית במיון"
                    dir="rtl"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeSortField(i)}
                  className="shrink-0 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-md p-1.5 border border-border"
                  title="הסר שדה מיון"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addSortField}
            className="mt-2 border border-dashed border-border text-xs"
          >
            <Plus size={14} />
            הוסף שדה מיון
          </Button>
          <p className="mt-1.5 text-xs text-muted leading-relaxed">
            <strong>השורה הראשונה היא ברירת המחדל.</strong> המשתמש בוחר שדה
            והופך כיוון (עולה/יורד) בדף. רשימה ריקה = מיון קבוע מהחדש לישן.
          </p>
        </div>
        </>
        )}
      </div>
    </SectionCard>
  );
}
