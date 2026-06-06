"use client";

// Small toolbar shown at the top of every admin editor page (both
// /admin/pages/[slug] and /admin/site-editor/[page]). For pages with a known
// public URL, it surfaces two quick actions:
//
//   • "פתח בלשונית חדשה" — open the live page in a new tab.
//   • "העתק כתובת"      — copy the FULL https://… URL to the clipboard so
//                         the admin can paste it into the Chrome Web Store
//                         listing, email signatures, etc.
//
// Falls back gracefully when the slug isn't in the registry (returns null),
// so it's safe to drop into any editor without per-slug guards.

import { useState } from "react";
import { Copy, ExternalLink, Check } from "lucide-react";
import { getPublicPathForSlug } from "@/lib/admin-page-map";

interface Props {
  slug: string;
}

export function PagePublicUrlActions({ slug }: Props) {
  const [copied, setCopied] = useState(false);
  const publicPath = getPublicPathForSlug(slug);

  if (!publicPath) return null;

  // Absolute URL for the copy-to-clipboard action. Falls back to relative on
  // first render (SSR / hydration mismatch protection) — the open button
  // works fine relative too.
  const absoluteUrl =
    typeof window !== "undefined"
      ? new URL(publicPath, window.location.origin).toString()
      : publicPath;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Older browser or denied permission — fall through silently.
    }
  }

  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-soft px-3 py-2 text-sm"
      style={{ background: "#f8fafc" }}
    >
      <span className="text-xs text-muted">כתובת ציבורית:</span>
      <code
        className="rounded bg-white px-2 py-0.5 text-xs font-mono"
        dir="ltr"
        title={absoluteUrl}
      >
        {publicPath}
      </code>
      <div className="flex-1" />
      <a
        href={publicPath}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-1.5 text-xs font-medium text-foreground hover:bg-gray-50"
      >
        <ExternalLink size={14} />
        פתח בלשונית חדשה
      </a>
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-1.5 text-xs font-medium text-foreground hover:bg-gray-50"
        aria-label="העתק את הכתובת המלאה ללוח"
      >
        {copied ? (
          <>
            <Check size={14} className="text-green-600" />
            הועתק
          </>
        ) : (
          <>
            <Copy size={14} />
            העתק כתובת
          </>
        )}
      </button>
    </div>
  );
}
