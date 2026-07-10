import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const LETZ_CARD = {
  title: "לץ — תוספי דפדפן",
  subtitle: "סדרת תוספי Chrome להורדת מידע ציבורי בלחיצה",
  description:
    "סדרת תוספי דפדפן שהופכים מאגרי מידע ומסמכים ציבוריים לקבצים מסודרים, מקומית בדפדפן וללא שרת ביניים: לץ המשפט (מסמכים מנט המשפט), לץ הממשל (מאגרי נתונים מאתרי ממשלה) ולץ הלמ״ס (נתוני הלשכה המרכזית לסטטיסטיקה).",
  url: "/letz",
  icon: "Puzzle",
  tags: ["תוספי דפדפן", "מידע פתוח", "הורדה מקומית"],
};

// URLs of the individual extension cards to remove (replaced by the one לץ card).
const REMOVE_URLS = new Set(["/court-downloader", "/govscraper"]);

function transform(list: any[]): any[] {
  if (!Array.isArray(list)) return [LETZ_CARD];
  // Drop the individual extension cards.
  const filtered = list.filter((p) => p && !REMOVE_URLS.has(p.url));
  // Dedup — don't add לץ twice.
  if (filtered.some((p) => p && p.url === LETZ_CARD.url)) return filtered;
  // Insert the לץ card right after the "פרויקט לעם" (/o) card, mirroring it.
  const leamIdx = filtered.findIndex((p) => p && p.url === "/o");
  if (leamIdx >= 0) {
    filtered.splice(leamIdx + 1, 0, LETZ_CARD);
    return filtered;
  }
  return [...filtered, LETZ_CARD];
}

async function main() {
  const projects = await prisma.page.findUnique({ where: { slug: "projects" } });
  if (!projects) throw new Error("projects page not found");
  const c: any = projects.content ?? {};
  const d: any = projects.draftContent ?? projects.content ?? {};
  await prisma.page.update({
    where: { slug: "projects" },
    data: {
      content: { ...c, projects: transform(c.projects) } as any,
      draftContent: { ...d, projects: transform(d.projects) } as any,
    },
  });
  console.log("✓ replaced extension cards with one לץ card (→ /letz) in /projects");
}

main().finally(() => prisma.$disconnect());
