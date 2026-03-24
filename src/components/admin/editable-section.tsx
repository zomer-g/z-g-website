"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import { useEditMode } from "@/contexts/admin-bar-context";
import { cn } from "@/lib/utils";

interface EditableSectionProps {
  children: React.ReactNode;
  editHref: string;
  editLabel: string;
  className?: string;
}

export function EditableSection({ children, editHref, editLabel, className }: EditableSectionProps) {
  const { editMode } = useEditMode();

  if (!editMode) return <>{children}</>;

  return (
    <div className={cn("group/edit relative", className)}>
      {children}
      <Link
        href={editHref}
        target="_blank"
        className={cn(
          "absolute start-3 top-3 z-[55] inline-flex items-center gap-1.5",
          "rounded-full bg-gray-900/80 px-3 py-1.5 text-xs font-medium text-white shadow-lg",
          "opacity-0 transition-all duration-200 group-hover/edit:opacity-100",
          "hover:bg-accent hover:text-primary-dark",
          "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          // Always visible on touch devices
          "touch-action-manipulation max-sm:opacity-70",
        )}
        aria-label={`ערוך: ${editLabel}`}
      >
        <Pencil className="h-3 w-3" />
        <span>{editLabel}</span>
      </Link>
    </div>
  );
}

interface EditableItemProps {
  children: React.ReactNode;
  editHref: string;
  editLabel: string;
  className?: string;
}

export function EditableItem({ children, editHref, editLabel, className }: EditableItemProps) {
  const { editMode } = useEditMode();

  if (!editMode) return <>{children}</>;

  return (
    <div className={cn("group/item relative", className)}>
      {children}
      <Link
        href={editHref}
        target="_blank"
        className={cn(
          "absolute start-2 top-2 z-[55] inline-flex items-center justify-center",
          "h-7 w-7 rounded-full bg-gray-900/80 text-white shadow-md",
          "opacity-0 transition-all duration-200 group-hover/item:opacity-100",
          "hover:bg-accent hover:text-primary-dark",
          "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          "max-sm:opacity-70",
        )}
        aria-label={`ערוך: ${editLabel}`}
      >
        <Pencil className="h-3 w-3" />
      </Link>
    </div>
  );
}
