"use client";

// Top-level WhatsApp Web look-alike. Owns the two-pane layout, which
// chat is open, and the message-loading state.
//
// Two operating modes:
//   - mode="mock" → pulls all messages synchronously from mock-data.ts.
//     Used by the public /whatsapp landing page.
//   - mode="live" → fetches /api/whatsapp/chats/<id>/messages on chat
//     selection. The API is gated to ADMIN or the workspace allowlist.
//
// Mobile layout: single-pane. The user sees the sidebar; tapping a
// chat hides the sidebar and shows the chat pane; tapping the back
// arrow returns to the sidebar.

import { useCallback, useEffect, useState } from "react";
import { ChatSidebar } from "./chat-sidebar";
import { ChatPane } from "./chat-pane";
import { mockMessagesFor } from "./mock-data";
import type {
  WhatsappChatSummary,
  WhatsappMessageDTO,
  WhatsappWorkspaceDTO,
} from "./types";

interface WhatsappShellProps {
  workspace: WhatsappWorkspaceDTO;
  mode: "mock" | "live";
}

interface ApiMessage {
  id: string;
  timestamp: string;
  sender: string;
  isSystem: boolean;
  text: string | null;
  media: { id: string; filename: string; mimeType: string; size: number } | null;
}

export function WhatsappShell({ workspace, mode }: WhatsappShellProps) {
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<WhatsappMessageDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active: WhatsappChatSummary | null =
    workspace.chats.find((c) => c.id === activeChatId) ?? null;

  // Loader: switches behavior on mode. In live mode it hits the
  // authenticated API. In mock mode it returns synchronously.
  const loadMessages = useCallback(
    async (chatId: string) => {
      if (mode === "mock") {
        setMessages(mockMessagesFor(chatId));
        setLoading(false);
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        // Pull a generous slice on first open — we paginate later if
        // chats get bigger than this.
        const res = await fetch(
          `/api/whatsapp/chats/${encodeURIComponent(chatId)}/messages?limit=2000`,
          { cache: "no-store" },
        );
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error || `HTTP ${res.status}`);
        }
        const json = (await res.json()) as { items: ApiMessage[] };
        const items: WhatsappMessageDTO[] = json.items.map((m) => ({
          id: m.id,
          timestamp: m.timestamp,
          sender: m.sender,
          isSystem: m.isSystem,
          text: m.text,
          media: m.media
            ? {
                id: m.media.id,
                filename: m.media.filename,
                mimeType: m.media.mimeType,
                size: m.media.size,
                url: `/api/whatsapp/media/${encodeURIComponent(m.media.id)}`,
              }
            : null,
        }));
        setMessages(items);
      } catch (err) {
        console.error("Failed to load messages", err);
        setError(err instanceof Error ? err.message : "שגיאה בטעינת הודעות");
        setMessages([]);
      } finally {
        setLoading(false);
      }
    },
    [mode],
  );

  useEffect(() => {
    if (!activeChatId) return;
    void loadMessages(activeChatId);
  }, [activeChatId, loadMessages]);

  return (
    <div
      className="flex flex-1 min-h-0 bg-[#dadbd3]"
      // Mobile single-pane: hide whichever pane isn't active. On lg+ we
      // show both.
      data-active={activeChatId ? "chat" : "list"}
    >
      <div
        className={
          "flex flex-1 min-h-0 " +
          (activeChatId ? "hidden lg:flex" : "flex")
        }
      >
        <ChatSidebar
          title={workspace.title}
          chats={workspace.chats}
          activeChatId={activeChatId}
          onSelect={setActiveChatId}
        />
      </div>

      <div
        className={
          "flex flex-1 min-h-0 " +
          (activeChatId ? "flex" : "hidden lg:flex")
        }
      >
        <ChatPane
          chat={active}
          messages={messages}
          loading={loading}
          error={error}
          selfSender={workspace.selfSender}
          onBack={() => setActiveChatId(null)}
        />
      </div>
    </div>
  );
}
