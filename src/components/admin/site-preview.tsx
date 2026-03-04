"use client";

import { useState } from "react";
import { Monitor, Smartphone, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Types ─── */

interface SitePreviewProps {
  /** The public page URL to load inside the iframe. */
  url: string;
  /** Changing this value forces the iframe to reload. */
  refreshKey?: number;
}

type ViewMode = "desktop" | "mobile";

/* ─── Component ─── */

export default function SitePreview({ url, refreshKey = 0 }: SitePreviewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("desktop");
  const [internalKey, setInternalKey] = useState(0);

  /** Combines the external refreshKey with an internal counter so both
   *  parent-driven and manual refreshes work. */
  const iframeKey = `${refreshKey}-${internalKey}`;

  const handleRefresh = () => {
    setInternalKey((prev) => prev + 1);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* ── Toolbar ── */}
      <div
        className={cn(
          "flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2",
          "shadow-sm",
        )}
      >
        {/* View-mode toggle */}
        <div className="flex items-center gap-1 rounded-md border border-gray-200 p-0.5">
          <button
            type="button"
            onClick={() => setViewMode("desktop")}
            className={cn(
              "flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors",
              viewMode === "desktop"
                ? "bg-primary-dark text-white"
                : "text-gray-600 hover:bg-gray-100",
            )}
            aria-pressed={viewMode === "desktop"}
            aria-label="תצוגת מחשב"
          >
            <Monitor size={16} />
            <span>מחשב</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("mobile")}
            className={cn(
              "flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors",
              viewMode === "mobile"
                ? "bg-primary-dark text-white"
                : "text-gray-600 hover:bg-gray-100",
            )}
            aria-pressed={viewMode === "mobile"}
            aria-label="תצוגת נייד"
          >
            <Smartphone size={16} />
            <span>נייד</span>
          </button>
        </div>

        {/* Refresh button */}
        <button
          type="button"
          onClick={handleRefresh}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium",
            "text-gray-600 transition-colors hover:bg-gray-100",
          )}
          aria-label="רענן תצוגה מקדימה"
        >
          <RefreshCw size={16} />
          <span>רענון</span>
        </button>

        {/* Current URL */}
        <span
          className="mr-auto truncate text-xs text-gray-400 ltr:ml-auto ltr:mr-0"
          dir="ltr"
          title={url}
        >
          {url}
        </span>
      </div>

      {/* ── Preview Area ── */}
      <div
        className={cn(
          "flex w-full items-start justify-center overflow-auto rounded-lg bg-gray-100 p-4",
          viewMode === "mobile" && "min-h-[700px]",
        )}
      >
        <div
          className={cn(
            "transition-all duration-300",
            viewMode === "desktop" && "w-full",
            viewMode === "mobile" &&
              "w-[375px] rounded-[2rem] border-[6px] border-gray-800 bg-gray-800 p-1 shadow-xl",
          )}
        >
          {/* Phone notch decoration (mobile only) */}
          {viewMode === "mobile" && (
            <div className="mx-auto mb-1 h-5 w-28 rounded-b-xl bg-gray-800" />
          )}

          <iframe
            key={iframeKey}
            src={url}
            title="תצוגה מקדימה של האתר"
            className={cn(
              "border border-gray-200 bg-white",
              viewMode === "desktop" && "h-[700px] w-full rounded-lg",
              viewMode === "mobile" && "h-[650px] w-full rounded-2xl",
            )}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
          />

          {/* Phone home-bar decoration (mobile only) */}
          {viewMode === "mobile" && (
            <div className="mx-auto mt-2 h-1 w-24 rounded-full bg-gray-500" />
          )}
        </div>
      </div>
    </div>
  );
}
