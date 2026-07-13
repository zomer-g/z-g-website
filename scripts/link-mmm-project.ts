import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const PROJECT = {
  url: "/mmm",
  icon: "Landmark",
  tags: ["מרכז המחקר והמידע", "הכנסת", "חיפוש בתוכן", "דאטה ציבורי"],
  title: "מסמכי מרכז המחקר והמידע (מ.מ.מ)",
  subtitle: "מאגר מסמכי מרכז המחקר והמידע של הכנסת — חיפוש חופשי בתוכן",
  description:
    "מאגר מסמכי מרכז המחקר והמידע של הכנסת (מ.מ.מ) ממערכת TAG-IT, עם חיפוש טקסט מלא בתוך תוכן המסמכים (FTS) — כל תוצאה מציגה קטע מודגש מהמסמך וציון רלוונטיות. בנוסף סינון לפי סוג המסמך וטווח תאריכים, עם גישה ישירה לקובץ ה-PDF המקורי.",
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
  console.log("✓ linked /mmm to /projects");
}

main().finally(() => prisma.$disconnect());
