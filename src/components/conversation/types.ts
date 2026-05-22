// Generic UI types for the conversation view (WhatsApp + Timeline).
//
// These intentionally mirror but don't depend on any Prisma model —
// keeps the components reusable for both the mock landing pages and
// the live (DB-backed) workspaces. Each domain provides an adapter
// (src/lib/conversation/{whatsapp,timeline}-adapter.ts) that maps its
// rows into the shapes below.
//
// Naming convention:
//   - Channel = a single tab in the sidebar (WhatsApp chat OR timeline layer)
//   - Item    = one bubble (WhatsApp message OR timeline event)
//   - Project = the top-level container (workspace OR project)
//
// We keep some of the old WhatsApp-specific names as type aliases at
// the bottom of the file so consuming code doesn't break during the
// refactor. They will be deprecated as references migrate.

export type ItemCategory =
  | "action"
  | "search"
  | "message"
  | "meeting"
  | "note"
  | null;

export interface MediaRef {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  // URL the client should hit to load the bytes. Domain-specific —
  // built by the adapter (e.g. /api/whatsapp/media/<id> or
  // /api/timeline/media/<id>). For mock data this is a data: or
  // /public/ URL.
  url: string;
}

export interface TagRef {
  id: string;
  name: string;
  color: string | null;
}

export interface ChannelSummary {
  id: string;
  // Display name shown in the sidebar. WhatsApp: contact name.
  // Timeline: layer title.
  title: string;
  // Which actor in this channel should render as "me" (outgoing/green).
  // Null until the admin picks one; bubbles fall back to all-incoming.
  selfActor: string | null;
  // For UX hints on the sidebar row.
  itemCount: number;
  lastAt: string | null;       // ISO
  lastPreview: string | null;
}

export interface Item {
  id: string;
  timestamp: string;            // ISO
  isSystem: boolean;
  // True only for admins. Hidden items are filtered out of the
  // server response for guest viewers; admins receive them flagged
  // so the bubble can fade + show the un-hide toggle.
  isHidden: boolean;
  // Free-form free-text body of the item.
  text: string | null;
  media: MediaRef | null;
  // The following fields are domain-extensions: optional so the
  // existing WhatsApp message DTOs remain assignable without changes.
  // Speaker (whatsapp message sender) OR operator (timeline event
  // actor). Empty string for system events. Defaults to the legacy
  // `sender` alias on WhatsappMessageDTO.
  actor?: string;
  // Timeline-only headline (short title rendered above the body).
  // Absent for WhatsApp messages.
  title?: string | null;
  // Timeline event category — drives the bubble accent + icon.
  // Absent for WhatsApp messages.
  category?: ItemCategory;
  // Tags attached to this item, resolved with name+color so the
  // bubble can render chips without a second lookup. Defaults to [].
  tags?: TagRef[];
}

export interface ProjectDTO {
  id: string;
  title: string;
  // Workspace/project-level fallback used by the shell only when an
  // individual channel has no per-channel selfActor configured. The
  // per-channel value (set by the admin) is the real signal.
  selfActor: string;
  channels: ChannelSummary[];
}

// ─── Search state ────────────────────────────────────────────────── //
// Mirrors the URL params: ?q=…&tag=<id>&tag=<id>
// Empty q + empty tags = no filter active.
export interface SearchState {
  q: string;
  tagIds: string[];
}

export const EMPTY_SEARCH: SearchState = { q: "", tagIds: [] };

// ─── Legacy aliases ──────────────────────────────────────────────── //
// Kept temporarily so existing whatsapp page code continues to compile
// while it's migrated to the new names. New code should import the
// generic names above.
export type WhatsappChatSummary = ChannelSummary & {
  // Backwards-compat aliases for the field names the WhatsApp code uses.
  // We project both sets so neither caller breaks. Newer code reads
  // ChannelSummary.title / .selfActor; legacy code reads .contactName /
  // .selfSender. The adapter populates both.
  contactName: string;
  selfSender: string | null;
  messageCount: number;
  lastTextPreview: string | null;
};

export type WhatsappMessageDTO = Item & {
  sender: string;
};

export type WhatsappMediaDTO = MediaRef;

export interface WhatsappWorkspaceDTO {
  id: string;
  title: string;
  selfSender: string;
  chats: WhatsappChatSummary[];
}
