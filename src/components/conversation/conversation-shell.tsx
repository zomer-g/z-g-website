"use client";

// Top-level WhatsApp Web look-alike. Owns the two-pane layout, the
// active channel, the item-loading state, and the merged-view mode.
//
// Operating modes:
//   - mode="mock" → pulls all items synchronously from a provided
//     `mockItemsFor(channelId)` function. Used by the public landing
//     pages of both whatsapp and timeline.
//   - mode="live" → fetches via the provided `apiPaths` URL builders.
//     The endpoints are gated to ADMIN or the workspace/project
//     allowlist on the server.
//
// Three view states (orthogonal to mode):
//   - "list"   → no channel open (mobile only; desktop always shows sidebar)
//   - "chat"   → one channel open in the right pane
//   - "merged" → N channels merged on a single chronological timeline
//
// One shell, two features. Whatsapp and timeline pages each pass the
// shell their domain's URL builders (apiPaths) and their domain's mock
// data accessor (mockItemsFor). Everything else is identical.

import { useCallback, useEffect, useState } from "react";
import { ChatSidebar } from "./channel-sidebar";
import { ChatPane } from "./stream-pane";
import { MergedPicker } from "./merged-picker";
import { MergedView, type MergedMessage } from "./merged-view";
import type {
  WhatsappChatSummary,
  WhatsappMessageDTO,
  WhatsappWorkspaceDTO,
} from "./types";

// URL builders the shell uses to reach the backend in "live" mode.
// Whatsapp pages pass `whatsappApiPaths`; timeline pages pass
// `timelineApiPaths`. Both shapes are identical; only the path
// segments differ.
export interface ApiPaths {
  // GET — paginated items for a single channel. Returns the same
  // payload shape regardless of domain: `{ items: ApiItem[] }`.
  channelItems: (channelId: string) => string;
  // GET — authenticated bytes for an attached file (image / audio /
  // pdf / etc.). Built into the item DTO's `media.url`.
  media: (mediaId: string) => string;
  // PATCH — toggle an item's isHidden flag (admin only).
  toggleHidden: (itemId: string) => string;
  // GET/POST — workspace/project-scoped tag pool. Optional so callers
  // can omit when the feature isn't built out for that page yet.
  tagsPool?: () => string;
  // GET — cross-channel search with q + tag filters.
  search?: (qs: string) => string;
  // POST/DELETE — attach a tag to an item / detach a tag from an item.
  itemTagsAttach?: (itemId: string) => string;
  itemTagsDetach?: (itemId: string, tagId: string) => string;
}

export const whatsappApiPaths: ApiPaths = {
  channelItems: (id) =>
    `/api/whatsapp/chats/${encodeURIComponent(id)}/messages?limit=2000`,
  media: (id) => `/api/whatsapp/media/${encodeURIComponent(id)}`,
  toggleHidden: (id) => `/api/whatsapp/messages/${encodeURIComponent(id)}`,
  // Tag pool / search / per-item tag ops are wired in by the shell at
  // page-mount time when the workspace id is known. We build these
  // here so the page only needs to pass the id.
  tagsPool: undefined, // set per-page via withWorkspaceId below
  search: undefined,
  itemTagsAttach: (id) => `/api/whatsapp/messages/${encodeURIComponent(id)}/tags`,
  itemTagsDetach: (id, tagId) =>
    `/api/whatsapp/messages/${encodeURIComponent(id)}/tags/${encodeURIComponent(tagId)}`,
};

export const timelineApiPaths: ApiPaths = {
  channelItems: (id) =>
    `/api/timeline/layers/${encodeURIComponent(id)}/events?limit=2000`,
  media: (id) => `/api/timeline/media/${encodeURIComponent(id)}`,
  toggleHidden: (id) => `/api/timeline/events/${encodeURIComponent(id)}`,
  itemTagsAttach: (id) => `/api/timeline/events/${encodeURIComponent(id)}/tags`,
  itemTagsDetach: (id, tagId) =>
    `/api/timeline/events/${encodeURIComponent(id)}/tags/${encodeURIComponent(tagId)}`,
};

// Helper that fills in the workspace/project-id-scoped URL builders.
// Pages call this with their feature-specific paths + the project id;
// the result is what's passed to the shell.
export function withProjectId(
  base: ApiPaths,
  feature: "whatsapp" | "timeline",
  projectId: string,
): ApiPaths {
  const root =
    feature === "whatsapp"
      ? `/api/whatsapp/workspaces/${encodeURIComponent(projectId)}`
      : `/api/timeline/projects/${encodeURIComponent(projectId)}`;
  return {
    ...base,
    tagsPool: () => `${root}/tags`,
    search: (qs: string) => `${root}/search?${qs}`,
  };
}

interface ConversationShellProps {
  workspace: WhatsappWorkspaceDTO;
  mode: "mock" | "live";
  // Whether the current viewer is an ADMIN. Drives per-item hide
  // controls and exposes hidden items with a "hidden" badge. The
  // server is the source of truth for these — guests never receive
  // hidden rows even if a malicious client passes isAdmin=true.
  isAdmin?: boolean;
  // Domain-specific URL builders. Whatsapp pages pass whatsappApiPaths,
  // timeline pages pass timelineApiPaths. Defaults to whatsapp so the
  // existing whatsapp page code didn't have to change.
  apiPaths?: ApiPaths;
  // Synchronous mock-mode accessor. Required when mode="mock".
  // Whatsapp passes its `mockMessagesFor`; timeline passes its own.
  mockItemsFor?: (channelId: string) => WhatsappMessageDTO[];
}

interface ApiMessage {
  id: string;
  timestamp: string;
  sender: string;
  isSystem: boolean;
  isHidden: boolean;
  text: string | null;
  media: { id: string; filename: string; mimeType: string; size: number } | null;
}

function apiMsgToDTO(m: ApiMessage, mediaUrlFor: (id: string) => string): WhatsappMessageDTO {
  return {
    id: m.id,
    timestamp: m.timestamp,
    sender: m.sender,
    isSystem: m.isSystem,
    isHidden: m.isHidden,
    text: m.text,
    title: null,
    category: null,
    actor: m.sender,
    tags: [],
    media: m.media
      ? {
          id: m.media.id,
          filename: m.media.filename,
          mimeType: m.media.mimeType,
          size: m.media.size,
          url: mediaUrlFor(m.media.id),
        }
      : null,
  };
}

async function fetchChannelItems(
  channelId: string,
  apiPaths: ApiPaths,
  signal?: AbortSignal,
): Promise<WhatsappMessageDTO[]> {
  const res = await fetch(apiPaths.channelItems(channelId), {
    cache: "no-store",
    signal,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `HTTP ${res.status}`);
  }
  const json = (await res.json()) as { items: ApiMessage[] };
  return json.items.map((m) => apiMsgToDTO(m, apiPaths.media));
}

export function WhatsappShell({
  workspace,
  mode,
  isAdmin = false,
  apiPaths = whatsappApiPaths,
  mockItemsFor,
}: ConversationShellProps) {
  /* ── Per-channel view state ─────────────────────────────────────── */

  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<WhatsappMessageDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active: WhatsappChatSummary | null =
    workspace.chats.find((c) => c.id === activeChatId) ?? null;

  const loadOneChat = useCallback(
    async (channelId: string) => {
      if (mode === "mock") {
        setMessages(mockItemsFor ? mockItemsFor(channelId) : []);
        setLoading(false);
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const items = await fetchChannelItems(channelId, apiPaths);
        setMessages(items);
      } catch (err) {
        console.error("Failed to load items", err);
        setError(err instanceof Error ? err.message : "שגיאה בטעינת הודעות");
        setMessages([]);
      } finally {
        setLoading(false);
      }
    },
    [mode, apiPaths, mockItemsFor],
  );

  useEffect(() => {
    if (!activeChatId) return;
    void loadOneChat(activeChatId);
  }, [activeChatId, loadOneChat]);

  /* ── Hide / unhide single items (admin only) ────────────────────── */

  const toggleMessageHidden = useCallback(
    async (messageId: string, nextHidden: boolean) => {
      if (!isAdmin) return;
      const prevList = messages;
      setMessages((list) =>
        list.map((m) => (m.id === messageId ? { ...m, isHidden: nextHidden } : m)),
      );
      try {
        const res = await fetch(apiPaths.toggleHidden(messageId), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isHidden: nextHidden }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } catch (err) {
        console.error("Failed to toggle hidden:", err);
        setMessages(prevList);
      }
    },
    [isAdmin, messages, apiPaths],
  );

  /* ── Merged-view state ──────────────────────────────────────────── */

  const [pickerOpen, setPickerOpen] = useState(false);
  const [mergedChatIds, setMergedChatIds] = useState<string[] | null>(null);
  const [mergedMessages, setMergedMessages] = useState<MergedMessage[]>([]);
  const [mergedLoading, setMergedLoading] = useState(false);
  const [mergedError, setMergedError] = useState<string | null>(null);
  const inMergedView = mergedChatIds !== null;

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
        const perChannel = await Promise.all(
          selected.map(async (c): Promise<MergedMessage[]> => {
            const items =
              mode === "mock"
                ? mockItemsFor
                  ? mockItemsFor(c.id)
                  : []
                : await fetchChannelItems(c.id, apiPaths, controller.signal);
            return items.map((m) => ({
              ...m,
              sourceContact: c.contactName,
              sourceSelfSender: c.selfSender ?? null,
            }));
          }),
        );
        const merged = perChannel.flat().sort((a, b) => {
          const ta = new Date(a.timestamp).getTime();
          const tb = new Date(b.timestamp).getTime();
          if (ta !== tb) return ta - tb;
          return a.sourceContact.localeCompare(b.sourceContact, "he");
        });
        if (!controller.signal.aborted) setMergedMessages(merged);
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("Failed to merge channels", err);
        setMergedError(err instanceof Error ? err.message : "שגיאה בטעינת הודעות");
        setMergedMessages([]);
      } finally {
        if (!controller.signal.aborted) setMergedLoading(false);
      }
    })();

    return () => controller.abort();
  }, [mergedChatIds, workspace.chats, mode, apiPaths, mockItemsFor]);

  const handleConfirmMerged = (ids: string[]) => {
    setPickerOpen(false);
    setActiveChatId(null);
    setMergedChatIds(ids);
  };

  const handleExitMerged = () => {
    setMergedChatIds(null);
    setMergedMessages([]);
    setMergedError(null);
  };

  /* ── Render ─────────────────────────────────────────────────────── */

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
            workspaceSelfSender={workspace.selfSender}
            selectedCount={mergedChatIds?.length ?? 0}
            onExit={handleExitMerged}
          />
        ) : (
          <ChatPane
            chat={active}
            messages={messages}
            loading={loading}
            error={error}
            selfSender={active?.selfSender ?? workspace.selfSender}
            onBack={() => setActiveChatId(null)}
            isAdmin={isAdmin}
            onToggleHidden={toggleMessageHidden}
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
