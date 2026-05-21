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
import { ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { MessageBubble } from "./message-bubble";
import type { WhatsappMessageDTO, WhatsappChatSummary } from "./types";

interface ChatPaneProps {
  chat: WhatsappChatSummary | null;
  messages: WhatsappMessageDTO[];
  loading: boolean;
  error: string | null;
  selfSender: string;
  onBack: () => void;          // mobile back button: returns to the chat list
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
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center bg-emerald-50/40 text-gray-500">
        <div className="rounded-full bg-white p-6 shadow-md mb-4">
          <span className="block h-12 w-12 text-emerald-700 text-3xl text-center leading-12">💬</span>
        </div>
        <p className="text-sm">בחרו שיחה כדי להתחיל</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-[#efeae2] min-h-0">
      {/* Top bar */}
      <header className="flex items-center gap-3 bg-[#f0f2f5] border-b border-black/5 px-3 py-2 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="lg:hidden inline-flex items-center justify-center h-9 w-9 rounded-full hover:bg-black/5 text-gray-700"
          aria-label="חזרה לרשימת השיחות"
        >
          <ArrowRight className="h-5 w-5" />
        </button>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white text-sm font-semibold">
          {initials(chat.contactName)}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-900 truncate">{chat.contactName}</div>
          <div className="text-xs text-gray-500">
            {chat.messageCount} {chat.messageCount === 1 ? "הודעה" : "הודעות"}
          </div>
        </div>
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
          <div className="flex items-center justify-center py-12 text-gray-500 text-sm">
            <Loader2 className="h-4 w-4 animate-spin me-2" /> טוען הודעות…
          </div>
        ) : error ? (
          <div className="mx-3 my-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-500">
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
              />
            ),
          )
        )}
      </div>
    </div>
  );
}
