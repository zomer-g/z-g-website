"use client";

// URL ⇄ search-state binding shared between /whatsapp/[slug] and
// /timeline/[slug]. Mirrors the pattern used by class-actions and
// guidelines so all three "filtered dashboard" features behave the
// same way: every keystroke / tag toggle replaces the URL, refreshes
// keep state, and a shared link reproduces the exact filtered view.

import { useCallback, useMemo, useState, useEffect } from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import type { SearchState } from "./types";

const Q_KEY = "q";
const TAG_KEY = "tag";
const STARRED_KEY = "starred";

interface UseConversationUrlState {
  // Applied (URL-derived) state — the source of truth for the search.
  searchState: SearchState;
  // Draft state for the text input — lives locally so each keystroke
  // isn't immediately a URL replace. Caller decides when to commit
  // (e.g. on Enter / blur).
  qDraft: string;
  setQDraft: (next: string) => void;
  // Push the current draft to the URL.
  commitQuery: () => void;
  // Tag toggle / clear apply immediately.
  toggleTag: (tagId: string) => void;
  clearTags: () => void;
  // "Favorites only" view filter, persisted in the URL (?starred=1) so
  // a filtered view can be shared as a link. Independent of `searchState`
  // — it does NOT flip the shell into search mode.
  starredOnly: boolean;
  setStarredOnly: (next: boolean) => void;
  // Reset the search (q + tags) in one go. Preserves the favorites
  // filter so exiting a search keeps the chosen view.
  reset: () => void;
}

export function useConversationUrlState(): UseConversationUrlState {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const searchState = useMemo<SearchState>(
    () => ({
      q: params.get(Q_KEY) ?? "",
      tagIds: params.getAll(TAG_KEY).filter(Boolean),
    }),
    [params],
  );

  const starredOnly = params.get(STARRED_KEY) === "1";

  // Draft state mirrors the URL on first paint so a shared link
  // visibly pre-fills the input. Once hydrated, the user owns it.
  const [qDraft, setQDraft] = useState(searchState.q);
  useEffect(() => {
    // Only re-sync if the user clears the URL (e.g. router replace
    // from the merged view exit). Otherwise leave the draft alone so
    // the user's in-flight typing isn't clobbered.
    if (searchState.q === "" && qDraft !== "") {
      setQDraft("");
    }
    // We intentionally don't include qDraft in the deps — that would
    // cause the hook to reset itself in a loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchState.q]);

  const writeUrl = useCallback(
    (next: { q: string; tagIds: string[]; starredOnly: boolean }) => {
      // Clone the existing params so unrelated keys (notably ?view=clean,
      // read server-side) survive a filter change.
      const p = new URLSearchParams(params.toString());
      if (next.q.trim()) p.set(Q_KEY, next.q.trim());
      else p.delete(Q_KEY);
      p.delete(TAG_KEY);
      for (const t of next.tagIds) p.append(TAG_KEY, t);
      if (next.starredOnly) p.set(STARRED_KEY, "1");
      else p.delete(STARRED_KEY);
      const qs = p.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, params],
  );

  return {
    searchState,
    qDraft,
    setQDraft,
    starredOnly,
    setStarredOnly: (next: boolean) =>
      writeUrl({ q: searchState.q, tagIds: searchState.tagIds, starredOnly: next }),
    commitQuery: () =>
      writeUrl({ q: qDraft, tagIds: searchState.tagIds, starredOnly }),
    toggleTag: (tagId: string) => {
      const has = searchState.tagIds.includes(tagId);
      const tagIds = has
        ? searchState.tagIds.filter((x) => x !== tagId)
        : [...searchState.tagIds, tagId];
      writeUrl({ q: searchState.q, tagIds, starredOnly });
    },
    clearTags: () =>
      writeUrl({ q: searchState.q, tagIds: [], starredOnly }),
    reset: () => {
      setQDraft("");
      // Preserve the favorites filter — clearing the search shouldn't
      // also drop the chosen view.
      writeUrl({ q: "", tagIds: [], starredOnly });
    },
  };
}
