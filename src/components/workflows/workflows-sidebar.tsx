"use client";

// Sidebar for the workflows interface. Visually mirrors the WhatsApp
// channel sidebar (header + search + scrollable list), but has a tab
// switcher at the top: "ישויות" vs "תהליכים". The same event stream is
// pivotable by either dimension.

import { Search, Users, Workflow, Briefcase, Building2, Scale } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type {
  WorkflowEntity,
  WorkflowProcess,
  EntityType,
  ProcessKind,
} from "./types";

export type SidebarTab = "entities" | "processes";

interface WorkflowsSidebarProps {
  title: string;
  tab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  entities: WorkflowEntity[];
  processes: WorkflowProcess[];
  // The currently selected row, regardless of tab. Stored as a string
  // because entities + processes share the same id namespace from the
  // shell's POV.
  activeId: string | null;
  onSelect: (kind: "entity" | "process", id: string) => void;
  // Counts → small badge on each row.
  entityEventCount: (entityId: string) => number;
  processEventCount: (processId: string) => number;
}

/* ─── Small icon resolvers for the avatar circle ─── */

function EntityIcon({ type, className }: { type: EntityType; className?: string }) {
  if (type === "client") return <Users className={className} aria-hidden="true" />;
  if (type === "police") return <Building2 className={className} aria-hidden="true" />;
  return <Scale className={className} aria-hidden="true" />;
}

function ProcessIcon({ kind, className }: { kind: ProcessKind; className?: string }) {
  if (kind === "discovery") return <Briefcase className={className} aria-hidden="true" />;
  if (kind === "evidence") return <Scale className={className} aria-hidden="true" />;
  return <Workflow className={className} aria-hidden="true" />;
}

// Stable per-entity-type / per-process-kind color so rows are visually
// distinguishable without relying on icons alone.
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

export function WorkflowsSidebar({
  title,
  tab,
  onTabChange,
  entities,
  processes,
  activeId,
  onSelect,
  entityEventCount,
  processEventCount,
}: WorkflowsSidebarProps) {
  const [filter, setFilter] = useState("");

  const filteredEntities = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return entities;
    return entities.filter((e) =>
      (e.name + " " + (e.subtitle ?? "")).toLowerCase().includes(q),
    );
  }, [entities, filter]);

  const filteredProcesses = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return processes;
    return processes.filter((p) =>
      (p.title + " " + (p.subtitle ?? "")).toLowerCase().includes(q),
    );
  }, [processes, filter]);

  return (
    <aside
      className={cn(
        "flex flex-col bg-white border-s border-black/5 shrink-0",
        "lg:w-[360px] lg:min-w-[320px]",
        "w-full lg:max-w-[360px]",
      )}
    >
      {/* Tab switcher acts as the sidebar's top strip — same height
          as the chat pane header (h-14) so the two top bars line up
          visually. The page-level h1 already states what this widget
          is, so we don't need a separate redundant title bar here. */}
      <div
        role="tablist"
        aria-label="בחירת סוג רשימה"
        title={title}
        className="flex items-stretch h-14 border-b border-black/5 bg-[#f0f2f5] shrink-0"
      >
        <TabButton
          active={tab === "entities"}
          onClick={() => onTabChange("entities")}
          label="ישויות"
          count={entities.length}
          controlsId="workflows-list-entities"
        />
        <TabButton
          active={tab === "processes"}
          onClick={() => onTabChange("processes")}
          label="תהליכים"
          count={processes.length}
          controlsId="workflows-list-processes"
        />
      </div>

      <div className="px-3 py-2 bg-white border-b border-black/5 shrink-0">
        <label className="relative block">
          <span className="sr-only">
            סינון {tab === "entities" ? "ישויות" : "תהליכים"} לפי שם
          </span>
          <Search
            className="absolute top-1/2 -translate-y-1/2 start-2 h-4 w-4 text-gray-500"
            aria-hidden="true"
          />
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={tab === "entities" ? "סינון לפי שם ישות" : "סינון לפי שם תהליך"}
            aria-label={tab === "entities" ? "סינון ישויות לפי שם" : "סינון תהליכים לפי שם"}
            className={cn(
              "w-full rounded-full bg-[#f0f2f5] border border-transparent ps-8 pe-3 py-1.5",
              "text-sm text-gray-900 placeholder:text-gray-600",
              "focus:outline-none focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-200",
            )}
          />
        </label>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === "entities" ? (
          <List
            id="workflows-list-entities"
            ariaLabel="רשימת ישויות"
            empty={
              entities.length === 0
                ? "אין ישויות עדיין."
                : "לא נמצאו תוצאות."
            }
            items={filteredEntities.map((e) => ({
              id: e.id,
              kind: "entity" as const,
              avatar: (
                <EntityIcon type={e.type} className="h-5 w-5 text-white" />
              ),
              avatarBg: entityAvatarBg(e.type),
              title: e.name,
              subtitle: e.subtitle,
              count: entityEventCount(e.id),
            }))}
            activeId={activeId}
            onSelect={onSelect}
          />
        ) : (
          <List
            id="workflows-list-processes"
            ariaLabel="רשימת תהליכים"
            empty={
              processes.length === 0
                ? "אין תהליכים עדיין."
                : "לא נמצאו תוצאות."
            }
            items={filteredProcesses.map((p) => ({
              id: p.id,
              kind: "process" as const,
              avatar: (
                <ProcessIcon kind={p.kind} className="h-5 w-5 text-white" />
              ),
              avatarBg: processAvatarBg(p.kind),
              title: p.title,
              subtitle: p.subtitle,
              count: processEventCount(p.id),
            }))}
            activeId={activeId}
            onSelect={onSelect}
          />
        )}
      </div>
    </aside>
  );
}

/* ─── Internal — tab button ─── */

function TabButton({
  active,
  onClick,
  label,
  count,
  controlsId,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  controlsId: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls={controlsId}
      tabIndex={active ? 0 : -1}
      onClick={onClick}
      className={cn(
        "flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-semibold",
        "transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600",
        active
          ? "text-emerald-800 border-b-2 border-emerald-600 bg-emerald-50/50"
          : "text-gray-700 border-b-2 border-transparent hover:bg-gray-50",
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none",
          active ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-700",
        )}
        aria-label={`${count} פריטים`}
      >
        {count}
      </span>
    </button>
  );
}

/* ─── Internal — list of rows ─── */

interface RowData {
  id: string;
  kind: "entity" | "process";
  avatar: React.ReactNode;
  avatarBg: string;
  title: string;
  subtitle?: string;
  count: number;
}

function List({
  id,
  ariaLabel,
  empty,
  items,
  activeId,
  onSelect,
}: {
  id: string;
  ariaLabel: string;
  empty: string;
  items: RowData[];
  activeId: string | null;
  onSelect: (kind: "entity" | "process", id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div
        id={id}
        role="tabpanel"
        className="px-4 py-10 text-center text-sm text-gray-700"
      >
        {empty}
      </div>
    );
  }
  return (
    <ul
      id={id}
      role="listbox"
      aria-label={ariaLabel}
      className="divide-y divide-black/5"
    >
      {items.map((it) => {
        const isActive = it.id === activeId;
        return (
          <li key={it.id} role="presentation">
            <button
              type="button"
              role="option"
              aria-selected={isActive}
              aria-current={isActive ? "true" : undefined}
              onClick={() => onSelect(it.kind, it.id)}
              className={cn(
                "w-full flex items-start gap-3 px-3 py-3 text-start hover:bg-black/[0.04] transition-colors",
                "focus:outline-none focus-visible:bg-emerald-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600",
                isActive &&
                  "bg-emerald-50 border-s-4 border-emerald-600 ps-2",
              )}
            >
              <div
                className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white text-sm font-semibold",
                  it.avatarBg,
                )}
                aria-hidden="true"
              >
                {it.avatar}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-gray-900">
                    {it.title}
                  </span>
                  <span
                    className="shrink-0 text-[11px] font-semibold rounded-full bg-gray-100 text-gray-700 px-1.5 py-0.5"
                    aria-label={`${it.count} אירועים`}
                  >
                    {it.count}
                  </span>
                </div>
                {it.subtitle ? (
                  <div className="mt-0.5 text-xs text-gray-700 line-clamp-1">
                    {it.subtitle}
                  </div>
                ) : null}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
