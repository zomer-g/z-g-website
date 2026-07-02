"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Check, ChevronDown, ChevronUp } from "lucide-react";

interface Header {
  title: string;
  subtitle: string;
}

export default function HeaderSettingsPanel() {
  const [header, setHeader] = useState<Header>({ title: "", subtitle: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/milon/settings");
        const data = await res.json();
        if (data.header) setHeader(data.header);
      } catch {
        /* keep empty */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/milon/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(header),
      });
      if (!res.ok) throw new Error("שגיאה בשמירה");
      const data = await res.json();
      if (data.header) setHeader(data.header);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40";

  return (
    <div className="rounded-lg border border-border bg-background">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-right"
      >
        <span className="text-sm font-semibold text-foreground">
          כותרת העמוד (Hero)
        </span>
        <span className="flex items-center gap-2 text-xs text-muted">
          כותרת וכותרת משנה של עמוד המילון הציבורי
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      {open && (
        <div className="border-t border-border p-4">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  כותרת ראשית
                </label>
                <input
                  className={inputCls}
                  value={header.title}
                  onChange={(e) =>
                    setHeader((h) => ({ ...h, title: e.target.value }))
                  }
                  placeholder="מִילוֹן"
                  dir="rtl"
                />
                <p className="mt-1 text-xs text-muted">
                  אפשר לנקד (למשל מִילוֹן) — הניקוד יוצג כמו שהוא.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  כותרת משנה
                </label>
                <textarea
                  className={inputCls + " resize-none"}
                  rows={3}
                  value={header.subtitle}
                  onChange={(e) =>
                    setHeader((h) => ({ ...h, subtitle: e.target.value }))
                  }
                  placeholder="תיאור קצר שמופיע מתחת לכותרת…"
                  dir="rtl"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex items-center gap-3">
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    "שמור ופרסם"
                  )}
                </Button>
                {saved && (
                  <span className="inline-flex items-center gap-1 text-sm text-green-600">
                    <Check size={16} /> נשמר
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
