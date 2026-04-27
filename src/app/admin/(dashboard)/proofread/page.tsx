"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Loader2,
  SpellCheck,
  Play,
  Square,
  RefreshCcw,
  AlertTriangle,
  CheckCircle,
  Copy,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Wand2,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ContentItem {
  source: string;
  text: string;
}

interface ProofreadIssue {
  source: string;
  original: string;
  suggestion: string;
  reason: string;
}

interface CollectResponse {
  items: ContentItem[];
  total: number;
  batchSize: number;
  totalBatches: number;
}

interface CheckResponse {
  issues?: ProofreadIssue[];
  error?: string;
}

interface RunState {
  startedAt: number;
  total: number;
  totalBatches: number;
  doneBatches: number;
  issues: ProofreadIssue[];
  failed: number;
  abort: AbortController;
}

function groupKey(source: string): string {
  // "defaults:home.hero.title" → "defaults:home"
  // "db:Page[home]:content" → "db:Page[home]"
  const colonIdx = source.indexOf(":");
  if (colonIdx === -1) return source;
  const prefix = source.slice(0, colonIdx);
  const rest = source.slice(colonIdx + 1);
  // For DB sources, keep the [slug] bracket as part of the group.
  const bracketEnd = rest.indexOf("]");
  if (bracketEnd !== -1) {
    return `${prefix}:${rest.slice(0, bracketEnd + 1)}`;
  }
  // For defaults, group by first dot segment.
  const dotIdx = rest.indexOf(".");
  return dotIdx === -1 ? `${prefix}:${rest}` : `${prefix}:${rest.slice(0, dotIdx)}`;
}

interface IssueState {
  status: "pending" | "applying" | "applied" | "error";
  error?: string;
  contextLoading?: boolean;
  context?: { before: string; after: string };
  editUrl?: string | null;
  editLabel?: string | null;
  applicable?: boolean;
  contextOpen?: boolean;
}

function IssueRow({
  issue,
  state,
  onApply,
  onLoadContext,
  onToggleContext,
}: {
  issue: ProofreadIssue;
  state: IssueState;
  onApply: () => void;
  onLoadContext: () => void;
  onToggleContext: () => void;
}) {
  return (
    <li
      className={cn(
        "p-4 space-y-2 transition-opacity",
        state.status === "applied" && "opacity-50",
      )}
    >
      <div className="text-xs font-mono text-gray-700 break-all">
        {issue.source}
      </div>
      <div className="text-sm">
        <span className="font-semibold text-gray-700">מקורי:</span>{" "}
        <span className="bg-red-50 px-1 rounded">{issue.original}</span>
      </div>
      <div className="text-sm flex items-center flex-wrap gap-2">
        <span className="font-semibold text-gray-700">הצעה:</span>
        <span className="bg-green-50 px-1 rounded">{issue.suggestion}</span>
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(issue.suggestion).catch(() => {})}
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          title="העתק את ההצעה"
        >
          <Copy size={12} />
        </button>
      </div>
      <div className="text-xs text-gray-700 leading-relaxed">
        <span className="font-semibold">סיבה:</span> {issue.reason}
      </div>

      {/* Context view */}
      {state.contextOpen ? (
        <div className="mt-2 rounded-lg border border-border bg-muted-bg/40 p-3 text-sm leading-relaxed">
          {state.contextLoading ? (
            <div className="flex items-center gap-2 text-xs text-gray-700">
              <Loader2 size={14} className="animate-spin" />
              טוען הקשר...
            </div>
          ) : state.context ? (
            <div className="space-y-1">
              {state.context.before ? (
                <div className="text-xs text-gray-700 italic">
                  …{state.context.before}
                </div>
              ) : null}
              <div className="font-semibold">
                <span className="bg-yellow-100 px-1 rounded">{issue.original}</span>
              </div>
              {state.context.after ? (
                <div className="text-xs text-gray-700 italic">
                  {state.context.after}…
                </div>
              ) : null}
              {!state.context.before && !state.context.after ? (
                <div className="text-xs text-gray-700">
                  אין טקסט סמוך זמין (זה השדה היחיד בקטע).
                </div>
              ) : null}
            </div>
          ) : (
            <div className="text-xs text-gray-700">לא ניתן לטעון הקשר.</div>
          )}
        </div>
      ) : null}

      {/* Action row */}
      <div className="flex items-center gap-2 flex-wrap pt-1">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="border border-border"
          onClick={() => {
            if (!state.context && !state.contextLoading) onLoadContext();
            onToggleContext();
          }}
        >
          <FileText size={14} />
          {state.contextOpen ? "סגור הקשר" : "הצג בהקשר"}
        </Button>
        {state.editUrl ? (
          <Link href={state.editUrl} target="_blank" rel="noopener noreferrer">
            <Button type="button" size="sm" variant="ghost" className="border border-border">
              <ExternalLink size={14} />
              {state.editLabel ?? "פתח לעריכה"}
            </Button>
          </Link>
        ) : null}
        {state.applicable === false ? (
          <span className="inline-flex items-center gap-1 text-xs text-gray-700">
            <AlertTriangle size={14} />
            תיקון אוטומטי לא אפשרי (ערך בקוד)
          </span>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={onApply}
            disabled={state.status === "applying" || state.status === "applied"}
          >
            {state.status === "applying" ? (
              <Loader2 size={14} className="animate-spin" />
            ) : state.status === "applied" ? (
              <CheckCircle size={14} />
            ) : (
              <Wand2 size={14} />
            )}
            {state.status === "applied" ? "הוחל" : "החל תיקון"}
          </Button>
        )}
        {state.status === "error" && state.error ? (
          <span className="inline-flex items-center gap-1 text-xs text-red-700">
            <AlertTriangle size={14} />
            {state.error}
          </span>
        ) : null}
      </div>
    </li>
  );
}

function GroupSection({
  title,
  issues,
  states,
  onApply,
  onLoadContext,
  onToggleContext,
  keyOf,
}: {
  title: string;
  issues: ProofreadIssue[];
  states: Map<string, IssueState>;
  onApply: (key: string) => void;
  onLoadContext: (key: string) => void;
  onToggleContext: (key: string) => void;
  keyOf: (iss: ProofreadIssue, idx: number) => string;
}) {
  const [open, setOpen] = useState(true);
  const remaining = issues.filter((iss, i) => states.get(keyOf(iss, i))?.status !== "applied").length;

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between p-4 text-right hover:bg-muted-bg/50 transition-colors duration-150 rounded-t-xl"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-foreground">{title}</span>
          <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-semibold">
            {remaining}/{issues.length}
          </span>
        </div>
        {open ? (
          <ChevronUp size={18} className="text-muted" />
        ) : (
          <ChevronDown size={18} className="text-muted" />
        )}
      </button>
      {open ? (
        <CardContent className="border-t border-border p-0">
          <ul className="divide-y divide-border">
            {issues.map((iss, i) => {
              const k = keyOf(iss, i);
              const st: IssueState = states.get(k) ?? { status: "pending" };
              return (
                <IssueRow
                  key={k}
                  issue={iss}
                  state={st}
                  onApply={() => onApply(k)}
                  onLoadContext={() => onLoadContext(k)}
                  onToggleContext={() => onToggleContext(k)}
                />
              );
            })}
          </ul>
        </CardContent>
      ) : null}
    </Card>
  );
}

export default function ProofreadAdminPage() {
  const [run, setRun] = useState<RunState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [collected, setCollected] = useState(false);

  // Per-issue state for actions: applied / context loaded / context open / etc.
  const [issueStates, setIssueStates] = useState<Map<string, IssueState>>(
    new Map(),
  );

  const issueKey = useCallback(
    (iss: ProofreadIssue) => `${iss.source}|${iss.original}|${iss.suggestion}`,
    [],
  );

  const updateIssueState = useCallback(
    (key: string, patch: Partial<IssueState>) => {
      setIssueStates((prev) => {
        const next = new Map(prev);
        const cur = next.get(key) ?? { status: "pending" as const };
        next.set(key, { ...cur, ...patch });
        return next;
      });
    },
    [],
  );

  const findIssueByKey = useCallback(
    (key: string): ProofreadIssue | null => {
      const all = run?.issues ?? [];
      for (const iss of all) {
        if (issueKey(iss) === key) return iss;
      }
      return null;
    },
    [run, issueKey],
  );

  const onLoadContext = useCallback(
    async (key: string) => {
      const iss = findIssueByKey(key);
      if (!iss) return;
      updateIssueState(key, { contextLoading: true });
      try {
        const res = await fetch("/api/admin/proofread/context", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source: iss.source }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as {
          before: string;
          after: string;
          editUrl: string | null;
          editLabel: string | null;
          applicable: boolean;
        };
        updateIssueState(key, {
          contextLoading: false,
          context: { before: data.before, after: data.after },
          editUrl: data.editUrl,
          editLabel: data.editLabel,
          applicable: data.applicable,
        });
      } catch {
        updateIssueState(key, {
          contextLoading: false,
          context: { before: "", after: "" },
        });
      }
    },
    [findIssueByKey, updateIssueState],
  );

  const onToggleContext = useCallback(
    (key: string) => {
      setIssueStates((prev) => {
        const next = new Map(prev);
        const cur = next.get(key) ?? { status: "pending" as const };
        next.set(key, { ...cur, contextOpen: !cur.contextOpen });
        return next;
      });
    },
    [],
  );

  const onApply = useCallback(
    async (key: string) => {
      const iss = findIssueByKey(key);
      if (!iss) return;
      updateIssueState(key, { status: "applying", error: undefined });
      try {
        const res = await fetch("/api/admin/proofread/apply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source: iss.source,
            original: iss.original,
            suggestion: iss.suggestion,
          }),
        });
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        if (!res.ok) {
          throw new Error(body?.error ?? `HTTP ${res.status}`);
        }
        updateIssueState(key, { status: "applied" });
      } catch (err) {
        updateIssueState(key, {
          status: "error",
          error: err instanceof Error ? err.message : "שגיאה",
        });
      }
    },
    [findIssueByKey, updateIssueState],
  );

  const start = useCallback(async () => {
    setError(null);
    setRunning(true);
    setCollected(false);
    setIssueStates(new Map());

    const abort = new AbortController();
    let state: RunState = {
      startedAt: Date.now(),
      total: 0,
      totalBatches: 0,
      doneBatches: 0,
      issues: [],
      failed: 0,
      abort,
    };
    setRun(state);

    try {
      // 1. Collect.
      const collectRes = await fetch("/api/admin/proofread/collect", {
        method: "POST",
        signal: abort.signal,
      });
      if (!collectRes.ok) {
        const body = await collectRes.json().catch(() => null);
        throw new Error(body?.error || `שגיאה באיסוף תוכן (${collectRes.status})`);
      }
      const data = (await collectRes.json()) as CollectResponse;
      state = {
        ...state,
        total: data.total,
        totalBatches: data.totalBatches,
      };
      setRun(state);
      setCollected(true);

      // 2. Walk batches.
      const batchSize = data.batchSize;
      for (let i = 0; i < data.items.length; i += batchSize) {
        if (abort.signal.aborted) break;
        const batch = data.items.slice(i, i + batchSize);
        try {
          const checkRes = await fetch("/api/admin/proofread/check", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: batch }),
            signal: abort.signal,
          });
          const out = (await checkRes.json()) as CheckResponse;
          if (!checkRes.ok) {
            state = { ...state, doneBatches: state.doneBatches + 1, failed: state.failed + 1 };
          } else {
            state = {
              ...state,
              doneBatches: state.doneBatches + 1,
              issues: [...state.issues, ...(out.issues ?? [])],
            };
          }
        } catch (err) {
          if ((err as Error)?.name === "AbortError") break;
          state = { ...state, doneBatches: state.doneBatches + 1, failed: state.failed + 1 };
        }
        setRun({ ...state });
      }
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        setError(err instanceof Error ? err.message : "שגיאה לא ידועה");
      }
    } finally {
      setRunning(false);
    }
  }, []);

  const stop = useCallback(() => {
    run?.abort.abort();
  }, [run]);

  const reset = useCallback(() => {
    setRun(null);
    setError(null);
    setCollected(false);
    setIssueStates(new Map());
  }, []);

  const total = run?.total ?? 0;
  const totalBatches = run?.totalBatches ?? 0;
  const done = run?.doneBatches ?? 0;
  const issues = run?.issues ?? [];
  const failed = run?.failed ?? 0;
  const finished = !running && done > 0 && done >= totalBatches;
  const elapsedSec = run ? Math.round((Date.now() - run.startedAt) / 1000) : 0;
  const progressPct = totalBatches > 0 ? Math.round((done / totalBatches) * 100) : 0;

  // Group issues by area for the report.
  const grouped = new Map<string, ProofreadIssue[]>();
  for (const iss of issues) {
    const key = groupKey(iss.source);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(iss);
  }
  const groups = Array.from(grouped.entries()).sort((a, b) =>
    a[0].localeCompare(b[0]),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary-dark flex items-center gap-2">
            <SpellCheck size={24} className="text-primary" />
            הגהה אוטומטית
          </h1>
          <p className="text-sm text-gray-700 mt-1 leading-relaxed">
            סורק את כל הטקסטים בעברית באתר (ברירות מחדל + מסד הנתונים) ומחפש
            טעויות כתיב, דקדוק וניסוח. מבוסס gpt-4o-mini, עלות הרצה ~$0.01.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!running && !run ? (
            <Button onClick={start}>
              <Play size={16} />
              התחל הגהה
            </Button>
          ) : null}
          {running ? (
            <Button onClick={stop} variant="ghost" className="border border-border">
              <Square size={16} />
              עצור
            </Button>
          ) : null}
          {!running && run ? (
            <>
              <Button onClick={reset} variant="ghost" className="border border-border">
                <RefreshCcw size={16} />
                איפוס
              </Button>
              <Button onClick={start}>
                <Play size={16} />
                הרץ שוב
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      ) : null}

      {run ? (
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                {running ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-primary" />
                    <span>
                      {!collected
                        ? "אוסף טקסטים..."
                        : `מעבד אצוות ${done}/${totalBatches}`}
                    </span>
                  </>
                ) : finished ? (
                  <>
                    <CheckCircle size={16} className="text-green-700" />
                    <span>הסתיים</span>
                  </>
                ) : null}
                {failed > 0 ? (
                  <span className="text-red-700">
                    ({failed} אצוות נכשלו)
                  </span>
                ) : null}
              </div>
              <div className="text-xs text-gray-700 tabular-nums">
                {total > 0 ? `${total} מחרוזות` : null}
                {elapsedSec > 0 ? ` • ${elapsedSec} שניות` : null}
                {issues.length > 0 ? ` • ${issues.length} בעיות` : null}
              </div>
            </div>
            {totalBatches > 0 ? (
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-200",
                    running ? "bg-primary" : "bg-green-700",
                  )}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {issues.length > 0 ? (
        <div className="space-y-4">
          {groups.map(([key, list]) => (
            <GroupSection
              key={key}
              title={key}
              issues={list}
              states={issueStates}
              onApply={onApply}
              onLoadContext={onLoadContext}
              onToggleContext={onToggleContext}
              keyOf={(iss) => issueKey(iss)}
            />
          ))}
        </div>
      ) : finished && !error ? (
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle size={32} className="mx-auto text-green-700 mb-3" />
            <p className="text-sm font-semibold text-gray-700">
              לא זוהו טעויות בכל הטקסטים שנסרקו.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
