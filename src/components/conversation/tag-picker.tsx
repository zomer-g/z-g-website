"use client";

// Tag-assignment popover used inside a bubble's hover controls. Lists
// the workspace/project tag pool with a checkbox-style chip each;
// clicking a chip toggles its attachment to the current item. A free-
// text input at the top lets the admin add a new tag in one shot —
// hitting Enter creates the tag (server-side upsert) and attaches it.
//
// Generic over the API endpoints: callers provide the two URL
// builders for "attach" and "detach" so the same picker drives both
// whatsapp and timeline tagging.

import { useEffect, useRef, useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { tagStyle } from "./tag-utils";
import type { TagRef } from "./types";

interface TagPickerProps {
  // All tags in the workspace/project's pool. The picker doesn't fetch
  // this itself — the caller already has it loaded for the SearchBar.
  pool: TagRef[];
  // Tags currently attached to this item.
  attached: TagRef[];
  // Called when the user clicks "create + attach". Should:
  //   1. upsert the named tag on the server (returns its TagRef)
  //   2. attach it to the item
  //   3. resolve with the resulting TagRef so we can update local state
  onAttachByName: (name: string) => Promise<TagRef>;
  // Called when the user toggles an existing pool tag on the item.
  onToggleAttached: (tag: TagRef, attach: boolean) => Promise<void>;
  // Close + position controlled by the caller (this component is just
  // the panel; the wrapping bubble owns the open/close state).
  onClose: () => void;
}

export function TagPicker({
  pool,
  attached,
  onAttachByName,
  onToggleAttached,
  onClose,
}: TagPickerProps) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Esc closes. Click-outside is handled by the wrapping bubble.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const attachedIds = new Set(attached.map((t) => t.id));
  const lowerDraft = draft.trim().toLowerCase();
  const filtered = lowerDraft
    ? pool.filter((t) => t.name.toLowerCase().includes(lowerDraft))
    : pool;
  // Show "create new" affordance when the draft doesn't exactly match
  // any existing tag.
  const canCreate =
    !!lowerDraft && !pool.some((t) => t.name.toLowerCase() === lowerDraft);

  const handleCreate = async () => {
    const name = draft.trim();
    if (!name) return;
    setBusy(true);
    setError(null);
    try {
      await onAttachByName(name);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setBusy(false);
    }
  };

  const handleToggle = async (tag: TagRef) => {
    const isAttached = attachedIds.has(tag.id);
    setBusy(true);
    setError(null);
    try {
      await onToggleAttached(tag, !isAttached);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-label="ניהול תגיות"
      className="w-64 rounded-lg border border-gray-200 bg-white p-2 shadow-xl"
      dir="rtl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-800">תגיות</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="סגור"
          className="text-gray-500 hover:bg-gray-100 rounded-full p-0.5"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-1 mb-2">
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canCreate) {
              e.preventDefault();
              void handleCreate();
            }
          }}
          placeholder="חיפוש או יצירת תגית חדשה"
          disabled={busy}
          className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-xs"
        />
        {canCreate ? (
          <button
            type="button"
            onClick={handleCreate}
            disabled={busy}
            aria-label={`צור תגית "${draft.trim()}"`}
            className="rounded-md bg-emerald-600 p-1 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      <div className="max-h-44 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-xs text-gray-500 py-2 text-center">
            {pool.length === 0 ? "טרם נוצרו תגיות." : "אין התאמות."}
          </p>
        ) : (
          <ul className="space-y-1">
            {filtered.map((t) => {
              const isOn = attachedIds.has(t.id);
              const style = tagStyle(t);
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => handleToggle(t)}
                    disabled={busy}
                    className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
                  >
                    <span
                      className="inline-block h-5 w-5 rounded-md border flex items-center justify-center shrink-0"
                      style={
                        isOn
                          ? { ...style, borderColor: style.borderColor }
                          : { borderColor: "#d1d5db", background: "#fff" }
                      }
                    >
                      {isOn ? <Check className="h-3 w-3" /> : null}
                    </span>
                    <span
                      className="inline-block rounded-full border px-2 py-0.5 leading-none text-[11px]"
                      style={style}
                    >
                      {t.name}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {error ? (
        <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[10px] text-red-700">
          {error}
        </div>
      ) : null}
    </div>
  );
}
