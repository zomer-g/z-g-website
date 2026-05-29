"use client";

// Top-level WhatsApp Web look-alike. Owns the two-pane layout, the
// active channel, the item-loading state, the merged-view mode, tag
// management, and cross-channel search.
//
// Operating modes:
//   - mode="mock" → pulls items synchronously from a provided
//     `mockItems` map. Used by the public landing pages.
//   - mode="live" → fetches via `apiPaths`. The endpoints are gated to
//     ADMIN or the workspace/project allowlist on the server.
//
// View states:
//   - "list"   → no channel open (mobile only).
//   - "chat"   → one channel open.
//   - "merged" → manual multi-channel merge.
//   - "search" → q / tag filter active → cross-channel search results.
//
// One shell, two features. Whatsapp + timeline pages each pass their
// own `apiPaths` + `mockItems`. Everything else is shared.

import { Suspense, useCallback, useEffect, useState } from "react";
import { ChatSidebar } from "./channel-sidebar";
import { ChatPane } from "./stream-pane";
import { MergedPicker } from "./merged-picker";
import { MergedView, type MergedMessage } from "./merged-view";
import { SearchBar } from "./search-bar";
import { useConversationUrlState } from "./use-conversation-url-state";
import type {
  WhatsappChatSummary,
  WhatsappMessageDTO,
  WhatsappWorkspaceDTO,
  TagRef,
  SearchState,
} from "./types";

// URL builders the shell uses to reach the backend in "live" mode.
export interface ApiPaths {
  channelItems: (channelId: string) => string;
  media: (mediaId: string) => string;
  toggleHidden: (itemId: string) => string;
  tagsPool?: () => string;
  search?: (qs: string) => string;
  itemTagsAttach?: (itemId: string) => string;
  itemTagsDetach?: (itemId: string, tagId: string) => string;
}

export const whatsappApiPaths: ApiPaths = {
  channelItems: (id) =>
    `/api/whatsapp/chats/${encodeURIComponent(id)}/messages?limit=2000`,
  media: (id) => `/api/whatsapp/media/${encodeURIComponent(id)}`,
  toggleHidden: (id) => `/api/whatsapp/messages/${encodeURIComponent(id)}`,
  itemTagsAttach: (id) =>
    `/api/whatsapp/messages/${encodeURIComponent(id)}/tags`,
  itemTagsDetach: (id, tagId) =>
    `/api/whatsapp/messages/${encodeURIComponent(id)}/tags/${encodeURIComponent(tagId)}`,
};

export const timelineApiPaths: ApiPaths = {
  channelItems: (id) =>
    `/api/timeline/layers/${encodeURIComponent(id)}/events?limit=2000`,
  media: (id) => `/api/timeline/media/${encodeURIComponent(id)}`,
  toggleHidden: (id) => `/api/timeline/events/${encodeURIComponent(id)}`,
  itemTagsAttach: (id) =>
    `/api/timeline/events/${encodeURIComponent(id)}/tags`,
  itemTagsDetach: (id, tagId) =>
    `/api/timeline/events/${encodeURIComponent(id)}/tags/${encodeURIComponent(tagId)}`,
};

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
  isAdmin?: boolean;
  apiPaths?: ApiPaths;
  mockItems?: Record<string, WhatsappMessageDTO[]>;
  // Pre-defined tag pool for mock mode (the landing pages bundle this
  // alongside their mock items so the demo can show + filter tags
  // without a server). Live mode ignores this and fetches from
  // apiPaths.tagsPool instead.
  mockTags?: TagRef[];
}

interface ApiMessage {
  id: string;
  timestamp: string;
  sender: string;
  isSystem: boolean;
  isHidden: boolean;
  text: string | null;
  title?: string | null;
  category?: string | null;
  media: { id: string; filename: string; mimeType: string; size: number } | null;
  tags?: { id: string; name: string; color: string | null }[];
  // Cross-channel search results carry source-channel info.
  sourceChannelId?: string;
  sourceContact?: string;
  sourceSelfSender?: string | null;
}

function apiMsgToDTO(
  m: ApiMessage,
  mediaUrlFor: (id: string) => string,
): WhatsappMessageDTO {
  return {
    id: m.id,
    timestamp: m.timestamp,
    sender: m.sender,
    isSystem: m.isSystem,
    isHidden: m.isHidden,
    text: m.text,
    title: m.title ?? null,
    category: (m.category as WhatsappMessageDTO["category"]) ?? null,
    actor: m.sender,
    tags: m.tags ?? [],
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

/* ─── Mock-mode helpers ─── */

// Build a tag pool from whatever tag refs appear on mock items, so
// the SearchBar gets a non-empty chip list to play with.
function deriveMockTags(
  items: Record<string, WhatsappMessageDTO[]>,
): TagRef[] {
  const byId = new Map<string, TagRef>();
  for (const arr of Object.values(items)) {
    for (const it of arr) {
      for (const t of it.tags ?? []) {
        if (!byId.has(t.id)) byId.set(t.id, t);
      }
    }
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, "he"));
}

// In-memory filter for mock-mode search. Cheap — mock workspaces have
// dozens of items, not thousands.
function mockSearch(
  workspace: WhatsappWorkspaceDTO,
  items: Record<string, WhatsappMessageDTO[]>,
  state: SearchState,
): MergedMessage[] {
  const q = state.q.trim().toLowerCase();
  const tagIds = new Set(state.tagIds);
  const merged: MergedMessage[] = [];
  for (const channel of workspace.chats) {
    const list = items[channel.id] ?? [];
    for (const it of list) {
      // q matches any of: text, title, sender/actor.
      const hay = (
        (it.text ?? "") +
        " " +
        (it.title ?? "") +
        " " +
        (it.sender ?? "") +
        " " +
        (it.actor ?? "")
      ).toLowerCase();
      if (q && !hay.includes(q)) continue;
      if (tagIds.size > 0) {
        const itemTagIds = new Set((it.tags ?? []).map((t) => t.id));
        let hit = false;
        for (const tid of tagIds) if (itemTagIds.has(tid)) { hit = true; break; }
        if (!hit) continue;
      }
      merged.push({
        ...it,
        sourceContact: channel.contactName,
        sourceSelfSender: channel.selfSender ?? null,
      });
    }
  }
  merged.sort((a, b) => {
    const ta = new Date(a.timestamp).getTime();
    const tb = new Date(b.timestamp).getTime();
    return ta - tb;
  });
  return merged;
}

/* ─── The actual shell — wrapped in Suspense at the export ─── */

function ConversationShellInner({
  workspace,
  mode,
  isAdmin = false,
  apiPaths = whatsappApiPaths,
  mockItems,
  mockTags,
}: ConversationShellProps) {
  const url = useConversationUrlState();
  const searchActive =
    !!url.searchState.q.trim() || url.searchState.tagIds.length > 0;

  /* ── Tag pool ── */
  const [tagsPool, setTagsPool] = useState<TagRef[]>(() =>
    mode === "mock"
      ? mockTags ?? (mockItems ? deriveMockTags(mockItems) : [])
      : [],
  );
  useEffect(() => {
    if (mode !== "live") return;
    if (!apiPaths.tagsPool) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiPaths.tagsPool!(), { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as { tags: TagRef[] };
        if (!cancelled) setTagsPool(json.tags);
      } catch (err) {
        console.error("tags pool fetch failed", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, apiPaths]);

  /* ── Per-channel view state ── */
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<WhatsappMessageDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active: WhatsappChatSummary | null =
    workspace.chats.find((c) => c.id === activeChatId) ?? null;

  const loadOneChat = useCallback(
    async (channelId: string) => {
      if (mode === "mock") {
        setMessages(mockItems?.[channelId] ?? []);
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
    [mode, apiPaths, mockItems],
  );

  useEffect(() => {
    if (!activeChatId) return;
    if (searchActive) return; // search mode owns the right pane
    void loadOneChat(activeChatId);
  }, [activeChatId, loadOneChat, searchActive]);

  /* ── Hide/unhide ── */
  const toggleMessageHidden = useCallback(
    async (messageId: string, nextHidden: boolean) => {
      if (!isAdmin) return;
      const prev = messages;
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
        console.error("toggle hidden failed", err);
        setMessages(prev);
      }
    },
    [isAdmin, messages, apiPaths],
  );

  /* ── Tag attach / detach ── */

  // Optimistically updates the local item state across all panes (the
  // single-chat list, merged messages, and search results). New tags
  // also get folded into the pool so they appear immediately in the
  // SearchBar chip-strip.
  const updateItemTags = useCallback(
    (itemId: string, nextTags: TagRef[]) => {
      const apply = (list: WhatsappMessageDTO[]) =>
        list.map((m) => (m.id === itemId ? { ...m, tags: nextTags } : m));
      setMessages(apply);
      setMergedMessages((prev) =>
        prev.map((m) =>
          m.id === itemId ? ({ ...m, tags: nextTags } as MergedMessage) : m,
        ),
      );
      setSearchResults((prev) =>
        prev.map((m) =>
          m.id === itemId ? ({ ...m, tags: nextTags } as MergedMessage) : m,
        ),
      );
      // Add any new tag refs to the pool.
      setTagsPool((pool) => {
        const known = new Set(pool.map((t) => t.id));
        const additions = nextTags.filter((t) => !known.has(t.id));
        return additions.length === 0 ? pool : [...pool, ...additions];
      });
    },
    [],
  );

  const attachTag = useCallback(
    async (
      itemId: string,
      payload: { tagId: string } | { name: string },
    ): Promise<TagRef> => {
      // In mock mode we synthesize a TagRef and update local state only —
      // no server. The pool is enriched in updateItemTags below.
      if (mode === "mock") {
        const item = messages.find((m) => m.id === itemId);
        const existingTags = item?.tags ?? [];
        let tag: TagRef;
        if ("tagId" in payload) {
          const found = tagsPool.find((t) => t.id === payload.tagId);
          if (!found) throw new Error("תגית לא נמצאה");
          tag = found;
        } else {
          const name = payload.name.trim();
          const exists = tagsPool.find((t) => t.name === name);
          tag = exists ?? { id: `mock-tag-${name}`, name, color: null };
        }
        if (!existingTags.some((t) => t.id === tag.id)) {
          updateItemTags(itemId, [...existingTags, tag]);
        }
        return tag;
      }
      if (!apiPaths.itemTagsAttach) throw new Error("חסר API לתיוג");
      const res = await fetch(apiPaths.itemTagsAttach(itemId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
      const tag = body.tag as TagRef;
      const item = messages.find((m) => m.id === itemId);
      const existingTags = item?.tags ?? [];
      if (!existingTags.some((t) => t.id === tag.id)) {
        updateItemTags(itemId, [...existingTags, tag]);
      }
      return tag;
    },
    [mode, messages, tagsPool, apiPaths, updateItemTags],
  );

  const detachTag = useCallback(
    async (itemId: string, tagId: string): Promise<void> => {
      const item = messages.find((m) => m.id === itemId);
      const nextTags = (item?.tags ?? []).filter((t) => t.id !== tagId);
      updateItemTags(itemId, nextTags);
      if (mode === "mock") return;
      if (!apiPaths.itemTagsDetach) return;
      try {
        const res = await fetch(apiPaths.itemTagsDetach(itemId, tagId), {
          method: "DELETE",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } catch (err) {
        console.error("detach tag failed", err);
        // Roll back: re-add the tag.
        const tagBack = (item?.tags ?? []).find((t) => t.id === tagId);
        if (tagBack) {
          updateItemTags(itemId, [...nextTags, tagBack]);
        }
      }
    },
    [mode, messages, apiPaths, updateItemTags],
  );

  /* ── Merged-view ── */
  const [pickerOpen, setPickerOpen] = useState(false);
  const [mergedChatIds, setMergedChatIds] = useState<string[] | null>(null);
  const [mergedMessages, setMergedMessages] = useState<MergedMessage[]>([]);
  const [mergedLoading, setMergedLoading] = useState(false);
  const [mergedError, setMergedError] = useState<string | null>(null);
  const inMergedView = mergedChatIds !== null && !searchActive;

  useEffect(() => {
    if (!mergedChatIds || searchActive) return;
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
                ? mockItems?.[c.id] ?? []
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
        setMergedError(err instanceof Error ? err.message : "שגיאה");
        setMergedMessages([]);
      } finally {
        if (!controller.signal.aborted) setMergedLoading(false);
      }
    })();
    return () => controller.abort();
  }, [mergedChatIds, workspace.chats, mode, apiPaths, mockItems, searchActive]);

  /* ── Search ── */
  const [searchResults, setSearchResults] = useState<MergedMessage[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    if (!searchActive) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }
    if (mode === "mock") {
      setSearchResults(
        mockSearch(workspace, mockItems ?? {}, url.searchState),
      );
      return;
    }
    if (!apiPaths.search) return;
    const controller = new AbortController();
    setSearchLoading(true);
    setSearchError(null);
    (async () => {
      try {
        const p = new URLSearchParams();
        if (url.searchState.q.trim()) p.set("q", url.searchState.q.trim());
        for (const t of url.searchState.tagIds) p.append("tag", t);
        const res = await fetch(apiPaths.search!(p.toString()), {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error || `HTTP ${res.status}`);
        }
        const json = (await res.json()) as { items: ApiMessage[] };
        const items: MergedMessage[] = json.items.map((m) => ({
          ...apiMsgToDTO(m, apiPaths.media),
          sourceContact: m.sourceContact ?? "",
          sourceSelfSender: m.sourceSelfSender ?? null,
        }));
        if (!controller.signal.aborted) setSearchResults(items);
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("search failed", err);
        setSearchError(err instanceof Error ? err.message : "שגיאה");
        setSearchResults([]);
      } finally {
        if (!controller.signal.aborted) setSearchLoading(false);
      }
    })();
    return () => controller.abort();
  }, [searchActive, mode, mockItems, workspace, url.searchState, apiPaths]);

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

  /* ── Render ── */

  // Right-pane priority: search > merged > single-chat > empty hint.
  const rightPaneOpen = searchActive || !!activeChatId || inMergedView;

  return (
    <div
      className="flex flex-1 flex-col min-h-0 bg-[#dadbd3]"
      data-active={rightPaneOpen ? "chat" : "list"}
    >
      <SearchBar
        qDraft={url.qDraft}
        setQDraft={url.setQDraft}
        onCommitQuery={url.commitQuery}
        searchState={url.searchState}
        pool={tagsPool}
        onToggleTag={url.toggleTag}
        onClear={url.reset}
        // Render the back arrow only when there's actually something
        // to back out of. Priority matches the right-pane priority
        // above: search beats merged beats single-chat.
        onBack={
          rightPaneOpen
            ? () => {
                if (searchActive) url.reset();
                else if (inMergedView) handleExitMerged();
                else setActiveChatId(null);
              }
            : undefined
        }
      />

      <div className="flex flex-1 min-h-0">
        {/* Left wrapper: hugs the sidebar's intrinsic width on desktop
            (360px) so there's no empty strip between it and the chat
            pane. On mobile it expands to full width when no chat is
            open, then collapses to hidden when the chat takes over. */}
        <div
          className={
            "flex min-h-0 lg:shrink-0 " +
            (rightPaneOpen
              ? "hidden lg:flex"
              : "flex flex-1 lg:flex-none")
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

        {/* Right wrapper: always takes the remaining space on desktop. */}
        <div
          className={
            "flex flex-1 min-h-0 min-w-0 " +
            (rightPaneOpen ? "flex" : "hidden lg:flex")
          }
        >
          {searchActive ? (
            <MergedView
              messages={searchResults}
              loading={searchLoading}
              error={searchError}
              workspaceSelfSender={workspace.selfSender}
              selectedCount={searchResults.length}
              onExit={url.reset}
              headerLabel={
                url.searchState.q
                  ? `תוצאות חיפוש: "${url.searchState.q}"`
                  : "תוצאות מסונן לפי תגיות"
              }
            />
          ) : inMergedView ? (
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
              tagsPool={tagsPool}
              onAttachTag={attachTag}
              onDetachTag={detachTag}
              onToggleTagFilter={url.toggleTag}
              activeTagIds={url.searchState.tagIds}
            />
          )}
        </div>
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

// `useSearchParams` (via useConversationUrlState) makes the inner
// component dynamic. Wrap in Suspense so the public landing pages can
// still pre-render their outer chrome.
export function WhatsappShell(props: ConversationShellProps) {
  return (
    <Suspense fallback={null}>
      <ConversationShellInner {...props} />
    </Suspense>
  );
}
