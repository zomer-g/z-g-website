"use client";

// Per-project timeline admin. Mirrors /admin/whatsapp/[id] but with
// manual event creation + CSV/JSON bulk import instead of ZIP upload.
// Layers play the role chats do in whatsapp.

import { useCallback, useEffect, useRef, useState, use } from "react";
import Link from "next/link";
import {
  Loader2,
  ArrowRight,
  Trash2,
  Plus,
  Copy,
  Pencil,
  AlertCircle,
  CheckCircle,
  Layers as LayersIcon,
  FileText,
  Upload,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AccessRow {
  id: string;
  email: string;
  createdAt: string;
}
interface ActorRow {
  actor: string;
  count: number;
}
interface LayerRow {
  id: string;
  title: string;
  description: string | null;
  selfActor: string | null;
  actors?: ActorRow[];
  _count: { events: number };
}
interface ProjectDetail {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  access: AccessRow[];
  layers: LayerRow[];
}
type Feedback = { type: "success" | "error"; message: string } | null;

const KNOWN_CATEGORIES = [
  { value: "note", label: "הערה" },
  { value: "action", label: "פעולה" },
  { value: "search", label: "חיפוש" },
  { value: "message", label: "הודעה" },
  { value: "meeting", label: "פגישה" },
] as const;

export default function AdminTimelineProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [data, setData] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const flash = useCallback((f: Feedback, durationMs = 4000) => {
    setFeedback(f);
    if (f) setTimeout(() => setFeedback(null), durationMs);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/timeline/projects/${id}`, { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      const json = (await res.json()) as { project: ProjectDetail };
      setData(json.project);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /* ─── Metadata save ─────────────────────────────────────────────── */
  const [titleDraft, setTitleDraft] = useState("");
  const [descDraft, setDescDraft] = useState("");
  useEffect(() => {
    if (data) {
      setTitleDraft(data.title);
      setDescDraft(data.description ?? "");
    }
  }, [data]);
  const [savingMeta, setSavingMeta] = useState(false);
  const saveMeta = async () => {
    setSavingMeta(true);
    try {
      const res = await fetch(`/api/timeline/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: titleDraft, description: descDraft }),
      });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error || `HTTP ${res.status}`);
      flash({ type: "success", message: "נשמר" });
      await refresh();
    } catch (err) {
      flash({ type: "error", message: err instanceof Error ? err.message : "שגיאה" });
    } finally {
      setSavingMeta(false);
    }
  };

  /* ─── Allowlist ─────────────────────────────────────────────────── */
  const [newEmail, setNewEmail] = useState("");
  const [addingEmail, setAddingEmail] = useState(false);
  const addEmail = async () => {
    if (!newEmail.trim()) return;
    setAddingEmail(true);
    try {
      const res = await fetch(`/api/timeline/projects/${id}/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail.trim() }),
      });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error || `HTTP ${res.status}`);
      setNewEmail("");
      await refresh();
    } catch (err) {
      flash({ type: "error", message: err instanceof Error ? err.message : "שגיאה" });
    } finally {
      setAddingEmail(false);
    }
  };
  const removeEmail = async (email: string) => {
    if (!window.confirm(`להסיר את ${email}?`)) return;
    try {
      const res = await fetch(
        `/api/timeline/projects/${id}/access/${encodeURIComponent(email)}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await refresh();
    } catch (err) {
      flash({ type: "error", message: err instanceof Error ? err.message : "שגיאה" });
    }
  };

  /* ─── Layers ────────────────────────────────────────────────────── */
  const [newLayerTitle, setNewLayerTitle] = useState("");
  const [creatingLayer, setCreatingLayer] = useState(false);
  const createLayer = async () => {
    if (!newLayerTitle.trim()) return;
    setCreatingLayer(true);
    try {
      const res = await fetch(`/api/timeline/projects/${id}/layers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newLayerTitle.trim() }),
      });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error || `HTTP ${res.status}`);
      setNewLayerTitle("");
      flash({ type: "success", message: "שכבה נוצרה" });
      await refresh();
    } catch (err) {
      flash({ type: "error", message: err instanceof Error ? err.message : "שגיאה" });
    } finally {
      setCreatingLayer(false);
    }
  };
  const renameLayer = async (layer: LayerRow) => {
    const next = window.prompt("כותרת חדשה לשכבה:", layer.title);
    if (next === null) return;
    const t = next.trim();
    if (!t || t === layer.title) return;
    try {
      const res = await fetch(`/api/timeline/projects/${id}/layers/${layer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t }),
      });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error || `HTTP ${res.status}`);
      flash({ type: "success", message: "השם עודכן" });
      await refresh();
    } catch (err) {
      flash({ type: "error", message: err instanceof Error ? err.message : "שגיאה" });
    }
  };
  const deleteLayer = async (layer: LayerRow) => {
    if (!window.confirm(`למחוק את השכבה "${layer.title}" וכל ${layer._count.events} האירועים שלה?`)) return;
    try {
      const res = await fetch(`/api/timeline/projects/${id}/layers/${layer.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      flash({ type: "success", message: "נמחק" });
      await refresh();
    } catch (err) {
      flash({ type: "error", message: err instanceof Error ? err.message : "שגיאה" });
    }
  };
  const setLayerSelfActor = async (layer: LayerRow, value: string) => {
    try {
      const res = await fetch(`/api/timeline/projects/${id}/layers/${layer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selfActor: value === "" ? null : value }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await refresh();
    } catch (err) {
      flash({ type: "error", message: err instanceof Error ? err.message : "שגיאה" });
    }
  };

  /* ─── Event editor (active layer) ───────────────────────────────── */
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  // Auto-select the first layer the moment data loads, so the event
  // editor + import widgets are visible immediately. Without this the
  // admin sees layers but no way to add events until they realize the
  // layer title is a button.
  useEffect(() => {
    if (!data) return;
    if (data.layers.length === 0) return;
    if (activeLayerId && data.layers.some((l) => l.id === activeLayerId)) return;
    setActiveLayerId(data.layers[0].id);
  }, [data, activeLayerId]);
  const [evtTs, setEvtTs] = useState("");
  const [evtCategory, setEvtCategory] = useState<string>("note");
  const [evtActor, setEvtActor] = useState("");
  const [evtTitle, setEvtTitle] = useState("");
  const [evtBody, setEvtBody] = useState("");
  const [creatingEvt, setCreatingEvt] = useState(false);
  const createEvent = async () => {
    if (!activeLayerId) return;
    if (!evtTs || !evtActor.trim() || (!evtTitle.trim() && !evtBody.trim())) {
      flash({ type: "error", message: "תאריך, actor, וכותרת או גוף נדרשים" });
      return;
    }
    setCreatingEvt(true);
    try {
      const res = await fetch(`/api/timeline/layers/${activeLayerId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timestamp: new Date(evtTs).toISOString(),
          category: evtCategory,
          actor: evtActor.trim(),
          title: evtTitle.trim() || null,
          body: evtBody.trim() || null,
        }),
      });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error || `HTTP ${res.status}`);
      flash({ type: "success", message: "אירוע נוסף" });
      setEvtActor("");
      setEvtTitle("");
      setEvtBody("");
      await refresh();
    } catch (err) {
      flash({ type: "error", message: err instanceof Error ? err.message : "שגיאה" });
    } finally {
      setCreatingEvt(false);
    }
  };

  /* ─── Bulk import (CSV/JSON/XLSX/WhatsApp ZIP) ──────────────────── */
  const importInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const importFile = async (file: File) => {
    if (!activeLayerId) {
      flash({ type: "error", message: "בחרי שכבה לפני יבוא" });
      return;
    }
    setImporting(true);
    try {
      // Pick the wire shape from the file extension. Binary formats
      // (xlsx, zip) need arrayBuffer; text formats stay as text so the
      // network panel is readable when debugging.
      const lower = file.name.toLowerCase();
      const isJson = lower.endsWith(".json");
      const isCsv = lower.endsWith(".csv");
      const isXlsx = /\.(xlsx|xlsm|xls)$/.test(lower);
      const isZip = lower.endsWith(".zip");

      let contentType: string;
      let body: BodyInit;
      if (isJson) {
        contentType = "application/json";
        body = await file.text();
      } else if (isCsv) {
        contentType = "text/csv";
        body = await file.text();
      } else if (isXlsx) {
        contentType =
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        body = await file.arrayBuffer();
      } else if (isZip) {
        contentType = "application/zip";
        body = await file.arrayBuffer();
      } else {
        // Unknown — let the server try to figure it out from filename.
        contentType = file.type || "application/octet-stream";
        body = await file.arrayBuffer();
      }

      // Pass filename so the server can dispatch even when the browser
      // sends application/octet-stream for binary uploads.
      const qs = new URLSearchParams({ filename: file.name }).toString();
      const res = await fetch(
        `/api/timeline/layers/${activeLayerId}/events/import?${qs}`,
        {
          method: "POST",
          headers: { "Content-Type": contentType },
          body,
        },
      );
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const warnings: string[] = json?.warnings ?? [];
        const tail = warnings.length
          ? "\n" + warnings.slice(0, 5).join("\n")
          : "";
        throw new Error((json?.error || `HTTP ${res.status}`) + tail);
      }
      const warnCount = (json?.warnings ?? []).length;
      const suffix = warnCount > 0 ? ` (${warnCount} אזהרות — דלגנו על שורות לא תקינות)` : "";
      flash(
        {
          type: "success",
          message: `יובאו ${json?.inserted ?? "?"} אירועים${suffix}`,
        },
        12000,
      );
      await refresh();
    } catch (err) {
      flash({ type: "error", message: err instanceof Error ? err.message : "שגיאה" }, 15000);
    } finally {
      setImporting(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  };

  /* ─── Share URLs ────────────────────────────────────────────────── */
  const copyShareUrl = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/timeline/${data.slug}`);
      flash({ type: "success", message: "הקישור הועתק" });
    } catch {
      flash({ type: "error", message: "ההעתקה נכשלה" });
    }
  };
  const copyCleanUrl = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/timeline/${data.slug}?view=clean`,
      );
      flash({ type: "success", message: "קישור לתצוגה נקייה הועתק" });
    } catch {
      flash({ type: "error", message: "ההעתקה נכשלה" });
    }
  };

  /* ─── Render ────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/timeline"
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ArrowRight className="h-4 w-4" />
          חזרה לרשימה
        </Link>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error ?? "לא נמצא"}
        </div>
      </div>
    );
  }

  const activeLayer = data.layers.find((l) => l.id === activeLayerId) ?? null;

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/admin/timeline"
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ArrowRight className="h-4 w-4" />
          חזרה לרשימה
        </Link>
        <div className="flex items-center justify-between gap-3 flex-wrap mt-2">
          <h1 className="text-2xl font-bold text-primary-dark truncate">{data.title}</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="ghost" size="sm" className="border border-border" onClick={copyShareUrl}>
              <Copy className="h-3.5 w-3.5" />
              קישור מלא
            </Button>
            <Button variant="ghost" size="sm" className="border border-border" onClick={copyCleanUrl}>
              <Copy className="h-3.5 w-3.5" />
              קישור לתצוגה נקייה
            </Button>
          </div>
        </div>
        <div className="mt-1 text-xs font-mono text-gray-600">/timeline/{data.slug}</div>
      </div>

      {feedback ? (
        <div
          role="alert"
          className={
            "rounded-lg border p-3 text-sm flex items-start gap-2 whitespace-pre-wrap " +
            (feedback.type === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700")
          }
        >
          {feedback.type === "success" ? (
            <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      ) : null}

      {/* ── Metadata ── */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h2 className="text-sm font-bold text-primary-dark">פרטי הפרויקט</h2>
          <Input
            label="כותרת"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            dir="rtl"
          />
          <Textarea
            label="תיאור (לא מוצג ללקוחות)"
            value={descDraft}
            onChange={(e) => setDescDraft(e.target.value)}
            dir="rtl"
            rows={2}
          />
          <div className="flex justify-end">
            <Button onClick={saveMeta} loading={savingMeta} disabled={savingMeta}>
              שמירה
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Allowlist ── */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-sm font-bold text-primary-dark">רשימת הרשאות (SSO)</h2>
            <Badge variant="muted">{data.access.length} משתמשים</Badge>
          </div>
          <p className="text-xs text-gray-700 leading-relaxed">
            רק כתובות המופיעות כאן יוכלו להיכנס לפרויקט הזה. גישה היא דרך
            Google SSO.
          </p>
          <div className="flex items-stretch gap-2">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void addEmail();
              }}
              placeholder="user@example.com"
              dir="ltr"
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <Button onClick={addEmail} loading={addingEmail} disabled={addingEmail}>
              <Plus className="h-4 w-4" />
              הוסיפי
            </Button>
          </div>
          {data.access.length === 0 ? (
            <p className="text-sm text-gray-500">אין כתובות ברשימה.</p>
          ) : (
            <ul className="divide-y divide-gray-100 border border-gray-200 rounded-md">
              {data.access.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="font-mono text-sm text-gray-900 truncate" dir="ltr">
                    {a.email}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeEmail(a.email)}
                    className="text-red-500 hover:bg-red-50 p-1 rounded"
                    aria-label="הסרה"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ── Layers ── */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-sm font-bold text-primary-dark">שכבות</h2>
            <Badge variant="muted">
              <LayersIcon className="h-3 w-3 me-1" />
              {data.layers.length}
            </Badge>
          </div>

          <div className="flex items-stretch gap-2">
            <input
              type="text"
              value={newLayerTitle}
              onChange={(e) => setNewLayerTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void createLayer();
              }}
              placeholder='כותרת שכבה — לדוגמה "חקירת המשטרה"'
              dir="rtl"
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <Button onClick={createLayer} loading={creatingLayer} disabled={creatingLayer}>
              <Plus className="h-4 w-4" />
              שכבה חדשה
            </Button>
          </div>

          {data.layers.length === 0 ? (
            <p className="text-sm text-gray-500">טרם נוצרו שכבות.</p>
          ) : (
            <ul className="divide-y divide-gray-100 border border-gray-200 rounded-md">
              {data.layers.map((l) => {
                const isActive = activeLayerId === l.id;
                return (
                  <li
                    key={l.id}
                    className={
                      "p-3 space-y-2 transition-colors " +
                      (isActive ? "bg-emerald-50 border-s-4 border-emerald-500" : "")
                    }
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => setActiveLayerId(isActive ? null : l.id)}
                          className={
                            "text-sm font-semibold truncate text-start " +
                            (isActive ? "text-emerald-700" : "text-gray-900 hover:underline")
                          }
                        >
                          {isActive ? "● " : ""}{l.title}
                        </button>
                        <div className="text-xs text-gray-600">
                          {l._count.events} אירועים
                          {isActive ? (
                            <span className="text-emerald-700 font-medium">
                              {" "}— נבחרה לעריכה
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!isActive ? (
                          <button
                            type="button"
                            onClick={() => setActiveLayerId(l.id)}
                            className="text-xs font-medium text-emerald-700 border border-emerald-300 bg-white hover:bg-emerald-50 rounded-md px-2 py-1"
                            aria-label="פתיחה לעריכת אירועים"
                            title="פתיחה — לפתיחת עורך האירועים והייבוא לשכבה זו"
                          >
                            פתח לעריכה
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => renameLayer(l)}
                          className="text-gray-500 hover:bg-gray-100 p-1 rounded"
                          aria-label="שינוי כותרת שכבה"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteLayer(l)}
                          className="text-red-500 hover:bg-red-50 p-1 rounded"
                          aria-label="מחיקת שכבה"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {l.actors && l.actors.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-2 rounded-md bg-muted-bg/40 px-2 py-1.5">
                        <label
                          htmlFor={`self-actor-${l.id}`}
                          className="text-[11px] font-semibold text-gray-700"
                        >
                          בועות ירוקות (אני):
                        </label>
                        <select
                          id={`self-actor-${l.id}`}
                          value={l.selfActor ?? ""}
                          onChange={(e) => setLayerSelfActor(l, e.target.value)}
                          className="text-xs rounded border border-gray-300 bg-white px-2 py-1 max-w-full"
                          dir="auto"
                        >
                          <option value="">— לא הוגדר —</option>
                          {l.actors.map((a) => (
                            <option key={a.actor} value={a.actor}>
                              {a.actor} ({a.count})
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ── Active-layer event editor ── */}
      {activeLayer ? (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h2 className="text-sm font-bold text-primary-dark">
              הוספת אירוע ל-&quot;{activeLayer.title}&quot;
            </h2>
            <p className="text-xs text-gray-600">
              עורך זה פעיל על השכבה שסומנה בירוק למעלה. כדי לערוך שכבה אחרת —
              לחצי על &quot;פתח לעריכה&quot; ליד הכותרת שלה.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <Input
                label="תאריך + שעה"
                type="datetime-local"
                value={evtTs}
                onChange={(e) => setEvtTs(e.target.value)}
                dir="ltr"
              />
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  סוג
                </label>
                <select
                  value={evtCategory}
                  onChange={(e) => setEvtCategory(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  {KNOWN_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label='שולח / פעולה ("actor")'
                value={evtActor}
                onChange={(e) => setEvtActor(e.target.value)}
                dir="rtl"
                placeholder='לדוגמה: "רס"ר אבי לוי" / "אני"'
              />
              <Input
                label="כותרת קצרה (אופציונלי)"
                value={evtTitle}
                onChange={(e) => setEvtTitle(e.target.value)}
                dir="rtl"
              />
            </div>
            <Textarea
              label="גוף האירוע"
              value={evtBody}
              onChange={(e) => setEvtBody(e.target.value)}
              dir="rtl"
              rows={3}
            />
            <div className="flex justify-end">
              <Button
                onClick={createEvent}
                loading={creatingEvt}
                disabled={creatingEvt}
              >
                <Plus className="h-4 w-4" />
                הוסיפי אירוע
              </Button>
            </div>

            {/* Bulk import — CSV / JSON / Excel / WhatsApp ZIP */}
            <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-4 mt-2">
              <p className="text-xs text-gray-700 leading-relaxed mb-2">
                <FileText className="inline h-3.5 w-3.5 me-1" />
                ייבוא רב-שורות. תומך ב-<strong>CSV</strong>, <strong>JSON</strong>,{" "}
                <strong>Excel (.xlsx)</strong> וייצוא <strong>WhatsApp ZIP</strong>.
                כל טבלה שיש בה עמודת תאריך תזוהה אוטומטית — פורמטים נתמכים:{" "}
                <code className="font-mono">DD/MM/YYYY</code>,{" "}
                <code className="font-mono">MM/DD/YYYY</code>,{" "}
                <code className="font-mono">YYYY-MM-DD</code>,{" "}
                <code className="font-mono">DD.MM.YYYY</code>, ועוד.
                עמודות מזוהות לפי כותרות (תאריך / מועד / date, שולח / actor, כותרת / title,
                תוכן / body, סוג / category). שאר העמודות מקופלות לתוך גוף האירוע.
              </p>
              <div className="flex items-center gap-2">
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".csv,.json,.xlsx,.xls,.xlsm,.zip,text/csv,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/zip"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void importFile(f);
                  }}
                  disabled={importing}
                  className="block text-sm flex-1"
                />
                {importing ? (
                  <div className="flex items-center gap-1 text-xs text-gray-700">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    מייבא…
                  </div>
                ) : (
                  <Upload className="h-4 w-4 text-gray-400" aria-hidden="true" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : data.layers.length > 0 ? (
        <Card>
          <CardContent className="p-4 text-sm text-gray-600">
            לעריכת אירועים בתוך שכבה — לחצי על &quot;פתח לעריכה&quot; ליד הכותרת
            של אחת השכבות למעלה.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4 text-sm text-gray-600">
            כדי להוסיף אירועים, יצרי קודם שכבה חדשה למעלה (לדוגמה &quot;חקירת המשטרה&quot;).
          </CardContent>
        </Card>
      )}
    </div>
  );
}
