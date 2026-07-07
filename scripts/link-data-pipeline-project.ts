import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DATA_PIPELINE_PROJECT = {
  url: "/data-pipeline",
  icon: "Workflow",
  tags: ["ארכיטקטורה", "סקרייפרים", "API", "שקיפות"],
  title: "זרימת המידע",
  subtitle: "מפה אינטראקטיבית של איך המערכות שלי מתחברות זו לזו",
  description:
    "מפה של תהליך זרימת המידע בין הפרויקטים: סקרייפרים שאוספים מבתי המשפט ומאתרי ממשלה, מערכות ניהול המסמכים והמאגרים (TAG-IT ו-OVER), ושורת האתרים והדשבורדים שניזונים מהם. לחיצה על כל פרויקט מציגה הסבר קצר עליו.",
};

function prepend(list: any[]): any[] {
  if (!Array.isArray(list)) return [DATA_PIPELINE_PROJECT];
  if (list.some((p) => p && p.url === DATA_PIPELINE_PROJECT.url)) return list; // dedup by url
  return [DATA_PIPELINE_PROJECT, ...list];
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
  console.log("✓ linked /data-pipeline to /projects");
}

main().finally(() => prisma.$disconnect());
