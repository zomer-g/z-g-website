"use client";

// A thin strip shown at the top of a message pane once the user has
// "marked" a set of messages (via selection → "הצג נבחרות"). It lets
// them toggle between viewing the whole conversation and viewing only
// the marked subset, and to clear the marks entirely.
//
// Shared by the WhatsApp/timeline panes (stream-pane, merged-view) and
// the workflows event-pane — all of which support the same focus flow.

import { Filter, X, ListFilter } from "lucide-react";
import { cn } from "@/lib/utils";

interface FocusBannerProps {
  // How many items are currently marked. The banner hides itself at 0.
  markedCount: number;
  // Whether the pane is currently filtered to the marked subset.
  focusActive: boolean;
  onToggleFocus: () => void;
  onClearMarks: () => void;
  // "הודעות" (default) or "אירועים" for the workflows pane.
  itemNoun?: string;
}

export function FocusBanner({
  markedCount,
  focusActive,
  onToggleFocus,
  onClearMarks,
  itemNoun = "הודעות",
}: FocusBannerProps) {
  if (markedCount === 0) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 px-3 py-1.5 shrink-0",
        "border-b text-xs",
        focusActive
          ? "bg-amber-100 border-amber-300 text-amber-900"
          : "bg-amber-50 border-amber-200 text-amber-800",
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <Filter className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="font-semibold truncate">
          {focusActive
            ? `מציג ${markedCount} ${itemNoun} מסומנות בלבד`
            : `${markedCount} ${itemNoun} מסומנות`}
        </span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onToggleFocus}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-semibold transition-colors",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-1",
            focusActive
              ? "border-amber-400 bg-white text-amber-800 hover:bg-amber-50"
              : "border-amber-500 bg-amber-600 text-white hover:bg-amber-700",
          )}
          aria-pressed={focusActive}
        >
          <ListFilter className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{focusActive ? "הצג הכל" : "הצג מסומנות בלבד"}</span>
        </button>
        <button
          type="button"
          onClick={onClearMarks}
          className={cn(
            "inline-flex items-center justify-center h-7 w-7 rounded-full",
            "hover:bg-black/5 transition-colors",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600",
          )}
          aria-label="ניקוי הסימון"
          title="ניקוי הסימון"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
