"use client";

// Inline strip of tag chips rendered under a bubble or as a filter
// indicator in the SearchBar. Each chip can be clickable (then the
// click writes the tagId into the URL filter via the URL-state hook).

import { tagStyle } from "./tag-utils";
import type { TagRef } from "./types";

interface TagChipsProps {
  tags: TagRef[];
  // When set, each chip becomes a button that calls onTagClick(id).
  // When omitted, chips are static labels.
  onTagClick?: (tagId: string) => void;
  // Highlights chips whose id is in this set — used by the SearchBar
  // to show which tags are currently filtering the view.
  activeTagIds?: Set<string>;
  // Adds an "×" inside each chip for removal — used by the SearchBar
  // active-filter row.
  removable?: boolean;
  size?: "xs" | "sm";
}

export function TagChips({
  tags,
  onTagClick,
  activeTagIds,
  removable = false,
  size = "xs",
}: TagChipsProps) {
  if (tags.length === 0) return null;
  const padding = size === "sm" ? "px-2 py-0.5" : "px-1.5 py-0.5";
  const textCls = size === "sm" ? "text-xs" : "text-[10px]";
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((t) => {
        const style = tagStyle(t);
        const isActive = activeTagIds?.has(t.id) ?? false;
        const className =
          `inline-flex items-center gap-1 rounded-full border ${padding} ${textCls} font-medium leading-none ` +
          (isActive ? "ring-2 ring-offset-1 ring-emerald-500" : "");
        if (onTagClick) {
          return (
            <button
              key={t.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTagClick(t.id);
              }}
              className={className}
              style={style}
              aria-pressed={isActive}
            >
              <span>{t.name}</span>
              {removable ? <span aria-hidden="true">×</span> : null}
            </button>
          );
        }
        return (
          <span key={t.id} className={className} style={style}>
            {t.name}
          </span>
        );
      })}
    </div>
  );
}
