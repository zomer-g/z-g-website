"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";
import {
  Loader2,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Trash2,
  Plus,
} from "lucide-react";

interface FoiDoc {
  id: number;
  slug: string;
  url: string;
  title: string;
  order: number;
  chunkCount: number;
  textChars: number;
  caseLawCount: number;
  sectionCount: number;
  exampleCount: number;
  lastFetchedAt: string | null;
  updatedAt: string;
}

interface IngestResponse {
  total: number;
  fetched: number;
  skipped: number;
  rebuilt: number;
  chunksCreated: number;
  failed: number;
  failedSlugs: string[];
  durationMs: number;
  stoppedEarly?: boolean;
  note?: string;
  firstError?: { slug: string; message: string } | null;
}

interface McpInvite {
  id: string;
  email: string;
  createdAt: string;
  invitedBy: string | null;
  callsLast7Days: number;
}

interface McpUsage {
  id: number;
  email: string;
  tool: string;
  query: string | null;
  resultCount: number;
  createdAt: string;
}

const MCP_DOCS_URL = "https://modelcontextprotocol.io/";

export default function AdminFoiGuidePage() {
  const [docs, setDocs] = useState<FoiDoc[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [ingestRunning, setIngestRunning] = useState(false);
  const [ingestResult, setIngestResult] = useState<IngestResponse | null>(null);
  const [ingestError, setIngestError] = useState<string | null>(null);

  const [invites, setInvites] = useState<McpInvite[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteSaving, setInviteSaving] = useState(false);

  const [usage, setUsage] = useState<McpUsage[]>([]);

  const fetchDocs = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/foi-guide/docs", { cache: "no-store" });
      if (!res.ok) throw new Error("שגיאה בטעינת פרקי המדריך");
      const data = (await res.json()) as { docs: FoiDoc[] };
      setDocs(data.docs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  const fetchInvites = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/mcp-invites", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { invites: McpInvite[] };
      setInvites(data.invites);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchUsage = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/mcp-usage?limit=30", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { usage: McpUsage[] };
      setUsage(data.usage);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchDocs();
    fetchInvites();
    fetchUsage();
  }, [fetchDocs, fetchInvites, fetchUsage]);

  async function runIngest(force: boolean) {
    setIngestRunning(true);
    setIngestError(null);
    setIngestResult(null);
    try {
      let stoppedEarly = true;
      let lastResult: IngestResponse | null = null;
      // Continuation loop — soft-deadline server-side resumes on next call.
      while (stoppedEarly) {
        const res = await fetch(
          `/api/admin/foi-guide/ingest${force ? "?force=1" : ""}`,
          { method: "POST" },
        );
        const data = (await res.json()) as IngestResponse | { error: string };
        if (!res.ok) {
          throw new Error("error" in data ? data.error : "ingest failed");
        }
        lastResult = data as IngestResponse;
        stoppedEarly = !!lastResult.stoppedEarly;
        force = false; // only the first call needs force=1
      }
      setIngestResult(lastResult);
      await fetchDocs();
    } catch (err) {
      setIngestError(err instanceof Error ? err.message : "שגיאה לא צפויה");
    } finally {
      setIngestRunning(false);
    }
  }

  async function addInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteSaving(true);
    try {
      const res = await fetch("/api/admin/mcp-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        alert(data.error ?? "שגיאה בהוספת מוזמן");
      } else {
        setInviteEmail("");
        await fetchInvites();
      }
    } finally {
      setInviteSaving(false);
    }
  }

  async function removeInvite(email: string) {
    if (!window.confirm(`למחוק את ${email} מרשימת המוזמנים?`)) return;
    await fetch(
      `/api/admin/mcp-invites?email=${encodeURIComponent(email)}`,
      { method: "DELETE" },
    );
    await fetchInvites();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">מדריך חופש המידע</h1>
        <p className="mt-2 text-sm text-muted">
          סנכרון תוכן מ-
          <a
            href="https://foiguide.org.il/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            foiguide.org.il
          </a>{" "}
          וניהול גישת MCP. הפרקים נטענים, מחולקים ל-chunks, ומוטמעים ל-vector
          embeddings ל-search סמנטי דרך ה-MCP.
        </p>
      </div>

      {/* ── Ingest panel ── */}
      <section className="rounded-lg border border-border bg-background p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">סנכרון תוכן</h2>
            <p className="text-sm text-muted">
              קריאה לאינדקס, הורדת כל פרק, חישוב hash, embeddings ל-chunks חדשים/משתנים בלבד.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => runIngest(true)}
              disabled={ingestRunning}
              title="טעון מחדש את כל הפרקים גם אם hash לא השתנה"
            >
              {ingestRunning ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RefreshCw size={16} />
              )}
              סנכרון מלא (force)
            </Button>
            <Button
              size="sm"
              onClick={() => runIngest(false)}
              disabled={ingestRunning}
            >
              {ingestRunning ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RefreshCw size={16} />
              )}
              סנכרן עכשיו
            </Button>
          </div>
        </div>

        {ingestError && (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <div>שגיאה: {ingestError}</div>
          </div>
        )}

        {ingestResult && (
          <div className="mt-4 grid grid-cols-2 gap-3 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800 md:grid-cols-5">
            <Stat label="סה״כ פרקים" value={ingestResult.total} />
            <Stat label="הורד" value={ingestResult.fetched} />
            <Stat label="חודש" value={ingestResult.rebuilt} />
            <Stat label="ללא שינוי" value={ingestResult.skipped} />
            <Stat
              label="chunks חדשים"
              value={ingestResult.chunksCreated}
            />
            {ingestResult.failed > 0 && (
              <div className="col-span-2 md:col-span-5 text-red-700">
                כשלים: {ingestResult.failed} —{" "}
                {ingestResult.failedSlugs.join(", ")}
                {ingestResult.firstError && (
                  <div className="mt-1 text-xs">
                    {ingestResult.firstError.slug}: {ingestResult.firstError.message}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Chapters list ── */}
      <section className="rounded-lg border border-border bg-background">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">
            פרקי המדריך{" "}
            <span className="text-sm font-normal text-muted">
              ({docs.length})
            </span>
          </h2>
        </div>
        {loadingDocs ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : docs.length === 0 ? (
          <div className="p-8 text-center text-muted">
            אין עדיין פרקים. לחץ &quot;סנכרן עכשיו&quot; כדי לטעון.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="border-b border-border bg-gray-50 text-sm">
                  <th className="px-4 py-3 font-semibold">סדר</th>
                  <th className="px-4 py-3 font-semibold">כותרת</th>
                  <th className="px-4 py-3 font-semibold">chunks</th>
                  <th className="px-4 py-3 font-semibold">פסיקה</th>
                  <th className="px-4 py-3 font-semibold">סעיפים/דוגמאות</th>
                  <th className="px-4 py-3 font-semibold">סונכרן</th>
                  <th className="px-4 py-3 font-semibold">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => (
                  <tr key={d.id} className="border-b border-border last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-sm text-muted">{d.order}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{d.title}</div>
                      <div className="text-xs text-muted">{d.slug}</div>
                    </td>
                    <td className="px-4 py-3">
                      {d.chunkCount > 0 ? (
                        <Badge variant="success">
                          <CheckCircle2 size={12} className="inline" />{" "}
                          {d.chunkCount}
                        </Badge>
                      ) : (
                        <Badge variant="muted">—</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted">
                      {d.caseLawCount > 0 ? `${d.caseLawCount} פסקי דין` : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted">
                      {d.sectionCount > 0
                        ? `${d.sectionCount} סעיפים · ${d.exampleCount} דוגמאות`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted">
                      {d.lastFetchedAt ? formatDate(d.lastFetchedAt) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        <ExternalLink size={14} />
                        פתח
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── MCP invites ── */}
      <section className="rounded-lg border border-border bg-background">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">
            גישת MCP — רשימת מוזמנים
          </h2>
          <p className="mt-1 text-sm text-muted">
            ה-MCP נגיש דרך{" "}
            <code className="rounded bg-gray-100 px-1 text-xs">
              https://z-g.co.il/api/mcp/foi-guide
            </code>
            . רק כתובות אימייל שמופיעות כאן יכולות להזדהות. מידע על MCP:{" "}
            <a
              href={MCP_DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              modelcontextprotocol.io
            </a>
            .
          </p>
        </div>
        <div className="px-6 py-4">
          <form onSubmit={addInvite} className="flex gap-2">
            <Input
              type="email"
              placeholder="email@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              disabled={inviteSaving}
              dir="ltr"
              className="text-left"
            />
            <Button size="sm" type="submit" disabled={inviteSaving || !inviteEmail.trim()}>
              {inviteSaving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              הוסף
            </Button>
          </form>
          {invites.length === 0 ? (
            <p className="mt-4 text-sm text-muted">
              אין מוזמנים כרגע. הוסף כתובת כדי לאפשר גישת MCP.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {invites.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-muted" />
                    <span className="text-sm font-medium text-foreground" dir="ltr">
                      {inv.email}
                    </span>
                    {inv.callsLast7Days > 0 && (
                      <Badge variant="muted">
                        {inv.callsLast7Days} קריאות (7י׳)
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted">
                    <span>{formatDate(inv.createdAt)}</span>
                    <button
                      type="button"
                      onClick={() => removeInvite(inv.email)}
                      className="rounded p-1 hover:bg-red-100 hover:text-red-600"
                      aria-label={`מחק ${inv.email}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ── MCP recent calls ── */}
      <section className="rounded-lg border border-border bg-background">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              קריאות MCP אחרונות
            </h2>
            <p className="mt-1 text-sm text-muted">
              30 הקריאות האחרונות לכלי <code>foi_guide_search</code>. שימושי
              לאבחון hallucination — מה Claude שאל, ואיזה מספר תוצאות הוחזרו.
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={fetchUsage}>
            <RefreshCw size={14} /> רענן
          </Button>
        </div>
        {usage.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-muted">
            אין עדיין קריאות. כשתשאל את Claude שאלה שתפעיל את הכלי,
            הקריאה תופיע כאן.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="border-b border-border bg-gray-50 text-sm">
                  <th className="px-4 py-3 font-semibold">זמן</th>
                  <th className="px-4 py-3 font-semibold">משתמש</th>
                  <th className="px-4 py-3 font-semibold">שאילתה</th>
                  <th className="px-4 py-3 font-semibold">תוצאות</th>
                </tr>
              </thead>
              <tbody>
                {usage.map((u) => (
                  <tr key={u.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 text-xs text-muted whitespace-nowrap">
                      {formatDate(u.createdAt)}
                    </td>
                    <td className="px-4 py-2 text-xs text-muted" dir="ltr">
                      {u.email}
                    </td>
                    <td className="px-4 py-2 text-sm text-foreground">
                      <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">
                        {u.query ?? "—"}
                      </code>
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {u.resultCount === 0 ? (
                        <Badge variant="error">0</Badge>
                      ) : (
                        <Badge variant="success">{u.resultCount}</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-xs text-green-700">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
