"use client";

// Right pane of the workflows shell — the events for the currently
// selected entity or process. Visually mirrors the WhatsApp chat pane:
// header with avatar + name, scrolling body grouped by day, bubble rows.
//
// All events from `self` (the lawyer) render as outgoing/green bubbles
// on the start side; everything else is incoming/white.

import { useEffect, useMemo, useRef } from "react";
import {
  ArrowRight,
  CalendarDays,
  Users,
  Building2,
  Scale,
  Briefcase,
  Workflow,
  Bell,
  BellRing,
  CheckSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SelectionBar } from "@/components/conversation/selection-bar";
import type {
  EntityType,
  ProcessKind,
  WorkflowEntity,
  WorkflowEvent,
  WorkflowProcess,
} from "./types";

interface EventPaneProps {
  // Either an entity or a process is selected at a time.
  context:
    | { kind: "entity"; entity: WorkflowEntity }
    | { kind: "process"; process: WorkflowProcess }
    | null;
  events: WorkflowEvent[];
  selfName: string;
  onBack: () => void;
  // For rendering the per-event tag chips below the bubble — we need to
  // resolve entity/process ids → display names.
  entityById: Map<string, WorkflowEntity>;
  processById: Map<string, WorkflowProcess>;
  // Selection + print
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelection?: (id: string) => void;
  onEnterSelection?: () => void;
  onExitSelection?: () => void;
  onPrintSelected?: () => void;
}

/* ─── Reminder formatting helpers ─── */

// "בעוד 3 ימים", "באיחור 2 ימים", "היום", "מחר" — turns the absolute
// ISO timestamp into a human-readable relative phrase. Returns the
// label + whether the reminder is past-due, which the caller uses to
// pick the visual treatment (red for overdue, amber for upcoming).
function describeReminder(iso: string): {
  label: string;
  overdue: boolean;
} {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { label: "—", overdue: false };
  const now = new Date();
  // Diff in full calendar days, using local midnight as the anchor.
  const midnightToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const midnightTarget = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
  );
  const dayDiff = Math.round(
    (midnightTarget.getTime() - midnightToday.getTime()) /
      (24 * 60 * 60 * 1000),
  );
  const overdue = d.getTime() < now.getTime();
  let rel: string;
  if (dayDiff === 0) rel = overdue ? "באיחור (היום)" : "היום";
  else if (dayDiff === 1) rel = "מחר";
  else if (dayDiff === -1) rel = "באיחור (אתמול)";
  else if (dayDiff > 1) rel = `בעוד ${dayDiff} ימים`;
  else rel = `באיחור ${Math.abs(dayDiff)} ימים`;
  return { label: rel, overdue };
}

function formatReminderAbs(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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
function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

function entityAvatarBg(type: EntityType): string {
  if (type === "client") return "bg-emerald-700";
  if (type === "police") return "bg-sky-700";
  return "bg-violet-700";
}
function processAvatarBg(kind: ProcessKind): string {
  if (kind === "discovery") return "bg-amber-700";
  if (kind === "evidence") return "bg-rose-700";
  return "bg-teal-700";
}
function entityIcon(type: EntityType) {
  if (type === "client") return Users;
  if (type === "police") return Building2;
  return Scale;
}
function processIcon(kind: ProcessKind) {
  if (kind === "discovery") return Briefcase;
  if (kind === "evidence") return Scale;
  return Workflow;
}

export function EventPane({
  context,
  events,
  selfName,
  onBack,
  entityById,
  processById,
  selectionMode = false,
  selectedIds,
  onToggleSelection,
  onEnterSelection,
  onExitSelection,
  onPrintSelected,
}: EventPaneProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [context, events.length]);

  // Pre-compute day separators + showSender hints.
  const items = useMemo(() => {
    const out: Array<
      | { kind: "day"; key: string; label: string }
      | {
          kind: "evt";
          key: string;
          evt: WorkflowEvent;
          isOutgoing: boolean;
          showSender: boolean;
        }
    > = [];
    let lastDay = "";
    let lastSender = "";
    for (const e of events) {
      const day = dayKey(e.timestamp);
      if (day !== lastDay) {
        out.push({ kind: "day", key: `day-${day}-${e.id}`, label: day });
        lastDay = day;
        lastSender = "";
      }
      const isOutgoing = e.creator === selfName;
      const showSender = !isOutgoing && e.creator !== lastSender;
      out.push({
        kind: "evt",
        key: e.id,
        evt: e,
        isOutgoing,
        showSender,
      });
      lastSender = e.creator;
    }
    return out;
  }, [events, selfName]);

  /* ── Empty-context state — desktop only ── */
  if (!context) {
    return (
      <div
        className="hidden lg:flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-emerald-50/60 to-white text-gray-700 p-10"
        role="region"
        aria-label="אזור תצוגת אירועים — לא נבחרה ישות או תהליך"
      >
        <div
          className="rounded-full bg-white p-8 shadow-md ring-1 ring-emerald-100 mb-6"
          aria-hidden="true"
        >
          <CalendarDays
            className="h-16 w-16 text-emerald-700"
            strokeWidth={1.5}
          />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2 text-center">
          בחרו ישות או תהליך
        </h2>
        <p className="text-sm text-gray-700 max-w-md text-center leading-relaxed mb-6">
          לשונית "ישויות" מציגה את כל האירועים סביב לקוח, תחנת משטרה או יחידת
          פרקליטות. לשונית "תהליכים" מציגה את כל האירועים שמתחת לתהליך
          ספציפי. את אותו אירוע אפשר לראות תחת ישות אחת או יותר ותחת תהליך
          אחד או יותר.
        </p>
      </div>
    );
  }

  /* ── Header for the selected context ── */

  const ctxTitle =
    context.kind === "entity" ? context.entity.name : context.process.title;
  const ctxSubtitle =
    context.kind === "entity"
      ? context.entity.subtitle
      : context.process.subtitle;
  const HeaderIcon =
    context.kind === "entity"
      ? entityIcon(context.entity.type)
      : processIcon(context.process.kind);
  const headerBg =
    context.kind === "entity"
      ? entityAvatarBg(context.entity.type)
      : processAvatarBg(context.process.kind);

  return (
    <div className="flex flex-1 flex-col bg-[#efeae2] min-h-0">
      {/* h-14 to line up exactly with the sidebar's tablist top strip
          (both top bars sit at the same height). */}
      <header className="flex items-center gap-3 h-14 bg-[#f0f2f5] border-b border-black/5 px-3 shrink-0">
        <button
          type="button"
          onClick={selectionMode ? onExitSelection : onBack}
          className="inline-flex items-center justify-center h-9 w-9 rounded-full hover:bg-black/5 text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-1"
          aria-label={selectionMode ? "יציאה ממצב סימון" : "חזרה לרשימה"}
          title={selectionMode ? "ביטול מצב סימון" : "חזרה לרשימה"}
        >
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </button>
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white",
            headerBg,
          )}
          aria-hidden="true"
        >
          <HeaderIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-gray-900 truncate">
            {ctxTitle}
          </div>
          <div className="text-xs text-gray-700 truncate">
            {selectionMode
              ? `בחר/י אירועים להדפסה — ${selectedIds?.size ?? 0} נבחרו`
              : `${ctxSubtitle ? `${ctxSubtitle} · ` : ""}${events.length} ${events.length === 1 ? "אירוע" : "אירועים"}`}
          </div>
        </div>
        {!selectionMode ? (
          <button
            type="button"
            onClick={onEnterSelection}
            title="בחירת אירועים להדפסה"
            aria-label="כניסה למצב בחירת אירועים"
            className="inline-flex items-center justify-center h-9 w-9 rounded-full hover:bg-black/5 text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-1 shrink-0"
          >
            <CheckSquare className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : null}
      </header>

      <div
        ref={listRef}
        className="flex-1 overflow-y-auto py-3 bg-[url('data:image/svg+xml;utf8,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%2040%2040%22%3E%3Ccircle%20cx=%2220%22%20cy=%2220%22%20r=%221%22%20fill=%22%23d8d2c8%22/%3E%3C/svg%3E')]"
      >
        {items.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-700" role="status">
            אין אירועים תחת ההקשר הזה עדיין. אפשר להוסיף אירוע חדש מטה.
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
              <EventBubble
                key={it.key}
                evt={it.evt}
                isOutgoing={it.isOutgoing}
                showSender={it.showSender}
                entityById={entityById}
                processById={processById}
                currentContextKind={context.kind}
                currentContextId={
                  context.kind === "entity"
                    ? context.entity.id
                    : context.process.id
                }
                selectable={selectionMode}
                selected={selectedIds?.has(it.evt.id)}
                onSelect={onToggleSelection}
              />
            ),
          )
        )}
      </div>
      <SelectionBar
        count={selectedIds?.size ?? 0}
        onPrint={onPrintSelected ?? (() => {})}
        onClear={onExitSelection ?? (() => {})}
      />
    </div>
  );
}

/* ─── Bubble — purposely simpler than the WhatsApp MessageBubble ─── */

function EventBubble({
  evt,
  isOutgoing,
  showSender,
  entityById,
  processById,
  currentContextKind,
  currentContextId,
  selectable = false,
  selected = false,
  onSelect,
}: {
  evt: WorkflowEvent;
  isOutgoing: boolean;
  showSender: boolean;
  entityById: Map<string, WorkflowEntity>;
  processById: Map<string, WorkflowProcess>;
  currentContextKind: "entity" | "process";
  currentContextId: string;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (id: string) => void;
}) {
  // Filter out the chip for the currently-open context — it's redundant
  // (the user already knows they're in that lane).
  const entityChips = evt.entityIds
    .map((id) => entityById.get(id))
    .filter((e): e is WorkflowEntity => !!e)
    .filter(
      (e) => !(currentContextKind === "entity" && e.id === currentContextId),
    );
  const processChips = evt.processIds
    .map((id) => processById.get(id))
    .filter((p): p is WorkflowProcess => !!p)
    .filter(
      (p) => !(currentContextKind === "process" && p.id === currentContextId),
    );

  return (
    <div
      className={cn(
        "flex w-full px-2 my-0.5 items-start",
        isOutgoing ? "justify-start" : "justify-end",
        selectable && "cursor-pointer",
        selectable && selected && "bg-emerald-50/60",
        selectable && !selected && "hover:bg-black/[0.02]",
      )}
      onClick={selectable && onSelect ? () => onSelect(evt.id) : undefined}
      role={selectable ? "checkbox" : undefined}
      aria-checked={selectable ? selected : undefined}
    >
      {selectable ? (
        <div
          className={cn(
            "shrink-0 flex items-center justify-center mt-1 me-1.5",
            "h-5 w-5 rounded border-2 transition-colors",
            selected ? "border-emerald-600 bg-emerald-600" : "border-gray-400 bg-white",
          )}
          aria-hidden="true"
        >
          {selected ? (
            <svg viewBox="0 0 12 10" className="h-3 w-3 fill-current text-white" aria-hidden="true">
              <polyline points="1,5 4.5,8.5 11,1" strokeWidth="2" stroke="white" fill="none" />
            </svg>
          ) : null}
        </div>
      ) : null}
      <div
        className={cn(
          "max-w-[78%] sm:max-w-[68%] rounded-lg shadow-sm px-2.5 py-1.5",
          isOutgoing
            ? "bg-emerald-100 rounded-tr-md rounded-tl-2xl rounded-bl-2xl rounded-br-2xl"
            : "bg-white rounded-tl-md rounded-tr-2xl rounded-br-2xl rounded-bl-2xl",
        )}
        dir="auto"
      >
        {evt.isSessionLocal ? (
          <div className="mb-1 text-[10px] font-semibold text-emerald-700">
            נוסף בסשן זה · יימחק ברענון הדפדפן
          </div>
        ) : null}
        {showSender && !isOutgoing ? (
          <div className="text-xs font-semibold text-emerald-700 mb-0.5">
            {evt.creator}
          </div>
        ) : null}

        {evt.title ? (
          <div className="text-sm font-semibold text-gray-900 leading-snug mb-0.5">
            {evt.title}
          </div>
        ) : null}

        <div className="whitespace-pre-wrap break-words text-sm text-gray-900">
          {evt.text}
        </div>

        {/* Reminder badge — appears ABOVE the tag chips so it's the
            first thing the eye lands on after the body text. Past-due
            alerts go red with a ringing-bell icon; upcoming ones go
            amber with a quiet bell. */}
        {evt.reminderAt ? (
          <ReminderBadge iso={evt.reminderAt} />
        ) : null}

        {(entityChips.length > 0 || processChips.length > 0) && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {entityChips.map((e) => (
              <span
                key={`e-${e.id}`}
                className="inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-900"
                title={`ישות: ${e.name}`}
              >
                {e.name}
              </span>
            ))}
            {processChips.map((p) => (
              <span
                key={`p-${p.id}`}
                className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-900"
                title={`תהליך: ${p.title}`}
              >
                {p.title}
              </span>
            ))}
          </div>
        )}

        <div className="text-[10px] text-gray-600 text-end mt-0.5">
          <time dateTime={evt.timestamp}>{formatTime(evt.timestamp)}</time>
        </div>
      </div>
    </div>
  );
}

/* ─── Reminder badge rendered inside an event bubble ─── */

function ReminderBadge({ iso }: { iso: string }) {
  const { label, overdue } = describeReminder(iso);
  const abs = formatReminderAbs(iso);

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 mt-1.5 mb-0.5 rounded-md px-2 py-1",
        overdue
          ? "bg-red-50 border border-red-200 text-red-800"
          : "bg-amber-50 border border-amber-200 text-amber-800",
      )}
      title={abs}
      role="note"
      aria-label={`התראה: ${label} (${abs})`}
    >
      {overdue ? (
        <BellRing className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      ) : (
        <Bell className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      )}
      <span className="text-[11px] font-semibold">{label}</span>
      <span className="text-[10px] opacity-75 truncate">{abs}</span>
    </div>
  );
}
