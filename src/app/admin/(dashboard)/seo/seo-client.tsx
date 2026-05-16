"use client";

import { useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Loader2,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Target,
  FileText,
  AlertCircle,
  ExternalLink,
  LogIn,
} from "lucide-react";

/* ─── Auth status (mirrors lib/gsc.ts) ─── */

type AuthStatus =
  | { kind: "no-site-url" }
  | { kind: "user-missing-scope"; signInRequired: true }
  | { kind: "user-oauth" }
  | { kind: "service-account" };

/* ─── Types ─── */

type OpportunityRow = {
  query: string;
  page: string | null;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  potential: number;
};

type LowCtrRow = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

type TopPageRow = {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

type GscData = {
  days: number;
  opportunities: OpportunityRow[];
  lowCtr: LowCtrRow[];
  topPages: TopPageRow[];
  generatedAt: string;
};

type KeywordIdea = {
  query: string;
  intent: "informational" | "navigational" | "commercial" | "transactional";
  rationale: string;
  targetPage: string;
  estimatedDifficulty: "low" | "medium" | "high";
  suggestedActions: string[];
  contentGap?: string;
};

type BrainstormResult = {
  ideas: KeywordIdea[];
  model: string;
  generatedAt: string;
  contentDigest: { services: number; pages: number; posts: number };
};

type Tab = "gsc" | "ai";

/* ─── Helpers ─── */

const intentLabel: Record<KeywordIdea["intent"], string> = {
  informational: "מידע",
  navigational: "ניווט",
  commercial: "השוואה",
  transactional: "המרה",
};

const difficultyLabel: Record<KeywordIdea["estimatedDifficulty"], string> = {
  low: "קל",
  medium: "בינוני",
  high: "גבוה",
};

const difficultyVariant: Record<KeywordIdea["estimatedDifficulty"], "success" | "accent" | "error"> = {
  low: "success",
  medium: "accent",
  high: "error",
};

function formatPercent(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function formatPosition(n: number): string {
  return n.toFixed(1);
}

function pageRelativeUrl(full: string | null): string {
  if (!full) return "";
  try {
    return new URL(full).pathname;
  } catch {
    return full;
  }
}

/* ─── Component ─── */

export default function SeoClient({ authStatus }: { authStatus: AuthStatus }) {
  const gscReady = authStatus.kind === "user-oauth" || authStatus.kind === "service-account";
  const [tab, setTab] = useState<Tab>(gscReady ? "gsc" : "ai");

  /* GSC state */
  const [gscData, setGscData] = useState<GscData | null>(null);
  const [gscLoading, setGscLoading] = useState(false);
  const [gscError, setGscError] = useState<string | null>(null);
  const [gscDays, setGscDays] = useState(28);

  /* Brainstorm state */
  const [brainstorm, setBrainstorm] = useState<BrainstormResult | null>(null);
  const [brainLoading, setBrainLoading] = useState(false);
  const [brainError, setBrainError] = useState<string | null>(null);
  const [focusHint, setFocusHint] = useState("");

  async function loadGsc(days = gscDays) {
    setGscLoading(true);
    setGscError(null);
    try {
      const res = await fetch(`/api/admin/seo/gsc?days=${days}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) {
        setGscError(json.message || json.error || "שגיאה בטעינת נתוני Search Console");
        setGscData(null);
      } else {
        setGscData(json);
      }
    } catch (err) {
      setGscError(err instanceof Error ? err.message : "שגיאה לא ידועה");
    } finally {
      setGscLoading(false);
    }
  }

  async function runBrainstorm() {
    setBrainLoading(true);
    setBrainError(null);
    try {
      const res = await fetch("/api/admin/seo/brainstorm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ focusHint: focusHint.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) {
        setBrainError(json.message || json.error || "שגיאה בהפעלת ה-AI");
        setBrainstorm(null);
      } else {
        setBrainstorm(json);
      }
    } catch (err) {
      setBrainError(err instanceof Error ? err.message : "שגיאה לא ידועה");
    } finally {
      setBrainLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary-dark">קידום SEO</h1>
          <p className="mt-1 text-sm text-muted">
            איתור הזדמנויות מ-Search Console + הצעות ביטויי חיפוש מבוססות תוכן האתר
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <TabButton
          active={tab === "gsc"}
          onClick={() => setTab("gsc")}
          icon={TrendingUp}
          label="Search Console"
          disabled={!gscReady}
        />
        <TabButton
          active={tab === "ai"}
          onClick={() => setTab("ai")}
          icon={Sparkles}
          label="הצעות AI"
        />
      </div>

      {tab === "gsc" && (
        <GscPanel
          authStatus={authStatus}
          data={gscData}
          loading={gscLoading}
          error={gscError}
          days={gscDays}
          onDaysChange={(d) => {
            setGscDays(d);
            if (gscData) loadGsc(d);
          }}
          onLoad={() => loadGsc()}
        />
      )}

      {tab === "ai" && (
        <AiPanel
          result={brainstorm}
          loading={brainLoading}
          error={brainError}
          focusHint={focusHint}
          onFocusHintChange={setFocusHint}
          onRun={runBrainstorm}
        />
      )}
    </div>
  );
}

/* ─── Tab Button ─── */

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
        active
          ? "border-primary text-primary-dark"
          : "border-transparent text-muted hover:text-foreground",
        disabled && "cursor-not-allowed opacity-50 hover:text-muted",
      )}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

/* ─── GSC Panel ─── */

function GscPanel({
  authStatus,
  data,
  loading,
  error,
  days,
  onDaysChange,
  onLoad,
}: {
  authStatus: AuthStatus;
  data: GscData | null;
  loading: boolean;
  error: string | null;
  days: number;
  onDaysChange: (d: number) => void;
  onLoad: () => void;
}) {
  if (authStatus.kind === "no-site-url") {
    return <NoSiteUrlCard />;
  }
  if (authStatus.kind === "user-missing-scope") {
    return <SignInRequiredCard />;
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 p-4">
          <div className="flex items-center gap-2">
            <label htmlFor="gsc-days" className="text-sm font-medium text-foreground">
              טווח:
            </label>
            <select
              id="gsc-days"
              value={days}
              onChange={(e) => onDaysChange(Number(e.target.value))}
              className="rounded-md border border-border bg-white px-3 py-1.5 text-sm"
            >
              <option value={7}>7 ימים</option>
              <option value={28}>28 ימים</option>
              <option value={90}>90 ימים</option>
            </select>
          </div>
          <button
            type="button"
            onClick={onLoad}
            disabled={loading}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white",
              "hover:bg-primary-light disabled:opacity-50",
            )}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw size={16} />}
            {data ? "רענן נתונים" : "טען נתונים"}
          </button>
          {data && (
            <span className="text-xs text-muted">
              עודכן: {new Date(data.generatedAt).toLocaleString("he-IL")}
            </span>
          )}
        </CardContent>
      </Card>

      {error && <ErrorCard message={error} />}

      {data && (
        <>
          <OpportunitiesCard rows={data.opportunities} />
          <LowCtrCard rows={data.lowCtr} />
          <TopPagesCard rows={data.topPages} />
        </>
      )}

      {!data && !loading && !error && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted">
            לחץ &laquo;טען נתונים&raquo; כדי לשלוף את נתוני ה-Search Console האחרונים.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function NoSiteUrlCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertCircle className="text-error" size={18} />
          GSC_SITE_URL לא הוגדר
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-foreground">
        <p>
          הגדר במשתני הסביבה את <code className="rounded bg-muted-bg px-1 font-mono text-xs">GSC_SITE_URL</code> לכתובת הנכס המאומת שלך ב-Search Console:
        </p>
        <ul className="list-disc space-y-1 pr-5 font-mono text-xs text-muted">
          <li><code>https://z-g.co.il/</code> — לנכס URL-prefix</li>
          <li><code>sc-domain:z-g.co.il</code> — לנכס Domain</li>
        </ul>
        <p className="text-muted">טען את הדף מחדש לאחר ההגדרה.</p>
      </CardContent>
    </Card>
  );
}

async function reauthorize() {
  // Force a fresh sign-out then sign-in to make Google show the consent screen
  // for the new webmasters.readonly scope.
  await signOut({ redirect: false });
  await signIn("google", { callbackUrl: "/admin/seo" });
}

function SignInRequiredCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <LogIn className="text-primary" size={18} />
          נדרשת הרשאת קריאה ל-Search Console
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-foreground">
        <p>
          הוספנו הרשאה חדשה (<code className="rounded bg-muted-bg px-1 font-mono text-xs">webmasters.readonly</code>) שמאפשרת לקרוא את הדוחות שלך מ-Search Console
          ישירות דרך החשבון שאיתו אתה מתחבר ללוח האדמין. אתה צריך להתחבר מחדש פעם אחת כדי לאשר את ההרשאה — Google יבקש ממך אישור מפורש.
        </p>
        <p className="text-muted">
          אחרי שתאשר, תחזור אוטומטית לעמוד הזה והנתונים יהיו זמינים. ההרשאה היא לקריאה בלבד.
        </p>
        <button
          type="button"
          onClick={reauthorize}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white",
            "hover:bg-primary-light",
          )}
        >
          <LogIn size={16} />
          התחברות מחדש לאישור ההרשאה
        </button>
      </CardContent>
    </Card>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <AlertCircle className="mt-0.5 shrink-0 text-error" size={18} />
        <div className="text-sm text-foreground">{message}</div>
      </CardContent>
    </Card>
  );
}

/* ─── Tables ─── */

function OpportunitiesCard({ rows }: { rows: OpportunityRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target size={18} className="text-primary" />
          הזדמנויות &laquo;ניצחון מהיר&raquo; ({rows.length})
        </CardTitle>
        <p className="text-sm text-muted">
          חיפושים שמופיעים בעמודים 5-25. שיפור התאמת התוכן וה-title יכול
          להעלות אותם לדף הראשון ולהוסיף קליקים.
        </p>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">לא נמצאו הזדמנויות בטווח שנבחר.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" dir="rtl">
              <thead>
                <tr className="border-b border-border text-right text-xs uppercase text-muted">
                  <th className="py-2 font-medium">חיפוש</th>
                  <th className="py-2 font-medium">עמוד</th>
                  <th className="py-2 font-medium">מיקום</th>
                  <th className="py-2 font-medium">חשיפות</th>
                  <th className="py-2 font-medium">קליקים</th>
                  <th className="py-2 font-medium">CTR</th>
                  <th className="py-2 font-medium">פוטנציאל</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r, i) => {
                  const pagePath = pageRelativeUrl(r.page);
                  return (
                    <tr key={i} className="hover:bg-muted-bg/50">
                      <td className="py-2 font-medium text-foreground">{r.query}</td>
                      <td className="py-2 text-xs text-muted">
                        {pagePath ? (
                          <a
                            href={pagePath}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 hover:text-primary"
                          >
                            {pagePath}
                            <ExternalLink size={11} />
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-2 tabular-nums">{formatPosition(r.position)}</td>
                      <td className="py-2 tabular-nums">{r.impressions.toLocaleString("he-IL")}</td>
                      <td className="py-2 tabular-nums">{r.clicks}</td>
                      <td className="py-2 tabular-nums">{formatPercent(r.ctr)}</td>
                      <td className="py-2">
                        <Badge variant={r.potential > 20 ? "success" : "muted"}>
                          +{r.potential}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LowCtrCard({ rows }: { rows: LowCtrRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertCircle size={18} className="text-error" />
          חיפושים בעמוד הראשון עם CTR נמוך ({rows.length})
        </CardTitle>
        <p className="text-sm text-muted">
          מופיעים גבוה אבל לא מקבלים קליקים — סימן שה-title או ה-meta description לא מושכים.
          ערוך אותם בעמוד היעד.
        </p>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">אין חיפושים כאלה — יופי.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" dir="rtl">
              <thead>
                <tr className="border-b border-border text-right text-xs uppercase text-muted">
                  <th className="py-2 font-medium">חיפוש</th>
                  <th className="py-2 font-medium">מיקום</th>
                  <th className="py-2 font-medium">חשיפות</th>
                  <th className="py-2 font-medium">קליקים</th>
                  <th className="py-2 font-medium">CTR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r, i) => (
                  <tr key={i} className="hover:bg-muted-bg/50">
                    <td className="py-2 font-medium text-foreground">{r.query}</td>
                    <td className="py-2 tabular-nums">{formatPosition(r.position)}</td>
                    <td className="py-2 tabular-nums">{r.impressions.toLocaleString("he-IL")}</td>
                    <td className="py-2 tabular-nums">{r.clicks}</td>
                    <td className="py-2 tabular-nums">{formatPercent(r.ctr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TopPagesCard({ rows }: { rows: TopPageRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText size={18} className="text-accent" />
          עמודים מובילים ({rows.length})
        </CardTitle>
        <p className="text-sm text-muted">לפי חשיפות בטווח שנבחר.</p>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">אין נתונים.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" dir="rtl">
              <thead>
                <tr className="border-b border-border text-right text-xs uppercase text-muted">
                  <th className="py-2 font-medium">עמוד</th>
                  <th className="py-2 font-medium">חשיפות</th>
                  <th className="py-2 font-medium">קליקים</th>
                  <th className="py-2 font-medium">CTR</th>
                  <th className="py-2 font-medium">מיקום ממוצע</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r, i) => {
                  const pagePath = pageRelativeUrl(r.page);
                  return (
                    <tr key={i} className="hover:bg-muted-bg/50">
                      <td className="py-2 text-xs text-muted">
                        <a
                          href={pagePath}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 hover:text-primary"
                        >
                          {pagePath}
                          <ExternalLink size={11} />
                        </a>
                      </td>
                      <td className="py-2 tabular-nums">{r.impressions.toLocaleString("he-IL")}</td>
                      <td className="py-2 tabular-nums">{r.clicks}</td>
                      <td className="py-2 tabular-nums">{formatPercent(r.ctr)}</td>
                      <td className="py-2 tabular-nums">{formatPosition(r.position)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── AI Panel ─── */

function AiPanel({
  result,
  loading,
  error,
  focusHint,
  onFocusHintChange,
  onRun,
}: {
  result: BrainstormResult | null;
  loading: boolean;
  error: string | null;
  focusHint: string;
  onFocusHintChange: (s: string) => void;
  onRun: () => void;
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles size={18} className="text-primary" />
            הצעות ביטויי חיפוש לקידום
          </CardTitle>
          <p className="text-sm text-muted">
            ה-AI סורק את התכנים הקיימים באתר (תחומי עיסוק, עמודי נחיתה, מאמרים)
            ומציע ביטויי חיפוש שכדאי לקדם — כולל פעולה ספציפית לכל ביטוי.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label htmlFor="focus-hint" className="mb-1 block text-sm font-medium text-foreground">
              דגש לסבב הזה (אופציונלי)
            </label>
            <input
              id="focus-hint"
              type="text"
              value={focusHint}
              onChange={(e) => onFocusHintChange(e.target.value)}
              placeholder="למשל: התמקד בתחום הסנגוריה הציבורית"
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onRun}
              disabled={loading}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white",
                "hover:bg-primary-light disabled:opacity-50",
              )}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles size={16} />}
              הפק הצעות
            </button>
            {result && (
              <span className="text-xs text-muted">
                {result.contentDigest.services} תחומים, {result.contentDigest.pages} עמודים, {result.contentDigest.posts} מאמרים
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {error && <ErrorCard message={error} />}

      {result && (
        <div className="space-y-4">
          {result.ideas.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center text-sm text-muted">
                ה-AI לא החזיר הצעות. נסה שוב או הוסף דגש ממוקד יותר.
              </CardContent>
            </Card>
          ) : (
            result.ideas.map((idea, i) => <IdeaCard key={i} idea={idea} />)
          )}
        </div>
      )}
    </div>
  );
}

function IdeaCard({ idea }: { idea: KeywordIdea }) {
  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-primary-dark">{idea.query}</h3>
            <p className="mt-1 text-xs text-muted">{idea.rationale}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Badge variant="default">{intentLabel[idea.intent]}</Badge>
            <Badge variant={difficultyVariant[idea.estimatedDifficulty]}>
              קושי: {difficultyLabel[idea.estimatedDifficulty]}
            </Badge>
          </div>
        </div>

        <div className="rounded-md bg-muted-bg/60 p-3 text-sm">
          <span className="text-xs font-medium text-muted">עמוד יעד: </span>
          <a
            href={idea.targetPage}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
          >
            {idea.targetPage}
            <ExternalLink size={11} />
          </a>
          {idea.contentGap && (
            <p className="mt-2 text-xs text-error">
              <strong>פער תוכן:</strong> {idea.contentGap}
            </p>
          )}
        </div>

        {idea.suggestedActions.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-medium text-muted">פעולות מומלצות:</p>
            <ul className="list-disc space-y-1 pr-5 text-sm text-foreground">
              {idea.suggestedActions.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
