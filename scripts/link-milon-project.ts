import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Adds "מילון" to the projects content so it shows in the "מיזמים" header
// dropdown (loadProjectNavItems reads this DB row) and on the /projects page.
const PROJECT = {
  url: "/dictionary",
  icon: "BookOpen",
  tags: ["מילון", "מונחים משפטיים", "שפה משפטית"],
  title: "מילון",
  subtitle: "מילון מונחים משפטיים — הלקסיקון של המונחים שטבעתי",
  description:
    "מילון עברי של מונחים משפטיים שטבעתי, המנגיש רעיונות ותופעות מעולם המשפט הפלילי והמנהלי בשפה ברורה. כל ערך מסביר את המונח, ההקשר שבו הוא נולד והשימוש בו.",
};

function append(list: any[]): any[] {
  if (!Array.isArray(list)) return [PROJECT];
  if (list.some((p) => p && p.url === PROJECT.url)) return list; // dedup by url
  return [...list, PROJECT];
}

async function main() {
  const projects = await prisma.page.findUnique({ where: { slug: "projects" } });
  if (!projects) throw new Error("projects page not found");
  const c: any = projects.content ?? {};
  const d: any = projects.draftContent ?? projects.content ?? {};
  await prisma.page.update({
    where: { slug: "projects" },
    data: {
      content: { ...c, projects: append(c.projects) } as any,
      draftContent: { ...d, projects: append(d.projects) } as any,
    },
  });
  console.log("✓ linked /dictionary (מילון) to /projects");
}

main().finally(() => prisma.$disconnect());
