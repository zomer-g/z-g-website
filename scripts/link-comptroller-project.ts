import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const PROJECT = {
  url: "/comptroller-reports",
  icon: "FileSearch",
  tags: ["מבקר המדינה", "ביקורת המדינה", "חיפוש בתוכן", "דאטה ציבורי"],
  title: "דוחות מבקר המדינה",
  subtitle: "מאגר דוחות מבקר המדינה — חיפוש חופשי בתוך תוכן הדוחות",
  description:
    "מאגר של 981 דוחות מבקר המדינה ממערכת TAG-IT, עם חיפוש טקסט מלא בתוך תוכן הדוחות (FTS) — כל תוצאה מציגה קטע מודגש מהדוח וציון רלוונטיות. בנוסף סינון לפי הגוף המבוקר/סדרת הדוח, חיפוש בכותרת, וטווח תאריכים, עם גישה ישירה לקובץ ה-PDF המקורי.",
};

function prepend(list: any[]): any[] {
  if (!Array.isArray(list)) return [PROJECT];
  if (list.some((p) => p && p.url === PROJECT.url)) return list; // dedup by url
  return [PROJECT, ...list];
}

async function main() {
  const projects = await prisma.page.findUnique({ where: { slug: "projects" } });
  if (!projects) throw new Error("projects page not found");
  const c: any = projects.content ?? {};
  const d: any = projects.draftContent ?? projects.content ?? {};
  await prisma.page.update({
    where: { slug: "projects" },
    data: {
      content: { ...c, projects: prepend(c.projects) } as any,
      draftContent: { ...d, projects: prepend(d.projects) } as any,
    },
  });
  console.log("✓ linked /comptroller-reports to /projects");
}

main().finally(() => prisma.$disconnect());
