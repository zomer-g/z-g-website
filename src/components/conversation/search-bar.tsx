"use client";

// Top bar with: free-text input + active tag filter chips + a popover
// trigger that exposes the FULL workspace/project tag pool so the user
// can pick filters without first having to find a chip on a bubble.
// Lives inside the conversation shell, above the sidebar + main pane.
// Driven by `useConversationUrlState` — every change writes to the
// URL, which is the source of truth.

import { useEffect, useRef, useState } from "react";
import { Search, X, Filter, Check, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { TagChips } from "./tag-chips";
import { tagStyle } from "./tag-utils";
import type { TagRef, SearchState } from "./types";

interface SearchBarProps {
  qDraft: string;
  setQDraft: (next: string) => void;
  onCommitQuery: () => void;
  searchState: SearchState;
  pool: TagRef[];
  onToggleTag: (tagId: string) => void;
  onClear: () => void;
  // When provided, renders a back-arrow button at the leading edge of
  // the search bar. The shell passes this in only when there's a sub-
  // view to exit (open chat / merged view / search results) so the
  // arrow doesn't appear on the empty list state where it would have
  // nothing to do.
  onBack?: () => void;
}

export function SearchBar({
  qDraft,
  setQDraft,
  onCommitQuery,
  searchState,
  pool,
  onToggleTag,
  onClear,
  onBack,
}: SearchBarProps) {
  const activeTagIds = new Set(searchState.tagIds);
  // Surface the resolved chips for the URL's tag ids — we look them
  // up in the pool so we can show the human-readable name.
  const activeTags = pool.filter((t) => activeTagIds.has(t.id));
  const hasFilter = !!searchState.q || searchState.tagIds.length > 0;

  /* ── Tag-pool popover ── */
  // Anchored next to the filter button. The user can scan the entire
  // pool and toggle multiple tags; the URL updates immediately on each
  // click so the result panel rerenders as they go.
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
  const tagButtonRef = useRef<HTMLButtonElement>(null);
  const tagPopoverRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!tagPopoverOpen) return;
    const onClick = (e: MouseEvent) => {
      if (tagButtonRef.current?.contains(e.target as Node)) return;
      if (tagPopoverRef.current?.contains(e.target as Node)) return;
      setTagPopoverOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTagPopoverOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [tagPopoverOpen]);

  return (
    <div className="border-b border-black/5 bg-white px-3 py-2 shrink-0">
      <div className="flex items-center gap-2">
        {/* Back arrow — only when the shell has a sub-view to exit.
            Always visible (both viewports) so users on mobile aren't
            forced to scroll up into the chat header to find the back
            arrow there. */}
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="חזרה לרשימת השכבות/השיחות"
            title="חזרה — סגירת התצוגה הנוכחית"
            className="inline-flex shrink-0 items-center justify-center h-9 w-9 rounded-full hover:bg-black/5 text-gray-700"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
        ) : null}
        <label className="relative flex-1">
          <span className="sr-only">חיפוש בתוכן</span>
          <Search
            className="absolute top-1/2 -translate-y-1/2 start-2 h-3.5 w-3.5 text-gray-400"
            aria-hidden="true"
          />
          <input
            type="text"
            value={qDraft}
            onChange={(e) => setQDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onCommitQuery();
              }
            }}
            onBlur={onCommitQuery}
            placeholder="חיפוש בתוך התוכן (כל השכבות/השיחות) — Enter לאישור"
            className="w-full rounded-full bg-[#f0f2f5] border border-transparent ps-7 pe-3 py-1.5 text-sm focus:outline-none focus:border-emerald-200"
          />
        </label>

        {/* Tag-filter trigger — only shows when there's a pool to pick from. */}
        {pool.length > 0 ? (
          <div className="relative shrink-0">
            <button
              ref={tagButtonRef}
              type="button"
              onClick={() => setTagPopoverOpen((v) => !v)}
              aria-expanded={tagPopoverOpen}
              aria-label="סינון לפי תגיות"
              title="סינון לפי תגיות"
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                searchState.tagIds.length > 0
                  ? "border-emerald-400 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
              )}
            >
              <Filter className="h-3.5 w-3.5" aria-hidden="true" />
              <span>תגיות</span>
              {searchState.tagIds.length > 0 ? (
                <span className="rounded-full bg-emerald-600 text-white text-[10px] leading-none px-1.5 py-0.5">
                  {searchState.tagIds.length}
                </span>
              ) : null}
            </button>

            {tagPopoverOpen ? (
              <div
                ref={tagPopoverRef}
                role="dialog"
                aria-label="בחירת תגיות לסינון"
                className={cn(
                  "absolute top-full mt-1 end-0 z-50",
                  "w-72 max-w-[80vw] rounded-lg border border-gray-200 bg-white shadow-lg",
                  "p-3",
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-gray-800">
                    סינון לפי תגיות
                  </div>
                  {searchState.tagIds.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        for (const id of [...searchState.tagIds]) onToggleTag(id);
                      }}
                      className="text-[11px] text-gray-600 hover:text-gray-900"
                    >
                      ניקוי
                    </button>
                  ) : null}
                </div>
                <p className="text-[11px] text-gray-500 mb-2 leading-snug">
                  בחר/י תגית אחת או יותר — יוצגו רק פריטים שמשויכים לפחות לאחת מהתגיות שנבחרו.
                </p>
                <ul className="max-h-64 overflow-y-auto -mx-1">
                  {pool.map((t) => {
                    const active = activeTagIds.has(t.id);
                    return (
                      <li key={t.id}>
                        <button
                          type="button"
                          onClick={() => onToggleTag(t.id)}
                          className={cn(
                            "w-full flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-start",
                            "hover:bg-gray-50 transition-colors",
                            active && "bg-emerald-50",
                          )}
                          aria-pressed={active}
                        >
                          <span
                            className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium leading-none"
                            style={tagStyle(t)}
                          >
                            {t.name}
                          </span>
                          {active ? (
                            <Check
                              className="h-4 w-4 text-emerald-700 shrink-0"
                              aria-hidden="true"
                            />
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        {hasFilter ? (
          <button
            type="button"
            onClick={onClear}
            aria-label="ניקוי חיפוש"
            className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 rounded-md px-2 py-1 hover:bg-gray-100 shrink-0"
          >
            <X className="h-3.5 w-3.5" />
            ניקוי
          </button>
        ) : null}
      </div>

      {/* Active tag chips — clicking a chip removes it from the URL filter. */}
      {activeTags.length > 0 ? (
        <div className="mt-2">
          <TagChips
            tags={activeTags}
            onTagClick={onToggleTag}
            removable
            activeTagIds={activeTagIds}
            size="sm"
          />
        </div>
      ) : null}
    </div>
  );
}
