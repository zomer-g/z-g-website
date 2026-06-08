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

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { ChatSidebar } from "./channel-sidebar";
import { ChatPane } from "./stream-pane";
import { MergedPicker } from "./merged-picker";
import { MergedView, type MergedMessage } from "./merged-view";
import { SearchBar } from "./search-bar";
import { useConversationUrlState } from "./use-conversation-url-state";
import { printMessages } from "@/lib/print-messages";
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
  isStarred?: boolean;
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
    isStarred: m.isStarred ?? false,
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

// Reconcile a starred-id set against a freshly-fetched item list: each
// id present in the payload takes the server's isStarred value; ids not
// in the payload are left untouched. Module-level (stable) so it can be
// called from effects/callbacks without dependency-ordering headaches.
function reconcileStarred(
  setStarredIds: (updater: (prev: Set<string>) => Set<string>) => void,
  items: { id: string; isStarred?: boolean }[],
): void {
  setStarredIds((prev) => {
    const next = new Set(prev);
    for (const it of items) {
      if (it.isStarred) next.add(it.id);
      else next.delete(it.id);
    }
    return next;
  });
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
        reconcileStarred(setStarredIds, items);
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

  // Applies a hidden flag to a set of message ids across ALL panes
  // (single chat, merged, search) so the change is reflected wherever
  // the message currently appears.
  const applyHiddenLocally = useCallback(
    (ids: Set<string>, hidden: boolean) => {
      const patch = <T extends WhatsappMessageDTO>(m: T): T =>
        ids.has(m.id) ? { ...m, isHidden: hidden } : m;
      setMessages((list) => list.map(patch));
      setMergedMessages((list) => list.map(patch));
      setSearchResults((list) => list.map(patch));
    },
    [],
  );

  const toggleMessageHidden = useCallback(
    async (messageId: string, nextHidden: boolean) => {
      if (!isAdmin) return;
      const one = new Set([messageId]);
      applyHiddenLocally(one, nextHidden);
      try {
        const res = await fetch(apiPaths.toggleHidden(messageId), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isHidden: nextHidden }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } catch (err) {
        console.error("toggle hidden failed", err);
        applyHiddenLocally(one, !nextHidden); // roll back
      }
    },
    [isAdmin, apiPaths, applyHiddenLocally],
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
        if (!controller.signal.aborted) {
          setMergedMessages(merged);
          if (mode === "live") reconcileStarred(setStarredIds, merged);
        }
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
        if (!controller.signal.aborted) {
          setSearchResults(items);
          if (mode === "live") reconcileStarred(setStarredIds, items);
        }
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

  /* ── Selection + print ── */
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Anchor for shift-click range selection — the last row the user
  // clicked without shift.
  const selectionAnchor = useRef<string | null>(null);

  // The ordered, printable (non-system) messages of whichever pane is
  // currently showing. Drives both shift-range selection and print.
  const currentPool = useCallback((): {
    pool: WhatsappMessageDTO[];
    title: string;
    source: string;
  } => {
    if (searchActive) {
      return {
        pool: searchResults.filter((m) => !m.isSystem),
        title: "תוצאות חיפוש",
        source: url.searchState.q ? `חיפוש: "${url.searchState.q}"` : "סינון תגיות",
      };
    }
    if (inMergedView) {
      return {
        pool: mergedMessages.filter((m) => !m.isSystem),
        title: "תצוגה משולבת",
        source: `${mergedChatIds?.length ?? 0} שיחות`,
      };
    }
    return {
      pool: messages.filter((m) => !m.isSystem),
      title: active?.contactName ? `שיחה: ${active.contactName}` : "הודעות",
      source: active?.contactName ?? "",
    };
  }, [searchActive, inMergedView, searchResults, mergedMessages, messages,
      active, mergedChatIds, url.searchState]);

  const enterSelection = useCallback(() => {
    setSelectionMode(true);
    setSelectedIds(new Set());
    selectionAnchor.current = null;
  }, []);

  const exitSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
    selectionAnchor.current = null;
  }, []);

  const toggleSelection = useCallback(
    (id: string, shift?: boolean) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        // Shift-click: select the contiguous range between the anchor
        // and the clicked row (inclusive), in display order.
        if (shift && selectionAnchor.current) {
          const ids = currentPool().pool.map((m) => m.id);
          const a = ids.indexOf(selectionAnchor.current);
          const b = ids.indexOf(id);
          if (a !== -1 && b !== -1) {
            const [lo, hi] = a < b ? [a, b] : [b, a];
            for (let i = lo; i <= hi; i++) next.add(ids[i]);
            return next;
          }
        }
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      // A plain click (or the first of a shift sequence) sets the anchor.
      if (!shift) selectionAnchor.current = id;
    },
    [currentPool],
  );

  // Print only the selected messages.
  const handlePrintSelected = useCallback(() => {
    const { pool, title, source } = currentPool();
    const selected = pool.filter((m) => selectedIds.has(m.id));
    printMessages(selected, { title: `${title} — נבחרות`, source, subtitle: workspace.title });
  }, [currentPool, selectedIds, workspace.title]);

  // Print everything currently displayed (no selection needed).
  const handlePrintAll = useCallback(() => {
    const { pool, title, source } = currentPool();
    printMessages(pool, { title, source, subtitle: workspace.title });
  }, [currentPool, workspace.title]);

  /* ── Star (per-message mark + "show starred only" filter) ── */
  // Like WhatsApp starred messages: each bubble can be starred via its
  // star button (everyone, any view). Stars are session-local and
  // persist across chats/views for the lifetime of the page — they are
  // NOT reset on navigation, so a star set in one chat stays set.
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());
  const [starFilterActive, setStarFilterActive] = useState(false);

  const toggleStarFilter = useCallback(
    () => setStarFilterActive((v) => !v),
    [],
  );

  // Favorite the current selection. Additive + toggle: if every selected
  // item is already starred, this un-stars them; otherwise it stars all.
  // Persists to the server in live mode (admin); session-local otherwise.
  // Then leaves selection mode so the user can re-enter and add more.
  const handleFavoriteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    const ids = [...selectedIds];
    const allStarred = ids.every((id) => starredIds.has(id));
    const nextVal = !allStarred;
    setStarredIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (nextVal) next.add(id);
        else next.delete(id);
      }
      return next;
    });
    exitSelection();

    // Persist. Only admins can write; mock mode has no backend.
    if (mode !== "live" || !isAdmin) return;
    for (const id of ids) {
      fetch(apiPaths.toggleHidden(id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isStarred: nextVal }),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
        })
        .catch((err) => {
          console.error("persist star failed", err);
          // Roll back just this id so the UI matches the server.
          setStarredIds((prev) => {
            const next = new Set(prev);
            if (nextVal) next.delete(id);
            else next.add(id);
            return next;
          });
        });
    }
  }, [selectedIds, starredIds, exitSelection, mode, isAdmin, apiPaths]);

  // When the star filter is on, restrict each pane to starred items.
  const filterStar = useCallback(
    <T extends WhatsappMessageDTO>(list: T[]): T[] =>
      starFilterActive ? list.filter((m) => starredIds.has(m.id)) : list,
    [starFilterActive, starredIds],
  );
  const starredCountIn = useCallback(
    (list: WhatsappMessageDTO[]): number =>
      list.reduce((n, m) => n + (starredIds.has(m.id) ? 1 : 0), 0),
    [starredIds],
  );

  /* ── Bulk hide (admin only) ── */
  const handleHideSelected = useCallback(async () => {
    if (!isAdmin || selectedIds.size === 0) return;
    const ids = new Set(selectedIds);
    applyHiddenLocally(ids, true);
    exitSelection();
    await Promise.allSettled(
      [...ids].map((id) =>
        fetch(apiPaths.toggleHidden(id), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isHidden: true }),
        }),
      ),
    );
  }, [isAdmin, selectedIds, apiPaths, applyHiddenLocally, exitSelection]);

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
              messages={filterStar(searchResults)}
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
              selectionMode={selectionMode}
              selectedIds={selectedIds}
              onToggleSelection={toggleSelection}
              onEnterSelection={enterSelection}
              onExitSelection={exitSelection}
              onPrintSelected={handlePrintSelected}
              onPrintAll={handlePrintAll}
              onHideSelected={isAdmin ? handleHideSelected : undefined}
              onFavoriteSelected={handleFavoriteSelected}
              starredIds={starredIds}
              starFilterActive={starFilterActive}
              onToggleStarFilter={toggleStarFilter}
              starredCount={starredCountIn(searchResults)}
            />
          ) : inMergedView ? (
            <MergedView
              messages={filterStar(mergedMessages)}
              loading={mergedLoading}
              error={mergedError}
              workspaceSelfSender={workspace.selfSender}
              selectedCount={mergedChatIds?.length ?? 0}
              onExit={handleExitMerged}
              selectionMode={selectionMode}
              selectedIds={selectedIds}
              onToggleSelection={toggleSelection}
              onEnterSelection={enterSelection}
              onExitSelection={exitSelection}
              onPrintSelected={handlePrintSelected}
              onPrintAll={handlePrintAll}
              onHideSelected={isAdmin ? handleHideSelected : undefined}
              onFavoriteSelected={handleFavoriteSelected}
              starredIds={starredIds}
              starFilterActive={starFilterActive}
              onToggleStarFilter={toggleStarFilter}
              starredCount={starredCountIn(mergedMessages)}
            />
          ) : (
            <ChatPane
              chat={active}
              messages={filterStar(messages)}
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
              selectionMode={selectionMode}
              selectedIds={selectedIds}
              onToggleSelection={toggleSelection}
              onEnterSelection={enterSelection}
              onExitSelection={exitSelection}
              onPrintSelected={handlePrintSelected}
              onPrintAll={handlePrintAll}
              onHideSelected={isAdmin ? handleHideSelected : undefined}
              onFavoriteSelected={handleFavoriteSelected}
              starredIds={starredIds}
              starFilterActive={starFilterActive}
              onToggleStarFilter={toggleStarFilter}
              starredCount={starredCountIn(messages)}
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
