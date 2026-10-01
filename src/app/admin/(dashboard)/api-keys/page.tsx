"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Copy, KeyRound, Loader2, Trash2 } from "lucide-react";

interface ApiKeyRow {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  lastUsedAt: string | null;
  lastUsedIp: string | null;
}

interface LogRow {
  id: number;
  method: string;
  path: string;
  target: string | null;
  status: number;
  ip: string | null;
  createdAt: string;
  key: { name: string };
}

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" }) : "—";

export default function ApiKeysPage() {
  const [scopes, setScopes] = useState<Record<string, string>>({});
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [picked, setPicked] = useState<string[]>(["plilist:draft"]);
  const [days, setDays] = useState(30);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/api-keys", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "שגיאה בטעינה");
      setScopes(data.scopes);
      setKeys(data.keys);
      setLogs(data.logs);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה בטעינה");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function create() {
    setCreating(true);
    setNewKey(null);
    setCopied(false);
    try {
      const res = await fetch("/api/admin/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, scopes: picked, days }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "שגיאה ביצירה");
      setNewKey(data.key);
      setName("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה ביצירה");
    } finally {
      setCreating(false);
    }
  }

  async function revoke(k: ApiKeyRow) {
    if (!confirm(`לבטל את המפתח "${k.name}"? אי אפשר לבטל את הביטול.`)) return;
    const res = await fetch(`/api/admin/api-keys/${k.id}`, { method: "DELETE" });
    if (!res.ok) setError((await res.json()).error ?? "שגיאה בביטול");
    await load();
  }

  const status = (k: ApiKeyRow) => {
    if (k.revokedAt) return <Badge variant="error">בוטל</Badge>;
    if (k.expiresAt && new Date(k.expiresAt) <= new Date()) return <Badge variant="muted">פג תוקף</Badge>;
    return <Badge variant="success">פעיל</Badge>;
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <KeyRound size={24} aria-hidden="true" /> מפתחות API
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          מפתח מאפשר לכלי חיצוני (למשל Claude) לכתוב לאתר דרך <code dir="ltr">/api/v1</code>, רק
          בהרשאות שנבחרו. המפתח מוצג פעם אחת בלבד, ונשמר באתר רק כגיבוב. כל קריאה נרשמת ביומן למטה.
          טיוטות שנוצרות דרך ה-API לא מתפרסמות עד שמפרסמים אותן כאן בממשק הניהול.
        </p>
      </div>

      {error && <p className="rounded-md bg-error/10 p-3 text-sm text-error">{error}</p>}

      <section className="rounded-lg border border-border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">מפתח חדש</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="שם (למי המפתח)" value={name} onChange={(e) => setName(e.target.value)} placeholder="Claude — העלאת טיוטות" />
          <Input
            label="תוקף בימים (עד 365)"
            type="number"
            min={1}
            max={365}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          />
        </div>
        <fieldset className="mt-4">
          <legend className="mb-2 text-sm font-medium">הרשאות</legend>
          {Object.entries(scopes).map(([scope, label]) => (
            <label key={scope} className="flex items-start gap-2 py-1 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={picked.includes(scope)}
                onChange={(e) =>
                  setPicked((p) => (e.target.checked ? [...p, scope] : p.filter((s) => s !== scope)))
                }
              />
              <span>
                <code dir="ltr">{scope}</code> — {label}
              </span>
            </label>
          ))}
        </fieldset>
        <Button className="mt-4" onClick={create} disabled={creating || !name.trim() || picked.length === 0}>
          {creating ? <Loader2 className="animate-spin" size={16} aria-hidden="true" /> : null}
          יצירת מפתח
        </Button>

        {newKey && (
          <div className="mt-4 rounded-md border border-accent bg-accent/10 p-4">
            <p className="text-sm font-semibold">
              העתיקו את המפתח עכשיו. הוא לא יוצג שוב, ואי אפשר לשחזר אותו.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code dir="ltr" className="flex-1 break-all rounded bg-white p-2 text-sm">
                {newKey}
              </code>
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(newKey);
                  setCopied(true);
                }}
              >
                <Copy size={14} aria-hidden="true" /> {copied ? "הועתק" : "העתקה"}
              </Button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">מפתחות</h2>
        {loading ? (
          <Loader2 className="animate-spin" aria-label="טוען" />
        ) : keys.length === 0 ? (
          <p className="text-sm text-muted">אין מפתחות.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-right text-muted">
                  <th className="p-2">שם</th>
                  <th className="p-2">מפתח</th>
                  <th className="p-2">הרשאות</th>
                  <th className="p-2">מצב</th>
                  <th className="p-2">תוקף עד</th>
                  <th className="p-2">שימוש אחרון</th>
                  <th className="p-2"><span className="sr-only">פעולות</span></th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id} className="border-b border-border last:border-0">
                    <td className="p-2 font-medium">{k.name}</td>
                    <td className="p-2"><code dir="ltr">{k.prefix}…</code></td>
                    <td className="p-2"><code dir="ltr">{k.scopes.join(", ")}</code></td>
                    <td className="p-2">{status(k)}</td>
                    <td className="p-2">{fmt(k.expiresAt)}</td>
                    <td className="p-2">
                      {fmt(k.lastUsedAt)}
                      {k.lastUsedIp ? <span className="block text-xs text-muted" dir="ltr">{k.lastUsedIp}</span> : null}
                    </td>
                    <td className="p-2">
                      {!k.revokedAt && (
                        <Button variant="ghost" size="sm" onClick={() => revoke(k)}>
                          <Trash2 size={14} aria-hidden="true" /> ביטול
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">יומן קריאות (50 האחרונות)</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-muted">עוד לא נעשו קריאות.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-right text-muted">
                  <th className="p-2">זמן</th>
                  <th className="p-2">מפתח</th>
                  <th className="p-2">פעולה</th>
                  <th className="p-2">יעד</th>
                  <th className="p-2">תוצאה</th>
                  <th className="p-2">IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-b border-border last:border-0">
                    <td className="p-2">{fmt(l.createdAt)}</td>
                    <td className="p-2">{l.key.name}</td>
                    <td className="p-2"><code dir="ltr">{l.method} {l.path}</code></td>
                    <td className="p-2"><code dir="ltr">{l.target ?? "—"}</code></td>
                    <td className="p-2">
                      <Badge variant={l.status < 300 ? "success" : "error"}>{l.status}</Badge>
                    </td>
                    <td className="p-2" dir="ltr">{l.ip ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-border bg-white p-6 text-sm">
        <h2 className="mb-2 text-lg font-semibold">ממשקים</h2>
        <ul className="list-disc space-y-1 pr-5" dir="ltr">
          <li>PUT /api/v1/plilist/&lt;slug&gt; — create/update a draft (plilist:draft)</li>
          <li>GET /api/v1/plilist/&lt;slug&gt; — read a post incl. drafts (plilist:draft)</li>
          <li>PUT /api/v1/media-appearances — upsert a publication by url (media:write)</li>
          <li>GET /api/v1/articles/&lt;slug&gt; — read an article&apos;s content (articles:edit)</li>
          <li>
            PUT /api/v1/articles/&lt;slug&gt; — replace an existing article&apos;s content; needs the updatedAt it read,
            keeps the old version, never changes status (articles:edit)
          </li>
          <li>
            GET/PUT /api/v1/plilist/&lt;slug&gt;/edit — edit an existing blog post, published included; same rules
            as articles (plilist:edit)
          </li>
          <li>GET /api/v1/content — public read of all published content (no key)</li>
          <li>POST /api/mcp/site — public read-only MCP server (no key)</li>
        </ul>
      </section>
    </div>
  );
}
