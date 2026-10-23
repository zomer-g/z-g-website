import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const NEW_PROJECT = {
  title: "גרסאות לעם",
  subtitle: "מעקב גרסאות אחרי מאגרי מידע ממשלתיים פתוחים",
  description:
    "כלי שמתעד את ההיסטוריה של מאגרי המידע הממשלתיים ב-data.gov.il וב-gov.il — כל פעם שמאגר מתעדכן, נוספים או נגרעים משאבים, או שמשתנה הקובץ עצמו. הפלטפורמה מאפשרת לעקוב אחרי מאגרים, להשוות בין גרסאות ולזהות שינויים שקטים בנתונים שמתפרסמים לציבור — ובכך הופכת את השקיפות הממשלתית לאחריותית גם לאורך זמן, ולא רק ברגע הפרסום הראשוני.",
  url: "https://www.over.org.il/",
  icon: "History",
  tags: ["מעקב גרסאות", "data.gov.il", "שקיפות לאורך זמן"],
};

type ProjectItem = { title: string; [k: string]: unknown };

function insertProject(projects: ProjectItem[]): ProjectItem[] {
  if (projects.some((p) => p.title === NEW_PROJECT.title)) return projects;
  const idx = projects.findIndex((p) => p.title === "מידע לעם");
  if (idx === -1) return [...projects, NEW_PROJECT];
  return [...projects.slice(0, idx + 1), NEW_PROJECT, ...projects.slice(idx + 1)];
}

async function main() {
  const page = await prisma.page.findUnique({ where: { slug: "projects" } });
  if (!page) {
    console.log("No projects page record — nothing to update.");
    return;
  }
  const content = page.content as { projects?: ProjectItem[] } & Record<string, unknown>;
  const draft = page.draftContent as ({ projects?: ProjectItem[] } & Record<string, unknown>) | null;

  const newContent = content?.projects
    ? { ...content, projects: insertProject(content.projects) }
    : content;
  const newDraft = draft?.projects
    ? { ...draft, projects: insertProject(draft.projects) }
    : draft;

  await prisma.page.update({
    where: { slug: "projects" },
    data: {
      content: newContent as unknown as Record<string, unknown>,
      draftContent: newDraft as unknown as Record<string, unknown> | null,
    },
  });
  console.log("Inserted גרסאות לעם into projects page content.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
