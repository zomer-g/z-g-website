/**
 * Seeds the "tolaat-hamishpat" case: the הפליליסט post about תולעת המשפט, the
 * rulings the project won over the years, and the existing press coverage of it.
 *
 * Same shape as seed-better-rail-case.ts, with two differences:
 *
 * - The PDFs are NOT in git. The repo is public and the rulings name private
 *   litigants, so the files are loaded straight into the uploaded_files table,
 *   which /uploads/[filename] serves first. No deploy is needed. Point
 *   TM_FILES_DIR at the folder holding the (already redacted) PDFs.
 * - Much of the coverage already exists on /media. Those rows are tagged and
 *   keep their visibility; only new items are created (hidden until --live).
 *
 * Idempotent: files upsert on filename, documents match on (caseTag, fileUrl),
 * the post upserts on slug. Seeds hidden by default; `--live` publishes.
 *
 * DATABASE_URL must point at the live DB (db.xhostd.com). The local .env still
 * points at the retired Render DB, so pass it in the environment.
 */

import "dotenv/config";
import { readFile } from "fs/promises";
import path from "path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const CASE_TAG = "tolaat-hamishpat";
const SLUG = "tolaat-hamishpat-open-court";

const LIVE = process.argv.includes("--live");
const POST_STATUS = LIVE ? "PUBLISHED" : "DRAFT";
const FILES_DIR = process.env.TM_FILES_DIR;

/* ─────────────────────────── Press coverage ─────────────────────────── */

interface Coverage {
  url: string;
  date: string; // ISO — /media sorts this column as a string
  // New items only. A url already on /media is just tagged, and `fix` (below)
  // corrects fields that were verified wrong on the existing row.
  source?: string;
  title?: string;
  description?: string;
  type?: "article" | "video" | "podcast";
  fix?: { title?: string; date?: string; description?: string; url?: string };
  oldUrl?: string; // a previous address of the same row
}

// Everything the project got over the years, oldest first — this is also the
// order of the case file. `order` is read only by the case file (/media sorts
// by date), so renumbering the existing rows moves nothing on /media.
const COVERAGE: Coverage[] = [
  {
    url: "https://www.the7eye.org.il/236311",
    date: "2017-02-11",
    type: "podcast",
    source: "העין השביעית — קול העין",
    title: "קול העין: תביעת המיליון נגד שרון שפורר, אריה שקד נגד יואב יצחק, אמיר חייק על לילה כלכלי ופרויקט ביג דאטה משפטי",
    description:
      "פרק בתוכנית הרדיו של העין השביעית וקול הקמפוס. באחד מפריטיו מציג אנדי וורמס את תולעת המשפט בשלביו הראשונים: פרויקט ביג דאטה שמנגיש את נתוני בתי המשפט.",
  },
  {
    url: "https://www.the7eye.org.il/236310",
    date: "2017-02-16",
    source: "העין השביעית",
    title: "תולעת במערכת",
    description:
      "ראיון עם אנדי וורמס על פרויקט שמחלץ נתונים מאתר הרשות השופטת לגיליונות פתוחים, כדי לאפשר ניתוח של עומס שופטים, מינויים ודפוסי התדיינות.",
  },
  {
    url: "https://portal.takdin.co.il/Article/Article/5941050",
    date: "2018-02-22",
    source: "תקדין",
    title: "הכירו את \"התולעת\": המיזם החתרני שפועל לשקיפות במערכת המשפט",
    description:
      "פרופיל של המיזם ושל הרובוט שסורק את נט המשפט, עם ממצאים ראשונים: פערים בין שופטים בשיעורי המעצר, התובע הסדרתי הגדול בתביעות קטנות, ויותר מ-7,000 תובענות ייצוגיות.",
  },
  {
    url: "https://www.the7eye.org.il/330479",
    date: "2019-05-27",
    source: "העין השביעית",
    title: "מחקר: תופעת תביעות ההשתקה צוברת תאוצה",
    description:
      "דיווח על מחקר שערכתי על נתוני תולעת המשפט, שמצא עלייה עקבית במספר תביעות לשון הרע ובסכומים הנתבעים בשנים 2010–2017.",
  },
  {
    url: "https://shakuf.co.il/9502",
    date: "2019-08-21",
    source: "שקוף",
    title: "רוצים להיות זבוב על הקיר של אמיר אוחנה? הכירו את מאגר המידע החדש שינגיש לכם את פסקי הדין",
    description:
      "כתבה על השקת אתר תולעת המשפט כמאגר חינמי ופתוח של תיקים ופסקי דין מנט המשפט, על רקע התשלום שהמדינה משלמת לחברות פרטיות על מאגרי פסיקה.",
  },
  { url: "https://www.haaretz.co.il/captain/software/2019-11-01/ty-article/.premium/0000017f-f459-d47e-a37f-fd7d5b3f0000", date: "2019-11-01" },
  { url: "https://news.walla.co.il/item/3368198", date: "2020-06-20" },
  {
    url: "https://www.srugim.co.il/482690",
    date: "2020-08-21",
    source: "סרוגים",
    title: "העליון קבע: למסור את כל ההחלטות במשפט נתניהו",
    description:
      "הכתבה מציינת שפרויקט תולעת המשפט של עמותת התמנון מנהל מאבק לפרסום ההחלטות שבתי המשפט נותנים בפתקים.",
  },
  {
    url: "https://www.the7eye.org.il/385495",
    date: "2020-08-26",
    fix: {
      date: "2020-08-26",
      title: "נתונים חלקיים, מסקנות לא מייצגות: מבט ביקורתי על דו\"ח חופש המידע הממשלתי",
      description:
        "מאמר שכתבתי על דוח היחידה הממשלתית לחופש המידע. בדיקה של תולעת המשפט הראתה שהדוח ניתח רק 137 מתוך 494 עתירות חופש מידע שהסתיימו ב-2019.",
    },
  },
  { url: "https://www.themarker.com/magazine/2020-11-02/ty-article-static-ext/0000017f-e54c-d7b2-a77f-e74f486b0000", date: "2020-11-02" },
  {
    url: "https://newmedia.calcalist.co.il/magazine-10-12-20/m02.html",
    date: "2020-12-10",
    source: "כלכליסט",
    title: "עו\"ד אילנה סקר חברה בוועדה למינוי שופטים. זה לא מפריע לה ולמשרדה לייצג לקוחות בפני שופטים שהיא יכולה לחרוץ את עתידם המקצועי",
    description:
      "תחקיר במוסף כלכליסט שנשען על נתוני תולעת המשפט כדי לאתר יותר מ-1,000 תיקים שבהם ייצג משרדה של חברת הוועדה לבחירת שופטים.",
  },
  {
    url: "https://news.walla.co.il/item/3410202",
    date: "2021-01-08",
    source: "וואלה",
    title: "המהלך שיכול לעזור לנתניהו להימנע מקמפיין בצל העדויות",
    description:
      "טור שעוסק ברובו בעתירה שהגשתי נגד הנהלת בתי המשפט לקבלת רשימת התיקים החסויים: מספר תיק, שופט ומועדים.",
  },
  { url: "https://13tv.co.il/item/news/domestic/crime-and-justice/police-complaints-1307014/", date: "2021-08-05" },
  { url: "https://www.globes.co.il/news/article.aspx?did=1001387868", date: "2021-10-19" },
  {
    url: "https://www.globes.co.il/news/article.aspx?did=1001390209",
    date: "2021-11-09",
    source: "גלובס",
    title: "המכורים לתביעות ייצוגיות: אלה עורכי הדין והמשרדים המובילים",
    description:
      "ניתוח של עורכי הדין והמשרדים שמגישים הכי הרבה תובענות ייצוגיות, המבוסס במפורש על מאגר תולעת המשפט.",
  },
  {
    url: "https://www.shomrim.news/hebrew/476",
    date: "2021-11-28",
    source: "שומרים",
    title: "חשיפה: השופט כבוב לא נתן גילוי נאות על הקשר עם עורך דינו",
    description:
      "תחקיר על תיקים שבהם דן השופט כבוב. הבדיקה בנט המשפט נעשתה בין השאר בסיוע תולעת המשפט.",
  },
  // The row said 1.1.2023; the article is from 27.12.2021.
  { url: "https://www.ice.co.il/career/news/article/839133", date: "2021-12-27", fix: { date: "2021-12-27" } },
  { url: "https://www.idi.org.il/books/38952", date: "2022-01-01" },
  {
    url: "https://finance.walla.co.il/item/3481772",
    date: "2022-01-09",
    source: "וואלה כסף",
    title: "האם ניתן לתבוע את פייסבוק בביהמ\"ש בישראל?",
    description:
      "כתבה שנשענת על חיפוש במאגר תולעת המשפט, שמעלה עשרות תביעות נגד פייסבוק בבתי המשפט בישראל.",
  },
  { url: "https://www.globes.co.il/news/article.aspx?did=1001401121", date: "2022-02-05" },
  { url: "https://www.shomrim.news/hebrew/494", date: "2022-02-09" },
  {
    url: "https://finance.walla.co.il/item/3514147",
    date: "2022-06-23",
    source: "וואלה כסף",
    title: "רמי לוי נגד מנכ\"ל מגדלי הדגים: למה הוא תובע בשנית?",
    description:
      "הידיעה על תביעת הדיבה החוזרת של רמי לוי נחשפה, לפי הכתבה, באתר תולעת המשפט.",
  },
  {
    url: "https://www.ice.co.il/law/news/article/865739",
    date: "2022-06-23",
    source: "ice",
    title: "רמי לוי תובע חצי מיליון שקל: מי עשויים לשלם?",
    description:
      "גם כאן הדיווח על תביעת הדיבה של רמי לוי מיוחס לאתר תולעת המשפט.",
  },
  {
    url: "https://finance.walla.co.il/item/3516263",
    date: "2022-07-04",
    source: "וואלה כסף",
    title: "למה תובעת שופרסל את תאגיד איסוף המכלים?",
    description:
      "כתב התביעה של שופרסל נגד תאגיד אל\"ה אותר, לפי הכתבה, באמצעות תולעת המשפט.",
  },
  { url: "https://www.globes.co.il/news/article.aspx?did=1001420722", date: "2022-08-08" },
  {
    url: "https://www.ice.co.il/research/news/article/874774",
    date: "2022-08-08",
    source: "ice",
    title: "רשות המסים נחשפה: כך תצליחו להפחית את המס",
    description:
      "מחקר על 16,314 תיקי ערעורי מס שנעשה בעזרת אנדי וורמס ובעזרתי, מעמותת התמנון המפעילה את תולעת המשפט.",
  },
  {
    url: "https://www.globes.co.il/news/article.aspx?did=1001420852",
    date: "2022-08-09",
    source: "גלובס",
    title: "משבר השכירות: שיא במספר תביעות הפינוי שמגיעות לבתי המשפט",
    description:
      "כתבה על שיא בתביעות לפינוי שוכרים, המבוססת בין היתר על בדיקה של תולעת המשפט בנתוני נט המשפט.",
  },
  {
    url: "https://www.the7eye.org.il/472274",
    date: "2022-12-06",
    source: "העין השביעית",
    title: "אלי ובתיה ציפורי מתחרטים: מבקשים למחוק תביעה בסך כחצי מיליון שקל, אחרונה בשרשרת תביעות נגררות",
    description:
      "דיווח על בקשת בני הזוג ציפורי למחוק את תביעת הפרטיות והדיבה שהגישו נגד עמותת התמנון בגלל פרסום בתולעת המשפט, ועל טענת העמותה שמדובר בשרשרת תביעות נגררות.",
  },
  {
    url: "https://news.walla.co.il/item/3561519",
    date: "2023-02-27",
    source: "וואלה",
    title: "השר לענייני תביעות דיבה: בכמה הליכים משפטיים בן גביר מעורב?",
    description:
      "בדיקה שנערכה באמצעות מאגר תולעת המשפט ומנתה את תביעות הדיבה שהשר בן גביר מעורב בהן.",
  },
  {
    url: "https://www.odata.org.il/dataset/f24bf9e2-a01e-4066-b74b-788f8bb3199e",
    date: "2023-05-13",
    source: "ועדת אנגלרד",
    title: "דוח הוועדה הציבורית לבחינת שאלות הנוגעות לפרסום פרטים מזהים בפסקי-דין ובהחלטות של בתי המשפט ולעיון בתיקי בתי המשפט",
    description:
      "הדוח הסופי של הוועדה, שהוגש לשר המשפטים ב-2023. אחת מפסקאותיו מתארת את תולעת המשפט ואת משמעות האינדוקס של החלטות שיפוטיות במנועי חיפוש.",
  },
  {
    url: "https://news.walla.co.il/item/3605571",
    date: "2023-08-30",
    source: "וואלה",
    title: "הסכום שיאיר נתניהו שילם בגין התביעות המשפטיות נגדו",
    description:
      "לפי נתוני תולעת המשפט ונבו, יאיר נתניהו מעורב ב-26 הליכים משפטיים מאז 2017.",
  },
  {
    url: "https://www.the7eye.org.il/509786",
    date: "2024-02-17",
    source: "העין השביעית",
    title: "מגיפת תביעות הדיבה: ב-2023 הוגשו בישראל כמעט שלוש תביעות לשון הרע מדי יום",
    description:
      "ניתוח נתוני תולעת המשפט על היקף תביעות הדיבה בישראל: 1,054 תביעות ב-2023, והמגמה לאורך עשור.",
  },
  {
    url: "https://www.globes.co.il/news/article.aspx?did=1001476262",
    date: "2024-04-11",
    source: "גלובס",
    title: "אלפי תביעות נגד עסקים: הכירו את שיטת מצליח של עורכי הדין",
    description:
      "כתבה על עורכי דין שמגישים אלפי תובענות ייצוגיות, המבוססת על בדיקה מקיפה של תולעת המשפט בנתוני נט המשפט.",
  },
  {
    url: "https://www.globes.co.il/news/article.aspx?did=1001501047",
    date: "2025-02-03",
    source: "גלובס",
    title: "נתונים חדשים מגלים: 2024 הייתה שנת שיא בתביעות לפינוי שוכרים",
    description:
      "כתבה על שיא בתביעות הפינוי ב-2024, המבוססת בין היתר על בדיקה של תולעת המשפט בנתוני נט המשפט.",
  },
  {
    url: "https://www.makorrishon.co.il/opinion/830740/",
    date: "2025-04-27",
    source: "מקור ראשון",
    title: "השקר הבוטה של ynet מסייע לפרוטקשן בחסות החוק",
    description:
      "טור דעה שמצטט את בדיקת תולעת המשפט לגלובס על עורכי דין שמגישים אלפי תובענות ייצוגיות.",
  },
  {
    url: "https://cdn.the7eye.org.il/uploads/2026/01/TEHOM_22-12-25_WEB-1.pdf",
    date: "2025-12-22",
    source: "העין השביעית ומכון ון ליר",
    title: "מדד התקשורת החופשית בישראל: על סף תהום",
    description:
      "פרק תביעות הדיבה בדוח נשען על מאגר של 13,777 תביעות דיבה מהשנים 2008–2024, שבניתי מנתוני תולעת המשפט.",
  },
  { url: "https://www.themarker.com/weekend/2025-12-26/ty-article-magazine/.highlight/0000019b-49df-d034-ab9b-c9dff81c0000", date: "2025-12-26" },
  {
    url: "https://www.the7eye.org.il/573617",
    date: "2026-02-03",
    source: "העין השביעית",
    title: "מחקר: העלייה במספר תביעות הדיבה נבלמה עם עליית ממשלת השינוי והתחדשה כשנפלה",
    description:
      "מחקר על תביעות הדיבה בשנים 2008–2024, המבוסס על מאגר תביעות הדיבה שבניתי מנתוני תולעת המשפט.",
  },
  { url: "https://www.israelhayom.co.il/news/law/article/20503250", date: "2026-05-10" },
  {
    // law.co.il moved the ruling from /05/11/ to /05/08/; the old address 404s.
    url: "https://www.law.co.il/computer-law/2026/05/08/uman-v-the-octopus-public-information-for-all-ra/",
    oldUrl: "https://www.law.co.il/computer-law/2026/05/11/uman-v-the-octopus-public-information-for-all-ra/",
    date: "2026-05-11",
    fix: { url: "https://www.law.co.il/computer-law/2026/05/08/uman-v-the-octopus-public-information-for-all-ra/" },
  },
  {
    url: "https://www.beithamishpat.co.il/post/court-2564",
    date: "2026-05-11",
    source: "בית המשפט",
    title: "ניצחון ל\"תולעת המשפט\": ביהמ\"ש דחה תביעה בעקבות פרסום פסקי דין",
    description:
      "דיווח על דחיית תביעת הפרטיות נגד העמותה, נגדי ונגד הנהלת בתי המשפט: פרסום מסמכים מהליכים פומביים מוגן גם כשיש בהם מידע אישי רגיש.",
  },
  { url: "https://www.bizportal.co.il/takdin/news/article/20031848", date: "2026-05-15" },
  {
    url: "https://www.the7eye.org.il/584639",
    date: "2026-05-23",
    fix: {
      date: "2026-05-23",
      title: "פסק דין: הזכות לפרטיות נסוגה מפני עיקרון פומביות הדיון",
      description:
        "דיווח על פסק הדין שדחה את התביעה נגד תולעת המשפט וקבע שפרסום נכון והוגן של מסמכים מהליכים פומביים מוגן, גם כשהוא פוגע בפרטיות.",
    },
  },
  {
    url: "https://www.beithamishpat.co.il/post/court-2646",
    date: "2026-06-08",
    source: "בית המשפט",
    title: "השופטת מזהירה את חבריה השופטים: \"פומביות הדיון היא אינטרס ציבורי\"",
    description:
      "דיווח על החלטת השופטת דורית פיינשטיין שביטלה צו איסור פרסום בתביעה נגד התמנון ונגד החברה המפעילה את תולעת המשפט, וקראה לשופטים להיזהר במתן צווים כאלה.",
  },
  {
    url: "https://www.the7eye.org.il/590800",
    date: "2026-07-28",
    source: "העין השביעית",
    title: "מחקר ראשון מסוגו משרטט את התהליך המהיר והמדאיג שבו נשחק חופש המידע בישראל",
    description:
      "דיווח על מחקר שמיפה כ-4,000 עתירות חופש מידע בשנים 2012–2024. תשתית הנתונים שלו נבנתה מתולעת המשפט.",
  },
];

/* ──────────────────────────── Case documents ──────────────────────────── */

interface CaseDoc {
  title: string;
  description: string;
  citation: string;
  authority: string;
  docDate: string;
  file: string;
}

// Newest first: the leading judgment opens the list.
const RULINGS: CaseDoc[] = [
  {
    title: "אומן נ' התמנון — מידע ציבורי לכל (ע\"ר) ואח'",
    citation: 'ת"א 56708-12-22',
    authority: "בית משפט השלום בירושלים, השופטת מוריה צ'רקה",
    docDate: "8.5.2026",
    description:
      "פסק הדין המנחה. פרסום פסקי דין ומסמכים מתוך הליך פומבי, ככתבם וכלשונם, הוא דיווח נכון והוגן המוגן בחוק — גם כשיש בו מספר זהות, חתימה או מידע רפואי. התביעה נגד העמותה, נגדי ונגד הנהלת בתי המשפט נדחתה.",
    file: "tm-ruling-2026-05-08-ta-56708-12-22-jerusalem.pdf",
  },
  {
    title: "רחבי נ' התמנון — מידע ציבורי לכל (ע\"ר) ואח'",
    citation: 'ת"א 62532-05-24',
    authority: "בית משפט השלום בירושלים, השופטת הבכירה דורית פיינשטיין",
    docDate: "26.10.2025",
    description:
      "צו איסור הפרסום הארעי בוטל, והשופטת פנתה לחבריה בכל הערכאות להיזהר ממתן צווים כאלה לפנים משורת הדין. התובעת חויבה ב-18,000 ש\"ח שכר טרחה והוצאות.",
    file: "tm-ruling-2025-10-26-ta-62532-05-24-jerusalem.pdf",
  },
  {
    title: "בקשה לאיסור פרסום שם בדיעבד",
    citation: 'ת"פ 39077-08-15',
    authority: "בית משפט השלום בחיפה, השופט אחסאן חלבי",
    docDate: "25.5.2025",
    description:
      "בקשה לאסור את פרסום שמה של נאשמת כשמונה שנים לאחר שההליך הסתיים בלי הרשעה נדחתה. פומביות הדיון גוברת, ושינוי נקודת האיזון נתון למחוקק.",
    file: "tm-ruling-2025-05-25-tp-39077-08-15-haifa.pdf",
  },
  {
    title: "שי נ' תולעת יודעת בע\"מ ואח'",
    citation: 'ת"ק 23110-11-23',
    authority: "בית משפט לתביעות קטנות בראשון לציון, הרשמת הבכירה דורון זיו-אב",
    docDate: "11.2.2024",
    description:
      "תביעה בטענה שהמידע באתר חלקי. נגד עמיחי וורמוס ונגדי נדחתה, נגד החברה המפעילה נמחקה, והתובע חויב בהוצאות. מספרי הזהות ומספרי חשבונות הבנק הושחרו.",
    file: "tm-ruling-2024-02-11-tk-23110-11-23-rishon.pdf",
  },
  {
    title: "גיל נ' התמנון — מידע ציבורי לכל (ע\"ר)",
    citation: 'ת"ק 52838-11-22',
    authority: "בית משפט לתביעות קטנות ברחובות, השופטת לימור חלד-רון",
    docDate: "2.3.2023",
    description:
      "התובע חויב בערובה להוצאות, על רקע חשש לשימוש לרעה בהליכי משפט. ובסוף ההחלטה: ההליך אינו מתנהל בדלתיים סגורות.",
    file: "tm-ruling-2023-03-02-tk-52838-11-22-rehovot.pdf",
  },
  {
    title: "ציפורי ואח' נ' התמנון — מידע ציבורי לכל (ע\"ר) ואח'",
    citation: 'ת"א 3932-06-22 (פסק דין חלקי)',
    authority: "בית משפט השלום בתל אביב-יפו, השופטת עדי ניר בנימיני",
    docDate: "20.11.2022",
    description:
      "תביעה על 440,000 ש\"ח. נגד עמותה נוספת סולקה על הסף, והתובעים חויבו, ביוזמת בית המשפט, בערובה של 30,000 ש\"ח לנוכח סכום תביעה \"בלתי מידתי באורח ניכר\".",
    file: "tm-ruling-2022-11-20-ta-3932-06-22-tel-aviv.pdf",
  },
  {
    title: "כרמין נ' וורמוס",
    citation: 'ת"ק 57723-01-20',
    authority: "בית משפט לתביעות קטנות, הרשם הבכיר אורי הדר",
    docDate: "16.6.2020",
    description:
      "התביעה נגד מייסד האתר נדחתה בהסכמה, בכפוף להסרת פרסום מתיק מעצר שהתברר כי התנהל בדלתיים סגורות. מספרי הזהות הושחרו.",
    file: "tm-ruling-2020-06-16-tk-57723-01-20-small-claims.pdf",
  },
];

const fileUrl = (file: string) => `/uploads/${file}`;
const byCitation = (citation: string) =>
  RULINGS.find((r) => r.citation.startsWith(citation))!;

/* ──────────────────────────────── Post ──────────────────────────────── */

const TITLE = "תולעת המשפט: שבעה פסקי דין על פומביות הדיון";

const EXCERPT =
  "תולעת המשפט פתח לחיפוש לפי שם מיליוני תיקים מנט המשפט, וסירב להסיר מידע בלי צו של בית משפט. לאורך שש שנים המדיניות הזו נבחנה בבתי המשפט שוב ושוב, ועמדה בכל פעם. סקירה של המיזם, של העקרונות שנקבעו ושל כל אחד מפסקי הדין, והמסמכים עצמם במלואם.";

type Mark = { type: string; attrs?: Record<string, unknown> };
type Inline = { type: "text"; text: string; marks?: Mark[] };

const t = (text: string, ...marks: Mark[]): Inline =>
  marks.length ? { type: "text", text, marks } : { type: "text", text };
const bold: Mark = { type: "bold" };
const link = (href: string): Mark => ({
  type: "link",
  attrs: { href, target: "_blank" },
});

const p = (...parts: (string | Inline)[]) => ({
  type: "paragraph",
  content: parts.map((x) => (typeof x === "string" ? t(x) : x)),
});

const h2 = (text: string) => ({
  type: "heading",
  attrs: { level: 2 },
  content: [t(text)],
});

/** A ruling's heading, linked to its PDF. */
const h3 = (text: string, href: string) => ({
  type: "heading",
  attrs: { level: 3 },
  content: [t(text, link(href))],
});

/** The citation line under a ruling's heading. */
const meta = (doc: CaseDoc) =>
  p(t(`${doc.citation} · ${doc.authority} · ${doc.docDate}`, { type: "italic" }));

const bullets = (items: string[]) => ({
  type: "bulletList",
  content: items.map((text) => ({ type: "listItem", content: [p(text)] })),
});

/** A list item that opens with a bold lead-in. */
const led = (items: [string, string][]) => ({
  type: "bulletList",
  content: items.map(([lead, text]) => ({
    type: "listItem",
    content: [p(t(lead, bold), ` — ${text}`)],
  })),
});

const ruling = (citation: string, heading: string) => {
  const doc = byCitation(citation);
  return [h3(heading, fileUrl(doc.file)), meta(doc)];
};

const content = {
  type: "doc",
  content: [
    p(
      "אני כותב כאן הרבה על הנגשת מידע ציבורי. את רוב מה שאני יודע על המחיר שלה למדתי בתולעת המשפט.",
    ),
    p(
      "תולעת המשפט היה מיזם של עמותת התמנון – מידע ציבורי לכל, שהייתי בין מייסדיה. הרעיון היה פשוט: המידע על ההליכים בבתי המשפט בישראל כבר פומבי. הוא נמצא באתר נט המשפט, אבל כדי להגיע אליו צריך לדעת מספר תיק. תולעת המשפט אפשר לחפש אותו לפי שם: של תובע, של נתבע, של עורך דין. כך נפתחו לציבור כשישה מיליון תיקים.",
    ),
    p(
      "מי שלא שמח למצוא את שמו שם פנה אלינו. חלק ביקשו, חלק איימו וחלק תבעו. לאורך השנים הצטברה כך סדרה של החלטות ופסקי דין, מבית המשפט לתביעות קטנות ועד פסק דין של 34 עמודים, וכולם עוסקים באותה שאלה: מי מחליט מה מתוך הליך משפטי נשאר גלוי לציבור? התשובה הייתה זהה בכל הפעמים: בית המשפט, ולא מי שמפרסם.",
    ),
    p(
      "בעמוד הזה ריכזתי את כולם: מה היה המיזם, מה נקבע, סקירה של כל החלטה, ובתחתית העמוד המסמכים עצמם, במלואם.",
    ),

    h2("מה עשה תולעת המשפט"),
    p(
      "האתר ניזון משני מקורות. המקור העיקרי היה נט המשפט: תוכנה ייעודית העתיקה ממנו באופן אוטומטי את כל מה שהיה פתוח לציבור בלי הזדהות, מתוך תיקים שלא סווגו כחסויים: מספרי תיקים, שמות הצדדים, החלטות ופסקי דין. המקור השני היה מסמכים ששלחו אלינו אנשים פרטיים, כמו כתבי טענות, תצהירים והחלטות שהיו בידיהם.",
    ),
    p(
      "המידע אורגן סביב אנשים. לכל שם היה עמוד, ובו רשימת ההליכים שהאדם היה צד להם, עם קישורים להחלטות. זה מה שהפך את האתר לשימושי, וזה גם מה שהפך אותו לשנוי במחלוקת. מאגרי פסיקה מסחריים נועדו למצוא הלכות. תולעת המשפט נועד למצוא אנשים: לזהות תובעים סדרתיים, לראות מי ייצג את מי ובפני איזה שופט, ולאפשר לציבור לפקח על מערכת המשפט בפועל.",
    ),
    p(
      "המיזם זכה לסיקור ולמחקרים שנשענו על הנתונים שלו. הוא גם זכה לאיומים. כתבת המגזין של TheMarker על העמותה, בסוף 2025, הופיעה תחת הכותרת \"מרגע שהאתר עלה קיבלנו איומים, גם ברצח\". העמותה הפעילה את האתר עד 2022, ומאז הוא מופעל על ידי חברה פרטית, תולעת יודעת בע\"מ.",
    ),

    h2("מדיניות אחת: מסירים רק לפי צו"),
    p(
      "הלב של המיזם לא היה הטכנולוגיה אלא מדיניות ההסרה. בקשות להסרת תוכן הגיעו כל הזמן, והתשובה להן הייתה קבועה: לא נסיר מידע מתוך הליך פומבי, אלא אם בית משפט אסר את פרסומו. מי שהביא צו איסור פרסום, הפרסום ירד מיד. מי שלא, הופנה לבית המשפט.",
    ),
    p(
      "היו שני חריגים שקבענו בעצמנו: הסרת שם התובע בתביעות על נזקי גוף, והסרת שם הנאשם בתיקים פליליים שהסתיימו בקביעה שאינו כשיר לעמוד לדין. בשני המקרים ההליך כולו סובב סביב מצבו הרפואי של אדם.",
    ),
    p(
      "המדיניות הזו לא נבעה מעקשנות. אתר שמסיר תכנים לפי שיקול דעתו הופך לערכאה פרטית שמכריעה מי זכאי לפרטיות ומי לא, בלי סמכות, בלי כלים לברר את העובדות ובלי שהצד השני, הציבור, מיוצג. את הטיעון הזה הציגה בבית המשפט דווקא מי שביקשה להסיר את שמה: האתרים המשפטיים, טענה, \"אינם הגורמים המתאימים לקבלת החלטה\" כזו. היא צדקה, ולכן המקום לבקשה כזו הוא בית המשפט.",
    ),

    h2("מה נקבע"),
    p("שבע ההחלטות שלהלן ניתנו בערכאות שונות ובידי שופטים שונים. יחד הן מעגנות כמה עקרונות:"),
    led([
      [
        "פרסום נכון והוגן מוגן, גם כשהוא פוגע בפרטיות",
        "פרסום פסקי דין ומסמכים מתוך הליך פומבי, ככתבם וכלשונם, הוא דין וחשבון נכון והוגן, המוגן מכוח סעיף 18 לחוק הגנת הפרטיות וסעיף 13 לחוק איסור לשון הרע. ההגנה חלה גם כשיש במסמך מספר זהות, חתימה או מידע רפואי, ובלי קשר למניעי המפרסם.",
      ],
      [
        "בית המשפט קובע מה חסוי, לא המפרסם",
        "הגבול בין גלוי לחסוי נקבע בצו שיפוטי או בדיון בדלתיים סגורות. מקום שאין אף אחד מהם, הפרסום מותר, והסרה לפי צו היא התנהלות סבירה.",
      ],
      [
        "אין איסור פרסום בדיעבד בלי פגיעה חמורה מוכחת",
        "חלוף הזמן, סיום ההליך בלי הרשעה ואפילו התיישנות הרישום אינם מספיקים. שינוי נקודת האיזון נתון למחוקק.",
      ],
      [
        "צו איסור פרסום אינו מחווה",
        "שופטת בכירה פנתה לחבריה בכל הערכאות להיזהר ממתן צווים כאלה לפנים משורת הדין.",
      ],
      [
        "חובת זהירות מצומצמת",
        "רשלנות בפרסום מתוך הליך משפטי תקום רק כשאדם סביר היה צריך לצפות שהפרסום אסור. האפשרות לצפות נזק אינה מספיקה.",
      ],
      [
        "אין אחריות אישית בלי מעשה אישי",
        "מייסד או חבר ועד אינו אחראי אישית לפרסום אוטומטי של העמותה.",
      ],
      [
        "לתביעות השתקה יש מחיר",
        "ערובה להוצאות, גם ביוזמת בית המשפט, מחיקת תביעות והוצאות לטובת האתר ומפעיליו.",
      ],
    ]),

    h2("הפסיקה, תיק אחר תיק"),
    p(
      "לפי סדר כרונולוגי. כל כותרת מקשרת לקובץ המלא. במסמכים הושחרו מספרי זהות ומספרי חשבונות בנק, ומלבד זאת הם מוצגים כפי שניתנו.",
    ),

    ...ruling('ת"ק 57723-01-20', "2020 · כרמין נ' וורמוס: הקו שבין פתוח לסגור"),
    p(
      "התביעה הוגשה נגד עמיחי וורמוס, מייסד האתר ומתכנתו, באופן אישי, בגין פרסום שנגע לתיק מעצר ימים משנת 2011. בדיון התברר נתון שלא היה מוכר לאתר: בהחלטה בתיק המעצר צוין שהדיון נערך, לבקשת הצדדים, בדלתיים סגורות.",
    ),
    p(
      "התיק הסתיים בהסכמה. התביעה נגד וורמוס נדחתה, בכפוף להסרת הפרסום הנוגע לאותו תיק מעצר, וכל צד נשא בהוצאותיו. זו לא הייתה נסיגה מהמדיניות אלא יישום שלה: דיון בדלתיים סגורות אינו פומבי, ולכן הפרסום ממנו ירד. הרשם גם הקפיד לציין שפסק הדין עצמו פתוח לעיון הציבור.",
    ),

    ...ruling('ת"א 3932-06-22', "2022 · ציפורי נ' התמנון: 440 אלף ש\"ח וערובה"),
    p(
      "תביעה על 440,000 ש\"ח נגד העמותה, נגד עמותה נוספת ונגד היועץ המשפטי של התמנון, עו\"ד אלעד מן, בגין פרסום כתבי טענות באתר ובטוויטר. חלקם מתיק אחר שהתובעים ניהלו, וחלקם מהתיק הזה עצמו. לטענת התובעים נכללו בהם מספרי הזהות שלהם.",
    ),
    p(
      "התביעה נגד העמותה הנוספת סולקה על הסף, משום שלא נטענה כל עובדה הקושרת אותה לפרסום. את התביעה נגד התמנון ועו\"ד מן בית המשפט לא סילק בשלב המקדמי, אבל שרטט את התמונה: לתמנון עומדת לכאורה חסינות בפרסום כתב טענות מהליך פומבי; הטלת אחריות אישית על עורך דין בגין פעולות לקוחו \"עשויה לעורר קשיים משפטיים\"; וסכום התביעה \"בלתי מידתי באורח ניכר\" ביחס לנזק, שעיקרו תגובה של צד שלישי בטוויטר. בית המשפט ציין שהוא ער לטענה שזו תביעת השתקה.",
    ),
    p(
      "התוצאה המעשית: ביוזמתו, חייב בית המשפט את התובעים להפקיד ערובה להוצאות בסך 30,000 ש\"ח כתנאי להמשך ההליך.",
    ),

    ...ruling('ת"ק 52838-11-22', "2023 · גיל נ' התמנון: ערובה ודלתיים פתוחות"),
    p(
      "תביעה קטנה על 10,000 ש\"ח. בקשה לסעד זמני שהוגשה יחד איתה נדחתה, משום שבית המשפט לתביעות קטנות אינו מוסמך לתת אותו. העמותה ביקשה לסלק את התביעה על הסף ולחייב את התובע בערובה, והציגה רשימה של הליכים שניהל באותה שנה.",
    ),
    p(
      "בית המשפט מצא שהימנעות התובע מלהצהיר כנדרש על תביעותיו הקודמות מעלה חשש שהוא מסתיר את התמונה המלאה \"תוך שימוש לרעה בהליכי משפט\", וחייב אותו בערובה של 1,500 ש\"ח. ובשורה האחרונה של ההחלטה, קביעה קצרה ועקרונית: \"הליך זה אינו מתנהל בדלתיים סגורות\".",
    ),

    ...ruling('ת"ק 23110-11-23', "2024 · שי נ' תולעת יודעת: כשהטענה היא שהמידע חלקי"),
    p(
      "התביעה הופנתה נגד החברה שמפעילה היום את האתר, נגד עמיחי וורמוס ונגדי, בטענות של \"ספאם\" ולשון הרע. הטענה המרכזית: האתר מראה שהוגשה תביעה, אבל לא תמיד מראה איך הסתיימה.",
    ),
    p(
      "וורמוס העיד שהאתר מעתיק את הנתונים מנט המשפט באופן אוטומטי, מציין את מועד העדכון, ומעדכן לבקשת גולשים. אני הבהרתי שהעמותה חדלה להפעיל את האתר ב-2022. התובע חזר בו מטענת הספאם ואישר שאין לו טענה אישית נגד וורמוס או נגדי. התברר גם שכשפנה לחברה, נענה שאם הפרסום אינו מעודכן, הוא מוזמן לעדכן והפרסום יתוקן.",
    ),
    p(
      "התביעה נגדנו נדחתה, התביעה נגד החברה נמחקה, והתובע חויב בהוצאות של 500 ש\"ח לכל נתבע. התשובה למידע לא מעודכן היא עדכון, לא מחיקה.",
    ),

    ...ruling('ת"פ 39077-08-15', "2025 · איסור פרסום בדיעבד: פומביות הדיון גוברת גם אחרי שמונה שנים"),
    p(
      "אישה שהודתה בעבירות בכרטיס חיוב, ושההליך בעניינה הסתיים ב-2017 בלי הרשעה, ביקשה כשמונה שנים לאחר מכן לאסור את פרסום שמה, ולחלופין למנוע את מפתוח שמה באתרים שמפרסמים החלטות שיפוטיות באופן שיטתי. תולעת המשפט סירב להסיר את הפרסום בלי צו; אתר אחר הסיר אותו לבקשתה.",
    ),
    p(
      "יש בבקשה כזו מצוקה אמיתית, ובית המשפט התייחס אליה בכבוד. ובכל זאת, בהחלטה מנומקת של 19 עמודים, הבקשה נדחתה. פומביות הדיון היא הכלל, וסטייה ממנה מחייבת פגיעה חמורה בפרטיות שהנטל להוכיחה כבד. טענה כללית לפגיעה בפרנסה, בלי ראיה, אינה מספיקה, וגם לא חלוף הזמן. החוק גם אינו מבחין לעניין זה בין הרשעה לאי-הרשעה.",
    ),
    p(
      "החלק החשוב בהחלטה הוא הסיום. בית המשפט סקר את המלצות ועדת אנגלרד משנת 2023, שרוב חבריה המליצו לשנות את ברירת המחדל בהליכים פליליים, וקבע שכל עוד החוק לא שונה, אין להחיל אותן דרך צווי איסור פרסום פרטניים. זו מלאכה של המחוקק, לא של בית המשפט. ואוסיף: בוודאי שלא של אתר אינטרנט.",
    ),

    ...ruling('ת"א 62532-05-24', "2025 · רחבי נ' התמנון: שופטת פונה לחבריה"),
    p(
      "התביעה נגד התמנון ונגד החברה המפעילה נמחקה בפסק דין קודם. ההחלטה הזו עסקה בשתי שאלות שנותרו: האם צו איסור הפרסום הארעי שניתן בתיק יימשך, ומי יישא בהוצאות.",
    ),
    p(
      "הצו ניתן על רקע טענת התובעת שהנתבעים הפרו צווי איסור פרסום בתיקים אחרים. בקדם המשפט התבררו הטענות האלה \"כטענות לא נכונות\". בית המשפט קבע שאין צו איסור פרסום בהליך הזה, וגם לא בהליכים אחרים של התובעת, אלא אם ניתן לגביהם צו ספציפי.",
    ),
    p(
      "ואז הוסיפה השופטת פסקה שכדאי לקרוא במלואה. לאחר שעיינה בתיקים שבהם ניתנו צווים, כתבה שיש \"להיזהר במתן צו איסור פרסום לפנים משורת הדין\", ופנתה לחבריה השופטים בכל הערכאות. קל להיענות לבקשה להפוך הליך לחסוי, כתבה, ולהתעלם מהאינטרס הציבורי שלפיו ככלל ההליך יהיה פומבי.",
    ),
    p(
      "התנהלות התובעת נמצאה \"בלתי סבירה\", והיא חויבה בשכר טרחה של 15,000 ש\"ח ובהוצאות של 3,000 ש\"ח.",
    ),

    ...ruling('ת"א 56708-12-22', "2026 · אומן נ' התמנון: פסק הדין המנחה"),
    p(
      "בתיק הזה השאלה נשאלה במפורש, כבר בשורה הראשונה של פסק הדין: \"האם מותר לפרסם פסקי דין ומסמכים מתוך תיקים המתנהלים בבתי המשפט, למרות שהפרסום פוגע בפרטיות?\"",
    ),
    p(
      "התובע ניהל שורת הליכים בבתי הדין לעבודה. באתר התפרסמו מתוכם פסקי דין שכללו את מספר הזהות שלו, הסדרי פשרה שעליהם חתימתו, ופסק דין בערעור על ועדה רפואית שבו שמו הושמט, אבל שהיה מקושר לעמוד הנושא את שמו. הוא תבע את העמותה, אותי אישית, ואת הנהלת בתי המשפט, שממערכת נט המשפט שלה נמשך המידע. את העמותה ואותי ייצג עו\"ד יהונתן קלינגר מהקליניקה למניעת תביעות השתקה.",
    ),
    p(
      "בית המשפט לא הקל ראש בפגיעה. הוא קבע במפורש שפרטיותו של התובע נפגעה, ובעניין הקישור לפסק הדין הרפואי, באופן משמעותי. ובכל זאת התביעה נדחתה כולה:",
    ),
    bullets([
      "המחוקק העניק חסינות מלאה למי שמפרסם דיווח נכון והוגן על הליכים משפטיים והחלטות שיפוטיות, כל עוד ההליך אינו חסוי ואין צו איסור פרסום. פרסום המסמכים ככתבם וכלשונם הוא דיווח כזה, והוא מותר בלי קשר לתום הלב או למניעי המפרסם.",
      "בעוולת הרשלנות לא די בכך שאפשר היה לצפות נזק. בפרסום מתוך הליך משפטי, חובת הזהירות קמה רק כשאדם סביר היה צריך לצפות שהפרסום אסור. אחרת, כל פרסום של שם בעל דין היה רשלני.",
      "העמותה הסירה כל פרסום ברגע שהוצג לה צו, והתובע אישר זאת בחקירתו. בית המשפט קבע שבכך פעלה כפי שאדם סביר היה פועל.",
      "לא הוטלה עליי אחריות אישית: הפרסומים נבעו מכרייה אוטומטית, ולא הוכח חלק אישי שלי בהם. בית המשפט הוסיף שגם אילו טעינו בפרשנות הדין, זו הייתה טעות בתום לב.",
      "הנהלת בתי המשפט נהנתה מחסינות שיפוטית. עם זאת, בית המשפט המליץ לה לשקול להפסיק להוסיף כברירת מחדל את מספרי הזהות של בעלי הדין לפרוטוקולים. זו אולי ההמלצה המעשית ביותר שיצאה מהתיק.",
    ]),
    p(
      "גם צו איסור הפרסום שקיבל התובע בתחילת ההליך צומצם בסופו, כך שיחול רק על מספר ההליך שממנו אפשר ללמוד על מצבו הרפואי. הוצאות לא נפסקו. בית המשפט כתב שכשם שהנתבעים מאמינים בתום לב בחשיבות פומביות הדיון, \"ובזכותם (ואולי גם חובתם) לפרסם מידע מתוך הליכים משפטיים\", כך התובע מאמין בתום לב בזכות לפרטיות. זו, לדעתי, הדרך הנכונה לסיים תיק כזה.",
    ),

    h2("מה נשאר"),
    p(
      "תולעת המשפט התחיל ככלי טכנולוגי, אבל מה שהשאיר אחריו הוא בעיקר משפטי. שבע ההחלטות האלה מגיעות לאותה תשובה: פומביות הדיון היא הכלל, החריגים לה נקבעים בצו שיפוטי, ומי שמפרסם דיווח נכון והוגן מתוך הליך פומבי מוגן.",
    ),
    p(
      "זה לא אומר שהשאלה סגורה. ועדת אנגלרד המליצה על שינוי, ובתי המשפט עצמם אומרים שהאיזון בעידן הדיגיטלי ראוי לדיון מחודש. אבל אם הוא ישתנה, הוא צריך להשתנות בכנסת, בדיון ציבורי ופתוח. זה בדיוק העיקרון שעליו עמדנו לאורך כל הדרך.",
    ),
    p("כל פסקי הדין נמצאים כאן למטה, במלואם, לצד הסיקור התקשורתי של המיזם."),
  ],
};

/* ─────────────────────────────── Runner ─────────────────────────────── */

async function seedFiles() {
  // The PDFs only need loading once; later runs (e.g. --live) can skip it.
  if (!FILES_DIR) return console.log("  files: skipped (TM_FILES_DIR not set)");

  for (const doc of RULINGS) {
    const data = await readFile(path.join(FILES_DIR, doc.file));
    await prisma.uploadedFile.upsert({
      where: { filename: doc.file },
      update: { data, size: data.length, mimeType: "application/pdf" },
      create: { filename: doc.file, data, size: data.length, mimeType: "application/pdf" },
    });
  }
  console.log(`  files: ${RULINGS.length} upserted`);
}

async function seedCoverage() {
  let created = 0;
  let tagged = 0;

  for (const [index, item] of COVERAGE.entries()) {
    // Match on url alone: most of these already sit on /media, untagged.
    const existing = await prisma.mediaAppearance.findFirst({
      where: { url: { in: item.oldUrl ? [item.url, item.oldUrl] : [item.url] } },
    });

    if (existing) {
      // An existing row keeps its visibility; only the tag, the case-file
      // order and any verified correction change.
      // Rows this script created (they carry a title here) are its own, so a
      // re-run refreshes their text too.
      const own = item.title
        ? { title: item.title, source: item.source, description: item.description ?? null, type: item.type ?? "article", date: item.date }
        : {};
      await prisma.mediaAppearance.update({
        where: { id: existing.id },
        data: { caseTag: CASE_TAG, order: index + 1, ...own, ...item.fix },
      });
      tagged++;
    } else {
      if (!item.title || !item.source) throw new Error(`New coverage needs title+source: ${item.url}`);
      await prisma.mediaAppearance.create({
        data: {
          title: item.title,
          description: item.description ?? null,
          type: item.type ?? "article",
          source: item.source,
          date: item.date,
          url: item.url,
          order: index + 1,
          isActive: LIVE,
          caseTag: CASE_TAG,
        },
      });
      created++;
    }
  }

  // New rows are created hidden; --live on a later run turns them on.
  if (LIVE) {
    const urls = COVERAGE.filter((c) => c.title).map((c) => c.url);
    await prisma.mediaAppearance.updateMany({
      where: { caseTag: CASE_TAG, url: { in: urls } },
      data: { isActive: true },
    });
  }

  console.log(`  coverage: ${created} created, ${tagged} existing tagged`);
}

async function seedDocuments() {
  let created = 0;
  let updated = 0;

  for (const [index, doc] of RULINGS.entries()) {
    const url = fileUrl(doc.file);
    const existing = await prisma.caseDocument.findFirst({
      where: { caseTag: CASE_TAG, fileUrl: url },
    });

    const data = {
      caseTag: CASE_TAG,
      category: "ruling",
      title: doc.title,
      description: doc.description,
      docDate: doc.docDate,
      citation: doc.citation,
      authority: doc.authority,
      fileUrl: url,
      sourceUrl: null,
      order: index + 1,
      isActive: LIVE,
    };

    if (existing) {
      await prisma.caseDocument.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.caseDocument.create({ data });
      created++;
    }
  }

  console.log(`  documents: ${created} created, ${updated} updated`);
}

async function seedPost() {
  const author =
    (await prisma.user.findUnique({ where: { email: "zomerg@gmail.com" } })) ??
    (await prisma.user.findFirst({ where: { role: "ADMIN" } })) ??
    (await prisma.user.findFirst());

  if (!author) throw new Error("No user found to attribute the post to.");

  const tags = [
    "תולעת המשפט",
    "התמנון",
    "פומביות הדיון",
    "פרטיות",
    "צו איסור פרסום",
    "מידע ציבורי",
  ];

  const fields = {
    title: TITLE,
    content,
    excerpt: EXCERPT,
    status: POST_STATUS,
    seoTitle: TITLE,
    seoDesc: EXCERPT.slice(0, 300),
    tags,
    caseTag: CASE_TAG,
  } as const;

  // Once the post exists it belongs to /admin: the author edits it there, so a
  // re-run only flips its status and never touches the text.
  const existing = await prisma.plilistPost.findUnique({ where: { slug: SLUG } });
  const post = existing
    ? await prisma.plilistPost.update({
        where: { slug: SLUG },
        data: {
          status: POST_STATUS,
          caseTag: CASE_TAG,
          // Stamped when the post actually goes live, not at draft time.
          ...(LIVE && existing.status !== "PUBLISHED" ? { publishedAt: new Date() } : {}),
        },
      })
    : await prisma.plilistPost.create({
        data: { ...fields, slug: SLUG, authorId: author.id, publishedAt: new Date() },
      });

  console.log(`  post: /haplilist/${post.slug} (${post.status})`);
}

async function main() {
  const host = new URL(process.env.DATABASE_URL ?? "postgres://none").hostname;
  console.log(`Seeding case "${CASE_TAG}" on ${host} — ${LIVE ? "LIVE" : "hidden (pass --live to publish)"}`);
  await seedFiles();
  await seedCoverage();
  await seedDocuments();
  await seedPost();
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
