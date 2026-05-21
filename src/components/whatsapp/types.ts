// Shared front-end types for the WhatsApp UI components.
//
// These intentionally mirror but don't depend on the Prisma models —
// keeps the components reusable for both the mock landing page (no DB)
// and the real workspace pages.

export interface WhatsappChatSummary {
  id: string;
  contactName: string;
  messageCount: number;
  lastAt: string | null;        // ISO string
  lastTextPreview: string | null;
}

export interface WhatsappMessageDTO {
  id: string;
  timestamp: string;            // ISO string
  sender: string;
  isSystem: boolean;
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
