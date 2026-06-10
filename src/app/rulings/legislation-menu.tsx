"use client";

import { useEffect, useRef, useState } from "react";
import type { LegislationLink } from "@/types/content";

// Compact relevant-legislation control: a single "חקיקה" button that opens a
// dropdown of links (primary law + regulations). Takes no row of its own —
// meant to sit inline in an existing action/controls row. Renders nothing when
// there are no links.
export function LegislationMenu({
  items,
  align = "end",
}: {
  items?: LegislationLink[];
  align?: "start" | "end";
}) {
  const links = (items || []).filter((l) => l && l.label && l.url);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (links.length === 0) return null;

  const laws = links.filter((l) => l.kind !== "regulation");
  const regs = links.filter((l) => l.kind === "regulation");
  const grouped = laws.length > 0 && regs.length > 0;

  const renderLinks = (list: LegislationLink[]) =>
    list.map((l, i) => (
      <a
        key={i}
        href={l.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-md px-2 py-1.5 text-sm text-primary hover:bg-gray-50 leading-snug"
      >
        {l.label} <span aria-hidden="true">↗</span>
      </a>
    ));

  return (
    <div className="relative" ref={ref} dir="rtl">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        title="חקיקה וחקיקת משנה רלוונטית"
        className="inline-flex items-center gap-1 border border-gray-300 rounded-md px-2 py-1 text-xs bg-white hover:bg-gray-50 whitespace-nowrap"
      >
        חקיקה
        <span aria-hidden="true" className={open ? "rotate-180 inline-block" : "inline-block"}>
          ▾
        </span>
      </button>
      {open ? (
        <div
          className={`absolute z-30 mt-1 min-w-[240px] max-w-[340px] rounded-lg border border-gray-200 bg-white shadow-lg p-2 ${
            align === "start" ? "left-0" : "right-0"
          }`}
        >
          {grouped ? (
            <>
              <div className="text-[11px] font-semibold text-gray-400 px-2 pt-1 pb-0.5">
                חקיקה ראשית
              </div>
              {renderLinks(laws)}
              <div className="text-[11px] font-semibold text-gray-400 px-2 pt-2 pb-0.5">
                חקיקת משנה (תקנות)
              </div>
              {renderLinks(regs)}
            </>
          ) : (
            renderLinks(links)
          )}
        </div>
      ) : null}
    </div>
  );
}
