// Synthetic chats for the public /whatsapp landing.
//
// All three conversations happen on the SAME day (the page's "today",
// frozen here to 2026-05-21) and revolve around one common thread:
// preparing for a hearing the next morning. That way the layered /
// merged view tells a coherent story — incoming notes from the client,
// the intern (Aliza) confirming logistics with an image, and the
// opposing counsel sending a synthetic voice note coordinating times.
//
// None of this is real data — names, phones and content are fabricated.
// The assets (sample-image.jpg, sample-voice.wav) live under
// /public/whatsapp-demo/ and ship as plain static files.

import type {
  WhatsappChatSummary,
  WhatsappMessageDTO,
  WhatsappWorkspaceDTO,
} from "./types";

const MOCK_SELF = "אני";
const SAMPLE_IMAGE_URL = "/whatsapp-demo/sample-image.jpg";
const SAMPLE_VOICE_URL = "/whatsapp-demo/sample-voice.wav";

// Helper to keep timestamps readable. All conversations occur on the
// same calendar day (2026-05-21).
function at(time: string): string {
  return `2026-05-21T${time}:00Z`;
}

// ── Chat A — דנה כהן (לקוחה) — initial outreach in the morning. ──
const CHAT_A: WhatsappMessageDTO[] = [
  {
    id: "a0",
    timestamp: at("06:00"),
    sender: "",
    isSystem: true,
    text: "ההודעות בצ׳אט זה מוצפנות מקצה לקצה",
    media: null,
  },
  {
    id: "a1",
    timestamp: at("08:12"),
    sender: "דנה כהן (לקוחה)",
    isSystem: false,
    text: "בוקר טוב — את הדיון מחר אישרת? יש לי לחץ קל לפני זה.",
    media: null,
  },
  {
    id: "a2",
    timestamp: at("08:18"),
    sender: MOCK_SELF,
    isSystem: false,
    text: "בוקר טוב 🙏 הדיון מחר ב-10:00, חדר ישיבות 3 בקומה 7. עליזה מסדרת איתי את החומר במהלך היום.",
    media: null,
  },
  {
    id: "a3",
    timestamp: at("08:21"),
    sender: "דנה כהן (לקוחה)",
    isSystem: false,
    text: "מצוין. שתעדכן אותי כשתוודאו שהמסמכים מסודרים.",
    media: null,
  },
];

// ── Chat B — עליזה (מתמחה) — sends the image of the meeting note. ──
const CHAT_B: WhatsappMessageDTO[] = [
  {
    id: "b1",
    timestamp: at("09:32"),
    sender: "עליזה — מתמחה",
    isSystem: false,
    text: "כמו שאמרנו — הדבקתי פתק קטן ליד התיק. צילמתי שלא נשכח:",
    media: null,
  },
  {
    id: "b2",
    timestamp: at("09:33"),
    sender: "עליזה — מתמחה",
    isSystem: false,
    text: null,
    media: {
      id: "b2-media",
      filename: "sample-image.jpg",
      mimeType: "image/jpeg",
      size: 18725,
      url: SAMPLE_IMAGE_URL,
    },
  },
  {
    id: "b3",
    timestamp: at("09:41"),
    sender: MOCK_SELF,
    isSystem: false,
    text: "מושלם, תודה. תוודאי שגם דנה רואה את החדר שמסודר על הפתק.",
    media: null,
  },
  {
    id: "b4",
    timestamp: at("09:43"),
    sender: "עליזה — מתמחה",
    isSystem: false,
    text: "על זה — שולחת לה תמונה גם 👍",
    media: null,
  },
];

// ── Chat C — עו"ד שמרון (צד שכנגד) — coordinating with a voice note. ──
const CHAT_C: WhatsappMessageDTO[] = [
  {
    id: "c1",
    timestamp: at("12:05"),
    sender: 'עו"ד שמרון (צד שכנגד)',
    isSystem: false,
    text: "אהלן, שלחתי הצעת פשרה בבוקר. אפשר לקפוץ ל-15 דקות שיחה לפני הדיון מחר?",
    media: null,
  },
  {
    id: "c2",
    timestamp: at("12:38"),
    sender: 'עו"ד שמרון (צד שכנגד)',
    isSystem: false,
    text: null,
    media: {
      id: "c2-media",
      filename: "sample-voice.wav",
      mimeType: "audio/wav",
      size: 185646,
      url: SAMPLE_VOICE_URL,
    },
  },
  {
    id: "c3",
    timestamp: at("13:12"),
    sender: MOCK_SELF,
    isSystem: false,
    text: "קיבלתי את ההקלטה. בוא נתאם מחר ב-09:00, רבע שעה לפני הדיון. אם תרצה — בקופיה מצורף את חברתי דנה.",
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
      contactName: 'עו"ד שמרון (צד שכנגד)',
      messageCount: CHAT_C.length,
      lastAt: CHAT_C[CHAT_C.length - 1].timestamp,
      lastTextPreview: "נתאם מחר ב-09:00 רבע שעה לפני הדיון.",
    },
    messages: CHAT_C,
  },
  {
    summary: {
      id: "mock-b",
      contactName: "עליזה — מתמחה",
      messageCount: CHAT_B.length,
      lastAt: CHAT_B[CHAT_B.length - 1].timestamp,
      lastTextPreview: "על זה — שולחת לה תמונה גם 👍",
    },
    messages: CHAT_B,
  },
  {
    summary: {
      id: "mock-a",
      contactName: "דנה כהן (לקוחה)",
      messageCount: CHAT_A.length,
      lastAt: CHAT_A[CHAT_A.length - 1].timestamp,
      lastTextPreview: "שתעדכן אותי כשתוודאו שהמסמכים מסודרים.",
    },
    messages: CHAT_A,
  },
];

export const MOCK_WORKSPACE: WhatsappWorkspaceDTO = {
  id: "mock",
  title: "תצוגה לדוגמה — הכנה לדיון",
  selfSender: MOCK_SELF,
  chats: MOCK_CHATS.map((c) => c.summary),
};

export function mockMessagesFor(chatId: string): WhatsappMessageDTO[] {
  return MOCK_CHATS.find((c) => c.summary.id === chatId)?.messages ?? [];
}
