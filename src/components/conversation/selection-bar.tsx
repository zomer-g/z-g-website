"use client";

// Sticky bar that appears at the bottom of the chat pane whenever one
// or more messages are selected. Shows a count + print + clear actions.

import { Printer, X, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectionBarProps {
  count: number;
  onPrint: () => void;
  onClear: () => void;
}

export function SelectionBar({ count, onPrint, onClear }: SelectionBarProps) {
  if (count === 0) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-4 py-2.5 shrink-0",
        "bg-emerald-700 text-white",
        "border-t border-emerald-800",
      )}
      role="status"
      aria-live="polite"
      aria-label={`${count} ${count === 1 ? "הודעה נבחרת" : "הודעות נבחרות"}`}
    >
      <div className="flex items-center gap-2">
        <CheckSquare className="h-4 w-4 opacity-80" aria-hidden="true" />
        <span className="text-sm font-semibold">
          {count} {count === 1 ? "הודעה נבחרת" : "הודעות נבחרות"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrint}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5",
            "bg-white text-emerald-800 text-sm font-semibold",
            "hover:bg-emerald-50 transition-colors",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-700",
          )}
          aria-label="הדפסת ההודעות הנבחרות"
        >
          <Printer className="h-4 w-4" aria-hidden="true" />
          <span>הדפסה</span>
        </button>
        <button
          type="button"
          onClick={onClear}
          className={cn(
            "inline-flex items-center justify-center h-8 w-8 rounded-full",
            "bg-white/15 hover:bg-white/25 transition-colors",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-white",
          )}
          aria-label="ביטול בחירת הודעות"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
