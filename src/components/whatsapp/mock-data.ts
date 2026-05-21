// Synthetic chats for the public /whatsapp landing.
//
// Strictly demo content — three short, made-up conversations in Hebrew
// designed to show off the UI (incoming + outgoing bubbles, media,
// emojis, system notice, time stamps). None of this represents a real
// person, real chat, or real upload.

import type {
  WhatsappChatSummary,
  WhatsappMessageDTO,
  WhatsappWorkspaceDTO,
} from "./types";

const MOCK_SELF = "אני";

// Inline SVG → data: URL. Avoids shipping a binary asset.
function svgDataUrl(svg: string): string {
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

const SAMPLE_DOC_SVG = svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200">
  <rect width="320" height="200" rx="12" fill="#e7f3ff"/>
  <rect x="40" y="40" width="240" height="120" rx="8" fill="#fff" stroke="#0ea5e9" stroke-width="2"/>
  <text x="160" y="105" text-anchor="middle" font-family="sans-serif" font-size="18" fill="#0c4a6e" font-weight="700">דוגמה — לא תיק אמיתי</text>
  <text x="160" y="130" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#475569">תצוגה מקדימה של ממשק ווטסאפ</text>
</svg>`);

const CHAT_A: WhatsappMessageDTO[] = [
  {
    id: "a0",
    timestamp: "2026-05-12T08:00:00Z",
    sender: "",
    isSystem: true,
    text: "ההודעות בצ׳אט זה מוצפנות מקצה לקצה",
    media: null,
  },
  {
    id: "a1",
    timestamp: "2026-05-12T08:32:00Z",
    sender: "דנה כהן (לקוחה)",
    isSystem: false,
    text: "בוקר טוב, אפשר לקבוע פגישת ייעוץ ראשונית השבוע?",
    media: null,
  },
  {
    id: "a2",
    timestamp: "2026-05-12T08:45:00Z",
    sender: MOCK_SELF,
    isSystem: false,
    text: "בוקר טוב. מתאים לך מחר ב-11:00?",
    media: null,
  },
  {
    id: "a3",
    timestamp: "2026-05-12T08:46:00Z",
    sender: "דנה כהן (לקוחה)",
    isSystem: false,
    text: "מצוין, נתראה 🙏",
    media: null,
  },
];

const CHAT_B: WhatsappMessageDTO[] = [
  {
    id: "b1",
    timestamp: "2026-05-15T13:10:00Z",
    sender: "נועם — לקוח",
    isSystem: false,
    text: "שלחתי את ייפוי הכוח, אפשר לאשר שהתקבל?",
    media: null,
  },
  {
    id: "b2",
    timestamp: "2026-05-15T13:11:00Z",
    sender: "נועם — לקוח",
    isSystem: false,
    text: null,
    media: {
      id: "b2-media",
      filename: "ייפוי-כוח.pdf",
      mimeType: "application/pdf",
      size: 184_320,
      url: SAMPLE_DOC_SVG, // won't actually render as PDF; the bubble shows the tile UI
    },
  },
  {
    id: "b3",
    timestamp: "2026-05-15T13:20:00Z",
    sender: MOCK_SELF,
    isSystem: false,
    text: "התקבל ✅ ממשיכים.",
    media: null,
  },
];

const CHAT_C: WhatsappMessageDTO[] = [
  {
    id: "c1",
    timestamp: "2026-05-17T09:00:00Z",
    sender: "טליה — מתמחה",
    isSystem: false,
    text: "צירפתי דוגמה של נספח להצעת הסדר.",
    media: null,
  },
  {
    id: "c2",
    timestamp: "2026-05-17T09:02:00Z",
    sender: "טליה — מתמחה",
    isSystem: false,
    text: null,
    media: {
      id: "c2-media",
      filename: "preview.png",
      mimeType: "image/svg+xml",
      size: 11_240,
      url: SAMPLE_DOC_SVG,
    },
  },
  {
    id: "c3",
    timestamp: "2026-05-17T09:18:00Z",
    sender: MOCK_SELF,
    isSystem: false,
    text: "מעולה — נדבר בצוהריים.",
    media: null,
  },
];

export const MOCK_CHATS: Array<{
  summary: WhatsappChatSummary;
  messages: WhatsappMessageDTO[];
}> = [
  {
    summary: {
      id: "mock-c",
      contactName: "טליה — מתמחה",
      messageCount: CHAT_C.length,
      lastAt: CHAT_C[CHAT_C.length - 1].timestamp,
      lastTextPreview: "מעולה — נדבר בצוהריים.",
    },
    messages: CHAT_C,
  },
  {
    summary: {
      id: "mock-b",
      contactName: "נועם — לקוח",
      messageCount: CHAT_B.length,
      lastAt: CHAT_B[CHAT_B.length - 1].timestamp,
      lastTextPreview: "התקבל ✅ ממשיכים.",
    },
    messages: CHAT_B,
  },
  {
    summary: {
      id: "mock-a",
      contactName: "דנה כהן (לקוחה)",
      messageCount: CHAT_A.length,
      lastAt: CHAT_A[CHAT_A.length - 1].timestamp,
      lastTextPreview: "מצוין, נתראה 🙏",
    },
    messages: CHAT_A,
  },
];

export const MOCK_WORKSPACE: WhatsappWorkspaceDTO = {
  id: "mock",
  title: "תצוגה לדוגמה",
  selfSender: MOCK_SELF,
  chats: MOCK_CHATS.map((c) => c.summary),
};

export function mockMessagesFor(chatId: string): WhatsappMessageDTO[] {
  return MOCK_CHATS.find((c) => c.summary.id === chatId)?.messages ?? [];
}
