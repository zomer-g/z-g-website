"use client";

import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface AutoRefreshToggleProps {
  enabled: boolean;
  onToggle: () => void;
  onRefreshNow: () => void;
  /** Seconds between polls, shown so the reader knows what they're switching off. */
  intervalSeconds: number;
  className?: string;
}

/**
 * Pairs with `useAutoRefresh`: a switch for the polling and a manual
 * "refresh now" for when it's off. Satisfies the "postpone or suppress"
 * half of WCAG 2.2.4 — the reader can stop the page changing under them
 * and still get fresh data on demand.
 */
export function AutoRefreshToggle({
  enabled,
  onToggle,
  onRefreshNow,
  intervalSeconds,
  className,
}: AutoRefreshToggleProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={enabled}
        className={cn(
          "tap-44 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
          enabled
            ? "border-primary bg-primary text-white"
            : "border-border-control bg-white text-gray-700 hover:bg-gray-50",
        )}
      >
        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
        {enabled
          ? `רענון אוטומטי פעיל (כל ${intervalSeconds} שניות)`
          : "רענון אוטומטי כבוי"}
      </button>

      {!enabled && (
        <button
          type="button"
          onClick={onRefreshNow}
          className="tap-44 inline-flex items-center gap-1.5 rounded-full border border-border-control bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"
        >
          לרענון עכשיו
        </button>
      )}
    </div>
  );
}
