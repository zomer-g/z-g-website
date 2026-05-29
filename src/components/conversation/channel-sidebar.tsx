"use client";

// Left pane of WhatsApp Web — list of chats. Each row is the equivalent
// of a contact in mobile WhatsApp: avatar with initials, contact name,
// last-message preview, last-activity timestamp.
//
// In desktop layout it's a fixed-width side column. In mobile layout it
// occupies the full screen and is replaced by the chat pane after the
// user picks a chat (controlled by the parent shell).

import { Search, Layers } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { WhatsappChatSummary } from "./types";

interface ChatSidebarProps {
  title: string;
  chats: WhatsappChatSummary[];
  activeChatId: string | null;
  onSelect: (chatId: string) => void;
  // Optional: open the merged-view picker. If omitted, the button is hidden
  // (e.g. workspaces with fewer than 2 chats where merging is meaningless).
  onOpenMergedPicker?: () => void;
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

export function ChatSidebar({
  title,
  chats,
  activeChatId,
  onSelect,
  onOpenMergedPicker,
}: ChatSidebarProps) {
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
      <header className="bg-[#f0f2f5] px-4 py-3 shrink-0 flex items-center justify-between gap-2">
        <h2
          className="text-sm font-semibold text-gray-900 truncate min-w-0"
          title={title}
        >
          {title}
        </h2>
        {onOpenMergedPicker && chats.length >= 2 ? (
          <button
            type="button"
            onClick={onOpenMergedPicker}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1",
              "border border-emerald-300 bg-white text-emerald-800",
              "text-xs font-semibold hover:bg-emerald-50 transition-colors",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-1",
              "shrink-0",
            )}
            title="הצגת כמה שיחות יחד בציר זמן רציף"
            aria-label="פתיחת תצוגה משולבת של כמה שיחות"
          >
            <Layers className="h-3.5 w-3.5" aria-hidden="true" />
            <span>תצוגה משולבת</span>
          </button>
        ) : null}
      </header>

      <div className="px-3 py-2 bg-white border-b border-black/5 shrink-0">
        <label className="relative block">
          <span className="sr-only">סינון רשימת השכבות/השיחות לפי שם</span>
          <Search
            className="absolute top-1/2 -translate-y-1/2 start-2 h-4 w-4 text-gray-500"
            aria-hidden="true"
          />
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="סינון לפי שם השכבה/השיחה"
            title="לחיפוש בתוך התוכן השתמשו בשורת החיפוש העליונה"
            aria-label="סינון רשימת השכבות/השיחות לפי שם"
            className="w-full rounded-full bg-[#f0f2f5] border border-transparent ps-8 pe-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-600 focus:outline-none focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-200"
          />
        </label>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div
            className="px-4 py-10 text-center text-sm text-gray-700"
            role="status"
          >
            {chats.length === 0 ? "אין שיחות עדיין." : "לא נמצאו תוצאות."}
          </div>
        ) : (
          <ul
            role="listbox"
            aria-label="רשימת השכבות/השיחות"
            className="divide-y divide-black/5"
          >
            {filtered.map((c) => {
              const isActive = c.id === activeChatId;
              return (
                <li key={c.id} role="presentation">
                  <button
                    type="button"
                    onClick={() => onSelect(c.id)}
                    role="option"
                    aria-selected={isActive}
                    aria-current={isActive ? "true" : undefined}
                    className={cn(
                      "w-full flex items-start gap-3 px-3 py-3 text-start hover:bg-black/[0.04] transition-colors",
                      "focus:outline-none focus-visible:bg-emerald-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600",
                      isActive &&
                        "bg-emerald-50 border-s-4 border-emerald-600 ps-2",
                    )}
                  >
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white text-sm font-semibold"
                      aria-hidden="true"
                    >
                      {initials(c.contactName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-gray-900">
                          {c.contactName}
                        </span>
                        <time
                          dateTime={c.lastAt ?? undefined}
                          className="text-[11px] text-gray-700 shrink-0"
                        >
                          {formatRelative(c.lastAt)}
                        </time>
                      </div>
                      <div className="mt-0.5 text-xs text-gray-700 line-clamp-1">
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
