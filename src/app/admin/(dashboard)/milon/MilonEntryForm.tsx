"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Trash2 } from "lucide-react";

interface Definition {
  text: string;
  label: string;
}

interface FormValues {
  slug: string;
  term: string;
  vocalized: string;
  partOfSpeech: string;
  etymology: string;
  inflections: string;
  domains: string;
  definitions: Definition[];
  example: string;
  order: number;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}

interface MilonEntryFormProps {
  initialValues?: Partial<Omit<FormValues, "domains">> & {
    id?: string;
    domains?: string | string[];
  };
  mode: "new" | "edit";
}

const DEFAULT_VALUES: FormValues = {
  slug: "",
  term: "",
  vocalized: "",
  partOfSpeech: "",
  etymology: "",
  inflections: "",
  domains: "",
  definitions: [{ text: "", label: "" }],
  example: "",
  order: 0,
  status: "DRAFT",
};

function slugify(s: string) {
  return s
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^א-תa-zA-Z0-9\-]/g, "")
    .toLowerCase();
}

/** Normalize the incoming `definitions` value into editable rows. Accepts an
 *  array of {text,label} objects OR a JSON-encoded string of the same (defends
 *  against the JSON column arriving stringified after serialization). Always
 *  returns at least one row so the form has an editable field. */
function parseDefinitions(raw: unknown): Definition[] {
  let arr: unknown = raw;
  if (typeof raw === "string") {
    try {
      arr = JSON.parse(raw);
    } catch {
      arr = [];
    }
  }
  if (Array.isArray(arr) && arr.length > 0) {
    return arr.map((d) => ({
      text: (d as Definition)?.text ?? "",
      label: (d as Definition)?.label ?? "",
    }));
  }
  return [{ text: "", label: "" }];
}

export default function MilonEntryForm({ initialValues, mode }: MilonEntryFormProps) {
  const router = useRouter();

  const [form, setForm] = useState<FormValues>({
    ...DEFAULT_VALUES,
    ...initialValues,
    definitions: parseDefinitions(initialValues?.definitions),
    domains: initialValues?.domains
      ? Array.isArray(initialValues.domains)
        ? (initialValues.domains as string[]).join(", ")
        : initialValues.domains
      : "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setDef(i: number, key: keyof Definition, value: string) {
    setForm((prev) => {
      const defs = [...prev.definitions];
      defs[i] = { ...defs[i], [key]: value };
      return { ...prev, definitions: defs };
    });
  }

  function addDef() {
    setForm((prev) => ({
      ...prev,
      definitions: [...prev.definitions, { text: "", label: "" }],
    }));
  }

  function removeDef(i: number) {
    setForm((prev) => ({
      ...prev,
      definitions: prev.definitions.filter((_, idx) => idx !== i),
    }));
  }

  async function handleSave(targetStatus?: "PUBLISHED" | "DRAFT") {
    setSaving(true);
    setError(null);

    const payload = {
      ...form,
      slug: form.slug || slugify(form.term),
      domains: form.domains
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean),
      definitions: form.definitions.filter((d) => d.text.trim()),
      status: targetStatus ?? form.status,
    };

    try {
      const url = mode === "new" ? "/api/milon" : `/api/milon/${initialValues?.id}`;
      const method = mode === "new" ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "שגיאה בשמירה");
      }
      router.push("/admin/milon");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה לא צפויה");
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40";
  const labelCls = "block text-sm font-medium text-foreground mb-1";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">
          {mode === "new" ? "ערך חדש במילון" : `עריכת "${form.term}"`}
        </h1>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.push("/admin/milon")}>
            ביטול
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleSave("DRAFT")} disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : "שמור טיוטה"}
          </Button>
          <Button size="sm" onClick={() => handleSave("PUBLISHED")} disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : "פרסם"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Term */}
        <div>
          <label className={labelCls}>ערך (ללא ניקוד)</label>
          <input
            className={inputCls}
            value={form.term}
            onChange={(e) => set("term", e.target.value)}
            placeholder="מסתתגרד"
            dir="rtl"
          />
        </div>

        {/* Vocalized */}
        <div>
          <label className={labelCls}>ערך מנוקד</label>
          <input
            className={inputCls}
            value={form.vocalized}
            onChange={(e) => set("vocalized", e.target.value)}
            placeholder="מִסְתַּתְגֵּרֵד"
            dir="rtl"
          />
        </div>

        {/* Part of speech */}
        <div>
          <label className={labelCls}>חלק דיבר</label>
          <input
            className={inputCls}
            value={form.partOfSpeech}
            onChange={(e) => set("partOfSpeech", e.target.value)}
            placeholder="שֵׁם / פֹּעַל"
            dir="rtl"
          />
        </div>

        {/* Domains */}
        <div>
          <label className={labelCls}>תחומים (מופרדים בפסיק)</label>
          <input
            className={inputCls}
            value={form.domains}
            onChange={(e) => set("domains", e.target.value)}
            placeholder="טכנולוגיה, סלנג"
            dir="rtl"
          />
        </div>

        {/* Order */}
        <div>
          <label className={labelCls}>סדר תצוגה</label>
          <input
            type="number"
            className={inputCls}
            value={form.order}
            onChange={(e) => set("order", Number(e.target.value))}
          />
        </div>

        {/* Slug */}
        <div>
          <label className={labelCls}>Slug (אוטומטי אם ריק)</label>
          <input
            className={inputCls}
            value={form.slug}
            onChange={(e) => set("slug", e.target.value)}
            placeholder="mistatagreed"
            dir="ltr"
          />
        </div>
      </div>

      {/* Etymology */}
      <div>
        <label className={labelCls}>אטימולוגיה / שורש</label>
        <input
          className={inputCls}
          value={form.etymology}
          onChange={(e) => set("etymology", e.target.value)}
          placeholder="נִטְוֶה מן: הלחם של הַפְעָלִים מִסְתַּתֵּר וּמְגָרֵד."
          dir="rtl"
        />
      </div>

      {/* Inflections */}
      <div>
        <label className={labelCls}>הטיות</label>
        <input
          className={inputCls}
          value={form.inflections}
          onChange={(e) => set("inflections", e.target.value)}
          placeholder="נ' מִסְתַּתְגָּרֶדֶת, ר' מִסְתַּתְגַּרְדִים, ר״נ מִסְתַּתְגַּרְדּוֹת."
          dir="rtl"
        />
      </div>

      {/* Definitions */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className={labelCls + " mb-0"}>הגדרות</label>
          <button
            type="button"
            onClick={addDef}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Plus size={14} />
            הוסף הגדרה
          </button>
        </div>
        <div className="space-y-4">
          {form.definitions.map((def, i) => (
            <div
              key={i}
              className="rounded-lg border border-border bg-gray-50/50 p-4"
            >
              {/* Row header: number + remove */}
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-primary">
                  הגדרה {i + 1}
                </span>
                {form.definitions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeDef(i)}
                    className="inline-flex items-center gap-1 rounded p-1 text-xs text-gray-400 transition-colors hover:bg-red-100 hover:text-red-600"
                    aria-label={`הסר הגדרה ${i + 1}`}
                  >
                    <Trash2 size={14} />
                    הסר
                  </button>
                )}
              </div>

              {/* Main definition text — the prominent field */}
              <label className="mb-1 block text-xs font-medium text-muted">
                טקסט ההגדרה
              </label>
              <textarea
                className={inputCls + " w-full resize-none"}
                rows={3}
                value={def.text}
                onChange={(e) => setDef(i, "text", e.target.value)}
                placeholder="כתוב כאן את ההגדרה המלאה..."
                dir="rtl"
              />

              {/* Optional label/tag — clearly secondary */}
              <label className="mb-1 mt-3 block text-xs font-medium text-muted">
                תווית (אופציונלי — למשל &quot;בהשאלה&quot;, &quot;ברשתות החברתיות&quot;)
              </label>
              <input
                className={inputCls + " w-full sm:w-64"}
                value={def.label}
                onChange={(e) => setDef(i, "label", e.target.value)}
                placeholder="השאר ריק אם אין"
                dir="rtl"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Example */}
      <div>
        <label className={labelCls}>ציטוט מהשטח</label>
        <textarea
          className={inputCls + " resize-none"}
          rows={3}
          value={form.example}
          onChange={(e) => set("example", e.target.value)}
          placeholder='"..."'
          dir="rtl"
        />
      </div>
    </div>
  );
}
