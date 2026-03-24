import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/**
 * Update DB page content: replace plural/firm references with singular/solo attorney.
 */
async function main() {
  // Find all pages
  const pages = await prisma.page.findMany({ select: { slug: true, id: true, content: true } });
  console.log("Pages in DB:", pages.map(p => p.slug));

  for (const page of pages) {
    if (!page.content) continue;
    let json = JSON.stringify(page.content);
    const original = json;

    // Replace patterns (values must be JSON-safe — use escaped quotes for עו"ד)
    const replacements: [string, string][] = [
      ['משרד עורכי דין זומר', 'עו\\"ד זומר'],
      ["תחומי העיסוק שלנו", "תחומי העיסוק"],
      ["השירותים שלנו", "השירותים"],
      ["הסיפור שלנו", "הסיפור שלי"],
      ["הערכים שלנו", "הערכים שמנחים אותי"],
      ["אודות המשרד", "אודות"],
      ['צוות המשרד', 'עו\\"ד זומר'],
      ['צוות משרד זומר', 'עו\\"ד גיא זומר'],
      ['מצוות עורכי הדין של משרד זומר', 'מעו\\"ד זומר'],
      ["עוד על המשרד", "עוד עליי"],
      ["רשימת התפוצה שלנו", "רשימת התפוצה"],
      ["מדיניות הפרטיות שלנו", "מדיניות הפרטיות"],
      ["מייסד ומנהל המשרד", "עורך דין פלילי"],
      // Plural verbs
      ["אנו מחויבים", "מחויבות מלאה"],
      ["אנו מאמינים", "אמונה"],
      ["אנו מקדישים", "מוקדש"],
      ["אנו מקפידים", "הקפדה"],
      ["אנו גאים", "גאווה"],
      ["אנו פועלים", "פעולה"],
      ["אנו מאמצים", "אימוץ"],
      ["אנו מתחייבים", "מחויבות"],
      ["אנו מבצעים", "מבוצעות"],
      ["נשמח לשמוע", "אשמח לשמוע"],
      ["נשמח להכיר", "אשמח להכיר"],
      ["נוכל לסייע", "אוכל לסייע"],
      ["פנו אלינו", "פנו אליי"],
      ["לקוחותינו", "הלקוחות"],
      ["מחויבותנו", "המחויבות"],
      ["הצוות שלנו", ""],
      ["הגישה שלנו", "הגישה"],
      ["הידע הנרחב שלנו", "הידע הנרחב"],
      ["משרד עורכי דין עם חזון", "עורך דין עם חזון"],
      ["משרד עורכי דין", "עורך דין"],
    ];

    for (const [from, to] of replacements) {
      json = json.split(from).join(to);
    }

    if (json !== original) {
      await prisma.page.update({
        where: { id: page.id },
        data: { content: JSON.parse(json) },
      });
      console.log(`  Updated page: ${page.slug}`);
    } else {
      console.log(`  No changes for: ${page.slug}`);
    }
  }

  console.log("\nDone!");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
