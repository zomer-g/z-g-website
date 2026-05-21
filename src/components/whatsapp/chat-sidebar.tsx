"use client";

// Left pane of WhatsApp Web — list of chats. Each row is the equivalent
// of a contact in mobile WhatsApp: avatar with initials, contact name,
// last-message preview, last-activity timestamp.
//
// In desktop layout it's a fixed-width side column. In mobile layout it
// occupies the full screen and is replaced by the chat pane after the
// user picks a chat (controlled by the parent shell).

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { WhatsappChatSummary } from "./types";

interface ChatSidebarProps {
  title: string;
  chats: WhatsappChatSummary[];
  activeChatId: string | null;
  onSelect: (chatId: string) => void;
}

function initials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]).join("").toUpperCase();
}

function formatRelative(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = Date.now();
  const sameDay =
    new Date(now).toDateString() === d.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  }
  const yesterday = new Date(now - 24 * 3600 * 1000).toDateString() === d.toDateString();
  if (yesterday) return "אתמול";
  return d.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit" });
}

export function ChatSidebar({ title, chats, activeChatId, onSelect }: ChatSidebarProps) {
  const [filter, setFilter] = useState("");
  const filtered = useMemo(() => {
    const q = filter.trim();
    if (!q) return chats;
    const lc = q.toLowerCase();
    return chats.filter((c) =>
      (c.contactName + " " + (c.lastTextPreview ?? "")).toLowerCase().includes(lc),
    );
  }, [chats, filter]);

  return (
    <aside
      className={cn(
        "flex flex-col bg-white border-s border-black/5 shrink-0",
        // Desktop: fixed width sidebar.
        "lg:w-[360px] lg:min-w-[320px]",
        // Mobile: full screen unless a chat is open — the parent handles
        // hiding/showing by toggling a class on the shell.
        "w-full lg:max-w-[360px]",
      )}
    >
      <header className="bg-[#f0f2f5] px-4 py-3 shrink-0">
        <div className="text-sm font-semibold text-gray-900 truncate">{title}</div>
      </header>

      <div className="px-3 py-2 bg-white border-b border-black/5 shrink-0">
        <label className="relative block">
          <span className="sr-only">חיפוש בשיחות</span>
          <Search className="absolute top-1/2 -translate-y-1/2 start-2 h-4 w-4 text-gray-400" aria-hidden="true" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="חיפוש בשיחות"
            className="w-full rounded-full bg-[#f0f2f5] border border-transparent ps-8 pe-3 py-1.5 text-sm focus:outline-none focus:border-emerald-200"
          />
        </label>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-gray-500">
            {chats.length === 0 ? "אין שיחות עדיין." : "לא נמצאו תוצאות."}
          </div>
        ) : (
          <ul role="list" className="divide-y divide-black/5">
            {filtered.map((c) => {
              const isActive = c.id === activeChatId;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(c.id)}
                    className={cn(
                      "w-full flex items-start gap-3 px-3 py-3 text-start hover:bg-black/[0.04] transition-colors",
                      isActive && "bg-emerald-50",
                    )}
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white text-sm font-semibold">
                      {initials(c.contactName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-gray-900">
                          {c.contactName}
                        </span>
                        <time className="text-[11px] text-gray-500 shrink-0">
                          {formatRelative(c.lastAt)}
                        </time>
                      </div>
                      <div className="mt-0.5 text-xs text-gray-600 line-clamp-1">
                        {c.lastTextPreview ?? "—"}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
