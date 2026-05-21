// Shared front-end types for the WhatsApp UI components.
//
// These intentionally mirror but don't depend on the Prisma models —
// keeps the components reusable for both the mock landing page (no DB)
// and the real workspace pages.

export interface WhatsappChatSummary {
  id: string;
  contactName: string;
  // Which raw sender string in this chat should be treated as "me"
  // (outgoing/green). null when the admin hasn't picked one yet —
  // bubbles fall back to "everyone is incoming" until they do.
  selfSender: string | null;
  messageCount: number;
  lastAt: string | null;        // ISO string
  lastTextPreview: string | null;
}

export interface WhatsappMessageDTO {
  id: string;
  timestamp: string;            // ISO string
  sender: string;
  isSystem: boolean;
  // True only for admins. Hidden messages are filtered out of the
  // server response for guest viewers; admins receive them with this
  // flag so the UI can fade them + offer an unhide toggle.
  isHidden: boolean;
  text: string | null;
  media: WhatsappMediaDTO | null;
}

export interface WhatsappMediaDTO {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  // URL the client should hit to load the actual bytes. For the mock
  // page this is a data: URL; for live workspaces it's
  // /api/whatsapp/media/<id>, which 401s for non-authorized users.
  url: string;
}

export interface WhatsappWorkspaceDTO {
  id: string;
  title: string;
  // Identifies which sender string belongs to "me" — the chat owner.
  // Outgoing bubbles align to the start of the chat pane, incoming to
  // the end. For mock mode we hard-code "Zomer Guy"; for live mode we
  // pass the chat owner email's display name (or fall back).
  selfSender: string;
  chats: WhatsappChatSummary[];
}
