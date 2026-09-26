"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { cn, formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Search,
  FileText,
  ImageIcon,
  File as FileIcon,
  Eye,
  EyeOff,
  ExternalLink,
  ChevronDown,
  AlertCircle,
  AlertTriangle,
  X,
  Pencil,
} from "lucide-react";
import type { InventoryFile } from "@/lib/file-inventory";

/* ─── Helpers ─── */

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const STORAGE_LABELS: Record<string, string> = {
  db: "מסד נתונים",
  seed: "git",
  disk: "דיסק",
};

// A seed file is copied into public/uploads on start, so it also shows up
// on disk; the seed copy is the real one.
function primaryStorage(f: InventoryFile) {
  if (f.storage.includes("db")) return "db";
  if (f.storage.includes("seed")) return "seed";
  return "disk";
}

const liveRefs = (f: InventoryFile) => f.references.filter((r) => r.live);

type UsageFilter = "all" | "live" | "none" | "inactive";
type VisibilityFilter = "all" | "public" | "private";
type SizeFilter = "all" | "small" | "medium" | "large";
type SortKey = "newest" | "oldest" | "size-desc" | "size-asc" | "name" | "refs";

const SIZE_RANGES: Record<SizeFilter, [number, number]> = {
  all: [0, Infinity],
  small: [0, 100 * 1024],
  medium: [100 * 1024, 1024 * 1024],
  large: [1024 * 1024, Infinity],
};

const selectClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-primary";

/* ─── Page ─── */

export default function AdminFilesPage() {
  const [files, setFiles] = useState<InventoryFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [usage, setUsage] = useState<UsageFilter>("all");
  const [visibility, setVisibility] = useState<VisibilityFilter>("all");
  const [format, setFormat] = useState("all");
  const [storage, setStorage] = useState("all");
  const [size, setSize] = useState<SizeFilter>("all");
  const [sort, setSort] = useState<SortKey>("newest");

  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirmHide, setConfirmHide] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/files")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "שגיאה בטעינת הקבצים");
        setFiles(data.files);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "שגיאה בטעינת הקבצים"))
      .finally(() => setLoading(false));
  }, []);

  const formats = useMemo(
    () => [...new Set(files.map((f) => f.ext))].sort(),
    [files],
  );

  const stats = useMemo(() => {
    const totalSize = files.reduce((s, f) => s + f.size, 0);
    return {
      count: files.length,
      totalSize,
      unused: files.filter((f) => f.references.length === 0).length,
      hidden: files.filter((f) => !f.isPublic).length,
    };
  }, [files]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const [minSize, maxSize] = SIZE_RANGES[size];
    const list = files.filter((f) => {
      if (q) {
        const hay = [f.filename, f.note ?? "", ...f.references.map((r) => `${r.kind} ${r.label}`)]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (usage === "live" && liveRefs(f).length === 0) return false;
      if (usage === "none" && f.references.length > 0) return false;
      if (usage === "inactive" && (f.references.length === 0 || liveRefs(f).length > 0)) return false;
      if (visibility === "public" && !f.isPublic) return false;
      if (visibility === "private" && f.isPublic) return false;
      if (format !== "all" && f.ext !== format) return false;
      if (storage !== "all" && primaryStorage(f) !== storage) return false;
      if (f.size < minSize || f.size >= maxSize) return false;
      return true;
    });
    const byDate = (a: InventoryFile, b: InventoryFile) =>
      (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
    const sorters: Record<SortKey, (a: InventoryFile, b: InventoryFile) => number> = {
      newest: (a, b) => byDate(b, a),
      oldest: byDate,
      "size-desc": (a, b) => b.size - a.size,
      "size-asc": (a, b) => a.size - b.size,
      name: (a, b) => a.filename.localeCompare(b.filename, "he"),
      refs: (a, b) => b.references.length - a.references.length,
    };
    return [...list].sort(sorters[sort]);
  }, [files, query, usage, visibility, format, storage, size, sort]);

  const filtersActive =
    query !== "" ||
    usage !== "all" ||
    visibility !== "all" ||
    format !== "all" ||
    storage !== "all" ||
    size !== "all";

  const resetFilters = () => {
    setQuery("");
    setUsage("all");
    setVisibility("all");
    setFormat("all");
    setStorage("all");
    setSize("all");
  };

  const toggleVisibility = async (f: InventoryFile) => {
    const isPublic = !f.isPublic;
    setSaving(f.filename);
    setError(null);
    try {
      const res = await fetch("/api/admin/files", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: f.filename, isPublic }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה בעדכון הקובץ");
      setFiles((prev) => prev.map((x) => (x.filename === f.filename ? { ...x, isPublic } : x)));
      setConfirmHide(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בעדכון הקובץ");
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary-dark">קבצים</h1>
        <p className="mt-1 text-sm text-muted">
          כל הקבצים שהאתר מגיש תחת <code dir="ltr">/uploads</code>, והמקומות שבהם הם מופיעים.
          קובץ מוסתר מחזיר 404 לכל מי שאינו מנהל (תוך כמה שניות מהשינוי).
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
          <AlertCircle size={18} className="shrink-0" />
          {error}
        </div>
      )}

      {/* ── Stats ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "קבצים", value: stats.count.toLocaleString("he-IL"), onClick: resetFilters },
          { label: "נפח כולל", value: formatFileSize(stats.totalSize) },
          {
            label: "לא מופיעים באתר",
            value: stats.unused.toLocaleString("he-IL"),
            onClick: () => { resetFilters(); setUsage("none"); },
          },
          {
            label: "מוסתרים",
            value: stats.hidden.toLocaleString("he-IL"),
            onClick: () => { resetFilters(); setVisibility("private"); },
          },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              {s.onClick ? (
                <button type="button" onClick={s.onClick} className="w-full text-right">
                  <div className="text-sm text-muted">{s.label}</div>
                  <div className="mt-1 text-2xl font-bold text-primary-dark">{s.value}</div>
                </button>
              ) : (
                <>
                  <div className="text-sm text-muted">{s.label}</div>
                  <div className="mt-1 text-2xl font-bold text-primary-dark">{s.value}</div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Search + filters ── */}
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="חיפוש לפי שם קובץ, או לפי המאמר / העמוד שבו הוא מופיע"
              aria-label="חיפוש קבצים"
              className="w-full rounded-lg border border-border bg-background py-2 pl-3 pr-9 text-sm focus-visible:outline-2 focus-visible:outline-primary"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <label className="text-xs font-semibold text-foreground">
              שימוש באתר
              <select value={usage} onChange={(e) => setUsage(e.target.value as UsageFilter)} className={cn(selectClass, "mt-1")}>
                <option value="all">הכל</option>
                <option value="live">מופיע בעמוד פעיל</option>
                <option value="inactive">רק בטיוטות / פריטים לא פעילים</option>
                <option value="none">לא מופיע בכלל</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-foreground">
              נראות
              <select value={visibility} onChange={(e) => setVisibility(e.target.value as VisibilityFilter)} className={cn(selectClass, "mt-1")}>
                <option value="all">הכל</option>
                <option value="public">פומבי</option>
                <option value="private">מוסתר</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-foreground">
              פורמט
              <select value={format} onChange={(e) => setFormat(e.target.value)} className={cn(selectClass, "mt-1")}>
                <option value="all">הכל</option>
                {formats.map((f) => (
                  <option key={f} value={f}>{f.toUpperCase()}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-foreground">
              גודל
              <select value={size} onChange={(e) => setSize(e.target.value as SizeFilter)} className={cn(selectClass, "mt-1")}>
                <option value="all">הכל</option>
                <option value="small">עד 100KB</option>
                <option value="medium">100KB עד 1MB</option>
                <option value="large">מעל 1MB</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-foreground">
              אחסון
              <select value={storage} onChange={(e) => setStorage(e.target.value)} className={cn(selectClass, "mt-1")}>
                <option value="all">הכל</option>
                <option value="db">מסד נתונים</option>
                <option value="seed">git</option>
                <option value="disk">דיסק</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-foreground">
              מיון
              <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={cn(selectClass, "mt-1")}>
                <option value="newest">חדש לישן</option>
                <option value="oldest">ישן לחדש</option>
                <option value="size-desc">גדול לקטן</option>
                <option value="size-asc">קטן לגדול</option>
                <option value="name">שם</option>
                <option value="refs">מספר מופעים</option>
              </select>
            </label>
          </div>
          <div className="flex items-center justify-between text-sm text-muted">
            <span aria-live="polite">
              {visible.length.toLocaleString("he-IL")} מתוך {files.length.toLocaleString("he-IL")} קבצים
            </span>
            {filtersActive && (
              <button type="button" onClick={resetFilters} className="inline-flex items-center gap-1 font-semibold text-primary hover:text-accent-text">
                <X size={14} /> ניקוי סינון
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── File list ── */}
      {visible.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted">אין קבצים שעונים על הסינון</CardContent>
        </Card>
      ) : (
        <Card>
          <ul role="list" className="divide-y divide-border">
            {visible.map((f) => {
              const live = liveRefs(f);
              const isOpen = expanded === f.filename;
              const TypeIcon = f.mimeType.startsWith("image/") ? ImageIcon : f.ext === "pdf" ? FileText : FileIcon;
              return (
                <li key={f.filename} className={cn("p-4", !f.isPublic && "bg-amber-50/60")}>
                  <div className="flex flex-wrap items-center gap-4">
                    {/* Preview */}
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted-bg">
                      {f.mimeType.startsWith("image/") ? (
                        <img src={f.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <TypeIcon className="h-6 w-6 text-muted" aria-hidden="true" />
                      )}
                    </div>

                    {/* Name + meta */}
                    <div className="min-w-0 flex-1">
                      <a
                        href={f.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex max-w-full items-center gap-1 font-semibold text-primary-dark hover:text-accent-text"
                        dir="ltr"
                      >
                        <span className="truncate">{f.filename}</span>
                        <ExternalLink size={14} className="shrink-0" aria-hidden="true" />
                        <span className="sr-only"> (נפתח בלשונית חדשה)</span>
                      </a>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                        <Badge variant="outline">{f.ext.toUpperCase()}</Badge>
                        <span>{formatFileSize(f.size)}</span>
                        {f.createdAt && <span>{formatDate(f.createdAt)}</span>}
                        <span>אחסון: {STORAGE_LABELS[primaryStorage(f)]}</span>
                        {f.inLibrary && <span>בספריית המדיה</span>}
                      </div>
                    </div>

                    {/* Usage */}
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : f.filename)}
                      aria-expanded={isOpen}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm hover:bg-muted-bg"
                    >
                      {f.references.length === 0 ? (
                        <Badge variant="muted">לא מופיע באתר</Badge>
                      ) : live.length === 0 ? (
                        <Badge variant="accent">רק בטיוטות ({f.references.length})</Badge>
                      ) : (
                        <Badge variant="success">
                          מופיע ב-{live.length} {live.length === 1 ? "מקום" : "מקומות"}
                        </Badge>
                      )}
                      {f.references.length > 0 && (
                        <ChevronDown size={16} className={cn("transition-transform", isOpen && "rotate-180")} aria-hidden="true" />
                      )}
                    </button>

                    {/* Visibility */}
                    <div className="flex items-center gap-2">
                      {confirmHide === f.filename ? (
                        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                          <AlertTriangle size={14} className="shrink-0" aria-hidden="true" />
                          <span>
                            {live.length === 1 ? "מופיע בעמוד פעיל אחד" : `מופיע ב-${live.length} עמודים פעילים`}. הקישורים שם יחזירו 404.
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleVisibility(f)}
                            disabled={saving === f.filename}
                            className="rounded bg-amber-600 px-2 py-1 font-semibold text-white hover:bg-amber-700"
                          >
                            להסתיר בכל זאת
                          </button>
                          <button type="button" onClick={() => setConfirmHide(null)} className="font-semibold underline">
                            ביטול
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            f.isPublic && live.length > 0 ? setConfirmHide(f.filename) : toggleVisibility(f)
                          }
                          disabled={saving === f.filename}
                          aria-pressed={!f.isPublic}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors",
                            f.isPublic
                              ? "border-border text-foreground hover:bg-muted-bg"
                              : "border-amber-400 bg-amber-100 text-amber-900 hover:bg-amber-200",
                          )}
                        >
                          {saving === f.filename ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : f.isPublic ? (
                            <Eye size={14} aria-hidden="true" />
                          ) : (
                            <EyeOff size={14} aria-hidden="true" />
                          )}
                          {f.isPublic ? "פומבי" : "מוסתר"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* References */}
                  {isOpen && f.references.length > 0 && (
                    <ul role="list" className="mt-3 space-y-2 border-r-2 border-border pr-4 text-sm">
                      {f.references.map((r, i) => (
                        <li key={i} className="flex flex-wrap items-center gap-2">
                          <Badge variant={r.live ? "default" : "muted"}>{r.kind}</Badge>
                          <span className={cn("font-medium", !r.live && "text-muted")}>{r.label}</span>
                          {!r.live && <span className="text-xs text-muted">(לא פעיל)</span>}
                          {r.href && (
                            <Link href={r.href} target="_blank" className="inline-flex items-center gap-1 text-xs font-semibold text-primary underline underline-offset-2 hover:text-accent-text">
                              לעמוד <ExternalLink size={12} aria-hidden="true" />
                              <span className="sr-only"> (נפתח בלשונית חדשה)</span>
                            </Link>
                          )}
                          {r.adminHref && (
                            <Link href={r.adminHref} className="inline-flex items-center gap-1 text-xs font-semibold text-primary underline underline-offset-2 hover:text-accent-text">
                              עריכה <Pencil size={12} aria-hidden="true" />
                            </Link>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
