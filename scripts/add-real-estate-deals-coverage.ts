/**
 * Press coverage of the real-estate deals register, added to the publications
 * list and tagged with the case so it shows under the post
 * (/haplilist/real-estate-deals-open), the same way the better-rail case does.
 *
 * Through the write API (ZG_API_KEY with media:write, from .env.local).
 * Idempotent: the API upserts by url. Links are the original articles —
 * the paywalled ones were read from PDFs the owner supplied, never linked.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

const SITE = process.env.ZG_SITE ?? "https://www.z-g.co.il";
const CASE_TAG = "real-estate-deals";

const ITEMS = [
  {
    url: "https://nadlanit.co.il/news/israel-real-estate-transactions-open-data",
    title: "נפתחה גישה לכ-3.8 מיליון עסקאות נדל\"ן בישראל",
    description:
      "מאגר עסקאות המקרקעין המדווחות לרשות המסים מאז 1998 פתוח לסינון, להשוואה ולניתוח של מחירי מכירה בפועל בגרסאות לעם.",
    source: "נדל\"נית",
    date: "2026-09-27",
  },
  {
    url: "https://www.themarker.com/realestate/2026-09-29/ty-article/.premium/000001a0-edd1-d259-a3b4-edd921890000",
    title: "אחרי הפרסום ב–TheMarker: נחסמה הגישה הפתוחה למאגר עסקות הנדל\"ן של רשות המסים",
    description:
      "ימים אחרי פרסום המאגר, רשות המסים הוסיפה דרישת הזדהות לכניסה למערכת מידע הנדל\"ן שלה, מה שמונע את עדכון המאגר הפתוח. הרשות: המידע עדיין נגיש לציבור, והשינוי נועד למנוע הפרעה לשירות עקב הפעלת כלי AI.",
    source: "TheMarker",
    date: "2026-09-29",
  },
  {
    url: "https://www.zman.co.il/728462/",
    title: "אשליית חרם הקונים: האמת הכואבת מאחורי הקיפאון בשוק הדיור",
    description:
      "ניתוח שוק הדיור על בסיס המאגר שנפתח בגרסאות לעם: הפער בין מחירי הדירות להון העצמי של הקונים, ולמה הקיפאון בשוק אינו חרם.",
    source: "זמן ישראל",
    date: "2026-09-29",
  },
  {
    url: "https://www.globes.co.il/news/article.aspx?did=1001557987",
    title: "רשות המסים מציגה: כך יעשה לאיש שמנסה להנגיש נתונים לציבור",
    description:
      "\"מאגר מידע נדל\"ן\" של רשות המסים, אחד המקורות המרכזיים של גרסאות לעם, נחסם לשאיבה בעזרת דרישת הזדהות. אתר הנדל\"ן הממשלתי עדיין פתוח, אך הנתונים בו חלקיים.",
    source: "גלובס",
    date: "2026-09-30",
  },
  {
    url: "https://www.ice.co.il/realestate/news/article/1131665",
    title: "הסיבה העיקרית שבגללה שוק הדיור בתל אביב עדיין לא קרס",
    description:
      "ניתוח המכירות והמחיר החציוני בתל אביב, בעזרת נתוני העסקאות ההיסטוריים שמנגיש מיזם \"גרסאות לעם\": מספר העסקאות יורד, והמחיר החציוני עולה.",
    source: "ice",
    date: "2026-09-30",
  },
];

async function main() {
  const key = process.env.ZG_API_KEY;
  if (!key) throw new Error("ZG_API_KEY is not set (put it in .env.local).");
  let failed = 0;
  for (const item of ITEMS) {
    const res = await fetch(`${SITE}/api/v1/media-appearances`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...item, type: "article", isActive: true, caseTag: CASE_TAG }),
    });
    if (!res.ok) failed++;
    console.log(res.status, item.source, item.date, await res.text());
  }
  if (failed) process.exit(1);
}

main();
