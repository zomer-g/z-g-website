import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const entries = [
  {
    slug: "mistatagreed",
    term: "מסתתגרד",
    vocalized: "מִסְתַּתְגֵּרֵד",
    partOfSpeech: "שֵׁם",
    etymology:
      "נִטְוֶה מן: הלחם של הַפְעָלִים מִסְתַּתֵּר וּמְגָרֵד.",
    inflections:
      "הטיות: נ' מִסְתַּתְגָּרֶדֶת, ר' מִסְתַּתְגַּרְדִים, ר\"נ מִסְתַּתְגַּרְדּוֹת.",
    domains: ["טכנולוגיה", "סלנג"],
    definitions: [
      {
        label: "",
        text: "אדם, מפתח או חברה המבצעים איסוף נתונים אוטומטי מאתרי אינטרנט (Scraping) בחשאי, מתוך פחד מחסימה, מתביעה משפטית או מחשיפה ציבורית.",
      },
      {
        label: "בהשאלה",
        text: "מי שפועל בדרכים עקלקלות ונסתרות כדי להשיג מידע שאינו מיועד לו.",
      },
    ],
    example:
      '"אל תבנה על ה-API הרשמי שלהם, הוא חסום. תהיה מסתתגרד, תרים מערך פרוקסי בלילה ותוריד את הדאטה בשקט."',
    order: 1,
    status: "PUBLISHED" as const,
  },
  {
    slug: "letarael",
    term: "לתרעל",
    vocalized: "לְתַרְעֵל",
    partOfSpeech: "פֹּעַל",
    etymology:
      "שורש: ת-ר-ע-ל (מרובע, נגזר מן השם רַעַל או תרעלה). בניין: פיעל.",
    inflections:
      "הטיות: עָבָר: תִּרְעֵל, הֹוֶה: מְתַרְעֵל, עָתִיד: יְתַרְעֵל, שֵׁם פְּעֻלָּה: תִּרְעוּל.",
    domains: ["פוליטיקה וממשל", "סלנג"],
    definitions: [
      {
        label: "",
        text: "להחדיר \"רעל\" רעיוני או אינטרסנטי לתוך השירות הציבורי; לשכנע פקידים או מקבלי החלטות במשרדי ממשלה לקדם פרויקטים גרועים, מזיקים או חסרי תועלת.",
      },
      {
        label: "",
        text: "להביא גורמים בתוך המערכת הממשלתית לתמוך, לשבח ולתקצב מיזמים חוץ-ממשלתיים (פרטיים או מגזריים) על חשבון האינטרס הציבורי.",
      },
    ],
    example:
      '"הלוביסטים של העמותה ההיא הצליחו לתרעל את ראש אגף התקציבים, ועכשיו הוא בטוח שהפרויקט הכושל שלהם הוא הצלת המדינה."',
    order: 2,
    status: "PUBLISHED" as const,
  },
  {
    slug: "lebayev",
    term: "לבייב",
    vocalized: "לְבַיֵּב",
    partOfSpeech: "פֹּעַל",
    etymology:
      "שורש: ב-י-ב (נגזר מן השם בִּיּוּב). בניין: פיעל.",
    inflections:
      "הטיות: עָבָר: בִּיֵּב, הֹוֶה: מְבַיֵּב, עָתִיד: יְבַיֵּב, שֵׁם פְּעֻלָּה: בִּיּוּב (במשמעות החדשה).",
    domains: ["תרבות ושיח", "סלנג"],
    definitions: [
      {
        label: "",
        text: "לדרדר שיח לרמה של ביוב; לנקוט בשפה בוטה, ישירה ולא מסויגת כלפי אדם, מוסד, מדיניות או החלטה ממשלתית — לעיתים כביקורת ענייינית מחוספסת, לעיתים כהתקפה גסה ריקה מתוכן.",
      },
      {
        label: "ברשתות החברתיות",
        text: "להציף תגובות בהכפשות ובהודעות גנאי מאורגנות, שבהן העוצמה הרועשת מחליפה את הטיעון.",
      },
    ],
    example:
      '"בדיון על מכרז הענן הממשלתי, זומר לא מינס מילים: \'הם לא ראו סעיף מחמיר שמנעו לכתוב — הם ראו חברה גדולה שרצו לסגור לה חוזה. הביורוקרטיה הזאת לא איטית, היא בחירה.\'"',
    order: 3,
    status: "PUBLISHED" as const,
  },
];

async function main() {
  for (const entry of entries) {
    await prisma.milonEntry.upsert({
      where: { slug: entry.slug },
      create: entry,
      update: entry,
    });
    console.log(`✓ ${entry.term}`);
  }
  console.log("Done.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
