"use client";

// Compose bar shown at the bottom of the event pane. Lets the user add
// a new event to the current session:
//   - free-text body
//   - multi-select chip for entities  (people / police / prosecution)
//   - multi-select chip for processes (discovery / evidence / settlement)
//   - submit button
//
// Sends a callback up to the shell. The shell stores the resulting event
// in component state — so it's gone on refresh, exactly per spec.

import { useRef, useState } from "react";
import { Send, X, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowEntity, WorkflowProcess } from "./types";

interface ComposeBarProps {
  entities: WorkflowEntity[];
  processes: WorkflowProcess[];
  // Pre-filled when the user has a context open — e.g. if they're
  // viewing an entity, that entity is auto-tagged on the new event.
  defaultEntityIds?: string[];
  defaultProcessIds?: string[];
  onSubmit: (input: {
    text: string;
    entityIds: string[];
    processIds: string[];
  }) => void;
}

export function ComposeBar({
  entities,
  processes,
  defaultEntityIds = [],
  defaultProcessIds = [],
  onSubmit,
}: ComposeBarProps) {
  const [text, setText] = useState("");
  const [entityIds, setEntityIds] = useState<string[]>(defaultEntityIds);
  const [processIds, setProcessIds] = useState<string[]>(defaultProcessIds);
  const [openPicker, setOpenPicker] = useState<null | "entity" | "process">(
    null,
  );
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Sync defaults when the user switches the active context. We only
  // adopt defaults the user hasn't actively edited away from — but for
  // the demo, the simple behaviour is "overwrite when defaults change".
  // We keep manually-added extra tags on top.
  // To keep things uncomplicated we reset to defaults only when the
  // *defaults* themselves change (controlled by dep array).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const defaultsKey = defaultEntityIds.join(",") + "|" + defaultProcessIds.join(",");
  // We can't useEffect here because we'd retrigger on every parent re-render;
  // instead, use a uncontrolled-style reset via a key prop on this component
  // from the parent (parent passes a `key={activeId}` so we get a fresh
  // instance per context). See workflows-shell.tsx.

  // Trick to silence the unused-var lint without doing anything at runtime.
  void defaultsKey;

  const canSubmit = text.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      text: text.trim(),
      entityIds: [...entityIds],
      processIds: [...processIds],
    });
    setText("");
    // Keep tag selections — the user usually wants to log several events
    // against the same context.
    taRef.current?.focus();
  };

  const toggle = (kind: "entity" | "process", id: string) => {
    if (kind === "entity") {
      setEntityIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      );
    } else {
      setProcessIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      );
    }
  };

  return (
    <div
      className="border-t border-black/10 bg-[#f0f2f5] px-3 py-2 shrink-0"
      role="region"
      aria-label="הוספת אירוע חדש"
    >
      {/* Selected-tags row */}
      {(entityIds.length > 0 || processIds.length > 0) && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {entityIds.map((id) => {
            const e = entities.find((x) => x.id === id);
            if (!e) return null;
            return (
              <TagChip
                key={`e-${id}`}
                label={e.name}
                kind="entity"
                onRemove={() => toggle("entity", id)}
              />
            );
          })}
          {processIds.map((id) => {
            const p = processes.find((x) => x.id === id);
            if (!p) return null;
            return (
              <TagChip
                key={`p-${id}`}
                label={p.title}
                kind="process"
                onRemove={() => toggle("process", id)}
              />
            );
          })}
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="relative flex-1">
          <label className="sr-only" htmlFor="workflows-compose-text">
            תוכן האירוע החדש
          </label>
          <textarea
            id="workflows-compose-text"
            ref={taRef}
            rows={1}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              // Auto-grow up to a sensible max.
              const ta = e.target as HTMLTextAreaElement;
              ta.style.height = "auto";
              ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
            }}
            onKeyDown={(e) => {
              // Ctrl/Cmd+Enter submits; plain Enter inserts newline.
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="הקלידו אירוע חדש… (Ctrl/⌘+Enter לשליחה)"
            className={cn(
              "w-full resize-none rounded-2xl bg-white border border-gray-300 px-3 py-2",
              "text-sm text-gray-900 placeholder:text-gray-600 leading-relaxed",
              "focus:outline-none focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-200",
            )}
          />
        </div>

        <div className="flex items-center gap-1">
          <PickerButton
            label="ישות"
            color="emerald"
            count={entityIds.length}
            open={openPicker === "entity"}
            onToggle={() =>
              setOpenPicker((cur) => (cur === "entity" ? null : "entity"))
            }
          >
            <PickerList
              items={entities.map((e) => ({
                id: e.id,
                label: e.name,
                subtitle: e.subtitle,
                active: entityIds.includes(e.id),
              }))}
              onToggle={(id) => toggle("entity", id)}
              onClose={() => setOpenPicker(null)}
              ariaLabel="בחירת ישויות לתיוג"
            />
          </PickerButton>

          <PickerButton
            label="תהליך"
            color="amber"
            count={processIds.length}
            open={openPicker === "process"}
            onToggle={() =>
              setOpenPicker((cur) => (cur === "process" ? null : "process"))
            }
          >
            <PickerList
              items={processes.map((p) => ({
                id: p.id,
                label: p.title,
                subtitle: p.subtitle,
                active: processIds.includes(p.id),
              }))}
              onToggle={(id) => toggle("process", id)}
              onClose={() => setOpenPicker(null)}
              ariaLabel="בחירת תהליכים לתיוג"
            />
          </PickerButton>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            aria-label="שליחת האירוע"
            title="שליחה (Ctrl/⌘+Enter)"
            className={cn(
              "inline-flex h-10 w-10 items-center justify-center rounded-full",
              "transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-1",
              canSubmit
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-gray-300 text-gray-500 cursor-not-allowed",
            )}
          >
            <Send className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <p className="mt-1.5 text-[11px] text-gray-600 leading-snug">
        אירועים שתוסיפו כאן נשמרים רק לסשן הנוכחי בדפדפן ויימחקו ברענון.
      </p>
    </div>
  );
}

/* ─── Internal ─── */

function TagChip({
  label,
  kind,
  onRemove,
}: {
  label: string;
  kind: "entity" | "process";
  onRemove: () => void;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
        kind === "entity"
          ? "border-emerald-300 bg-emerald-50 text-emerald-900"
          : "border-amber-300 bg-amber-50 text-amber-900",
      )}
    >
      <span className="max-w-[12rem] truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`הסרת התיוג: ${label}`}
        className="rounded-full hover:bg-black/5 p-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
      >
        <X className="h-3 w-3" aria-hidden="true" />
      </button>
    </span>
  );
}

function PickerButton({
  label,
  color,
  count,
  open,
  onToggle,
  children,
}: {
  label: string;
  color: "emerald" | "amber";
  count: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={`תיוג ${label}`}
        className={cn(
          "inline-flex h-10 items-center gap-1 rounded-full border px-2.5 text-xs font-semibold transition-colors",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
          color === "emerald"
            ? "border-emerald-400 bg-white text-emerald-800 hover:bg-emerald-50 focus-visible:ring-emerald-600"
            : "border-amber-400 bg-white text-amber-800 hover:bg-amber-50 focus-visible:ring-amber-600",
        )}
      >
        <Tag className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{label}</span>
        {count > 0 ? (
          <span
            className={cn(
              "rounded-full text-[10px] leading-none px-1.5 py-0.5 text-white",
              color === "emerald" ? "bg-emerald-600" : "bg-amber-600",
            )}
          >
            {count}
          </span>
        ) : null}
      </button>
      {open ? children : null}
    </div>
  );
}

function PickerList({
  items,
  onToggle,
  onClose,
  ariaLabel,
}: {
  items: { id: string; label: string; subtitle?: string; active: boolean }[];
  onToggle: (id: string) => void;
  onClose: () => void;
  ariaLabel: string;
}) {
  // Click-outside via the parent state. We do at least dismiss on Esc here.
  return (
    <div
      role="dialog"
      aria-label={ariaLabel}
      className={cn(
        // Popover floats above the compose bar; the bar lives at the
        // bottom so we anchor the popover UP.
        "absolute bottom-full mb-2 end-0 z-50 w-72 max-w-[80vw]",
        "rounded-lg border border-gray-200 bg-white shadow-lg p-2",
      )}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="flex items-center justify-between px-2 py-1">
        <div className="text-xs font-semibold text-gray-800">{ariaLabel}</div>
        <button
          type="button"
          onClick={onClose}
          aria-label="סגירה"
          className="rounded-full p-1 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
      <ul className="max-h-64 overflow-y-auto">
        {items.map((it) => (
          <li key={it.id}>
            <button
              type="button"
              role="option"
              aria-selected={it.active}
              onClick={() => onToggle(it.id)}
              className={cn(
                "w-full flex items-start justify-between gap-2 rounded-md px-2 py-1.5 text-start",
                "hover:bg-gray-50 transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600",
                it.active && "bg-emerald-50",
              )}
            >
              <div className="min-w-0">
                <div className="text-sm text-gray-900 truncate">{it.label}</div>
                {it.subtitle ? (
                  <div className="text-[11px] text-gray-600 truncate">
                    {it.subtitle}
                  </div>
                ) : null}
              </div>
              <input
                type="checkbox"
                checked={it.active}
                readOnly
                tabIndex={-1}
                aria-hidden="true"
                className="mt-1 accent-emerald-600 pointer-events-none"
              />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
