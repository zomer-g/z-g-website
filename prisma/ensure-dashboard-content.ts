import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

/**
 * Idempotent ensure-script run on every deploy:
 * 1. Creates "sanegoria" and "class-actions" Page rows with default content
 *    if they don't exist yet (existing rows are left alone — admins may have
 *    edited them).
 * 2. Prepends the two dashboard projects to the "projects" Page content,
 *    only if entries with those URLs aren't already present.
 *
 * Safe to run on a database where the projects array has been manually
 * edited — never overwrites existing entries by URL.
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const SANEGORIA_DEFAULT = {
  isPublic: true,
  hero: {
    title: "ניתוח ייצוג סניגוריה ציבורית",
    subtitle: "הליכים פליליים בישראל — 2022 ואילך",
  },
  disclaimer: {
    paragraphs: [
      "שיוך העבירות מבוסס על נתוני תביעות משטרה בלבד (ללא פרקליטות) לשנים 2022–2025.",
      "הנתונים והעיבודים בוצעו במאמץ לשקף את המציאות בצורה מדויקת, אולם ייתכנו טעויות ואי-דיוקים, בין היתר לאור הצורך באינטגרציה של מקורות מידע שונים ללא שדות אחידים.",
      "חשוב לציין כי הפער בין תיקים בייצוג סניגוריה ציבורית לבין תיקים שלא בייצוג עשוי לנבוע לא רק מאופי הטיפול ודינמיקת ההליך, אלא גם — ואולי בעיקר — מעצם הניתוב והבחירה בייצוג סניגוריה על בסיס מאפייני התיק והנאשם. לפיכך, ההבדלים המוצגים אינם בהכרח משקפים שוני באופן הטיפול, אלא עשויים לשקף הבדלים מובנים בסוגי התיקים המנותבים לכל ערוץ ייצוג.",
    ],
  },
};

const CLASS_ACTIONS_DEFAULT = {
  isPublic: true,
  hero: {
    title: "תובענות ייצוגיות — תובענות אחרונות",
    subtitle: "רשימת התובענות הייצוגיות החדשות שנפתחו בפנקס",
  },
};

const DASHBOARD_PROJECTS = [
  {
    title: "דשבורד סניגוריה ציבורית",
    subtitle: "ניתוח ייצוג סניגוריה ציבורית בהליכים פליליים",
    description:
      "דשבורד אינטראקטיבי הסוקר את ייצוג הסניגוריה הציבורית בהליכים פליליים בישראל מ-2022 ואילך. הכלי משווה תיקים, דיונים, עבירות ופסקי דין בין תיקים שיוצגו על ידי הסניגוריה הציבורית לבין כאלה שלא — ומאפשר לציבור, לחוקרים ולמערכת המשפט לראות בעיניים נתוניות את תרומת הסניגוריה הציבורית להליך הפלילי.",
    url: "/sanegoria",
    icon: "BarChart3",
    tags: ["סניגוריה ציבורית", "הליכים פליליים", "דאטה משפטי"],
  },
  {
    title: "דשבורד תובענות ייצוגיות",
    subtitle: "תובענות ייצוגיות אחרונות שהוגשו",
    description:
      "פלטפורמה המנגישה את התובענות הייצוגיות החדשות שנפתחו בפנקס התובענות הייצוגיות, לרבות שם התיק, בית המשפט, סעד מבוקש, הגדרת הקבוצה והשאלה המשפטית — עם קישור ישיר לכתבי הטענות. הכלי מאפשר לציבור ולעורכי דין לעקוב בזמן אמת אחר ההתפתחויות בתחום ולזהות מגמות בהגשת תובענות ייצוגיות.",
    url: "/class-actions",
    icon: "Scale",
    tags: ["תובענות ייצוגיות", "פנקס תובענות", "גישה למידע"],
  },
];

function backfillMissingKeys(
  defaults: Record<string, unknown>,
  current: Record<string, unknown> | null,
): { merged: Record<string, unknown>; added: string[] } {
  if (!current) return { merged: defaults, added: Object.keys(defaults) };
  const merged = { ...current };
  const added: string[] = [];
  for (const key of Object.keys(defaults)) {
    if (!(key in merged) || merged[key] === undefined) {
      merged[key] = defaults[key];
      added.push(key);
    }
  }
  return { merged, added };
}

async function ensureDashboardPage(
  slug: string,
  title: string,
  defaults: Record<string, unknown>,
) {
  const existing = await prisma.page.findUnique({ where: { slug } });

  if (!existing) {
    await prisma.page.create({
      data: {
        slug,
        title,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        content: defaults as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        draftContent: defaults as any,
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });
    console.log(`  + ${slug}: created`);
    return;
  }

  const contentRes = backfillMissingKeys(
    defaults,
    (existing.content as Record<string, unknown> | null) ?? null,
  );
  const draftRes = backfillMissingKeys(
    defaults,
    (existing.draftContent as Record<string, unknown> | null) ?? null,
  );

  if (contentRes.added.length === 0 && draftRes.added.length === 0) {
    console.log(`  · ${slug}: up to date`);
    return;
  }

  await prisma.page.update({
    where: { slug },
    data: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      content: contentRes.merged as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      draftContent: draftRes.merged as any,
    },
  });
  const added = Array.from(new Set([...contentRes.added, ...draftRes.added]));
  console.log(`  ~ ${slug}: back-filled ${added.join(", ")}`);
}

interface ProjectItem {
  title: string;
  subtitle: string;
  description: string;
  url: string;
  icon: string;
  tags: string[];
}

interface ProjectsContent {
  hero?: { title: string; subtitle: string };
  projects?: ProjectItem[];
  cta?: { title: string; description: string; ctaText: string; ctaLink: string };
}

function prependMissing(existing: ProjectItem[], additions: ProjectItem[]): ProjectItem[] {
  const existingUrls = new Set(existing.map((p) => p.url));
  const toAdd = additions.filter((p) => !existingUrls.has(p.url));
  return [...toAdd, ...existing];
}

async function ensureProjectsPage() {
  const page = await prisma.page.findUnique({ where: { slug: "projects" } });
  if (!page) {
    console.log("  · projects: page row does not exist (defaults will apply)");
    return;
  }

  const content = (page.content as ProjectsContent | null) ?? {};
  const draft = (page.draftContent as ProjectsContent | null) ?? {};

  const newContentProjects = prependMissing(content.projects ?? [], DASHBOARD_PROJECTS);
  const newDraftProjects = prependMissing(draft.projects ?? [], DASHBOARD_PROJECTS);

  const contentChanged = newContentProjects.length !== (content.projects ?? []).length;
  const draftChanged = newDraftProjects.length !== (draft.projects ?? []).length;

  if (!contentChanged && !draftChanged) {
    console.log("  · projects: dashboards already present, skipping");
    return;
  }

  await prisma.page.update({
    where: { slug: "projects" },
    data: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      content: { ...content, projects: newContentProjects } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      draftContent: { ...draft, projects: newDraftProjects } as any,
      ...(contentChanged ? { publishedAt: new Date() } : {}),
    },
  });
  console.log(
    `  + projects: prepended ${DASHBOARD_PROJECTS.length - (DASHBOARD_PROJECTS.length - (newContentProjects.length - (content.projects ?? []).length))} dashboard project(s)`,
  );
}

async function main() {
  console.log("Ensuring dashboard content is in sync...");

  await ensureDashboardPage("sanegoria", "דשבורד סניגוריה", SANEGORIA_DEFAULT);
  await ensureDashboardPage("class-actions", "דשבורד תובענות ייצוגיות", CLASS_ACTIONS_DEFAULT);
  await ensureProjectsPage();

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error("ensure-dashboard-content failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
