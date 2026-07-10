"use client";

import { useRef, useState } from "react";
import { FileText, Loader2, Plus, Trash2, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";

export interface PdfAttachment {
  name: string;
  url: string;
}

interface PdfAttachmentsEditorProps {
  attachments: PdfAttachment[];
  onChange: (attachments: PdfAttachment[]) => void;
}

/**
 * Manages the list of PDF files attached to a הפליליסט post. Uploads go through
 * the shared /api/media/upload endpoint (which already accepts application/pdf),
 * and the resulting {name, url} list is stored on the post's `attachments` field.
 */
export function PdfAttachmentsEditor({
  attachments,
  onChange,
}: PdfAttachmentsEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePick = () => fileInputRef.current?.click();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;

    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "שגיאה בהעלאת הקובץ");
      }

      const data = await res.json();
      // Default the display name to the file name without its .pdf extension.
      const displayName = file.name.replace(/\.pdf$/i, "");
      onChange([...attachments, { name: displayName, url: data.url }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בהעלאת הקובץ");
    } finally {
      setUploading(false);
    }
  }

  function updateName(index: number, name: string) {
    onChange(attachments.map((a, i) => (i === index ? { ...a, name } : a)));
  }

  function remove(index: number) {
    onChange(attachments.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-gray-50/50 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          קבצים מצורפים (PDF)
        </h2>
        <button
          type="button"
          onClick={handlePick}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40 disabled:opacity-60"
        >
          {uploading ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Plus size={15} />
          )}
          {uploading ? "מעלה..." : "הוספת PDF"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleFile}
        />
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {attachments.length === 0 ? (
        <p className="text-sm text-muted">
          לא צורפו קבצים. אפשר לצרף מסמכי PDF שיוצגו בתחתית הפוסט.
        </p>
      ) : (
        <ul className="space-y-2">
          {attachments.map((att, i) => (
            <li
              key={`${att.url}-${i}`}
              className="flex items-center gap-2 rounded-lg border border-border bg-background p-2"
            >
              <FileText size={18} className="shrink-0 text-primary" />
              <Input
                value={att.name}
                onChange={(e) => updateName(i, e.target.value)}
                placeholder="שם המסמך שיוצג"
                dir="rtl"
                className="flex-1"
              />
              <a
                href={att.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-md p-1.5 text-muted transition-colors hover:text-primary"
                aria-label="פתיחת הקובץ בכרטיסייה חדשה"
                title="פתיחה בכרטיסייה חדשה"
              >
                <ExternalLink size={16} />
              </a>
              <button
                type="button"
                onClick={() => remove(i)}
                className="shrink-0 rounded-md p-1.5 text-red-600 transition-colors hover:bg-red-50"
                aria-label="הסרת הקובץ"
                title="הסרה"
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
