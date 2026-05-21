"use client";

// Top-level WhatsApp Web look-alike. Owns the two-pane layout, the
// active chat, the message-loading state, and the merged-view mode.
//
// Operating modes:
//   - mode="mock" → pulls all messages synchronously from mock-data.ts.
//     Used by the public /whatsapp landing page.
//   - mode="live" → fetches /api/whatsapp/chats/<id>/messages on chat
//     selection. The API is gated to ADMIN or the workspace allowlist.
//
// Three view states (orthogonal to mode):
//   - "list"   → no chat open (mobile only; desktop always shows sidebar)
//   - "chat"   → one chat open in the right pane
//   - "merged" → N chats merged on a single chronological timeline,
//                shown via <MergedView>. Triggered by the sidebar's
//                "תצוגה משולבת" button → MergedPicker → confirm.
//
// Mobile layout: single-pane. Desktop layout: sidebar + main pane.

import { useCallback, useEffect, useState } from "react";
import { ChatSidebar } from "./chat-sidebar";
import { ChatPane } from "./chat-pane";
import { MergedPicker } from "./merged-picker";
import { MergedView, type MergedMessage } from "./merged-view";
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

// Convert one API payload (live mode) into our DTO shape, including
// resolving the media URL onto the authenticated streaming endpoint.
function apiMsgToDTO(m: ApiMessage): WhatsappMessageDTO {
  return {
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
  };
}

async function fetchChatMessages(
  chatId: string,
  signal?: AbortSignal,
): Promise<WhatsappMessageDTO[]> {
  const res = await fetch(
    `/api/whatsapp/chats/${encodeURIComponent(chatId)}/messages?limit=2000`,
    { cache: "no-store", signal },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `HTTP ${res.status}`);
  }
  const json = (await res.json()) as { items: ApiMessage[] };
  return json.items.map(apiMsgToDTO);
}

export function WhatsappShell({ workspace, mode }: WhatsappShellProps) {
  /* ── Per-chat view state ────────────────────────────────────────── */

  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<WhatsappMessageDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active: WhatsappChatSummary | null =
    workspace.chats.find((c) => c.id === activeChatId) ?? null;

  const loadOneChat = useCallback(
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
        const items = await fetchChatMessages(chatId);
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
    void loadOneChat(activeChatId);
  }, [activeChatId, loadOneChat]);

  /* ── Merged-view state ──────────────────────────────────────────── */

  const [pickerOpen, setPickerOpen] = useState(false);
  const [mergedChatIds, setMergedChatIds] = useState<string[] | null>(null);
  const [mergedMessages, setMergedMessages] = useState<MergedMessage[]>([]);
  const [mergedLoading, setMergedLoading] = useState(false);
  const [mergedError, setMergedError] = useState<string | null>(null);
  const inMergedView = mergedChatIds !== null;

  // Each time the selection changes, refetch each selected chat,
  // attach its sourceContact, then merge + sort by timestamp.
  useEffect(() => {
    if (!mergedChatIds) return;
    const controller = new AbortController();
    setMergedLoading(true);
    setMergedError(null);

    (async () => {
      try {
        const selected = workspace.chats.filter((c) =>
          mergedChatIds.includes(c.id),
        );
        const perChat = await Promise.all(
          selected.map(async (c): Promise<MergedMessage[]> => {
            const items =
              mode === "mock"
                ? mockMessagesFor(c.id)
                : await fetchChatMessages(c.id, controller.signal);
            return items.map((m) => ({ ...m, sourceContact: c.contactName }));
          }),
        );
        const merged = perChat.flat().sort((a, b) => {
          const ta = new Date(a.timestamp).getTime();
          const tb = new Date(b.timestamp).getTime();
          if (ta !== tb) return ta - tb;
          // Stable secondary sort within the same minute: by source
          // contact name so the same conversation cluster stays grouped.
          return a.sourceContact.localeCompare(b.sourceContact, "he");
        });
        if (!controller.signal.aborted) setMergedMessages(merged);
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("Failed to merge chats", err);
        setMergedError(err instanceof Error ? err.message : "שגיאה בטעינת הודעות");
        setMergedMessages([]);
      } finally {
        if (!controller.signal.aborted) setMergedLoading(false);
      }
    })();

    return () => controller.abort();
  }, [mergedChatIds, workspace.chats, mode]);

  const handleConfirmMerged = (ids: string[]) => {
    setPickerOpen(false);
    setActiveChatId(null);  // exit any single-chat view first
    setMergedChatIds(ids);
  };

  const handleExitMerged = () => {
    setMergedChatIds(null);
    setMergedMessages([]);
    setMergedError(null);
  };

  /* ── Render ─────────────────────────────────────────────────────── */

  // Decide which pane goes on the right. Three branches: ChatPane,
  // MergedView, or the "pick a chat" empty state baked into ChatPane.
  const rightPaneOpen = !!activeChatId || inMergedView;

  return (
    <div
      className="flex flex-1 min-h-0 bg-[#dadbd3]"
      data-active={rightPaneOpen ? "chat" : "list"}
    >
      <div
        className={
          "flex flex-1 min-h-0 " + (rightPaneOpen ? "hidden lg:flex" : "flex")
        }
      >
        <ChatSidebar
          title={workspace.title}
          chats={workspace.chats}
          activeChatId={activeChatId}
          onSelect={(id) => {
            // Opening a single chat exits merged view automatically.
            if (inMergedView) handleExitMerged();
            setActiveChatId(id);
          }}
          onOpenMergedPicker={() => setPickerOpen(true)}
        />
      </div>

      <div
        className={
          "flex flex-1 min-h-0 " + (rightPaneOpen ? "flex" : "hidden lg:flex")
        }
      >
        {inMergedView ? (
          <MergedView
            messages={mergedMessages}
            loading={mergedLoading}
            error={mergedError}
            selfSender={workspace.selfSender}
            selectedCount={mergedChatIds?.length ?? 0}
            onExit={handleExitMerged}
          />
        ) : (
          <ChatPane
            chat={active}
            messages={messages}
            loading={loading}
            error={error}
            selfSender={workspace.selfSender}
            onBack={() => setActiveChatId(null)}
          />
        )}
      </div>

      {pickerOpen ? (
        <MergedPicker
          chats={workspace.chats}
          initialSelected={
            new Set(mergedChatIds ?? workspace.chats.map((c) => c.id))
          }
          onCancel={() => setPickerOpen(false)}
          onConfirm={handleConfirmMerged}
        />
      ) : null}
    </div>
  );
}
