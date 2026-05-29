"use client";

// Top-level workflows shell. Visually mirrors the WhatsappShell:
// fixed-width sidebar on the start side, scrolling event pane on the
// end side, with proper RTL behaviour and the same empty-strip-free
// layout. Differences from WhatsappShell:
//
//   - The sidebar has TWO tabs (entities / processes), so the same
//     event stream can be pivoted by either dimension.
//   - There's a compose bar at the bottom of the event pane so the user
//     can add events. These are session-only — nothing is persisted.
//   - No live API; no admin features; no merged-view picker.

import { useCallback, useMemo, useState } from "react";
import { WorkflowsSidebar, type SidebarTab } from "./workflows-sidebar";
import { EventPane } from "./event-pane";
import { ComposeBar } from "./compose-bar";
import {
  MOCK_ENTITIES,
  MOCK_PROCESSES,
  SEED_EVENTS,
  SELF_NAME,
} from "./workflows-mock-data";
import type {
  WorkflowEntity,
  WorkflowEvent,
  WorkflowProcess,
} from "./types";

interface WorkflowsShellProps {
  title: string;
}

export function WorkflowsShell({ title }: WorkflowsShellProps) {
  /* ── Session-only event store. Initial value seeded from mock data;
        new events appended via the compose bar live only in component
        state, so they disappear on refresh exactly per spec. ── */
  const [events, setEvents] = useState<WorkflowEvent[]>(SEED_EVENTS);

  const [tab, setTab] = useState<SidebarTab>("entities");
  // active selection — namespaced by kind because entity ids and process
  // ids share an id space from the shell's point of view.
  const [active, setActive] = useState<
    | { kind: "entity"; id: string }
    | { kind: "process"; id: string }
    | null
  >(null);

  /* ── Resolve maps for fast lookup ── */
  const entityById = useMemo(
    () => new Map(MOCK_ENTITIES.map((e) => [e.id, e])),
    [],
  );
  const processById = useMemo(
    () => new Map(MOCK_PROCESSES.map((p) => [p.id, p])),
    [],
  );

  /* ── Counts shown as badges on each sidebar row ── */
  const entityEventCount = useCallback(
    (entityId: string): number =>
      events.reduce((n, e) => n + (e.entityIds.includes(entityId) ? 1 : 0), 0),
    [events],
  );
  const processEventCount = useCallback(
    (processId: string): number =>
      events.reduce(
        (n, e) => n + (e.processIds.includes(processId) ? 1 : 0),
        0,
      ),
    [events],
  );

  /* ── Events for the currently active context ── */
  const activeEvents = useMemo<WorkflowEvent[]>(() => {
    if (!active) return [];
    const filtered = events.filter((e) =>
      active.kind === "entity"
        ? e.entityIds.includes(active.id)
        : e.processIds.includes(active.id),
    );
    return [...filtered].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
  }, [events, active]);

  const activeContext = useMemo<
    | { kind: "entity"; entity: WorkflowEntity }
    | { kind: "process"; process: WorkflowProcess }
    | null
  >(() => {
    if (!active) return null;
    if (active.kind === "entity") {
      const entity = entityById.get(active.id);
      return entity ? { kind: "entity", entity } : null;
    }
    const process = processById.get(active.id);
    return process ? { kind: "process", process } : null;
  }, [active, entityById, processById]);

  const handleSelect = useCallback(
    (kind: "entity" | "process", id: string) => setActive({ kind, id }),
    [],
  );

  const handleAddEvent = useCallback(
    (input: {
      text: string;
      entityIds: string[];
      processIds: string[];
      reminderAt?: string;
    }) => {
      // Always tag the active context, so the new event will show up
      // under the lane the user is currently viewing — even if they
      // forgot to pick it explicitly in the compose bar.
      const entityIds = new Set(input.entityIds);
      const processIds = new Set(input.processIds);
      if (active) {
        if (active.kind === "entity") entityIds.add(active.id);
        else processIds.add(active.id);
      }
      const evt: WorkflowEvent = {
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
        text: input.text,
        creator: SELF_NAME,
        entityIds: [...entityIds],
        processIds: [...processIds],
        isSessionLocal: true,
        reminderAt: input.reminderAt,
      };
      setEvents((prev) => [...prev, evt]);
    },
    [active],
  );

  /* ── Right pane is "open" whenever we have a selected context. The
        sidebar wrapper hugs its intrinsic 360px on desktop so there's
        no empty strip between the panes. Same fix as the WhatsApp/
        Timeline shell. ── */
  const rightPaneOpen = !!active;

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-[#dadbd3]">
      <div className="flex flex-1 min-h-0">
        <div
          className={
            "flex min-h-0 lg:shrink-0 " +
            (rightPaneOpen
              ? "hidden lg:flex"
              : "flex flex-1 lg:flex-none")
          }
        >
          <WorkflowsSidebar
            title={title}
            tab={tab}
            onTabChange={(t) => {
              setTab(t);
              // Drop the current selection when switching dimensions —
              // a process selection makes no sense while looking at the
              // entities list and vice versa.
              setActive(null);
            }}
            entities={MOCK_ENTITIES}
            processes={MOCK_PROCESSES}
            activeId={active?.id ?? null}
            onSelect={handleSelect}
            entityEventCount={entityEventCount}
            processEventCount={processEventCount}
          />
        </div>

        <div
          className={
            "flex flex-1 min-h-0 min-w-0 flex-col " +
            (rightPaneOpen ? "flex" : "hidden lg:flex")
          }
        >
          <EventPane
            context={activeContext}
            events={activeEvents}
            selfName={SELF_NAME}
            onBack={() => setActive(null)}
            entityById={entityById}
            processById={processById}
          />
          {/* Compose only when a context is open — adding an untagged
              event would be meaningless. The compose `key` resets local
              state when the active context changes. */}
          {active ? (
            <ComposeBar
              key={`${active.kind}-${active.id}`}
              entities={MOCK_ENTITIES}
              processes={MOCK_PROCESSES}
              defaultEntityIds={
                active.kind === "entity" ? [active.id] : []
              }
              defaultProcessIds={
                active.kind === "process" ? [active.id] : []
              }
              onSubmit={handleAddEvent}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
