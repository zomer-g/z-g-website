"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import HeaderSettingsPanel from "./HeaderSettingsPanel";

interface MilonEntry {
  id: string;
  term: string;
  vocalized: string;
  partOfSpeech: string;
  domains: string[];
  definitions: { text: string; label?: string }[];
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  order: number;
}

const STATUS_CONFIG: Record<
  MilonEntry["status"],
  { label: string; variant: "muted" | "success" | "error" }
> = {
  DRAFT: { label: "טיוטה", variant: "muted" },
  PUBLISHED: { label: "פורסם", variant: "success" },
  ARCHIVED: { label: "בארכיון", variant: "error" },
};

export default function AdminMilonPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<MilonEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEntries() {
      try {
        const res = await fetch("/api/milon?all=true");
        if (!res.ok) throw new Error("שגיאה בטעינת הערכים");
        const data = await res.json();
        setEntries(data.entries);
      } catch (err) {
        setError(err instanceof Error ? err.message : "שגיאה לא צפויה");
      } finally {
        setLoading(false);
      }
    }
    fetchEntries();
  }, []);

  async function handleDelete(id: string, term: string) {
    const confirmed = window.confirm(`למחוק את הערך "${term}"?`);
    if (!confirmed) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/milon/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("שגיאה במחיקה");
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "שגיאה במחיקה");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">מילון</h1>
          <p className="mt-1 text-sm text-muted">
            ביטויים שהמצאתי — נגיש בכתובת{" "}
            <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs" dir="ltr">
              /dictionary
            </code>
          </p>
        </div>
        <Button size="sm" onClick={() => router.push("/admin/milon/new")}>
          <Plus size={18} />
          ערך חדש
        </Button>
      </div>

      {/* Public-page hero title / subtitle */}
      <HeaderSettingsPanel />

      {entries.length === 0 ? (
        <div className="rounded-lg border border-border bg-background p-12 text-center">
          <p className="text-muted">המילון עדיין ריק</p>
          <Button
            size="sm"
            className="mt-4"
            onClick={() => router.push("/admin/milon/new")}
          >
            <Plus size={18} />
            הוסיפו ערך ראשון
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-background">
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="border-b border-border bg-gray-50">
                  <th className="px-4 py-3 text-sm font-semibold text-foreground">#</th>
                  <th className="px-4 py-3 text-sm font-semibold text-foreground">ערך</th>
                  <th className="px-4 py-3 text-sm font-semibold text-foreground">חלק דיבר</th>
                  <th className="px-4 py-3 text-sm font-semibold text-foreground">תחומים</th>
                  <th className="px-4 py-3 text-sm font-semibold text-foreground">סטטוס</th>
                  <th className="px-4 py-3 text-sm font-semibold text-foreground">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const sc = STATUS_CONFIG[entry.status];
                  return (
                    <tr
                      key={entry.id}
                      className="border-b border-border last:border-0 hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-muted">{entry.order}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => router.push(`/admin/milon/${entry.id}`)}
                          className="block text-right"
                        >
                          <span className="font-bold text-primary hover:underline">
                            {entry.vocalized}
                          </span>
                          <span className="mr-2 text-xs text-muted">({entry.term})</span>
                          {entry.definitions?.length > 0 && (
                            <span className="mt-1 block max-w-md text-xs leading-relaxed text-muted line-clamp-2">
                              {entry.definitions
                                .map(
                                  (d, di) =>
                                    `${di + 1}. ${d.label ? `[${d.label}] ` : ""}${d.text}`,
                                )
                                .join("  ")}
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">{entry.partOfSpeech}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {entry.domains.map((d) => (
                            <span
                              key={d}
                              className="rounded border border-primary/20 bg-primary/5 px-1.5 py-0.5 text-xs text-primary"
                            >
                              {d}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={sc.variant}>{sc.label}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => router.push(`/admin/milon/${entry.id}`)}
                            className="rounded p-1.5 text-gray-500 hover:bg-gray-200 hover:text-primary transition-colors"
                            aria-label={`עריכת ${entry.term}`}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(entry.id, entry.term)}
                            disabled={deletingId === entry.id}
                            className="rounded p-1.5 text-gray-500 hover:bg-red-100 hover:text-red-600 transition-colors disabled:opacity-50"
                            aria-label={`מחיקת ${entry.term}`}
                          >
                            {deletingId === entry.id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
