// Synthetic timeline events for the public /timeline landing.
//
// Five layers representing a single multi-suspect investigation case
// (May–June 2026). Three layers are police action-report streams from
// different officers at different stations; the other two are the
// correspondence chain and the defense diary. This gives the merged
// view a realistic cross-layer picture.
//
// All names, addresses and case numbers are fabricated.

import type {
  WhatsappChatSummary,
  WhatsappMessageDTO,
  WhatsappWorkspaceDTO,
  TagRef,
} from "@/components/conversation/types";

const SELF = "עו\"ד גיא זומר";
const IMG = "/whatsapp-demo/sample-image.jpg";

// ── Tag pool ──
const T_REPORT:  TagRef = { id: "t-report",  name: "דו\"ח פעולה",          color: null };
const T_ARREST:  TagRef = { id: "t-arrest",  name: "מעצר",                  color: null };
const T_SEARCH:  TagRef = { id: "t-search",  name: "חיפוש",                  color: null };
const T_INTEROG: TagRef = { id: "t-interog", name: "תשאול",                  color: null };
const T_EVIDENCE:TagRef = { id: "t-evid",    name: "ראיה",                   color: null };
const T_SUSPECT: TagRef = { id: "t-suspect", name: "חשוד",                   color: null };
const T_CONTACT: TagRef = { id: "t-contact", name: "תכתובת",                 color: null };
const T_MEETING: TagRef = { id: "t-meeting", name: "פגישה",                  color: null };
const T_KEY:     TagRef = { id: "t-key",     name: "נקודת זמן מרכזית",      color: null };
const T_LEGAL:   TagRef = { id: "t-legal",   name: "מסמך רשמי",              color: null };

export const MOCK_TIMELINE_TAGS: TagRef[] = [
  T_KEY, T_REPORT, T_ARREST, T_SEARCH, T_INTEROG,
  T_EVIDENCE, T_SUSPECT, T_CONTACT, T_MEETING, T_LEGAL,
];

function ev(
  id: string, iso: string, actor: string,
  cat: WhatsappMessageDTO["category"],
  body: { title?: string; text?: string; media?: WhatsappMessageDTO["media"] },
  tags: TagRef[] = [],
): WhatsappMessageDTO {
  return {
    id, timestamp: iso, sender: actor, actor, category: cat,
    title: body.title ?? null, text: body.text ?? null,
    isSystem: false, isHidden: false, media: body.media ?? null, tags,
  };
}

// ────────────────────────────────────────────────────────────────────
// Layer A — דוחות פעולה: תחנת יפו / רס"ר אבי כהן (חשד יוסי ברק)
// ────────────────────────────────────────────────────────────────────
const LAYER_A: WhatsappMessageDTO[] = [
  ev("ta01","2026-05-19T06:30:00Z",'רס"ר אבי כהן','action',{
    title:"מעצר ראשוני — יוסי ברק",
    text:"קיבלנו קריאה בשעה 05:45. יוסי ברק (תיק 4471/26) נעצר בדירתו ברחוב הנגב 12. לא הייתה התנגדות. הובא לתחנת יפו.",
  },[T_ARREST,T_KEY,T_REPORT]),
  ev("ta02","2026-05-19T07:45:00Z",'רס"ר אבי כהן','search',{
    title:"חיפוש בדירת הנחקר",
    text:"חיפוש בהסכמה בדירה. נמצאו מסמכים פיננסיים + טאבלט. נתפסו לראיה.",
    media:{ id:"ta02m", filename:"sample-image.jpg", mimeType:"image/jpeg", size:18725, url:IMG },
  },[T_SEARCH,T_EVIDENCE,T_REPORT]),
  ev("ta03","2026-05-19T10:00:00Z",'רס"ר אבי כהן','action',{
    title:"תשאול ראשוני",
    text:"תשאול בן שעה בנוכחות עורך דין. הנחקר מסר כי לא היה בבית העסק ב-16.05. לא ניתנה הודעה רשמית.",
  },[T_INTEROG,T_SUSPECT,T_REPORT]),
  ev("ta04","2026-05-19T14:00:00Z",'רס"ר אבי כהן','action',{
    title:"בקשת מעצר עד תום ההליכים",
    text:"הוגשה בקשה לבית משפט שלום ת\"א. הנימוק: חשש להשמדת ראיות ומסוכנות.",
  },[T_ARREST,T_LEGAL,T_KEY]),
  ev("ta05","2026-05-20T11:45:00Z",'רס"ר אבי כהן','action',{
    title:"החלטת בית המשפט — שחרור בתנאים",
    text:"שופטת פסקה: שחרור ב-50,000 ₪ ערבות + איסור יציאה מהארץ. מועד דיון הבא: 15.06.",
  },[T_KEY,T_LEGAL]),
  ev("ta06","2026-05-22T09:00:00Z",'רס"ר אבי כהן','search',{
    title:"חיפוש נוסף — רכב הנחקר",
    text:"צו חיפוש ברכב סוזוקי שחור (122-16-200). נמצאה קבלה מבית עסק ב-16.05 בשעה 21:30.",
  },[T_SEARCH,T_EVIDENCE,T_REPORT,T_KEY]),
  ev("ta07","2026-05-23T10:00:00Z",'רס"ר אבי כהן','action',{
    title:"זימון לתשאול נוסף — 02.06",
    text:"נשלח זימון רשמי לנחקר ולעורך דינו. מועד: 02.06.2026 ב-10:00 בתחנת יפו.",
  },[T_INTEROG,T_LEGAL]),
];

// ────────────────────────────────────────────────────────────────────
// Layer B — דוחות פעולה: תחנת ירושלים מרכז / מפקח חגי ביטון
//            (חשד עמית שאול — אותו תיק, שותף נטען)
// ────────────────────────────────────────────────────────────────────
const LAYER_B: WhatsappMessageDTO[] = [
  ev("tb01","2026-05-19T08:00:00Z",'מפקח חגי ביטון','action',{
    title:"פתיחת הליך מקביל — עמית שאול",
    text:"קיבלנו הפניה מיפו: חשד לשותפות עם ברק. עמית שאול (ת.ז. 0XXXXXXXX) מתגורר בירושלים. תחנת ירושלים מרכז תטפל.",
  },[T_REPORT,T_SUSPECT,T_KEY]),
  ev("tb02","2026-05-19T11:30:00Z",'מפקח חגי ביטון','search',{
    title:"חיפוש בחנות שאול — רחוב יפו 44 ירושלים",
    text:"בוצע בצו שופטת שלום ירושלים. נמצאו חשבוניות המתאימות לתקופה הרלוונטית (מרץ–מאי 2026).",
  },[T_SEARCH,T_EVIDENCE,T_REPORT]),
  ev("tb03","2026-05-19T15:00:00Z",'מפקח חגי ביטון','action',{
    title:"תשאול עמית שאול",
    text:"תשאול ראשוני ללא עצירה. שאול טען שלא מכיר את ברק. עדות סותרת לעדות שנגבתה ביפו.",
  },[T_INTEROG,T_SUSPECT,T_REPORT]),
  ev("tb04","2026-05-20T09:00:00Z",'מפקח חגי ביטון','action',{
    title:"עימות עדויות — טלקונפרנס עם יפו",
    text:"שיחה עם רס\"ר כהן. הסתירות בין גרסת ברק לגרסת שאול מחזקות את גרסת המתלוננת.",
  },[T_REPORT,T_KEY]),
  ev("tb05","2026-05-21T14:00:00Z",'מפקח חגי ביטון','action',{
    title:"קבלת צו הקפאת חשבון",
    text:"בית משפט שלום ירושלים הוציא צו הקפאת חשבון בנקאי על שאול בחשד להלבנת הון.",
  },[T_LEGAL,T_KEY,T_EVIDENCE]),
  ev("tb06","2026-05-23T16:00:00Z",'מפקח חגי ביטון','search',{
    title:"חיפוש נוסף — ביתו הפרטי של שאול",
    text:"בצו חדש. נמצא מחשב נייד + נייד שני. ממתינים לחוות דעת מעבדת מחשבים.",
  },[T_SEARCH,T_EVIDENCE,T_REPORT]),
];

// ────────────────────────────────────────────────────────────────────
// Layer C — דוחות פעולה: תחנת חיפה / רב-פקד נועה ספיר
//            (חשד מיכל גל — עד מרכזי / חשוד שלישי)
// ────────────────────────────────────────────────────────────────────
const LAYER_C: WhatsappMessageDTO[] = [
  ev("tc01","2026-05-20T10:00:00Z",'רב"פ נועה ספיר','action',{
    title:"קבלת הפניה לעד חיפה",
    text:"מיכל גל (מספר עד 17-B) מתגוררת בחיפה. קיבלנו בקשת עדות מתחנת יפו. נחקרת כעד מרכזי.",
  },[T_REPORT,T_EVIDENCE]),
  ev("tc02","2026-05-20T14:30:00Z",'רב"פ נועה ספיר','action',{
    title:"גביית עדות מיכל גל",
    text:"עדות של שעה וחצי. גל מסרה כי ראתה את ברק ושאול יחד בחנות בתאריך 16.05 בשעה 21:00. מוכנה לחתום על תצהיר.",
  },[T_INTEROG,T_EVIDENCE,T_KEY,T_REPORT]),
  ev("tc03","2026-05-21T09:00:00Z",'רב"פ נועה ספיר','action',{
    title:"אימות זהות העד — בדיקת מצלמות",
    text:"ביצענו חיפוש בחומר מצלמות הרחוב ברחוב הנמל חיפה. אין חומר רלוונטי לפרק הזמן המדובר.",
  },[T_SEARCH,T_REPORT]),
  ev("tc04","2026-05-21T16:00:00Z",'רב"פ נועה ספיר','action',{
    title:"תשאול נוסף — סתירות בעדות",
    text:"זיהינו אי-התאמה בזמן שגל ציינה. בשיחה שנייה הבהירה כי טעתה בשעה — השעה הנכונה הייתה 22:00.",
  },[T_INTEROG,T_EVIDENCE,T_REPORT]),
  ev("tc05","2026-05-22T11:00:00Z",'רב"פ נועה ספיר','action',{
    title:"תצהיר חתום מיכל גל",
    text:"גל חתמה על תצהיר מפורט בנוכחות שוטר חיפה. הועבר לתיק המרכזי ביפו.",
  },[T_LEGAL,T_KEY,T_REPORT]),
  ev("tc06","2026-05-23T14:00:00Z",'רב"פ נועה ספיר','action',{
    title:"סיכום — תיק חיפה מוסגר לתיק המרכזי",
    text:"כל החומר מחיפה הועבר לרס\"ר כהן ביפו. תפקידנו בחקירה הסתיים בשלב זה.",
  },[T_REPORT,T_KEY]),
];

// ────────────────────────────────────────────────────────────────────
// Layer D — תכתובות משפטיות ורשמיות בין הצדדים
// ────────────────────────────────────────────────────────────────────
const LAYER_D: WhatsappMessageDTO[] = [
  ev("td01","2026-05-19T08:50:00Z","מתלוננת",'message',{
    text:"אני הולכת למשטרה היום. יש לי כל מה שצריך.",
  },[T_CONTACT,T_KEY]),
  ev("td02","2026-05-19T09:05:00Z","יוסי ברק",'message',{
    text:"אני לא מבין מה את רוצה ממני. נדבר אחר כך.",
  },[T_CONTACT,T_SUSPECT]),
  ev("td03","2026-05-19T11:20:00Z","מתלוננת",'message',{
    text:"מצרפת צילום מסך של ההודעות שקיבלתי בשבוע שעבר.",
    media:{ id:"td03m", filename:"sample-image.jpg", mimeType:"image/jpeg", size:18725, url:IMG },
  },[T_EVIDENCE,T_CONTACT]),
  ev("td04","2026-05-19T11:28:00Z","עמית שאול",'message',{
    text:"אני לא קשור לזה. תגידי להם שטעו.",
  },[T_CONTACT,T_SUSPECT]),
  ev("td05","2026-05-20T14:00:00Z",'עו"ד רחלי שגיא','action',{
    title:"הודעת פרקליטות — הסדר מותנה",
    text:"ניתנת הודעה ראשונית כי הפרקליטות שוקלת הסדר מותנה לאחד הנחקרים. פרטים יועברו בהמשך.",
  },[T_LEGAL,T_KEY]),
  ev("td06","2026-05-21T10:00:00Z",SELF,'action',{
    title:"בקשת עיון בחומר חקירה — סע' 74",
    text:"הוגשה בקשה רשמית לפרקליטות לקבלת חומר חקירה מלא: עדויות, דוחות פעולה, ראיות פורנזיות.",
  },[T_LEGAL,T_KEY]),
  ev("td07","2026-05-22T16:00:00Z","יוסי ברק",'message',{
    text:"שכרתי עו\"ד. כל הקשר מעכשיו דרכו בלבד.",
  },[T_CONTACT,T_KEY]),
  ev("td08","2026-05-23T15:00:00Z",'עו"ד רחלי שגיא','action',{
    title:"תגובת פרקליטות לבקשת עיון",
    text:"החומר ייועבר תוך 21 יום. בקשה להגיש בקשת דחיית תשאול עד לקבלת החומר — לשקול.",
  },[T_LEGAL]),
];

// ────────────────────────────────────────────────────────────────────
// Layer E — יומן ייצוג הסניגוריה
// ────────────────────────────────────────────────────────────────────
const LAYER_E: WhatsappMessageDTO[] = [
  ev("te01","2026-05-19T13:00:00Z",SELF,'meeting',{
    title:"פגישת ייעוץ ראשונית — יוסי ברק",
    text:"פגישה בתחנת יפו, 45 דקות. סקירת עובדות התיק וגיבוש קו הגנה: אין עבר, אין כוונה, עדות שנויה במחלוקת.",
  },[T_MEETING,T_KEY]),
  ev("te02","2026-05-19T17:00:00Z",SELF,'note',{
    title:"הערה פנימית — סתירות בין עדי התביעה",
    text:"עדות גל (חיפה) לא מכסה את פרק הזמן המדויק שטוענת התביעה. צריך לבדוק ולדרוש את גרסה המלאה.",
  },[]),
  ev("te03","2026-05-20T08:30:00Z",SELF,'action',{
    title:"הכנת בקשת מעצר — דיון בשעה 10",
    text:"ניסוח טיעוני ההגנה: קשרים משפחתיים, עבודה יציבה, מגורים קבועים, היעדר עבר.",
  },[T_LEGAL]),
  ev("te04","2026-05-20T12:00:00Z",SELF,'note',{
    title:"תוצאת דיון מעצר — שחרור בערבות",
    text:"הושגה הסכמה עם הפרקליטות: 50,000 ₪ ערבות + איסור יציאה. תנאי טוב בהתחשב בנסיבות.",
  },[T_KEY]),
  ev("te05","2026-05-21T10:00:00Z",SELF,'action',{
    title:"הגשת בקשת עיון",
    text:"בקשה לחומר חקירה מלא הוגשה לפרקליטות מחוז ת\"א. סימוכין: BRAK-2026-447.",
  },[T_LEGAL]),
  ev("te06","2026-05-21T15:00:00Z",SELF,'meeting',{
    title:"פגישת ייעוץ שנייה עם הלקוח",
    text:"הלקוח מסר מידע נוסף לגבי מערכת היחסים עם שאול. נראה שיש פה סיפור אחר ממה שנטען.",
  },[T_MEETING]),
  ev("te07","2026-05-22T14:00:00Z",SELF,'note',{
    title:"ניתוח דוחות פעולה ראשוניים",
    text:"סתירה בין שעת המעצר ביפו לשעת התשאול בירושלים. יש לדרוש הבהרה.",
  },[T_EVIDENCE,T_KEY]),
  ev("te08","2026-05-23T09:30:00Z",SELF,'note',{
    title:"סיכום שבוע ראשון — מצב התיק",
    text:"שלוש חקירות מקבילות (יפו, ירושלים, חיפה). חומר חקירה לא התקבל. זימון ל-02.06 נדחה בהתראה. עמדת הפרקליטות — שוקלים הסדר. הלקוח שוקל.",
  },[T_KEY]),
];

export const MOCK_TIMELINE_LAYERS: Array<{
  summary: WhatsappChatSummary;
  messages: WhatsappMessageDTO[];
}> = [
  {
    summary: { id:"tl-a", contactName:'דוחות פעולה — תחנת יפו (רס"ר כהן)', selfSender:null, messageCount:LAYER_A.length, lastAt:LAYER_A[LAYER_A.length-1].timestamp, lastTextPreview:"זימון לתשאול נוסף — 02.06" },
    messages: LAYER_A,
  },
  {
    summary: { id:"tl-b", contactName:'דוחות פעולה — ירושלים מרכז (מפקח ביטון)', selfSender:null, messageCount:LAYER_B.length, lastAt:LAYER_B[LAYER_B.length-1].timestamp, lastTextPreview:"חיפוש ביתו הפרטי — מחשב + נייד" },
    messages: LAYER_B,
  },
  {
    summary: { id:"tl-c", contactName:'דוחות פעולה — תחנת חיפה (רב"פ ספיר)', selfSender:null, messageCount:LAYER_C.length, lastAt:LAYER_C[LAYER_C.length-1].timestamp, lastTextPreview:"תיק חיפה מוסגר לתיק המרכזי" },
    messages: LAYER_C,
  },
  {
    summary: { id:"tl-d", contactName:"תכתובות רשמיות בין הצדדים", selfSender:null, messageCount:LAYER_D.length, lastAt:LAYER_D[LAYER_D.length-1].timestamp, lastTextPreview:"תגובת פרקליטות לבקשת עיון" },
    messages: LAYER_D,
  },
  {
    summary: { id:"tl-e", contactName:"יומן ייצוג — הסניגוריה", selfSender:SELF, messageCount:LAYER_E.length, lastAt:LAYER_E[LAYER_E.length-1].timestamp, lastTextPreview:"סיכום שבוע ראשון — מצב התיק" },
    messages: LAYER_E,
  },
];

export const MOCK_TIMELINE_WORKSPACE: WhatsappWorkspaceDTO = {
  id: "mock-timeline",
  title: "תצוגה לדוגמה — ציר זמן תיק 4471/26",
  selfSender: SELF,
  chats: MOCK_TIMELINE_LAYERS.map((c) => c.summary),
};

export function mockTimelineEventsFor(layerId: string): WhatsappMessageDTO[] {
  return MOCK_TIMELINE_LAYERS.find((l) => l.summary.id === layerId)?.messages ?? [];
}

export const MOCK_TIMELINE_ITEMS: Record<string, WhatsappMessageDTO[]> =
  Object.fromEntries(
    MOCK_TIMELINE_LAYERS.map((l) => [l.summary.id, l.messages]),
  );
