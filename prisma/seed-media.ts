/**
 * One-time seed script: populates MediaAppearance table with known media appearances.
 * Usage: npx tsx prisma/seed-media.ts
 */

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

interface MediaItem {
  title: string;
  description: string;
  type: "video" | "article" | "podcast";
  source: string;
  date: string;
  url: string;
}

const MEDIA_ITEMS: MediaItem[] = [
  // ── TheMarker ──
  {
    title: "הילדים הרעים של השקיפות: מרגע שהאתר עלה קיבלנו איומים, גם ברצח",
    description: "כתבת מגזין מקיפה על עמותת התמנון ומייסדיה, האיומים שקיבלו והמאבק על שקיפות ציבורית",
    type: "article",
    source: "TheMarker",
    date: "2025-12-26",
    url: "https://www.themarker.com/weekend/2025-12-26/ty-article-magazine/.highlight/0000019b-49df-d034-ab9b-c9dff81c0000",
  },
  {
    title: "פעיל חופש מידע פירסם נתונים גיאוגרפיים — המדינה מאיימת לתבוע על הפרת זכויות יוצרים",
    description: "הפרקליטות נלחמת בעמותת התמנון באמצעות איום בתביעת זכויות יוצרים על פרסום נתונים ציבוריים",
    type: "article",
    source: "TheMarker",
    date: "2025-02-02",
    url: "https://www.themarker.com/captain-internet/2025-02-02/ty-article/.premium/00000194-44ac-d924-a59f-76edf3930000",
  },
  {
    title: "פרטים אישיים של אזרחים עלולים לדלוף, אך הרשויות ממשיכות להשתמש ב-Gmail",
    description: "חשיפת השימוש הבעייתי של רשויות ציבוריות בשירותי דוא\"ל מסחריים לטיפול במידע רגיש",
    type: "article",
    source: "TheMarker",
    date: "2024-08-20",
    url: "https://www.themarker.com/captain-internet/2024-08-20/ty-article/.premium/00000191-6998-d12a-a3b5-7dfdbc630000",
  },
  {
    title: "הרשות להגנת פרטיות סיפקה מסמכים לאתר \"מידע לעם\" — ואז דרשה באיומים משפטיים להבין מי סיפק אותם",
    description: "הרשות להגנת הפרטיות איימה על גיא זומר בדרישה לחשוף מקורות מידע שסופקו כדין",
    type: "article",
    source: "TheMarker",
    date: "2023-03-28",
    url: "https://www.themarker.com/captain-internet/2023-03-28/ty-article/.premium/00000187-236b-d4ca-afff-336b01320000",
  },
  {
    title: "40 הצעירים המבטיחים של מגזין TheMarker 2020",
    description: "גיא זומר נבחר כאחד מ-40 הצעירים המבטיחים בזכות פעילותו להנגשת מידע ציבורי",
    type: "article",
    source: "TheMarker",
    date: "2020-11-02",
    url: "https://www.themarker.com/magazine/2020-11-02/ty-article-static-ext/0000017f-e54c-d7b2-a77f-e74f486b0000",
  },
  {
    title: "עתירה נגד משרד הבריאות: ניהול המידע בנוגע לקורונה \"חובבני\"",
    description: "עתירה שהוגשה לבית המשפט לחייב את משרד הבריאות לחשוף מידע על ניהול משבר הקורונה",
    type: "article",
    source: "TheMarker",
    date: "2020-07-13",
    url: "https://www.themarker.com/law/2020-07-13/ty-article/0000017f-eb8f-d4cd-af7f-ebffe26f0000",
  },

  // ── הארץ ──
  {
    title: "שופטת הורתה לדחות בקשות של פעיל חברתי, הנהלת בתיהמ\"ש הכחישה — וחזרה בה",
    description: "חשיפת הוראה שיפוטית לדחיית בקשות חופש מידע באופן גורף, שבוטלה לאחר חשיפתה",
    type: "article",
    source: "הארץ",
    date: "2022-01-26",
    url: "https://www.haaretz.co.il/news/law/2022-01-26/ty-article/.premium/0000017f-db1c-df9c-a17f-ff1cb0190000",
  },
  {
    title: "ביהמ\"ש המחוזי: הנחיות המשנים ליועמ\"ש אינן מחייבות את הרשויות",
    description: "פסיקה תקדימית בעתירת חופש מידע שהגיש גיא זומר בנוגע להנחיות היועץ המשפטי לממשלה",
    type: "article",
    source: "הארץ",
    date: "2020-06-18",
    url: "https://www.haaretz.co.il/news/law/2020-06-18/ty-article/.premium/0000017f-f14a-d497-a1ff-f3cac9520000",
  },
  {
    title: "מתכנתי נט המשפט טרם הפנימו את מה שגם תינוק לומד עם הזמן",
    description: "חשיפת כשלים טכנולוגיים באתר מערכת המשפט הישראלית ופגיעה בזכויות אזרחים",
    type: "article",
    source: "הארץ",
    date: "2019-11-01",
    url: "https://www.haaretz.co.il/captain/software/2019-11-01/ty-article/.premium/0000017f-f459-d47e-a37f-fd7d5b3f0000",
  },
  {
    title: "אתר מערכת המשפט חשף פרטים מסכני חיים של תיקים חסויים",
    description: "חקירה שחשפה כי מערכת נט המשפט הדליפה פרטים רגישים של תיקים חסויים באופן שסיכן חיי אדם",
    type: "article",
    source: "הארץ",
    date: "2019-09-02",
    url: "https://www.haaretz.co.il/captain/software/2019-09-02/ty-article/.premium/0000017f-f8de-d318-afff-fbfff5920000",
  },

  // ── גלובס ──
  {
    title: "מחקר בדק: כך תגדילו את הסיכויים לנצח את רשות המסים בבית המשפט",
    description: "ניתוח נתונים מקיף על תוצאות משפטים מול רשות המסים באמצעות כלי תולעת המשפט",
    type: "article",
    source: "גלובס",
    date: "2022-08-08",
    url: "https://www.globes.co.il/news/article.aspx?did=1001420722",
  },
  {
    title: "מערכת המשפט לא מספקת מידע? זה המיזם שמנגיש אותו",
    description: "כתבה על עמותת התמנון ומיזם תולעת המשפט שפתח 6 מיליון תיקים משפטיים לציבור",
    type: "article",
    source: "גלובס",
    date: "2022-02-05",
    url: "https://www.globes.co.il/news/article.aspx?did=1001401121",
  },
  {
    title: "מדוע סירבה הנהלת בתי המשפט לבקשה שהטיפול בה אורך שניות?",
    description: "חשיפת סירוב בירוקרטי לבקשת חופש מידע פשוטה מהנהלת בתי המשפט",
    type: "article",
    source: "גלובס",
    date: "2021-10-19",
    url: "https://www.globes.co.il/news/article.aspx?did=1001387868",
  },
  {
    title: "לראשונה: הפרקליטות חויבה לפרסם רשימת הנחיות פנימיות",
    description: "פסיקה תקדימית שחייבה את הפרקליטות לחשוף הנחיות פנימיות בעקבות עתירת גיא זומר",
    type: "article",
    source: "גלובס",
    date: "2021-07-20",
    url: "https://www.globes.co.il/news/article.aspx?did=1001378823",
  },

  // ── כלכליסט ──
  {
    title: "חוק חופש המידע משמש את משרדי הממשלה כדי להסתיר יותר",
    description: "ניתוח מצב חופש המידע בישראל: כיצד החוק שנועד לקדם שקיפות מנוצל להסתרת מידע",
    type: "article",
    source: "כלכליסט",
    date: "2023-01-01",
    url: "https://www.calcalist.co.il/local_news/article/hypcvtusjg",
  },

  // ── שומרים ──
  {
    title: "הזכות להישכח: כתב האישום בוטל, באינטרנט הכתם נשאר",
    description: "חקירה על הפגיעה בזכות לפרטיות כשמידע על הליכים פליליים שבוטלו נשאר נגיש ברשת",
    type: "article",
    source: "שומרים",
    date: "2022-02-09",
    url: "https://www.shomrim.news/hebrew/494",
  },

  // ── וואלה ──
  {
    title: "האיש שנאבק על שקיפות מערכת המשפט מבטיח: \"מי שלא עונה — יחטוף עתירה\"",
    description: "ראיון עם גיא זומר על המאבק להנגשת מידע משפטי ושקיפות מערכת המשפט",
    type: "article",
    source: "וואלה",
    date: "2020-06-20",
    url: "https://news.walla.co.il/item/3368198",
  },

  // ── law.co.il ──
  {
    title: "עתירה — משרד הבריאות מנהל מידע באופן חובבני",
    description: "סיקור עתירת חופש מידע נגד משרד הבריאות בנוגע לניהול מידע בתקופת הקורונה",
    type: "article",
    source: "law.co.il",
    date: "2020-07-13",
    url: "https://www.law.co.il/news/2020/07/13/coronavirus-freedom-of-information-petition/",
  },

  // ── רשות הרבים (כתב עת משפטי) ──
  {
    title: "הייעוץ המשפטי: דין מחייב אבל סודי – בעקבות עע״מ זומר",
    description: "הערת פסיקה אקדמית על ערעור תקדימי בבית המשפט העליון בנושא חופש מידע",
    type: "article",
    source: "רשות הרבים",
    date: "2022-01-01",
    url: "https://journal.lawforum.org.il/zomer/",
  },

  // ── ICE ──
  {
    title: "מייסד אתרי המידע המשפטי בסכנה? ארגון העיתונאים בדרישה מהמשטרה",
    description: "ארגון העיתונאים דרש מהמשטרה לפתוח מחדש תלונת איומים של גיא זומר",
    type: "article",
    source: "ICE",
    date: "2023-01-01",
    url: "https://www.ice.co.il/career/news/article/839133",
  },

  // ── המקום הכי חם בגיהנום ──
  {
    title: "בדיקה: ככל שהשופט מנוסה יותר — הסיכוי לשחרור ממעצר גדל פי 3",
    description: "ניתוח נתונים שחשף קשר בין ניסיון השופט לסיכויי שחרור ממעצר",
    type: "article",
    source: "המקום הכי חם בגיהנום",
    date: "2020-05-19",
    url: "https://www.ha-makom.co.il/post-guy-arrest-subti/",
  },

  // ── העין השביעית ──
  {
    title: "העין השביעית — כתבה 385495",
    description: "כתבה בנושא שקיפות ותקשורת באתר העין השביעית",
    type: "article",
    source: "העין השביעית",
    date: "2022-01-01",
    url: "https://www.the7eye.org.il/385495",
  },
  {
    title: "העין השביעית — כתבה 317110",
    description: "כתבה בנושא שקיפות ותקשורת באתר העין השביעית",
    type: "article",
    source: "העין השביעית",
    date: "2020-01-01",
    url: "https://www.the7eye.org.il/317110",
  },

  // ── חדשות 13 (video) ──
  {
    title: "קיבל איומים ברצח לטלפון — אך במשטרה לא התרגשו",
    description: "כתבת וידאו על איומי הרצח שקיבל גיא זומר והטיפול הלקוי של המשטרה בתלונתו",
    type: "video",
    source: "חדשות 13",
    date: "2021-08-05",
    url: "https://13tv.co.il/item/news/domestic/crime-and-justice/police-complaints-1307014/",
  },
];

async function main() {
  console.log(`Seeding ${MEDIA_ITEMS.length} media appearances...\n`);

  // Sort by date descending for order assignment
  const sorted = [...MEDIA_ITEMS].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  let created = 0;
  let updated = 0;

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i];
    const existing = await prisma.mediaAppearance.findFirst({
      where: { url: item.url },
    });

    if (existing) {
      await prisma.mediaAppearance.update({
        where: { id: existing.id },
        data: {
          title: item.title,
          description: item.description,
          type: item.type,
          source: item.source,
          date: item.date,
          order: i + 1,
          isActive: true,
        },
      });
      updated++;
      console.log(`  Updated: ${item.source} — ${item.title.substring(0, 50)}...`);
    } else {
      await prisma.mediaAppearance.create({
        data: {
          title: item.title,
          description: item.description,
          type: item.type,
          source: item.source,
          date: item.date,
          url: item.url,
          order: i + 1,
          isActive: true,
        },
      });
      created++;
      console.log(`  Created: ${item.source} — ${item.title.substring(0, 50)}...`);
    }
  }

  console.log(`\nDone! Created: ${created}, Updated: ${updated}, Total: ${sorted.length}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
