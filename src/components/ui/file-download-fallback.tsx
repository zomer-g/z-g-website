"use client";

import { cn } from "@/lib/utils";

/** The same file URL, asking the server to send it as a download. */
export function fileDownloadHref(fileUrl: string): string {
  return `${fileUrl}${fileUrl.includes("?") ? "&" : "?"}download=1`;
}

/**
 * A small "didn't open? download it" link shown next to a document's
 * view button. Some corporate proxies (Symantec Web Isolation) block a PDF
 * opened inline in the browser but let a plain download through; this gives
 * those visitors a way to get the file.
 */
export function FileDownloadFallback({
  href,
  className,
}: {
  href: string;
  className?: string;
}) {
  return (
    <a
      href={fileDownloadHref(href)}
      download
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "relative z-10 inline-block text-xs text-gray-600 underline underline-offset-2",
        "hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 rounded-sm",
        className,
      )}
    >
      לא נפתח? להורדת הקובץ
    </a>
  );
}
