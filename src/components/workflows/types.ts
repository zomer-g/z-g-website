// Demo-only types for the workflows interface.
// The data model is intentionally simple — every event carries an
// arbitrary set of entity tags + process tags. The sidebar lets the user
// pivot the same event stream by either dimension.

export type EntityType = "client" | "police" | "prosecution";
export type ProcessKind = "discovery" | "evidence" | "settlement";

export interface WorkflowEntity {
  id: string;
  type: EntityType;
  name: string;
  // Optional one-liner shown under the name in the sidebar row.
  subtitle?: string;
}

export interface WorkflowProcess {
  id: string;
  kind: ProcessKind;
  title: string;
  // Optional one-liner shown under the title in the sidebar row.
  subtitle?: string;
}

export interface WorkflowEvent {
  id: string;
  // ISO timestamp. Used for chronological sorting + the day-separator
  // logic, matching the WhatsApp shell behaviour.
  timestamp: string;
  // The free-text body of the event.
  text: string;
  // Display name of who created the event (e.g. "עו"ד גיא זומר",
  // "תחנת ירושלים").
  creator: string;
  // Tag dimensions. An event can belong to any number of entities and
  // processes — the sidebar pivots the same event stream by either.
  entityIds: string[];
  processIds: string[];
  // Optional one-line title shown above the body, for "structured"
  // events like protocol entries or formal letters.
  title?: string | null;
  // Marks user-created events from the compose bar. Used only for the
  // small "נוסף בסשן זה" badge — everything else is identical.
  isSessionLocal?: boolean;
}
