"use client";

import { createContext, useContext, useId, useState } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";

/**
 * Collapsible filters on phones.
 *
 * On the database pages (guidelines, rulings, class actions, comptroller
 * reports…) the filter panel came first and took two or three phone screens
 * before the first result. Below the md breakpoint, everything marked
 * `mf-collapse` inside <MobileFilters> is hidden until the reader taps
 * <MobileFiltersButton>; the free-text search stays visible. From md up
 * nothing changes: the button is hidden and the filters always show.
 *
 * The hiding is one CSS rule in globals.css (.mf-root:not(.mf-open)
 * .mf-collapse), so the filter markup itself needs only a class name.
 */

interface Ctx {
  open: boolean;
  toggle: () => void;
  regionId: string;
}

const MobileFiltersContext = createContext<Ctx | null>(null);

export function MobileFilters({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const regionId = useId();
  return (
    <MobileFiltersContext.Provider value={{ open, toggle: () => setOpen((o) => !o), regionId }}>
      <div id={regionId} className={open ? "mf-root mf-open" : "mf-root"}>
        {children}
      </div>
    </MobileFiltersContext.Provider>
  );
}

export function MobileFiltersButton({
  label = "סינון מתקדם",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  const ctx = useContext(MobileFiltersContext);
  if (!ctx) return null;
  return (
    <button
      type="button"
      onClick={ctx.toggle}
      aria-expanded={ctx.open}
      aria-controls={ctx.regionId}
      className={`md:hidden tap-44 w-full flex items-center justify-between gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 ${className}`}
    >
      <span className="inline-flex items-center gap-2">
        <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
        {ctx.open ? "הסתרת הסינון" : label}
      </span>
      <ChevronDown
        className={`h-4 w-4 transition-transform ${ctx.open ? "rotate-180" : ""}`}
        aria-hidden="true"
      />
    </button>
  );
}
