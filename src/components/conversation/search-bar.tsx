"use client";

// Top bar with: free-text input + active tag filter chips. Lives
// inside the conversation shell, above the sidebar + main pane.
// Driven by `useConversationUrlState` — every change writes to the
// URL, which is the source of truth.

import { Search, X } from "lucide-react";
import { TagChips } from "./tag-chips";
import type { TagRef, SearchState } from "./types";

interface SearchBarProps {
  qDraft: string;
  setQDraft: (next: string) => void;
  onCommitQuery: () => void;
  searchState: SearchState;
  pool: TagRef[];
  onToggleTag: (tagId: string) => void;
  onClear: () => void;
}

export function SearchBar({
  qDraft,
  setQDraft,
  onCommitQuery,
  searchState,
  pool,
  onToggleTag,
  onClear,
}: SearchBarProps) {
  const activeTagIds = new Set(searchState.tagIds);
  // Surface the resolved chips for the URL's tag ids — we look them
  // up in the pool so we can show the human-readable name.
  const activeTags = pool.filter((t) => activeTagIds.has(t.id));
  const hasFilter = !!searchState.q || searchState.tagIds.length > 0;

  return (
    <div className="border-b border-black/5 bg-white px-3 py-2 shrink-0">
      <div className="flex items-center gap-2">
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
            placeholder="חיפוש בכל השיחות/השכבות באזור"
            className="w-full rounded-full bg-[#f0f2f5] border border-transparent ps-7 pe-3 py-1.5 text-sm focus:outline-none focus:border-emerald-200"
          />
        </label>
        {hasFilter ? (
          <button
            type="button"
            onClick={onClear}
            aria-label="ניקוי חיפוש"
            className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 rounded-md px-2 py-1 hover:bg-gray-100"
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
