/**
 * Case-file post: the address layer published from the Survey of Israel
 * (מפ"י) site, the State's copyright threat, and the FOI petition about it
 * (עת"מ 30638-12-25). Same shape as the real-estate deals post.
 *
 * Through the write API (ZG_API_KEY with plilist:draft + media:write +
 * cases:write, from .env.local):
 *   1. uploads the 8 PDFs (already redacted: ID number, home addresses,
 *      a private person's address/phone/email) as /uploads/api-mapi-*.pdf;
 *   2. creates their case documents (letters + the court proceeding);
 *   3. tags the existing TheMarker item to the case;
 *   4. creates the post as a DRAFT.
 * Idempotent: every call is an upsert.
 *
 *   npx tsx scripts/create-mapi-addresses-post.ts <dir-with-the-pdfs>
 */

import { readFileSync } from "fs";
import path from "path";
import { config } from "dotenv";
config({ path: ".env.local" });

const SITE = process.env.ZG_SITE ?? "https://www.z-g.co.il";
const CASE_TAG = "mapi-addresses";
const SLUG = "mapi-address-layer";

const SRC = {
  dataset: "https://www.odata.org.il/dataset/ac1ae1fa-6d43-4685-8434-9953e950ca9b",
  themarker:
    "https://www.themarker.com/captain-internet/2025-02-02/ty-article/.premium/00000194-44ac-d924-a59f-76edf3930000",
  realEstatePost: "/haplilist/real-estate-deals-open",
};

/* ─────────────────────────── Case documents ─────────────────────────── */

type Doc = {
  file: string;
  category: "letter" | "court";
  title: string;
  description: string;
  docDate: string;
  sortDate: string;
  citation?: string;
  authority?: string;
};

const DOCS: Doc[] = [
  {
    file: "api-mapi-addresses-warning-letter-2024-12-12.pdf",
    category: "letter",
    title: "מכתב ההתראה של פרקליטות המדינה",
    description:
      "\"התראה טרם נקיטת הליכים משפטיים\": דרישה להסיר את שכבת הכתובות לאלתר, טענה לזכויות יוצרים של המדינה, \"רישיון\" בשווי 100,000 יורו, פיצוי ללא הוכחת נזק של 100,000 ש\"ח לכל הפרה ואיום באחריות אישית של נושאי המשרה בעמותה.",
    docDate: "12.12.2024",
    sortDate: "2024-12-12T19:02:00.000Z",
    citation: "היחידה לאכיפה אזרחית → התמנון, עמיחי וורמס, גיא זומר",
    authority: "פרקליטות המדינה, היחידה לאכיפה אזרחית",
  },
  {
    file: "api-mapi-addresses-dafna-email-2024-12-12.pdf",
    category: "letter",
    title: "\"מצוין, תודה רבה\": מייל התשבחות של מנהלת היחידה",
    description:
      "שעתיים אחרי מכתב ההתראה, מנהלת היחידה לאכיפה אזרחית מודה לפרקליטים ששלחו אותו, ב\"השב לכולם\" שהגיע גם למקבלי המכתב.",
    docDate: "12.12.2024",
    sortDate: "2024-12-12T21:05:00.000Z",
    citation: "אסנת דפנה → אביטל קלר ואחרים",
    authority: "פרקליטות המדינה",
  },
  {
    file: "api-mapi-addresses-klinger-reply-2024-12-22.pdf",
    category: "letter",
    title: "המענה: אין זכויות יוצרים בנתונים",
    description:
      "עו\"ד יהונתן קלינגר דוחה את מכתב ההתראה: סעיף 5 לחוק זכות יוצרים שולל הגנה על נתונים, הפסיקה עקבית בכך, המידע חייב בפרסום לפי חוק חופש המידע ולפי החלטת הממשלה, וממילא היה צריך להופיע ב-data.gov.il.",
    docDate: "22.12.2024",
    sortDate: "2024-12-22T10:00:00.000Z",
    citation: "עו\"ד יהונתן קלינגר → עו\"ד אביטל קלר",
    authority: "בשם התמנון, עמיחי וורמס וגיא זומר",
  },
  {
    file: "api-mapi-30638-petition-2025-12-10.pdf",
    category: "court",
    title: "העתירה המנהלית",
    description:
      "עתירה לפי חוק חופש המידע לקבלת החומר שעמד מאחורי מכתב ההתראה: ההתכתבויות, הגורמים שפנו לעמותה, המסמכים ששימשו בסיס לפנייה ופרוטוקולים של ישיבות.",
    docDate: "10.12.2025",
    sortDate: "2025-12-10T10:00:00.000Z",
    citation: "עת\"מ 30638-12-25 זומר נ' אדמסו ואח'",
    authority: "בית המשפט המחוזי בתל אביב בשבתו כבית משפט לעניינים מנהליים",
  },
  {
    file: "api-mapi-30638-state-response-2026-04-13.pdf",
    category: "court",
    title: "התגובה המקדמית של המדינה",
    description:
      "מפ\"י טוענת לחיסיון של התייעצות פנימית (סעיף 9(ב)(4)), ומודה כי מעבר למכתב ההתראה לא ננקטו כל צעדי אכיפה וכי הקובץ לא הוסר.",
    docDate: "13.4.2026",
    sortDate: "2026-04-13T10:00:00.000Z",
    citation: "עת\"מ 30638-12-25",
    authority: "פרקליטות מחוז תל אביב (אזרחי), בשם המרכז למיפוי ישראל",
  },
  {
    file: "api-mapi-30638-transcript-2026-04-20.pdf",
    category: "court",
    title: "תמליל הדיון, 20.4.2026",
    description:
      "בית המשפט מציע לעיין בחומר במעמד צד אחד; המדינה מסרבת. וגם: הקובץ שמכתב ההתראה העריך ב-100,000 יורו תומחר בוועדת המחירים של מפ\"י בכ-20,000 ש\"ח.",
    docDate: "20.4.2026",
    sortDate: "2026-04-20T10:00:00.000Z",
    citation: "עת\"מ 30638-12-25",
    authority: "כב' השופטת לימור ביבי",
  },
  {
    file: "api-mapi-30638-decision-2026-04-20.pdf",
    category: "court",
    title: "החלטה בדיון, 20.4.2026",
    description: "תיעוד הדיון בהקלטה, דחיית הדיון ומועדים להמצאת העתירה למשיב 4.",
    docDate: "20.4.2026",
    sortDate: "2026-04-20T12:00:00.000Z",
    citation: "עת\"מ 30638-12-25",
    authority: "כב' השופטת לימור ביבי",
  },
  {
    file: "api-mapi-30638-state-particulars-2026-06-10.pdf",
    category: "court",
    title: "תגובת המדינה לבקשה לפרטים נוספים",
    description: "המדינה מתנגדת למסור פרטים נוספים על החומר שבמחלוקת.",
    docDate: "10.6.2026",
    sortDate: "2026-06-10T10:00:00.000Z",
    citation: "עת\"מ 30638-12-25",
    authority: "פרקליטות מחוז תל אביב (אזרחי), בשם משיבים 1–3 ו-5",
  },
];

const MEDIA = {
  url: SRC.themarker,
  title: "פעיל חופש מידע פירסם נתונים גיאוגרפיים — המדינה מאיימת לתבוע על הפרת זכויות יוצרים",
  description: "הפרקליטות נלחמת בעמותת התמנון באמצעות איום בתביעת זכויות יוצרים על פרסום נתונים ציבוריים",
  type: "article",
  source: "TheMarker",
  date: "2025-02-02",
  isActive: true,
  thumbnailUrl: "/uploads/media-thumb-cmn1dg5ql0001d89olskgqakv.png",
  caseTag: CASE_TAG,
};

/* ─────────────────────────── TipTap helpers ─────────────────────────── */

type Part = string | { text: string; href: string } | { text: string; bold: true };
const a = (text: string, href: string): Part => ({ text, href });
const b = (text: string): Part => ({ text, bold: true });

function textNode(part: Part) {
  if (typeof part === "string") return { type: "text", text: part };
  if ("href" in part) {
    return { type: "text", text: part.text, marks: [{ type: "link", attrs: { href: part.href, target: "_blank" } }] };
  }
  return { type: "text", text: part.text, marks: [{ type: "bold" }] };
}
const p = (...parts: Part[]) => ({ type: "paragraph", content: parts.map(textNode) });
const h2 = (text: string) => ({ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text }] });
const quote = (text: string, who: string) => ({ type: "blockquote", content: [p(text), p(`— ${who}`)] });
const doc = (file: string) => `/uploads/${file}`;

/* ──────────────────────────────── Post ──────────────────────────────── */

const TITLE = "100,000 יורו על רשימת כתובות";
const EXCERPT =
  "פרסמנו חצי מיליון כתובות בישראל עם הקואורדינטות שלהן, מידע שהמדינה מציגה בחינם באתר שלה. הפרקליטות שלחה מכתב איום על הפרת זכויות יוצרים, ומנהלת היחידה שלחה אחריו מייל תודה. עכשיו אני בבית המשפט כדי לדעת מה עמד מאחוריו.";

const content = {
  type: "doc",
  content: [
    p(b(EXCERPT)),

    h2("רשימה של כתובות"),

    p(
      `ב-20 בנובמבר 2024 פרסמנו בעמותת התמנון, ב`,
      a("מידע לעם", SRC.dataset),
      `, קובץ אקסל אחד: יותר מחצי מיליון כתובות בישראל, ולצד כל כתובת הקואורדינטות שלה. מי שעובד עם מידע יודע כמה הקובץ הזה שימושי: הוא הופך כל טבלה עם כתובות למפה. בלעדיו, חוקר, עיתונאי או ארגון קטן שרוצים למפות נתונים צריכים לשלם, או לוותר.`,
    ),

    p(
      `את המידע הזה המדינה מציגה בחינם. כל אחד יכול להקליד כתובת באתר של המרכז למיפוי ישראל (מפ"י) ולקבל את הקואורדינטות שלה. אבל רק אחת-אחת, בלי אפשרות לעבד את המידע בהיקף. יחד עם אנדי וורמס כתבנו סקריפט קטן שעשה את מה שכל אזרח יכול לעשות ידנית, רק הרבה פעמים, ופרסמנו את התוצאה לשימוש חופשי.`,
    ),

    h2("מכתב בתשע בלילה"),

    p(
      `עוד באותו יום התקשרו מטעם מפ"י ודרשו להסיר את הקובץ. סירבנו. שלושה שבועות אחר כך, ביום חמישי, 12 בדצמבר 2024, בשעה 21:02, הגיע `,
      a("מכתב ההתראה", doc("api-mapi-addresses-warning-letter-2024-12-12.pdf")),
      ` מהיחידה לאכיפה אזרחית בפרקליטות המדינה, לעמותה, לאנדי ולי אישית.`,
    ),

    p(
      `לפי המכתב, שכבת הכתובות היא "מוצר שיש לשלם עבורו", רישיון לשימוש מסחרי בה עולה 100,000 יורו, ופרסומה בחינם הוא הפרה של זכויות היוצרים של המדינה. המכתב דרש להסיר את הקובץ "לאלתר", מכל מקום שאליו הגיע, הזכיר פיצוי ללא הוכחת נזק של 100,000 ש"ח "עבור כל הפרה", ואיים באחריות אישית של נושאי המשרה בעמותה.`,
    ),

    p(
      `שעתיים אחר כך, ב-23:05, מנהלת היחידה לאכיפה אזרחית `,
      a("השיבה למייל", doc("api-mapi-addresses-dafna-email-2024-12-12.pdf")),
      ` כדי להחמיא לפרקליטים ששלחו אותו. היא לחצה "השב לכולם", כך שהמייל הגיע גם אלינו:`,
    ),

    quote("מצוין, תודה רבה אביטל ויהונתן! שבת שלום", "מנהלת היחידה לאכיפה אזרחית בפרקליטות המדינה"),

    h2("אין זכויות יוצרים בעובדות"),

    p(
      `התשובה המשפטית פשוטה, ועו"ד יהונתן קלינגר `,
      a("כתב אותה", doc("api-mapi-addresses-klinger-reply-2024-12-22.pdf")),
      ` בשמנו עשרה ימים אחר כך. סעיף 5 לחוק זכות יוצרים קובע במפורש שלא תהיה זכות יוצרים בנתונים, והפסיקה עקבית בכך: אוסף עובדות שאין בבחירתן או בסידורן יצירתיות אינו יצירה מוגנת. מעבר לזה, מדובר במידע שהמדינה חייבת לפרסם לפי חוק חופש המידע ולפי החלטת הממשלה על פתיחת מאגרי מידע, ושהיה צריך להיות ב-data.gov.il מזמן.`,
    ),

    p(
      `גם המומחים הסכימו. "בניגוד למפות, עובדות אינן מוגנות בזכויות יוצרים. נתוני מיקום גיאוגרפיים הם עובדות", אמר פרופ' מיכאל בירנהק ל`,
      a("TheMarker", SRC.themarker),
      `, שסיקר את הפרשה בפברואר 2025. מפ"י, מצדה, אמרה שם שמעשה העמותה הוא "פיראטיות לשמה", ושחלק משמעותי מתקציבה, כ-35%, מגיע ממכירת מוצרים כמו שכבת הכתובות.`,
    ),

    p(
      `מאז, אגב, לא קרה כלום. לא תביעה ולא הליך. הקובץ עדיין באוויר.`,
    ),

    h2("מה עמד מאחורי המכתב?"),

    p(
      `אבל השאלה שהטרידה אותי היא אחרת: איך מגיעה היחידה לאכיפה אזרחית של הפרקליטות לשלוח מכתב איום על רשימת כתובות? מי פנה אליה, מה נאמר לה, ומאיפה הגיע הסכום של 100,000 יורו?`,
    ),

    p(
      `ביולי 2025 הגשתי בקשת חופש מידע לקבל את החומר הזה: את ההתכתבויות, את זהות הגורמים שפנו לעמותה, את המסמכים ששימשו בסיס לפנייה ואת הפרוטוקולים. מפ"י סירבה, בטענה שמדובר בהתייעצות פנימית. בדצמבר 2025 הגשתי `,
      a("עתירה מנהלית", doc("api-mapi-30638-petition-2025-12-10.pdf")),
      ` לבית המשפט המחוזי בתל אביב (עת"מ 30638-12-25).`,
    ),

    p(
      `ב`,
      a("תגובה המקדמית", doc("api-mapi-30638-state-response-2026-04-13.pdf")),
      ` של המדינה יש שני אישורים חשובים. הראשון: "עד כה טרם ננקטו צעדי אכיפה או ננקטו צעדים משפטיים כנגד העותר או עמותת 'התמנון', זולת שליחת מכתב ההתראה". השני: "הקובץ האמור לא הוסר מהפלטפורמות בהן פורסם". כלומר, האיום נשאר איום.`,
    ),

    h2("100,000 יורו, או 20,000 שקל"),

    p(
      `בדיון שהתקיים ב-20 באפריל 2026 קרו שני דברים שכדאי לקרוא `,
      a("בתמליל", doc("api-mapi-30638-transcript-2026-04-20.pdf")),
      ` המלא.`,
    ),

    p(
      `הראשון נוגע למחיר. לפי הפרוטוקול של ועדת המחירים של מפ"י עצמה, הקובץ הזה עולה כ-20,000 ש"ח. לגוף האכיפה של המדינה נמסר שהוא שווה 100,000 יורו, והסכום הזה הוא שהופיע במכתב האיום. מי שמעביר מידע לא מדויק לגורמי אכיפה, כדי שיפעלו נגד אזרחים, לא אמור ליהנות מחיסיון על כך.`,
    ),

    p(
      `השני נוגע לשקיפות. השופטת הציעה לעיין בעצמה בחומר, במעמד צד אחד, כדי לבדוק אם הוא באמת חסוי. המדינה סירבה. באת כוחה הסבירה את הסירוב, בין היתר, ב"התנהלות של העותר שהיא שערורייתית בעיניי".`,
    ),

    p(
      `ההליך עדיין מתנהל. אעדכן כאן, ומסמכי התיק יתווספו למטה ככל שיתקדם.`,
    ),

    h2("למה זה חשוב"),

    p(
      `שכבת כתובות עם קואורדינטות היא תשתית. היא מאפשרת למפות כל דבר שיש לו כתובת: מחירי דירות, עבירות, מרפאות, מקלטים. בכל העולם, מאגרים כאלה פתוחים, ו`,
      a("מחקרים מראים", "/haplilist/what-is-a-closed-database-worth"),
      ` שהערך שהם מייצרים כשהם פתוחים גדול פי כמה מההכנסה שהם מניבים כשהם נמכרים. במקרה הזה, המדינה בחרה לא רק למכור את המידע, אלא לאיים על מי שהנגיש אותו.`,
    ),

    p(
      `זה לא המקרה היחיד. גם `,
      a("פתיחת מאגר עסקאות הנדל\"ן", SRC.realEstatePost),
      ` נענתה בחסימה. המכנה המשותף הוא שגופים ציבוריים מתייחסים למידע שהם מחזיקים בשביל הציבור כאל רכוש שלהם. הוא לא.`,
    ),
  ],
};

/* ─────────────────────────────── Runner ─────────────────────────────── */

async function main() {
  const dir = process.argv[2];
  if (!dir) throw new Error("usage: create-mapi-addresses-post.ts <dir-with-the-pdfs>");
  const key = process.env.ZG_API_KEY;
  if (!key) throw new Error("ZG_API_KEY is not set (put it in .env.local).");
  const auth = { Authorization: `Bearer ${key}` };
  const json = { ...auth, "Content-Type": "application/json" };

  for (const [i, d] of DOCS.entries()) {
    const bytes = readFileSync(path.join(dir, d.file));
    const up = await fetch(`${SITE}/api/v1/uploads/${d.file}`, {
      method: "PUT",
      headers: { ...auth, "Content-Type": "application/pdf" },
      body: bytes,
    });
    if (!up.ok) throw new Error(`upload ${d.file}: ${up.status} ${await up.text()}`);
    const { file, ...meta } = d;
    const res = await fetch(`${SITE}/api/v1/case-documents`, {
      method: "PUT",
      headers: json,
      body: JSON.stringify({ ...meta, caseTag: CASE_TAG, fileUrl: doc(file), order: i + 1, isActive: true }),
    });
    if (!res.ok) throw new Error(`document ${d.file}: ${res.status} ${await res.text()}`);
    console.log(`doc ${i + 1}/${DOCS.length}: ${d.title} (${Math.round(bytes.length / 1024)}KB)`);
  }

  const m = await fetch(`${SITE}/api/v1/media-appearances`, { method: "PUT", headers: json, body: JSON.stringify(MEDIA) });
  console.log("media:", m.status, await m.text());
  if (!m.ok) process.exit(1);

  const tags = ["חופש מידע", "מידע ציבורי", "זכויות יוצרים", "מידע גיאוגרפי"];
  const post = await fetch(`${SITE}/api/v1/plilist/${SLUG}`, {
    method: "PUT",
    headers: json,
    body: JSON.stringify({ title: TITLE, content, excerpt: EXCERPT, seoTitle: TITLE, seoDesc: EXCERPT, tags, caseTag: CASE_TAG }),
  });
  console.log("post:", post.status, await post.text());
  if (!post.ok) process.exit(1);
}

main().catch((e) => {
  console.error("ERROR:", e instanceof Error ? e.message : e);
  process.exit(1);
});
