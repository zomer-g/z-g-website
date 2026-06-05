"use client";

// Right pane of WhatsApp Web — the open chat. Shows:
//   - top bar with contact avatar + name
//   - scrolling message list grouped by day, with a "showSender" hint
//     so consecutive messages from the same sender don't repeat the name
//   - empty / loading / error states
//
// Receives messages from the parent. Doesn't fetch on its own — the
// parent shell handles loading (mock data on /whatsapp, paginated
// API fetch on /whatsapp/<slug>).

import { useEffect, useMemo, useRef } from "react";
import { ArrowRight, Loader2, MessagesSquare, Search, Layers, CheckSquare, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { MessageBubble } from "./bubble";
import { SelectionBar } from "./selection-bar";
import type {
  WhatsappMessageDTO,
  WhatsappChatSummary,
  TagRef,
} from "./types";

interface ChatPaneProps {
  chat: WhatsappChatSummary | null;
  messages: WhatsappMessageDTO[];
  loading: boolean;
  error: string | null;
  selfSender: string;
  onBack: () => void;          // mobile back button: returns to the chat list
  // Admin-only — when true, MessageBubble renders a per-bubble hide
  // toggle and faded styling on hidden rows. Guests never see this.
  isAdmin?: boolean;
  onToggleHidden?: (messageId: string, nextHidden: boolean) => void;
  // Tag pool + per-item attach/detach handed down from the shell so
  // bubbles can render a tag-icon button + TagPicker popover.
  tagsPool?: TagRef[];
  onAttachTag?: (
    itemId: string,
    payload: { tagId: string } | { name: string },
  ) => Promise<TagRef>;
  onDetachTag?: (itemId: string, tagId: string) => Promise<void>;
  // Click handler on existing tag chips → toggles that tag's id in the
  // URL search filter (so clicking a chip narrows the view to "items
  // with this tag").
  onToggleTagFilter?: (tagId: string) => void;
  activeTagIds?: string[];
  // Selection + print
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelection?: (id: string, shift?: boolean) => void;
  onEnterSelection?: () => void;
  onExitSelection?: () => void;
  onPrintSelected?: () => void;
  // Print everything currently displayed, without selecting.
  onPrintAll?: () => void;
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("he-IL", {
    year: "numeric",
    month: "long",
    day: "2-digit",
  });
}

function initials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]).join("").toUpperCase();
}

export function ChatPane({
  chat,
  messages,
  loading,
  error,
  selfSender,
  onBack,
  isAdmin = false,
  onToggleHidden,
  tagsPool,
  onAttachTag,
  onDetachTag,
  onToggleTagFilter,
  activeTagIds,
  selectionMode = false,
  selectedIds,
  onToggleSelection,
  onEnterSelection,
  onExitSelection,
  onPrintSelected,
  onPrintAll,
}: ChatPaneProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when the open chat changes or new messages
  // arrive. WhatsApp loads bottom-anchored — feels off if we don't.
  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [chat?.id, messages.length]);

  // Pre-compute day separators + showSender flags so the render path
  // stays cheap on big chats.
  const items = useMemo(() => {
    const out: Array<
      | { kind: "day"; key: string; label: string }
      | { kind: "msg"; key: string; msg: WhatsappMessageDTO; isOutgoing: boolean; showSender: boolean }
    > = [];
    let lastDay = "";
    let lastSender = "";
    for (const m of messages) {
      const day = dayKey(m.timestamp);
      if (day !== lastDay) {
        out.push({ kind: "day", key: `day-${day}-${m.id}`, label: day });
        lastDay = day;
        lastSender = "";
      }
      const isOutgoing = !m.isSystem && m.sender === selfSender;
      const showSender = !m.isSystem && !isOutgoing && m.sender !== lastSender;
      out.push({
        kind: "msg",
        key: m.id,
        msg: m,
        isOutgoing,
        showSender,
      });
      if (!m.isSystem) lastSender = m.sender;
    }
    return out;
  }, [messages, selfSender]);

  if (!chat) {
    return (
      <div
        className="hidden lg:flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-emerald-50/60 to-white text-gray-700 p-10"
        role="region"
        aria-label="אזור תצוגת שיחה — לא נבחרה שיחה"
      >
        <div
          className="rounded-full bg-white p-8 shadow-md ring-1 ring-emerald-100 mb-6"
          aria-hidden="true"
        >
          <MessagesSquare
            className="h-16 w-16 text-emerald-700"
            strokeWidth={1.5}
          />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2 text-center">
          בחרו שיחה כדי להתחיל
        </h2>
        <p className="text-sm text-gray-700 max-w-md text-center leading-relaxed mb-6">
          בחרו שכבה או שיחה מהרשימה כדי לראות את ההודעות שלה. אפשר גם להשתמש
          בכלים הבאים כדי לסקור את כל החומר יחד.
        </p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full">
          <li className="flex items-start gap-3 rounded-lg bg-white border border-gray-200 p-3 shadow-sm">
            <Search
              className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div className="text-xs leading-relaxed text-gray-700">
              <div className="font-semibold text-gray-900 mb-0.5">
                חיפוש חוצה־שיחות
              </div>
              שורת החיפוש בראש העמוד סורקת את כל השכבות יחד.
            </div>
          </li>
          <li className="flex items-start gap-3 rounded-lg bg-white border border-gray-200 p-3 shadow-sm">
            <Layers
              className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div className="text-xs leading-relaxed text-gray-700">
              <div className="font-semibold text-gray-900 mb-0.5">
                תצוגה משולבת
              </div>
              צירוף כמה שיחות לציר זמן רציף אחד לפי הסדר הכרונולוגי.
            </div>
          </li>
        </ul>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-[#efeae2] min-h-0">
      {/* Top bar */}
      <header className="flex items-center gap-3 bg-[#f0f2f5] border-b border-black/5 px-3 py-2 shrink-0">
        {/* WhatsApp-mobile-style back arrow. Visible on every viewport
            (not just mobile) so the user always has a one-click way to
            close the chat and return to the list — matches what the
            merged/search view does, and what users expect from the
            phone app even on desktop. */}
        <button
          type="button"
          onClick={selectionMode ? onExitSelection : onBack}
          className="inline-flex items-center justify-center h-9 w-9 rounded-full hover:bg-black/5 text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-1"
          aria-label={selectionMode ? "יציאה ממצב סימון" : "חזרה לרשימת השיחות"}
          title={selectionMode ? "ביטול מצב סימון" : "סגירת השיחה — חזרה לרשימה"}
        >
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </button>
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white text-sm font-semibold"
          aria-hidden="true"
        >
          {initials(chat.contactName)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-gray-900 truncate">{chat.contactName}</div>
          <div className="text-xs text-gray-500">
            {selectionMode
              ? `${selectedIds?.size ?? 0} נבחרו · Shift לבחירת טווח`
              : `${chat.messageCount} ${chat.messageCount === 1 ? "הודעה" : "הודעות"}`}
          </div>
        </div>
        {/* Header actions: direct print + selection toggle */}
        {!selectionMode ? (
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={onPrintAll}
              title="הדפסת כל ההודעות המוצגות"
              aria-label="הדפסת כל ההודעות המוצגות"
              className="inline-flex items-center justify-center h-9 w-9 rounded-full hover:bg-black/5 text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-1"
            >
              <Printer className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onEnterSelection}
              title="בחירת הודעות להדפסה"
              aria-label="כניסה למצב בחירת הודעות"
              className="inline-flex items-center justify-center h-9 w-9 rounded-full hover:bg-black/5 text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-1"
            >
              <CheckSquare className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </header>

      {/* Message list */}
      <div
        ref={listRef}
        className={cn(
          "flex-1 overflow-y-auto py-3",
          // The classic WhatsApp doodle background as a subtle pattern.
          "bg-[url('data:image/svg+xml;utf8,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%2040%2040%22%3E%3Ccircle%20cx=%2220%22%20cy=%2220%22%20r=%221%22%20fill=%22%23d8d2c8%22/%3E%3C/svg%3E')]",
        )}
      >
        {loading ? (
          <div
            className="flex items-center justify-center py-12 text-gray-700 text-sm"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="h-4 w-4 animate-spin me-2" aria-hidden="true" />
            טוען הודעות…
          </div>
        ) : error ? (
          <div
            className="mx-3 my-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            role="alert"
          >
            {error}
          </div>
        ) : items.length === 0 ? (
          <div
            className="text-center py-12 text-sm text-gray-700"
            role="status"
          >
            אין הודעות בשיחה זו.
          </div>
        ) : (
          items.map((it) =>
            it.kind === "day" ? (
              <div key={it.key} className="flex justify-center my-3">
                <span className="rounded-md bg-white/85 px-2.5 py-1 text-xs text-gray-700 shadow-sm">
                  {it.label}
                </span>
              </div>
            ) : (
              <MessageBubble
                key={it.key}
                message={it.msg}
                isOutgoing={it.isOutgoing}
                showSender={it.showSender}
                isAdmin={isAdmin && !selectionMode}
                onToggleHidden={onToggleHidden}
                tagsPool={tagsPool}
                onAttachTag={onAttachTag}
                onDetachTag={onDetachTag}
                onToggleTagFilter={onToggleTagFilter}
                activeTagIds={activeTagIds}
                selectable={selectionMode}
                selected={selectedIds?.has(it.msg.id)}
                onSelect={onToggleSelection}
              />
            ),
          )
        )}
      </div>
      <SelectionBar
        count={selectedIds?.size ?? 0}
        onPrint={onPrintSelected ?? (() => {})}
        onClear={onExitSelection ?? (() => {})}
      />
    </div>
  );
}
