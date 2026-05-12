"use client";

import { useCallback, useState } from "react";

// A pair of buttons for sharing the current page (or a passed URL):
//   1. "📋 העתק קישור" — copies the URL to the clipboard, briefly showing
//      "✓ הקישור הועתק" so the user knows it worked.
//   2. "↗ שתף" — only rendered on browsers that expose the Web Share API
//      (mobile + Edge). Opens the native share sheet so the user can pipe the
//      link into WhatsApp / Signal / etc. without copy-pasting.
//
// The URL falls back to `window.location.href` so callers can drop the
// component on any page and get the right link without wiring props.

interface ShareLinkButtonProps {
  // Absolute or path-relative URL to share. Defaults to the current page URL.
  url?: string;
  // Optional title used by the native share sheet (mobile only).
  title?: string;
  // Optional text used by the native share sheet (mobile only).
  text?: string;
  // Compact variant renders as a single icon-sized button — used inside list cards.
  compact?: boolean;
  className?: string;
}

function resolveUrl(url?: string): string {
  if (!url) {
    if (typeof window === "undefined") return "";
    return window.location.href;
  }
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (typeof window === "undefined") return url;
  return new URL(url, window.location.origin).toString();
}

export function ShareLinkButton({
  url,
  title,
  text,
  compact = false,
  className,
}: ShareLinkButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  const onCopy = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      // The card around us is a stretched-link target — without this, the
      // outer <a> swallows the click and navigates away before the copy runs.
      e.preventDefault();
      e.stopPropagation();
      const target = resolveUrl(url);
      try {
        await navigator.clipboard.writeText(target);
        setStatus("copied");
      } catch {
        // Clipboard API can fail when the page isn't focused (e.g. iOS) — fall
        // back to the legacy execCommand path before giving up.
        try {
          const ta = document.createElement("textarea");
          ta.value = target;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          const ok = document.execCommand("copy");
          document.body.removeChild(ta);
          setStatus(ok ? "copied" : "failed");
        } catch {
          setStatus("failed");
        }
      }
      setTimeout(() => setStatus("idle"), 2000);
    },
    [url],
  );

  const onShare = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (typeof navigator === "undefined" || !("share" in navigator)) return;
      try {
        await navigator.share({
          url: resolveUrl(url),
          title,
          text,
        });
      } catch {
        // User cancelled the share sheet — nothing to do.
      }
    },
    [url, title, text],
  );

  const canNativeShare =
    typeof navigator !== "undefined" && "share" in navigator;

  // Compact (in-card) variant: just an icon-sized copy button. Saves space on
  // dense list views where every pixel matters.
  if (compact) {
    return (
      <button
        type="button"
        onClick={onCopy}
        aria-label={
          status === "copied"
            ? "הקישור הועתק"
            : status === "failed"
              ? "ההעתקה נכשלה"
              : "להעתקת קישור לפריט"
        }
        title={
          status === "copied"
            ? "הקישור הועתק ללוח"
            : status === "failed"
              ? "ההעתקה נכשלה"
              : "להעתקת קישור לפריט"
        }
        className={`relative z-10 inline-flex items-center justify-center w-8 h-8 rounded-md border text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition ${className ?? ""}`}
        style={{ borderColor: "#d1d5db" }}
      >
        {status === "copied" ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4 text-green-700"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.42 0l-3.5-3.5a1 1 0 111.42-1.42L8.5 12.08l6.79-6.79a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          // Link icon — universal "copy link" affordance.
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        )}
      </button>
    );
  }

  // Full variant: side-by-side "copy" + (when available) "share" buttons.
  // Used on detail pages where there's space for an explicit label.
  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <button
        type="button"
        onClick={onCopy}
        className="relative z-10 inline-flex items-center gap-1.5 text-sm font-semibold rounded-md px-3 py-1.5 border text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition"
        style={{ borderColor: "#d1d5db" }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
        <span>
          {status === "copied"
            ? "הקישור הועתק"
            : status === "failed"
              ? "ההעתקה נכשלה"
              : "להעתקת קישור"}
        </span>
      </button>
      {canNativeShare ? (
        <button
          type="button"
          onClick={onShare}
          className="relative z-10 inline-flex items-center gap-1.5 text-sm font-semibold rounded-md px-3 py-1.5 border text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition"
          style={{ borderColor: "#d1d5db" }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          <span>שיתוף</span>
        </button>
      ) : null}
    </div>
  );
}
