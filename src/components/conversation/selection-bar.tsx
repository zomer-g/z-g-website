"use client";

// Sticky bar that appears at the bottom of the chat pane whenever one
// or more messages are selected. Shows a count + actions:
//   - הדפסה        → print the selected messages
//   - הסתר         → (admin only) bulk-hide the selected messages
//   - X            → clear the selection / exit selection mode

import { Printer, X, CheckSquare, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectionBarProps {
  count: number;
  onPrint: () => void;
  onClear: () => void;
  // Bulk-hide the selected messages. Only provided for admins on the
  // private management interface.
  onHideSelected?: () => void;
  // Noun for the count label: "הודעה"/"הודעות" or "אירוע"/"אירועים".
  itemNounSingular?: string;
  itemNounPlural?: string;
}

export function SelectionBar({
  count,
  onPrint,
  onClear,
  onHideSelected,
  itemNounSingular = "הודעה",
  itemNounPlural = "הודעות",
}: SelectionBarProps) {
  if (count === 0) return null;
  const noun = count === 1 ? itemNounSingular : itemNounPlural;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 shrink-0",
        "bg-emerald-700 text-white",
        "border-t border-emerald-800",
      )}
      role="status"
      aria-live="polite"
      aria-label={`${count} ${count === 1 ? `${itemNounSingular} נבחרת` : `${itemNounPlural} נבחרות`}`}
    >
      <div className="flex items-center gap-2 shrink-0">
        <CheckSquare className="h-4 w-4 opacity-80" aria-hidden="true" />
        <span className="text-sm font-semibold">
          {count} {noun} {count === 1 ? "נבחרת" : "נבחרות"}
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
          aria-label="הדפסת הפריטים הנבחרים"
        >
          <Printer className="h-4 w-4" aria-hidden="true" />
          <span>הדפסה</span>
        </button>

        {onHideSelected ? (
          <button
            type="button"
            onClick={onHideSelected}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5",
              "bg-white/15 text-white text-sm font-semibold",
              "hover:bg-white/25 transition-colors",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-white",
            )}
            aria-label="הסתרת ההודעות הנבחרות ממציגים אחרים"
          >
            <EyeOff className="h-4 w-4" aria-hidden="true" />
            <span>הסתר</span>
          </button>
        ) : null}

        <button
          type="button"
          onClick={onClear}
          className={cn(
            "inline-flex items-center justify-center h-8 w-8 rounded-full",
            "bg-white/15 hover:bg-white/25 transition-colors",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-white",
          )}
          aria-label="ביטול הבחירה"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
