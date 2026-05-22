// Synthetic timeline events for the public /timeline landing.
//
// Three "layers" (channels) sharing a single fabricated investigation
// case across May 2026. Many events spread over a few days so the demo
// shows what a populated timeline looks like — and most events carry
// one or two tags so the SearchBar's tag-filter chips give a real
// signal when the user toggles them.

import type {
  WhatsappChatSummary,
  WhatsappMessageDTO,
  WhatsappWorkspaceDTO,
  TagRef,
} from "@/components/conversation/types";

const MOCK_SELF = "אני";
const SAMPLE_IMAGE_URL = "/whatsapp-demo/sample-image.jpg";

// ── Tag pool — one canonical list referenced by mock events. ── //
const T_RAYAH: TagRef = { id: "t-rayah", name: "ראיה", color: null };
const T_HASHAD: TagRef = { id: "t-hashad", name: "חשד", color: null };
const T_LAKOACH: TagRef = { id: "t-lakoach", name: "לקוח", color: null };
const T_TZAD_SHELI: TagRef = { id: "t-tzad-sheli", name: "צד שלי", color: null };
const T_TZAD_SHEKENGED: TagRef = {
  id: "t-tzad-shekenged",
  name: "צד שכנגד",
  color: null,
};
const T_MISMACH: TagRef = { id: "t-mismach", name: "מסמך רשמי", color: null };
const T_SHIFRA: TagRef = { id: "t-shifra", name: "שיחה", color: null };
const T_PAGISH: TagRef = { id: "t-pagish", name: "פגישה", color: null };
const T_ZIKARON: TagRef = { id: "t-zikaron", name: "נקודת זמן מרכזית", color: null };

export const MOCK_TIMELINE_TAGS: TagRef[] = [
  T_ZIKARON,
  T_RAYAH,
  T_HASHAD,
  T_LAKOACH,
  T_TZAD_SHELI,
  T_TZAD_SHEKENGED,
  T_MISMACH,
  T_SHIFRA,
  T_PAGISH,
];

function ev(
  id: string,
  date: string,        // ISO date+time
  actor: string,
  category: WhatsappMessageDTO["category"],
  body: { title?: string; text?: string; media?: WhatsappMessageDTO["media"] },
  tags: TagRef[] = [],
): WhatsappMessageDTO {
  return {
    id,
    timestamp: date,
    sender: actor,
    actor,
    category,
    title: body.title ?? null,
    text: body.text ?? null,
    isSystem: false,
    isHidden: false,
    media: body.media ?? null,
    tags,
  };
}

// ── Layer A — חקירת המשטרה ── //
const LAYER_A: WhatsappMessageDTO[] = [
  ev(
    "ta01",
    "2026-05-12T07:30:00Z",
    'רס"ר אבי לוי',
    "action",
    {
      title: "פתיחת תיק חקירה",
      text: "התקבל דו\"ח ראשוני מהמתלוננת. נפתח תיק חקירה במשטרת מרחב יפו.",
    },
    [T_ZIKARON, T_MISMACH],
  ),
  ev(
    "ta02",
    "2026-05-12T10:15:00Z",
    'רס"ר אבי לוי',
    "search",
    {
      title: "חיפוש בדירת הנחקר",
      text: "חיפוש בכתובת רחוב פלוני 5. נמצאו מסמכים רלוונטיים — נתפסו לראיה.",
    },
    [T_RAYAH, T_MISMACH],
  ),
  ev(
    "ta03",
    "2026-05-12T14:00:00Z",
    "מפקח דני שמש",
    "action",
    {
      title: "תשאול ראשוני של הנחקר",
      text: "תשאול בהיקף של שעה. הנחקר מסר גרסה לפיה לא היה במקום בזמן הרלוונטי.",
    },
    [T_HASHAD],
  ),
  ev(
    "ta04",
    "2026-05-13T09:00:00Z",
    'רס"ר אבי לוי',
    "search",
    {
      title: "בדיקת מצלמות אבטחה",
      text: "סקירת חומר מצלמות באזור בית העסק בשעות 22:00-23:30 בליל האירוע.",
    },
    [T_RAYAH],
  ),
  ev(
    "ta05",
    "2026-05-13T16:30:00Z",
    "מפקח דני שמש",
    "action",
    {
      title: "שיחה עם עד מרכזי",
      text: "עד מסר כי ראה את הנחקר באזור בשעה הרלוונטית. הודעה מסודרת תיגבה ביום שני.",
    },
    [T_HASHAD],
  ),
  ev(
    "ta06",
    "2026-05-14T11:00:00Z",
    'רס"ר אבי לוי',
    "search",
    {
      title: "מימוש צו חיפוש בכלי הרכב של הנחקר",
      text: "תפיסת חפצים אישיים + מסמכים. רישום בבית מטה החקירה.",
    },
    [T_RAYAH, T_MISMACH, T_ZIKARON],
  ),
];

// ── Layer B — תכתובות בין הצדדים (מתוך הטלפון של המתלוננת) ── //
const LAYER_B: WhatsappMessageDTO[] = [
  ev(
    "tb01",
    "2026-05-12T08:42:00Z",
    "מתלוננת",
    "message",
    { text: "אני הולכת למשטרה היום בבוקר." },
    [T_TZAD_SHELI, T_SHIFRA],
  ),
  ev(
    "tb02",
    "2026-05-12T08:50:00Z",
    "נחקר",
    "message",
    { text: "אני לא מבין מה את רוצה ממני. נדבר אחר כך." },
    [T_TZAD_SHEKENGED, T_SHIFRA],
  ),
  ev(
    "tb03",
    "2026-05-12T11:20:00Z",
    "מתלוננת",
    "message",
    {
      media: {
        id: "tb03-media",
        filename: "screen-2026-05-12.jpg",
        mimeType: "image/jpeg",
        size: 18725,
        url: SAMPLE_IMAGE_URL,
      },
      text: "מצרפת צילום מסך של ההודעות שקיבלתי בשבוע שעבר.",
    },
    [T_RAYAH, T_TZAD_SHELI],
  ),
  ev(
    "tb04",
    "2026-05-12T11:25:00Z",
    "נחקר",
    "message",
    { text: "אל תפיצי את זה. דברי איתי לפני." },
    [T_TZAD_SHEKENGED, T_HASHAD],
  ),
  ev(
    "tb05",
    "2026-05-13T20:14:00Z",
    "מתלוננת",
    "message",
    { text: "המשטרה ביקשה מסמכים נוספים. אני שולחת אליהם הכל מחר בבוקר." },
    [T_TZAD_SHELI],
  ),
  ev(
    "tb06",
    "2026-05-15T09:02:00Z",
    "נחקר",
    "message",
    { text: "השכרתי עו\"ד. כל הקשר מעכשיו דרכו." },
    [T_TZAD_SHEKENGED, T_ZIKARON],
  ),
];

// ── Layer C — יומן ייצוג הסניגוריה ── //
const LAYER_C: WhatsappMessageDTO[] = [
  ev(
    "tc01",
    "2026-05-13T12:00:00Z",
    MOCK_SELF,
    "meeting",
    {
      title: "פגישת ייעוץ ראשונית",
      text: "פגישה עם הנחקר בלשכה. סקירת התיק וגיבוש קו הגנה ראשוני. הוסכם שלא ימסור הודעה נוספת ללא הזמנה רשמית.",
    },
    [T_PAGISH, T_LAKOACH, T_ZIKARON],
  ),
  ev(
    "tc02",
    "2026-05-13T14:30:00Z",
    MOCK_SELF,
    "note",
    {
      title: "הערה פנימית — קו טיעון",
      text: "ייתכן שצריך לבקש הסדר מותנה — תלוי בעמדת התביעה לאחר השלמת החקירה.",
    },
    [],
  ),
  ev(
    "tc03",
    "2026-05-14T10:45:00Z",
    MOCK_SELF,
    "action",
    {
      title: "פנייה בכתב לחוקר",
      text: "בקשה לתיאום מועד הודעה. דרישה לקבל את חומר החקירה הקיים לפני התשאול.",
    },
    [T_MISMACH],
  ),
  ev(
    "tc04",
    "2026-05-15T11:30:00Z",
    'עו"ד פלוני (צד שכנגד)',
    "message",
    {
      text: "תוכל לקפוץ ל-15 דקות שיחה לפני הדיון? יש לי הצעה לשקול.",
    },
    [T_TZAD_SHEKENGED, T_SHIFRA],
  ),
  ev(
    "tc05",
    "2026-05-15T16:00:00Z",
    MOCK_SELF,
    "meeting",
    {
      title: "פגישת ייעוץ עם הלקוח",
      text: "סקירת הצעת הסדר. הלקוח מבקש שבוע לבחון.",
    },
    [T_PAGISH, T_LAKOACH],
  ),
  ev(
    "tc06",
    "2026-05-16T09:30:00Z",
    MOCK_SELF,
    "note",
    {
      title: "סיכום שבוע ראשון",
      text: "חומר החקירה חלקי. נקבע מועד נוסף להשלמת תשאול. הלקוח שוקל הסדר מותנה. ממתינים לתעודת שירות מהחוקרת הראשית.",
    },
    [T_ZIKARON],
  ),
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
      lastTextPreview: "מימוש צו חיפוש בכלי הרכב",
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
      lastTextPreview: "השכרתי עו\"ד. כל הקשר מעכשיו דרכו.",
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
      lastTextPreview: "סיכום שבוע ראשון",
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

export const MOCK_TIMELINE_ITEMS: Record<string, WhatsappMessageDTO[]> =
  Object.fromEntries(
    MOCK_TIMELINE_LAYERS.map((l) => [l.summary.id, l.messages]),
  );
