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

import { useEffect, useRef, useState } from "react";
import {
  Download,
  Eye,
  EyeOff,
  FileText,
  Image as ImageIcon,
  Mic,
  Star,
  Tag as TagIcon,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AudioPlayer } from "./audio-player";
import { TagChips } from "./tag-chips";
import { TagPicker } from "./tag-picker";
import type { WhatsappMessageDTO, TagRef } from "./types";

interface MessageBubbleProps {
  message: WhatsappMessageDTO;
  isOutgoing: boolean;
  // Show the sender label above the bubble (used for the first message
  // in a run by the same sender).
  showSender: boolean;
  // When true, the viewer is an ADMIN and we expose the hide toggle.
  // Hidden messages render with faded styling + a "hidden" badge so the
  // admin can still see them. Non-admins never receive hidden rows from
  // the server, so this branch never runs for them.
  isAdmin?: boolean;
  onToggleHidden?: (messageId: string, nextHidden: boolean) => void;
  // Tag system: pool + per-item attach/detach + active filter state.
  // The bubble renders TagChips below the body whenever the message
  // has tags (visible to everyone), plus a tag-icon button in the
  // hover controls that opens TagPicker (admin only).
  tagsPool?: TagRef[];
  onAttachTag?: (
    itemId: string,
    payload: { tagId: string } | { name: string },
  ) => Promise<TagRef>;
  onDetachTag?: (itemId: string, tagId: string) => Promise<void>;
  onToggleTagFilter?: (tagId: string) => void;
  activeTagIds?: string[];
  // Selection mode — when selectable is true, a checkbox appears and
  // clicking anywhere on the row toggles selection. Shift-click selects
  // the range between the last clicked row and this one.
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (messageId: string, shift?: boolean) => void;
  // Star ("מסומן בכוכב") — a lightweight per-message mark, like WhatsApp
  // starred messages. Available to everyone, independent of selection
  // mode. When starred, a filled star shows next to the timestamp.
  starred?: boolean;
  onToggleStar?: (messageId: string) => void;
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

export function MessageBubble({
  message,
  isOutgoing,
  showSender,
  isAdmin = false,
  onToggleHidden,
  tagsPool,
  onAttachTag,
  onDetachTag,
  onToggleTagFilter,
  activeTagIds,
  selectable = false,
  selected = false,
  onSelect,
  starred = false,
  onToggleStar,
}: MessageBubbleProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const tagButtonRef = useRef<HTMLButtonElement>(null);
  // Click-outside dismiss for the tag picker popover. The picker
  // itself stops propagation; clicks anywhere else close it.
  useEffect(() => {
    if (!tagPickerOpen) return;
    const onClick = (e: MouseEvent) => {
      if (tagButtonRef.current?.contains(e.target as Node)) return;
      setTagPickerOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [tagPickerOpen]);

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
  const hideable = isAdmin && !!onToggleHidden;
  const taggable = isAdmin && !!onAttachTag && !!onDetachTag;
  const starrable = !!onToggleStar;
  const itemTags = message.tags ?? [];
  const activeTagSet = activeTagIds ? new Set(activeTagIds) : undefined;

  return (
    <div
      className={cn(
        "group/bubble flex w-full px-2 my-0.5 items-start",
        // In RTL Hebrew, "outgoing" = right-aligned visually =
        // `justify-start` because the start edge is on the right.
        isOutgoing ? "justify-start" : "justify-end",
        message.isHidden && "opacity-50",
        // When selection mode is active, highlight the row on hover/selection.
        selectable && "cursor-pointer",
        selectable && selected && "bg-emerald-50/60",
        selectable && !selected && "hover:bg-black/[0.02]",
      )}
      onClick={
        selectable && onSelect
          ? (e) => onSelect(message.id, e.shiftKey)
          : undefined
      }
      aria-checked={selectable ? selected : undefined}
      role={selectable ? "checkbox" : undefined}
    >
      {/* Selection checkbox — shown on the visual-right of the row
          (start edge in RTL) when selectable mode is active. */}
      {selectable ? (
        <div
          className={cn(
            "shrink-0 flex items-center justify-center mt-1 me-1.5",
            "h-5 w-5 rounded border-2 transition-colors",
            selected
              ? "border-emerald-600 bg-emerald-600"
              : "border-gray-400 bg-white",
          )}
          aria-hidden="true"
        >
          {selected ? (
            <svg viewBox="0 0 12 10" className="h-3 w-3 text-white fill-current" aria-hidden="true">
              <polyline points="1,5 4.5,8.5 11,1" strokeWidth="2" stroke="white" fill="none" />
            </svg>
          ) : null}
        </div>
      ) : null}
      {/* Hover controls stacked vertically beside the bubble. The star
          toggle is available to everyone; hide + tag are admin-only.
          Hidden while in selection mode to avoid click conflicts. */}
      {(!selectable && (starrable || hideable || taggable)) ? (
        <div className="shrink-0 flex flex-col items-center mt-1.5 gap-0.5 opacity-0 group-hover/bubble:opacity-100 focus-within:opacity-100 transition-opacity">
          {starrable ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleStar!(message.id);
              }}
              aria-label={starred ? "ביטול הסימון בכוכב" : "סימון ההודעה בכוכב"}
              aria-pressed={starred}
              title={starred ? "ביטול סימון בכוכב" : "סימון בכוכב"}
              className={cn(
                "rounded-full p-1",
                starred
                  ? "text-amber-500 hover:bg-amber-50"
                  : "text-gray-500 hover:bg-black/5",
              )}
            >
              <Star
                className={cn("h-3.5 w-3.5", starred && "fill-amber-400")}
                aria-hidden="true"
              />
            </button>
          ) : null}
          {hideable ? (
            <button
              type="button"
              onClick={() => onToggleHidden!(message.id, !message.isHidden)}
              aria-label={message.isHidden ? "החזרה להצגה" : "הסתרת הודעה"}
              title={message.isHidden ? "הצגה מחדש" : "הסתרת ההודעה ממציגים אחרים"}
              className={cn(
                "rounded-full p-1",
                message.isHidden
                  ? "text-emerald-700 hover:bg-emerald-50"
                  : "text-gray-500 hover:bg-black/5",
              )}
            >
              {message.isHidden ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
            </button>
          ) : null}
          {taggable ? (
            <div className="relative">
              <button
                ref={tagButtonRef}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setTagPickerOpen((v) => !v);
                }}
                aria-label="ניהול תגיות להודעה"
                title="ניהול תגיות"
                aria-expanded={tagPickerOpen}
                className="rounded-full p-1 text-gray-500 hover:bg-black/5"
              >
                <TagIcon className="h-3.5 w-3.5" />
              </button>
              {tagPickerOpen ? (
                <div
                  className={cn(
                    // Anchor the popover next to the button. In RTL the
                    // "start" edge is the right; in mobile a fixed
                    // right-side offset works in both.
                    "absolute top-full mt-1 z-50",
                    isOutgoing ? "start-0" : "end-0",
                  )}
                >
                  <TagPicker
                    pool={tagsPool ?? []}
                    attached={itemTags}
                    onAttachByName={async (name) => {
                      const tag = await onAttachTag!(message.id, { name });
                      return tag;
                    }}
                    onToggleAttached={async (tag, attach) => {
                      if (attach) await onAttachTag!(message.id, { tagId: tag.id });
                      else await onDetachTag!(message.id, tag.id);
                    }}
                    onClose={() => setTagPickerOpen(false)}
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
      <div
        className={cn(
          "max-w-[78%] sm:max-w-[68%] rounded-lg shadow-sm",
          // Tail-ish corner: outgoing flat on top-start, incoming flat on top-end.
          isOutgoing
            ? "bg-emerald-100 rounded-tr-md rounded-tl-2xl rounded-bl-2xl rounded-br-2xl"
            : "bg-white rounded-tl-md rounded-tr-2xl rounded-br-2xl rounded-bl-2xl",
          "px-2.5 py-1.5",
          message.isHidden && "ring-1 ring-amber-300",
        )}
        dir="auto"
      >
        {message.isHidden ? (
          <div className="mb-1 text-[10px] font-semibold text-amber-700">
            הודעה מוסתרת — נראית רק למנהלי האזור
          </div>
        ) : null}
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
              <AudioPlayer src={message.media.url} outgoing={isOutgoing} />
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

        {/* Optional timeline-event headline — small bold line above the body. */}
        {message.title ? (
          <div className="text-sm font-semibold text-gray-900 leading-snug mb-0.5">
            {message.title}
          </div>
        ) : null}

        {message.text ? (
          <div className="whitespace-pre-wrap break-words text-sm text-gray-900">
            {message.text}
          </div>
        ) : null}

        {/* Tag chips. Clicking a chip toggles it in the URL filter (if the
            shell wired a handler) so the user can drill down by tag. */}
        {itemTags.length > 0 ? (
          <div className="mt-1">
            <TagChips
              tags={itemTags}
              onTagClick={onToggleTagFilter}
              activeTagIds={activeTagSet}
            />
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-1 mt-0.5">
          {starred ? (
            <Star
              className="h-3 w-3 text-amber-500 fill-amber-400"
              aria-label="מסומן בכוכב"
            />
          ) : null}
          <span className="text-[10px] text-gray-500">{time}</span>
        </div>
      </div>
    </div>
  );
}
