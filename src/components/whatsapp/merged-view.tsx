"use client";

// Merged chronological view across multiple chats. Behaves like the
// regular ChatPane but every bubble carries a small "from <contact>"
// chip above it, since the timeline mixes contacts. Outgoing bubbles
// get "→ <contact>" so the operator can tell which thread their reply
// belonged to.
//
// Messages are passed in pre-sorted by the parent shell. The pane is
// purely presentational; it doesn't fetch.

import { useEffect, useMemo, useRef } from "react";
import { ArrowRight, Layers, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { MessageBubble } from "./message-bubble";
import type { WhatsappMessageDTO } from "./types";

export interface MergedMessage extends WhatsappMessageDTO {
  // Which chat this message originated in (display name). Required for
  // the per-bubble source label. The merged shell builds these by
  // tagging each loaded chat's messages with the chat's contactName.
  sourceContact: string;
  // The source chat's selfSender (configured by the admin per chat).
  // Used to decide outgoing-vs-incoming per message — without this,
  // every bubble in the merged view would look like an incoming message.
  sourceSelfSender: string | null;
}

interface MergedViewProps {
  messages: MergedMessage[];
  loading: boolean;
  error: string | null;
  // Used only when a merged message lacks sourceSelfSender — kept here as
  // a workspace-level fallback so the props stay backward-compatible.
  workspaceSelfSender: string;
  onExit: () => void;       // dismiss merged view, return to chat list
  selectedCount: number;
  // isAdmin is intentionally NOT a prop here: hidden-message styling
  // surfaces via the MessageBubble component itself (it reads
  // message.isHidden and renders the fade + badge). The merged view does
  // not currently offer an inline hide toggle — admins should hide
  // messages from the single-chat pane to keep the merged state simple.
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

// Stable color hash per contact so bubbles for the same contact share a
// visual cue (the small label chip). 5 distinct hues — enough for any
// realistic workspace and easy on the eye.
const CHIP_COLORS = [
  "bg-blue-100 text-blue-800",
  "bg-violet-100 text-violet-800",
  "bg-amber-100 text-amber-800",
  "bg-rose-100 text-rose-800",
  "bg-teal-100 text-teal-800",
];

function chipColorFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) | 0;
  }
  return CHIP_COLORS[Math.abs(h) % CHIP_COLORS.length];
}

export function MergedView({
  messages,
  loading,
  error,
  workspaceSelfSender,
  onExit,
  selectedCount,
}: MergedViewProps) {
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length]);

  // Build the render list with day separators woven in. We don't group
  // by sender across runs the way ChatPane does — in merged view, every
  // bubble shows its source contact regardless.
  const items = useMemo(() => {
    const out: Array<
      | { kind: "day"; key: string; label: string }
      | {
          kind: "msg";
          key: string;
          msg: MergedMessage;
          isOutgoing: boolean;
        }
    > = [];
    let lastDay = "";
    for (const m of messages) {
      const day = dayKey(m.timestamp);
      if (day !== lastDay) {
        out.push({ kind: "day", key: `day-${day}-${m.id}`, label: day });
        lastDay = day;
      }
      // Per-source selfSender is the priority; the workspace fallback only
      // applies when a source chat has no selfSender configured (and even
      // then, only if it isn't an empty string).
      const self = m.sourceSelfSender ?? workspaceSelfSender;
      const isOutgoing = !m.isSystem && !!self && m.sender === self;
      out.push({ kind: "msg", key: m.id, msg: m, isOutgoing });
    }
    return out;
  }, [messages, workspaceSelfSender]);

  return (
    <div className="flex flex-1 flex-col bg-[#efeae2] min-h-0">
      <header className="flex items-center gap-3 bg-[#f0f2f5] border-b border-black/5 px-3 py-2 shrink-0">
        <button
          type="button"
          onClick={onExit}
          aria-label="חזרה לרשימת השיחות"
          className="inline-flex items-center justify-center h-9 w-9 rounded-full hover:bg-black/5 text-gray-700"
        >
          <ArrowRight className="h-5 w-5" />
        </button>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white">
          <Layers className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-900 truncate">
            תצוגה משולבת
          </div>
          <div className="text-xs text-gray-500">
            {selectedCount} שיחות · {messages.length} הודעות בציר משותף
          </div>
        </div>
      </header>

      <div
        ref={listRef}
        className={cn(
          "flex-1 overflow-y-auto py-3",
          "bg-[url('data:image/svg+xml;utf8,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%2040%2040%22%3E%3Ccircle%20cx=%2220%22%20cy=%2220%22%20r=%221%22%20fill=%22%23d8d2c8%22/%3E%3C/svg%3E')]",
        )}
      >
        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-500 text-sm">
            <Loader2 className="h-4 w-4 animate-spin me-2" /> טוען הודעות מכל השיחות…
          </div>
        ) : error ? (
          <div className="mx-3 my-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-500">
            לא נמצאו הודעות בשיחות שנבחרו.
          </div>
        ) : (
          items.map((it) => {
            if (it.kind === "day") {
              return (
                <div key={it.key} className="flex justify-center my-3">
                  <span className="rounded-md bg-white/85 px-2.5 py-1 text-xs text-gray-700 shadow-sm">
                    {it.label}
                  </span>
                </div>
              );
            }
            const { msg, isOutgoing } = it;
            const isSystem = msg.isSystem;
            const chipColor = chipColorFor(msg.sourceContact);
            return (
              <div key={it.key}>
                {/* Source-contact chip — shown for every non-system message.
                    Outgoing chips have an arrow prefix to signal direction. */}
                {!isSystem ? (
                  <div
                    className={cn(
                      "flex px-2",
                      isOutgoing ? "justify-start" : "justify-end",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold mt-1",
                        chipColor,
                      )}
                    >
                      {isOutgoing ? "→ " : ""}
                      {msg.sourceContact}
                    </span>
                  </div>
                ) : null}
                <MessageBubble
                  message={msg}
                  isOutgoing={isOutgoing}
                  // We already render the source chip above the bubble, so
                  // the bubble's own "showSender" is redundant — disable it.
                  showSender={false}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
