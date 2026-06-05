// Synthetic chats for the public /whatsapp landing.
//
// Five conversations across an investigation week (2026-05-19–23)
// that tell a coherent legal story: a criminal case managed from
// arrest through bail hearing to case management. Conversations span:
//   A — הלקוח (נחקר)          → direct client communication
//   B — עליזה המתמחה           → internal office coordination
//   C — עו"ד מול פרקליטות      → opposing counsel negotiation
//   D — חוקרת המשטרה            → formal investigator correspondence
//   E — בית המשפט               → court coordination
//
// All names, case numbers and content are fabricated.

import type {
  WhatsappChatSummary,
  WhatsappMessageDTO,
  WhatsappWorkspaceDTO,
} from "@/components/conversation/types";

const SELF = "עו\"ד גיא זומר";
const IMAGE = "/whatsapp-demo/sample-image.jpg";
const AUDIO = "/whatsapp-demo/sample-voice.wav";

function at(d: string, t: string): string {
  return `2026-05-${d}T${t}:00Z`;
}
function sys(id: string, date: string, time: string, text: string): WhatsappMessageDTO {
  return { id, timestamp: at(date, time), sender: "", actor: "", isSystem: true, isHidden: false, text, media: null, tags: [] };
}
function msg(
  id: string, date: string, time: string,
  sender: string, text: string | null,
  media?: WhatsappMessageDTO["media"],
): WhatsappMessageDTO {
  return { id, timestamp: at(date, time), sender, actor: sender, isSystem: false, isHidden: false, text, media: media ?? null, tags: [] };
}

// ── Chat A — יוסי ברק (לקוח, נחקר) ──
const CHAT_A: WhatsappMessageDTO[] = [
  sys("a0",  "19", "05:50", "ההודעות בצ׳אט זה מוצפנות מקצה לקצה"),
  msg("a1",  "19", "06:12", "יוסי ברק",        "אני עצור. אמרו לי שיש לי 48 שעות. מה עושים?"),
  msg("a2",  "19", "06:31", SELF,               "עוד מעט אני מגיע לתחנה. לא תוסר מילה ללא נוכחותי — תגיד שאתה ממתין לעורך דין."),
  msg("a3",  "19", "08:45", "יוסי ברק",        "הם ביקשו שוב לתשאל. סרבתי כמו שאמרת. הם לא מאוד מרוצים."),
  msg("a4",  "19", "08:52", SELF,               "מצוין. הם לא יכולים לכפות. אני כרגע בחדר ההמתנה."),
  msg("a5",  "19", "14:30", SELF,               "סיימנו את הדיון הראשוני. הם מבקשים מעצר עד תום ההליכים — אני מתנגד. מחר דיון מעצר בשעה 10."),
  msg("a6",  "19", "14:41", "יוסי ברק",        "אשתי יכולה לבוא לדיון?"),
  msg("a7",  "19", "14:45", SELF,               "כן, דיון פתוח. תגיד לה חדר 12 בבית משפט שלום ת\"א."),
  msg("a8",  "20", "09:02", "יוסי ברק",        "הלילה היה קשה. לא ישנתי. מה הסיכויים?"),
  msg("a9",  "20", "09:15", SELF,               "הצד שלנו חזק. אין עבר פלילי, כתובת קבועה, עבודה יציבה. נתחיל בחרם מעצר ממומן."),
  msg("a10", "20", "11:20", "יוסי ברק",        "אמא שלי מוכנה לשים ערבות של 50 אלף. מספיק?"),
  msg("a11", "20", "11:28", SELF,               "בהחלט. תשלח לי את פרטי תעודת הזהות שלה ואני אכין את הבקשה."),
  msg("a12", "20", "16:55", SELF,               "קיבלנו שחרור בערבות! 50,000 ₪ + איסור יציאה מהארץ. מחכה לך בכניסה הראשית בשעה 18:00."),
  msg("a13", "20", "16:58", "יוסי ברק",        "תודה לך על הכל. לא מאמין שזה קרה כל כך מהר."),
  msg("a14", "21", "10:00", SELF,               "עכשיו השלב הבא — בקשת עיון בחומר החקירה. אשלח בקשה רשמית היום. נחכה לתגובת הפרקליטות תוך 30 יום."),
  msg("a15", "21", "10:14", "יוסי ברק",        "מה לגבי החיפוש בדירה — האם יחזירו את הדברים שלקחו?"),
  msg("a16", "21", "10:21", SELF,               "אגיש בקשה להחזרת תפוסים במקביל. בדרך כלל לוקח שבועיים-שלושה."),
  msg("a17", "23", "09:30", "יוסי ברק",        "קיבלתי זימון נוסף לתשאול ל-02.06. מה עושים?"),
  msg("a18", "23", "09:44", SELF,               "תדחה אותם — צריך קודם לקבל את חומר החקירה. שולח להם מכתב רשמי."),
];

// ── Chat B — עליזה (מתמחה) ──
const CHAT_B: WhatsappMessageDTO[] = [
  sys("b0",  "19", "07:00", "ההודעות בצ׳אט זה מוצפנות מקצה לקצה"),
  msg("b1",  "19", "07:22", SELF,               "עליזה, אני בתחנת יפו עם עציר חדש. תוציאי תיק מעצר דחוף."),
  msg("b2",  "19", "07:25", "עליזה — מתמחה", "מבוצע. שם מלא ומספר תיק?"),
  msg("b3",  "19", "07:28", SELF,               "יוסי ברק, ת.ז. 034XXXXXX. תיק עדיין לא נפתח — הגענו ראשונים."),
  msg("b4",  "19", "09:10", "עליזה — מתמחה", "פתחתי תיק. סרקתי את הזכויות — מצרפת:",
    { id: "b4m", filename: "sample-image.jpg", mimeType: "image/jpeg", size: 18725, url: IMAGE }),
  msg("b5",  "19", "09:13", SELF,               "מצוין. תכיני גם טיוטה לבקשת דחיית מעצר — תבסיסי על היעדר עבר + קשרים משפחתיים."),
  msg("b6",  "19", "14:00", "עליזה — מתמחה", "הטיוטה מוכנה:",
    { id: "b7m", filename: "sample-voice.wav", mimeType: "audio/wav", size: 185646, url: AUDIO }),
  msg("b8",  "19", "14:18", SELF,               "שמעתי — שני תיקונים קטנים. מחר דיון ב-10, תהיי בבית משפט ב-9:30."),
  msg("b9",  "20", "08:45", "עליזה — מתמחה", "בבית משפט. החדר עדיין סגור. המשפחה כאן, רגועים יחסית."),
  msg("b10", "20", "12:00", "עליזה — מתמחה", "🎉🎉🎉"),
  msg("b11", "20", "12:02", SELF,               "כן! תרשמי את תנאי השחרור ותשלחי לו."),
  msg("b12", "21", "11:00", "עליזה — מתמחה", "קיבלתי אישור שהערבות הופקדה. עדכנתי את הלקוח."),
  msg("b13", "22", "15:30", SELF,               "תכיני בקשת עיון לפרקליטות מחוז ת\"א. כולל: חומר גלם, עדויות, דוחות פעולה שוטרים."),
  msg("b14", "22", "15:35", "עליזה — מתמחה", "אכין ואשלח להחתמה מחר בבוקר."),
  msg("b15", "23", "10:15", "עליזה — מתמחה", "הבקשה יצאה בפקס ובמייל. סימוכין: BRAK-2026-447."),
];

// ── Chat C — עו"ד רחלי שגיא (פרקליטות) ──
const CHAT_C: WhatsappMessageDTO[] = [
  sys("c0",  "19", "13:00", "ההודעות בצ׳אט זה מוצפנות מקצה לקצה"),
  msg("c1",  "19", "13:12", 'עו"ד רחלי שגיא', "קיבלתי מינוי לתיק. ניפגש לפני הדיון מחר?"),
  msg("c2",  "19", "13:25", SELF,               "כן, 09:00 בחצר בית המשפט. אביא גם עמדה בכתב."),
  msg("c3",  "20", "09:05", 'עו"ד רחלי שגיא', "ראיתי את הבקשה שלך. לא מתנגדת לשחרור בתנאים — אבל אני דורשת 80 אלף ומעקב כתובת."),
  msg("c4",  "20", "09:12", SELF,               "50 אלף ואיסור יציאה מהארץ. אין עבר, יש ילדים קטנים. זה הגיוני."),
  msg("c5",  "20", "09:18", 'עו"ד רחלי שגיא', "60 אלף ואני מסכימה. נציג ביחד לשופטת."),
  msg("c6",  "20", "09:21", SELF,               "הסכמה."),
  msg("c7",  "20", "11:45", 'עו"ד רחלי שגיא', "השופטת קיבלה. אני שולחת מייל רשמי לאישור."),
  msg("c8",  "21", "14:00", 'עו"ד רחלי שגיא', "קיבלתי את בקשת העיון. נדרשים 30 יום אבל אנסה לזרז — 21 יום."),
  msg("c9",  "21", "14:15", SELF,               "מעריך. במיוחד חשוב לי דוחות הפעולה של השוטרים ב-19.05 בשעות הראשונות."),
  msg("c10", "23", "16:00", 'עו"ד רחלי שגיא', "התביעה שוקלת הסדר מותנה. מוקדם לדון — אבל רציתי שתדע."),
  msg("c11", "23", "16:22", SELF,               "נשמע. לא מתחייב כרגע אבל ניהיה פתוחים לשיחה אחרי שנסיים לקרוא את החומר."),
];

// ── Chat D — רס"ר טל מזרחי (חוקרת) ──
const CHAT_D: WhatsappMessageDTO[] = [
  sys("d0",  "20", "14:00", "ערוץ תקשורת מוצפן — כל ההתכתבות נשמרת"),
  msg("d1",  "20", "14:08", 'רס"ר טל מזרחי', "שלום עו\"ד זומר. נהלי החקירה מצריכים תשאול נוסף — נקבע מועד?"),
  msg("d2",  "20", "14:22", SELF,               "שלום. אנחנו ממתינים לחומר חקירה לפי סע' 74. לא נגיע לתשאול לפני שנקבל אותו."),
  msg("d3",  "20", "14:35", 'רס"ר טל מזרחי', "הבנתי. הבקשה הועברת לפרקליטות. אצלנו זה לא מעכב את החקירה."),
  msg("d4",  "20", "14:42", SELF,               "מובן. נמתין."),
  msg("d5",  "22", "09:00", 'רס"ר טל מזרחי', "פגישה קצרה? רוצה לשאול כמה שאלות על לוח הזמנים של 19.05."),
  msg("d6",  "22", "09:20", SELF,               "לא בשלב הזה. המדיניות שלנו ברורה."),
  msg("d7",  "22", "09:28", 'רס"ר טל מזרחי', "הבנתי. אשלח זימון רשמי אם צריך."),
  msg("d8",  "23", "11:00", 'רס"ר טל מזרחי', "שלחתי זימון רשמי לנחקר — 02.06, 10:00, תחנת יפו."),
  msg("d9",  "23", "11:18", SELF,               "קיבלתי. נהיה שם עם עמדה מוכנה — לאחר שנקבל ונעיין בחומר."),
];

// ── Chat E — מזכירות בית משפט ──
const CHAT_E: WhatsappMessageDTO[] = [
  sys("e0",  "20", "07:30", "ערוץ תיאומי בית משפט — אוטומטי"),
  msg("e1",  "20", "08:00", "מזכירות בהמ\"ש", "אישור דיון — 20.05.2026, 10:00, חדר 12. תיק מ.ת. 4471/26."),
  msg("e2",  "20", "08:05", SELF,               "תודה. מאושר."),
  msg("e3",  "20", "11:55", "מזכירות בהמ\"ש", "פרוטוקול דיון מ-20.05 יהיה מוכן בעוד 3 ימי עסקים."),
  msg("e4",  "21", "12:00", "מזכירות בהמ\"ש", "עדכון: דיון הבא — 15.06.2026, 14:00, חדר 8. פרק זמן: 30 דק'."),
  msg("e5",  "21", "12:15", SELF,               "מאושר בלוח. תשלחו גם ללקוח ישירות?"),
  msg("e6",  "21", "12:22", "מזכירות בהמ\"ש", "שלחנו SMS ישיר."),
  msg("e7",  "23", "09:00", "מזכירות בהמ\"ש", "פרוטוקול מ-20.05 — PDF רשמי מוכן לעיון."),
  msg("e8",  "23", "09:10", SELF,               "תודה רבה."),
];

export const MOCK_CHATS: Array<{
  summary: WhatsappChatSummary;
  messages: WhatsappMessageDTO[];
}> = [
  { summary: { id: "mock-a", contactName: "יוסי ברק (לקוח)", selfSender: SELF, messageCount: CHAT_A.length, lastAt: CHAT_A[CHAT_A.length-1].timestamp, lastTextPreview: "תדחה — שולח מכתב רשמי." }, messages: CHAT_A },
  { summary: { id: "mock-b", contactName: "עליזה — מתמחה", selfSender: SELF, messageCount: CHAT_B.length, lastAt: CHAT_B[CHAT_B.length-1].timestamp, lastTextPreview: "הבקשה יצאה. סימוכין: BRAK-2026-447." }, messages: CHAT_B },
  { summary: { id: "mock-c", contactName: 'עו"ד רחלי שגיא (פרקליטות)', selfSender: SELF, messageCount: CHAT_C.length, lastAt: CHAT_C[CHAT_C.length-1].timestamp, lastTextPreview: "ניהיה פתוחים לשיחה אחרי העיון." }, messages: CHAT_C },
  { summary: { id: "mock-d", contactName: 'רס"ר טל מזרחי (חוקרת)', selfSender: SELF, messageCount: CHAT_D.length, lastAt: CHAT_D[CHAT_D.length-1].timestamp, lastTextPreview: "נהיה שם עם עמדה מוכנה." }, messages: CHAT_D },
  { summary: { id: "mock-e", contactName: 'בית משפט שלום ת"א', selfSender: SELF, messageCount: CHAT_E.length, lastAt: CHAT_E[CHAT_E.length-1].timestamp, lastTextPreview: "פרוטוקול מ-20.05 מוכן לעיון." }, messages: CHAT_E },
];

export const MOCK_WORKSPACE: WhatsappWorkspaceDTO = {
  id: "mock",
  title: 'תצוגה לדוגמה — תיק ברק (מ.ת. 4471/26)',
  selfSender: SELF,
  chats: MOCK_CHATS.map((c) => c.summary),
};

export function mockMessagesFor(chatId: string): WhatsappMessageDTO[] {
  return MOCK_CHATS.find((c) => c.summary.id === chatId)?.messages ?? [];
}

export const MOCK_ITEMS: Record<string, WhatsappMessageDTO[]> =
  Object.fromEntries(MOCK_CHATS.map((c) => [c.summary.id, c.messages]));
