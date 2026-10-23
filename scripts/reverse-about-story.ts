import "dotenv/config";
import { writeFileSync } from "node:fs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const page = await prisma.page.findUnique({
    where: { slug: "about" },
    select: { content: true },
  });
  if (!page?.content) throw new Error("about page content not found");

  const content = page.content as Record<string, any>;

  // Backup current content before mutating prod.
  const backupPath = process.argv[2] ?? "scripts/about-content.backup.json";
  writeFileSync(backupPath, JSON.stringify(content, null, 2), "utf8");
  console.log("Backed up current about content ->", backupPath);

  const firmStory = (content.firmStory ?? {}) as Record<string, any>;

  // Reverse-chronological story: start from the present, then peel back the
  // layers each one rests on, ending with the synthesis as the specialization.
  content.firmStory = {
    ...firmStory,
    title: firmStory.title ?? "הסיפור שלי",
    subtitle: "החיבור בין שלוש דיסציפלינות — ומה שעומד מאחוריו",
    paragraphs: [
      "היום אני עורך דין פלילי. לצד הייצוג בהליכים פליליים אני מטפל גם בעתירות חופש מידע ובתיקי לשון הרע — ובכל אחד מהתחומים האלה הרקע הטכנולוגי שלי משנה את מה שאני רואה בתיק. מה שלעין אחרת נראה כפרט טכני שולי, מתגלה לי לא פעם כלב המחלוקת.",
      "במקביל לפרקטיקה אני מפעיל את מאגרי המידע המשפטיים הציבוריים הגדולים בישראל — מאגר ההנחיות הציבורי, מאגר פסקי הדין בלשון הרע ומאגר פסקי הדין בעתירות חופש מידע. אלה לא תחביב; הם תשתית שאני בונה ומתחזק כדי שכל עורך דין, עיתונאי וחוקר בישראל יוכל להיכנס למידע שעד לפני שנים בודדות היה נעול בארכיונים מפוזרים.",
      "כל זה נשען על לימודי משפטים לעומק — לא קורס קצר אלא עיסוק שלוקח שנים להפנים. בחרתי לעבור לעולם המשפט לא כמפלט מטכנולוגיה, אלא כדי להוסיף לארגז הכלים שלי דיסציפלינה משלימה.",
      "ומתחת לכל אלה נמצא העולם שממנו באתי. את דרכי המקצועית התחלתי כאנליסט וראש צוות דאטה בסטארטאפ בתחום האלגוריתמיקה של סאונד — סביבה שבה כל החלטה נמדדת מול נתונים, וכל הנחה צריכה להחזיק בלחץ של פלט אמיתי. שם פיתחתי את ההרגל לחשוב על בעיות דרך מערכות, דפוסים ויעילות, ולא רק דרך אינטואיציה.",
      "החיבור בין שלוש הדיסציפלינות הוא לא תוצר לוואי — הוא ההתמחות. הוא מה שמאפשר לי לקחת תיק שבו אלגוריתם הוא חלק מהמחלוקת, לזהות הזדמנויות במאגר שעו״ד אחר לא היה רואה, או לבנות כלי דיגיטלי שפותר בעיה משפטית בקנה מידה רחב יותר ממה שייצוג פרטני יכול להציע.",
    ],
  };

  await prisma.page.update({
    where: { slug: "about" },
    data: { content },
  });

  console.log("About story rewritten (reverse-chronological).");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
