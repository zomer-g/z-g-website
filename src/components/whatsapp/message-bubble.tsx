"use client";

// One chat bubble. Switches its rendering by message type:
//   - system notice → gray centered pill
//   - text only → standard bubble (green for outgoing, white for incoming)
//   - image media → bubble contains an <img>, click opens a lightbox
//   - audio media → <audio controls> inside the bubble
//   - everything else (pdf/docx/...) → file-tile that opens the URL
//
// The component never fetches anything itself — every media URL is
// produced by the parent (data: URL on the mock landing, or
// /api/whatsapp/media/<id> for a real workspace, which 401s/404s for
// non-authorized users).

import { useState } from "react";
import { Download, FileText, Image as ImageIcon, Mic, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WhatsappMessageDTO } from "./types";

interface MessageBubbleProps {
  message: WhatsappMessageDTO;
  isOutgoing: boolean;
  // Show the sender label above the bubble (used for the first message
  // in a run by the same sender).
  showSender: boolean;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

function FileTile({
  filename,
  size,
  url,
  iconKind,
}: {
  filename: string;
  size: number;
  url: string;
  iconKind: "doc" | "image" | "audio";
}) {
  const Icon = iconKind === "doc" ? FileText : iconKind === "image" ? ImageIcon : Mic;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex items-center gap-3 rounded-md border border-black/10 bg-black/[0.04] px-3 py-2",
        "hover:bg-black/[0.08] transition-colors",
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-emerald-700 shadow-sm">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-gray-900">{filename}</div>
        <div className="text-xs text-gray-600">{formatBytes(size)}</div>
      </div>
      <Download className="h-4 w-4 text-gray-500 shrink-0" />
    </a>
  );
}

export function MessageBubble({ message, isOutgoing, showSender }: MessageBubbleProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (message.isSystem) {
    return (
      <div className="flex justify-center my-3">
        <div className="rounded-lg bg-yellow-50 px-3 py-1 text-xs text-yellow-800 shadow-sm">
          {message.text || "הודעת מערכת"}
        </div>
      </div>
    );
  }

  const time = formatTime(message.timestamp);
  const isImage = message.media?.mimeType.startsWith("image/");
  const isAudio = message.media?.mimeType.startsWith("audio/");

  return (
    <div
      className={cn(
        "flex w-full px-2 my-0.5",
        // In RTL Hebrew, "outgoing" = right-aligned visually =
        // `justify-start` because the start edge is on the right.
        isOutgoing ? "justify-start" : "justify-end",
      )}
    >
      <div
        className={cn(
          "max-w-[78%] sm:max-w-[68%] rounded-lg shadow-sm",
          // Tail-ish corner: outgoing flat on top-start, incoming flat on top-end.
          isOutgoing
            ? "bg-emerald-100 rounded-tr-md rounded-tl-2xl rounded-bl-2xl rounded-br-2xl"
            : "bg-white rounded-tl-md rounded-tr-2xl rounded-br-2xl rounded-bl-2xl",
          "px-2.5 py-1.5",
        )}
        dir="auto"
      >
        {showSender && !isOutgoing ? (
          <div className="text-xs font-semibold text-emerald-700 mb-0.5">
            {message.sender || "הודעה"}
          </div>
        ) : null}

        {/* Media first, text below — matches WhatsApp Web layout. */}
        {message.media ? (
          <div className="mb-1">
            {isImage ? (
              <>
                <button
                  type="button"
                  onClick={() => setLightboxOpen(true)}
                  className="block w-full"
                  aria-label={`פתח תמונה: ${message.media.filename}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={message.media.url}
                    alt={message.media.filename}
                    className="rounded-md max-h-72 w-auto object-contain bg-black/5"
                    loading="lazy"
                  />
                </button>
                {lightboxOpen ? (
                  <div
                    className="fixed inset-0 z-[80] bg-black/85 flex items-center justify-center p-4"
                    onClick={() => setLightboxOpen(false)}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxOpen(false);
                      }}
                      aria-label="סגור"
                      className="absolute top-3 end-3 z-[81] rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                    >
                      <X className="h-5 w-5" />
                    </button>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={message.media.url}
                      alt={message.media.filename}
                      className="max-h-[90vh] max-w-[90vw] object-contain"
                    />
                  </div>
                ) : null}
              </>
            ) : isAudio ? (
              <audio
                controls
                src={message.media.url}
                className="w-full max-w-xs"
                preload="none"
              />
            ) : (
              <FileTile
                filename={message.media.filename}
                size={message.media.size}
                url={message.media.url}
                iconKind="doc"
              />
            )}
          </div>
        ) : null}

        {message.text ? (
          <div className="whitespace-pre-wrap break-words text-sm text-gray-900">
            {message.text}
          </div>
        ) : null}

        <div className="text-[10px] text-gray-500 text-end mt-0.5">{time}</div>
      </div>
    </div>
  );
}
