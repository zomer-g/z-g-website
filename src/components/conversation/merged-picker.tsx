"use client";

// Modal that lets the operator pick a subset of chats to merge into
// one chronological timeline. Renders on top of the WhatsApp shell;
// dismiss with Esc or backdrop click.
//
// The picker is a controlled component — it doesn't fetch anything,
// just collects the chosen chat ids and hands them back to the shell
// which does the merging.

import { useState } from "react";
import { X, CheckSquare, Square, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { useModalDialog } from "@/hooks/use-modal-dialog";
import type { WhatsappChatSummary } from "./types";

interface MergedPickerProps {
  chats: WhatsappChatSummary[];
  initialSelected: Set<string>;
  onCancel: () => void;
  onConfirm: (chatIds: string[]) => void;
}

export function MergedPicker({
  chats,
  initialSelected,
  onCancel,
  onConfirm,
}: MergedPickerProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected));

  // Esc to close, focus trapped inside, focus restored to the trigger.
  const dialog = useModalDialog(true, onCancel);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = chats.length > 0 && selected.size === chats.length;
  const noneSelected = selected.size === 0;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
    >
      {/* The dialog role belongs on the panel, not the backdrop: a screen
          reader confined to the dialog should not have the overlay's click
          target as its only child. */}
      <div
        {...dialog.dialogProps}
        aria-labelledby="merged-picker-title"
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-gray-200 px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <Layers className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="merged-picker-title" className="text-sm font-bold text-primary-dark">
              תצוגה משולבת
            </h2>
            <p className="text-xs text-gray-600 leading-tight">
              סמני אילו שיחות לאחד לציר זמן רציף.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="סגור"
            className="text-gray-500 hover:bg-gray-100 rounded-full p-1.5"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Quick toggles */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 text-xs text-gray-700">
          <span>{selected.size} מתוך {chats.length} נבחרו</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelected(new Set(chats.map((c) => c.id)))}
              disabled={allSelected}
              className="font-semibold hover:underline disabled:opacity-40"
            >
              בחרי הכל
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              disabled={noneSelected}
              className="font-semibold hover:underline disabled:opacity-40"
            >
              ניקוי
            </button>
          </div>
        </div>

        {/* Chat list */}
        <ul role="list" className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {chats.map((c) => {
            const isOn = selected.has(c.id);
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => toggle(c.id)}
                  aria-pressed={isOn}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-start",
                    "hover:bg-emerald-50/60 transition-colors",
                    isOn && "bg-emerald-50",
                  )}
                >
                  {isOn ? (
                    <CheckSquare className="h-5 w-5 text-emerald-800 shrink-0" />
                  ) : (
                    <Square className="h-5 w-5 text-gray-600 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-gray-900 truncate">
                      {c.contactName}
                    </div>
                    <div className="text-xs text-gray-600">
                      {c.messageCount} הודעות
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Footer */}
        <footer className="flex items-center justify-end gap-2 border-t border-gray-200 px-4 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            ביטול
          </button>
          <button
            type="button"
            onClick={() => onConfirm([...selected])}
            disabled={noneSelected}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-semibold text-white",
              "bg-emerald-600 hover:bg-emerald-700",
              "disabled:bg-gray-300 disabled:cursor-not-allowed",
            )}
          >
            הצגה משולבת
          </button>
        </footer>
      </div>
    </div>
  );
}
