// Seed data for the /workflows public demo.
// All names + case numbers are synthetic. No real clients or files.

import type {
  WorkflowEntity,
  WorkflowEvent,
  WorkflowProcess,
} from "./types";

export const SELF_NAME = "עו\"ד גיא זומר";

/* ─── 7 entities: 3 clients, 2 police stations, 2 prosecution units ─── */

export const MOCK_ENTITIES: WorkflowEntity[] = [
  {
    id: "client-cohen",
    type: "client",
    name: "דוד כהן",
    subtitle: "לקוח — תיק תעבורה",
  },
  {
    id: "client-levi",
    type: "client",
    name: "שרה לוי",
    subtitle: "לקוחה — תיק פלילי",
  },
  {
    id: "client-avraham",
    type: "client",
    name: "יוסי אברהם",
    subtitle: "לקוח — תיק נוער",
  },
  {
    id: "police-dan",
    type: "police",
    name: "תחנת מרחב דן",
    subtitle: "משטרת ישראל",
  },
  {
    id: "police-jerusalem",
    type: "police",
    name: "תחנת מרכז ירושלים",
    subtitle: "משטרת ישראל",
  },
  {
    id: "prosecution-ta",
    type: "prosecution",
    name: "פרקליטות מחוז ת\"א (פלילי)",
    subtitle: "פרקליטות המדינה",
  },
  {
    id: "prosecution-jerusalem",
    type: "prosecution",
    name: "פרקליטות מחוז ירושלים (פלילי)",
    subtitle: "פרקליטות המדינה",
  },
];

/* ─── 5 processes: 2 discovery, 2 evidence, 1 settlement ─── */

export const MOCK_PROCESSES: WorkflowProcess[] = [
  {
    id: "proc-discovery-cohen",
    kind: "discovery",
    title: "בקשת עיון בחומר חקירה — דוד כהן",
    subtitle: "פ\"א 1234/26",
  },
  {
    id: "proc-discovery-levi",
    kind: "discovery",
    title: "בקשת עיון בחומר חקירה — שרה לוי",
    subtitle: "פ\"א 5678/26",
  },
  {
    id: "proc-evidence-cohen",
    kind: "evidence",
    title: "פרשת התביעה (הוכחות) — דוד כהן",
    subtitle: "ת\"פ 2345/26",
  },
  {
    id: "proc-evidence-avraham",
    kind: "evidence",
    title: "פרשת התביעה (הוכחות) — יוסי אברהם",
    subtitle: "ת\"פ 6789/26",
  },
  {
    id: "proc-settlement-levi",
    kind: "settlement",
    title: "פגישת הסדר טיעון — שרה לוי",
    subtitle: "תיק 9876/26 — מול הפרקליטות",
  },
];

/* ─── Seed events. Each carries entity tags + process tags. ─── */

// Helper — keeps the literal data block tidy. Picks a date relative to
// "today" (synthetic — real timestamps would come from a DB).
const day = (offset: number, hh = 9, mm = 0): string => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(hh, mm, 0, 0);
  return d.toISOString();
};

export const SEED_EVENTS: WorkflowEvent[] = [
  /* ── discovery — דוד כהן ── */
  {
    id: "evt-1",
    timestamp: day(-21, 10, 15),
    creator: SELF_NAME,
    title: "הגשת בקשה לעיון",
    text:
      "הוגשה בקשה לעיון בחומר חקירה מלא לפי סע' 74 לחסד\"פ. הודגש הצורך בקבלת " +
      "הקלטות מצלמות הגוף ותיעוד צו החיפוש.",
    entityIds: ["client-cohen", "police-dan"],
    processIds: ["proc-discovery-cohen"],
  },
  {
    id: "evt-2",
    timestamp: day(-14, 14, 30),
    creator: "תחנת מרחב דן",
    title: "תשובת המשטרה לבקשת עיון",
    text:
      "התקבלה תשובה: חומר חלקי נשלח בדוא\"ל. הקלטות מצלמות הגוף לא צורפו " +
      "מפאת \"חוסר זמינות טכנית\".",
    entityIds: ["client-cohen", "police-dan"],
    processIds: ["proc-discovery-cohen"],
  },
  {
    id: "evt-3",
    timestamp: day(-10, 9, 5),
    creator: SELF_NAME,
    text:
      "סיכום שיחת טלפון עם הלקוח — עדכון על תשובת המשטרה והצורך בפנייה " +
      "נוספת לקבלת הקלטות הוידאו.",
    entityIds: ["client-cohen"],
    processIds: ["proc-discovery-cohen"],
  },

  /* ── discovery — שרה לוי ── */
  {
    id: "evt-4",
    timestamp: day(-30, 11, 0),
    creator: SELF_NAME,
    title: "פתיחת בקשת עיון",
    text:
      "הוגשה בקשה לעיון בחומר חקירה. בוקש במיוחד תיעוד החקירה הראשונית " +
      "ועדויות נוספות מהזירה.",
    entityIds: ["client-levi", "police-jerusalem"],
    processIds: ["proc-discovery-levi"],
  },
  {
    id: "evt-5",
    timestamp: day(-22, 16, 45),
    creator: "תחנת מרכז ירושלים",
    text:
      "החומר הועבר במלואו לקבלה במשרד החקירות. נדרשת הגעה פיזית לקבלתו " +
      "(לא ניתן לשלוח בדוא\"ל מפאת היקפו).",
    entityIds: ["client-levi", "police-jerusalem"],
    processIds: ["proc-discovery-levi"],
  },
  {
    id: "evt-6",
    timestamp: day(-18, 13, 0),
    creator: SELF_NAME,
    text:
      "ביקור במשטרה לאיסוף החומר. התקבלו 3 דיסקים + תיק נייר עבה. החלה סריקה " +
      "ראשונית של חומר הסרטונים.",
    entityIds: ["client-levi", "police-jerusalem"],
    processIds: ["proc-discovery-levi"],
  },

  /* ── evidence — דוד כהן ── */
  {
    id: "evt-7",
    timestamp: day(-7, 9, 0),
    creator: "פרקליטות מחוז ת\"א (פלילי)",
    title: "זימון לישיבת הוכחות",
    text:
      "נקבעה ישיבת הוכחות ראשונה ליום 12.06 בשעה 9:00 בבית המשפט המחוזי " +
      "תל אביב, אולם 304. נוכחות חובה.",
    entityIds: ["client-cohen", "prosecution-ta"],
    processIds: ["proc-evidence-cohen"],
  },
  {
    id: "evt-8",
    timestamp: day(-3, 17, 30),
    creator: SELF_NAME,
    text:
      "סקירה של רשימת העדים מטעם התביעה (12 עדים). זוהו 3 עדים מרכזיים " +
      "שיידרשו לחקירה נגדית מעמיקה.",
    entityIds: ["client-cohen", "prosecution-ta"],
    processIds: ["proc-evidence-cohen"],
  },

  /* ── evidence — יוסי אברהם ── */
  {
    id: "evt-9",
    timestamp: day(-12, 10, 30),
    creator: "פרקליטות מחוז ירושלים (פלילי)",
    title: "כתב אישום מתוקן",
    text:
      "התקבל כתב אישום מתוקן — נוסף סעיף אישום אחד בנושא הפרת תנאי שחרור. " +
      "ההגנה נדרשת להגיש תשובה תוך 30 יום.",
    entityIds: ["client-avraham", "prosecution-jerusalem"],
    processIds: ["proc-evidence-avraham"],
  },
  {
    id: "evt-10",
    timestamp: day(-5, 14, 0),
    creator: SELF_NAME,
    text:
      "פגישת הכנה עם הלקוח (כשעתיים). חודדה גרסת ההגנה לעניין המסגרת " +
      "העובדתית של הפרת תנאי השחרור. הוחלט על קו הגנה חלופי.",
    entityIds: ["client-avraham"],
    processIds: ["proc-evidence-avraham"],
  },

  /* ── settlement — שרה לוי ── */
  {
    id: "evt-11",
    timestamp: day(-2, 11, 15),
    creator: SELF_NAME,
    title: "תיאום פגישת הסדר",
    text:
      "תואמה פגישה בפרקליטות ירושלים ליום ד' הקרוב בשעה 14:00 — בחינת " +
      "מתווה הסדר טיעון אפשרי לפני הוכחות.",
    entityIds: ["client-levi", "prosecution-jerusalem"],
    processIds: ["proc-settlement-levi"],
  },
  {
    id: "evt-12",
    timestamp: day(-1, 9, 45),
    creator: SELF_NAME,
    text:
      "הוכן מסמך עקרונות להצעת הסדר — דגש על הפיכת אישום עיקרי לאישום קל, " +
      "תוך הסכמה לעבודות שירות במקום מאסר בפועל.",
    entityIds: ["client-levi"],
    processIds: ["proc-settlement-levi"],
  },
];
