// Synthetic timeline events for the public /timeline landing.
//
// Mirrors mock-data.ts: three "layers" / channels around one common
// thread (a hypothetical investigation, dates 21-22 May 2026). Each
// layer plays the role of a different domain — searches by the police,
// inter-party messages, and a meeting log. Demo only — no real data.

import type {
  WhatsappChatSummary,
  WhatsappMessageDTO,
  WhatsappWorkspaceDTO,
} from "@/components/conversation/types";

const MOCK_SELF = "אני";
const SAMPLE_IMAGE_URL = "/whatsapp-demo/sample-image.jpg";

function at(time: string): string {
  return `2026-05-21T${time}:00Z`;
}

// ── Layer A — חקירת המשטרה ── //
const LAYER_A: WhatsappMessageDTO[] = [
  {
    id: "ta1",
    timestamp: at("07:30"),
    sender: "רס\"ר אבי לוי",
    actor: "רס\"ר אבי לוי",
    category: "action",
    title: "פתיחת חקירה",
    text: "התקבל דו\"ח ראשוני מהמתלוננת. נפתח תיק חקירה.",
    isSystem: false,
    isHidden: false,
    media: null,
  },
  {
    id: "ta2",
    timestamp: at("10:15"),
    sender: "רס\"ר אבי לוי",
    actor: "רס\"ר אבי לוי",
    category: "search",
    title: "חיפוש בדירה",
    text: "חיפוש בכתובת רחוב פלוני 5 בשעה 10:15. נמצאו מסמכים רלוונטיים.",
    isSystem: false,
    isHidden: false,
    media: null,
  },
];

// ── Layer B — תכתובות בין הצדדים (מתוך הטלפון של הנילון) ── //
const LAYER_B: WhatsappMessageDTO[] = [
  {
    id: "tb1",
    timestamp: at("08:42"),
    sender: "מתלוננת",
    actor: "מתלוננת",
    category: "message",
    text: "אני הולכת למשטרה היום בבוקר.",
    isSystem: false,
    isHidden: false,
    media: null,
  },
  {
    id: "tb2",
    timestamp: at("08:50"),
    sender: "נחקר",
    actor: "נחקר",
    category: "message",
    text: "אני לא מבין מה את רוצה ממני. נדבר אחר כך.",
    isSystem: false,
    isHidden: false,
    media: null,
  },
  {
    id: "tb3",
    timestamp: at("11:20"),
    sender: "מתלוננת",
    actor: "מתלוננת",
    category: "message",
    text: null,
    media: {
      id: "tb3-media",
      filename: "screen-2026-05-21.jpg",
      mimeType: "image/jpeg",
      size: 18725,
      url: SAMPLE_IMAGE_URL,
    },
    isSystem: false,
    isHidden: false,
  },
];

// ── Layer C — יומן ייצוג ── //
const LAYER_C: WhatsappMessageDTO[] = [
  {
    id: "tc1",
    timestamp: at("12:00"),
    sender: MOCK_SELF,
    actor: MOCK_SELF,
    category: "meeting",
    title: "פגישת ייעוץ ראשונית",
    text: "פגישה עם הנחקר בלשכה. סקירת התיק וגיבוש קו הגנה.",
    isSystem: false,
    isHidden: false,
    media: null,
  },
  {
    id: "tc2",
    timestamp: at("14:30"),
    sender: MOCK_SELF,
    actor: MOCK_SELF,
    category: "note",
    title: "הערה פנימית",
    text: "ייתכן שצריך לבקש הסדר מותנה — תלוי בעמדת התביעה לאחר השלמת החקירה.",
    isSystem: false,
    isHidden: false,
    media: null,
  },
];

export const MOCK_TIMELINE_LAYERS: Array<{
  summary: WhatsappChatSummary;
  messages: WhatsappMessageDTO[];
}> = [
  {
    summary: {
      id: "tl-a",
      contactName: "חקירת המשטרה",
      selfSender: null,
      messageCount: LAYER_A.length,
      lastAt: LAYER_A[LAYER_A.length - 1].timestamp,
      lastTextPreview: "חיפוש בדירה — 10:15",
    },
    messages: LAYER_A,
  },
  {
    summary: {
      id: "tl-b",
      contactName: "תכתובות בין הצדדים",
      selfSender: null,
      messageCount: LAYER_B.length,
      lastAt: LAYER_B[LAYER_B.length - 1].timestamp,
      lastTextPreview: "צילום מסך",
    },
    messages: LAYER_B,
  },
  {
    summary: {
      id: "tl-c",
      contactName: "יומן ייצוג",
      selfSender: MOCK_SELF,
      messageCount: LAYER_C.length,
      lastAt: LAYER_C[LAYER_C.length - 1].timestamp,
      lastTextPreview: "הערה פנימית — הסדר מותנה",
    },
    messages: LAYER_C,
  },
];

export const MOCK_TIMELINE_WORKSPACE: WhatsappWorkspaceDTO = {
  id: "mock-timeline",
  title: "תצוגה לדוגמה — ציר זמן של תיק חקירה",
  selfSender: MOCK_SELF,
  chats: MOCK_TIMELINE_LAYERS.map((c) => c.summary),
};

export function mockTimelineEventsFor(layerId: string): WhatsappMessageDTO[] {
  return (
    MOCK_TIMELINE_LAYERS.find((l) => l.summary.id === layerId)?.messages ?? []
  );
}
