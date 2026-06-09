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
  cacheTtlMinutes: 60,
};

const GUIDELINES_DEFAULT = {
  isPublic: true,
  hero: {
    title: "הנחיות",
    subtitle: 'מאגר מאוחד של הנחיות יועמ"ש, פרקליט המדינה, משטרה ועוד — חיפוש בתוך הטקסט',
  },
  cacheTtlMinutes: 60,
};

const DEFAMATION_RULINGS_DEFAULT = {
  isPublic: false,
  hero: {
    title: "פסקי דין בלשון הרע",
    subtitle: "פסקי דין אחרונים בעניין לשון הרע",
  },
  cacheTtlMinutes: 60,
};

const FOI_RULINGS_DEFAULT = {
  isPublic: false,
  hero: {
    title: "פסקי דין בעתירות חופש מידע",
    subtitle: "פסקי דין אחרונים בעתירות לפי חוק חופש המידע",
  },
  cacheTtlMinutes: 60,
};

// Mirrors DEFAULT_LEAM_CONTENT in src/lib/content-defaults.ts. The runtime
// page deep-merges DB content with the defaults map, so this only seeds the
// initial row — admins are free to edit any field after that.
const LEAM_DEFAULT = {
  metaStrip: "טכנולוגיה אזרחית · גרסה 1.0",
  hero: {
    title: "לעם",
    subtitle:
      "מקבץ של ארבעה אתרים אזרחיים שמנגישים מידע ציבורי בישראל — מאגרי מידע, גרסאות, יומני נבחרים והסדרי ניגוד עניינים.",
  },
  stats: [
    { k: "04", v: "אתרים" },
    { k: "49+", v: "גופים ציבוריים" },
    { k: "∞", v: "מאגרי מידע", srK: "ללא הגבלה" },
    { k: "100%", v: "קוד פתוח" },
  ],
  manifesto: {
    title: "שקיפות היא תנאי לדמוקרטיה",
    body:
      "ארבעת האתרים שלהלן נבנו מתוך תפיסה אחת: שמידע ציבורי הוא קודם כל שלנו. כל אתר מטפל בשכבה אחרת של הפער בין המידע שגופי הציבור מחזיקים לבין המידע שאזרחים יכולים בפועל להגיע אליו, להבין ולהשתמש בו — מהקובץ הגולמי ועד מפת הקשרים בין נושאי המשרה.",
  },
  sitesSection: {
    eyebrow: "האתרים",
    title: "ארבע שכבות של שקיפות",
  },
  sites: [
    {
      index: "01",
      name: "מידע לעם",
      tagline: "אתר המידע הפתוח הישראלי",
      description:
        "מערכת שמרכזת אלפי מאגרי מידע מ-49 גופים ציבוריים בישראל ומאפשרת לכל אזרח לחפש, לעיין ולהוריד מידע ממשלתי — מהיסטוריית טיסות ועד רישומי בנייה ירוקה. הבסיס לכל ניתוח ציבורי בלתי-תלוי.",
      domain: "odata.org.il",
      url: "https://www.odata.org.il/",
      icon: "Database",
      tags: ["מידע פתוח", "ממשק תכנות פתוח", "49 גופים"],
    },
    {
      index: "02",
      name: "גרסאות לעם",
      tagline: "מעקב גרסאות אחרי מאגרי מידע ממשלתיים",
      description:
        "כלי שמתעד את ההיסטוריה של מאגרי המידע ב-data.gov.il וב-gov.il — כל הוספה, גריעה או שינוי של קובץ. מאפשר לעקוב, להשוות בין גרסאות ולזהות שינויים שקטים בנתונים שמתפרסמים לציבור. שקיפות גם לאורך זמן, לא רק ברגע הפרסום.",
      domain: "over.org.il",
      url: "https://www.over.org.il/",
      icon: "History",
      tags: ["השוואת גרסאות", "מאגרים ממשלתיים", "שקיפות לאורך זמן"],
    },
    {
      index: "03",
      name: "יומן לעם",
      tagline: "מעקב אחר פעילות נבחרי ציבור",
      description:
        "כלי שמתעד ומנגיש את יומני הפעילות של נבחרי ציבור בישראל — ישיבות, הצבעות ופעילות שוטפת — ומקשר בין דמויות ציבוריות לבין ציר הזמן. נציגים שנבחרו לשרת את הציבור צריכים להיות אחראים כלפיו.",
      domain: "ocal.org.il",
      url: "https://ocal.org.il/",
      icon: "Calendar",
      tags: ["נבחרי ציבור", "ציר זמן", "אחריותיות"],
    },
    {
      index: "04",
      name: "ניגוד עניינים לעם",
      tagline: "מאגר הסדרי ניגוד עניינים של נושאי משרה",
      description:
        "מנוע חיפוש שמרכז את הסדרי ניגוד העניינים של בעלי תפקידים ציבוריים בישראל ומאפשר לבדוק אילו זיקות כלכליות ועסקיות קיימות להם — וגם למפות חזותית את רשת הקשרים שביניהם.",
      domain: "ocoi.org.il",
      url: "https://www.ocoi.org.il/",
      icon: "Network",
      tags: ["גרף קשרים", "ניגוד עניינים", "מיפוי קשרים"],
    },
  ],
  ctaSiteLabel: "כניסה לאתר",
  cta: {
    title: "רוצים לשתף פעולה?",
    description:
      "אתרי לעם פתוחים לשיתופי פעולה עם חוקרים, עיתונאים, ארגוני חברה אזרחית ויוצרים עצמאיים. אם יש לכם רעיון להמשך — כתבו לנו.",
    primaryCtaText: "צרו קשר",
    primaryCtaLink: "/contact",
    secondaryCtaText: "כל המיזמים",
    secondaryCtaLink: "/projects",
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
  {
    title: "מאגר הנחיות",
    subtitle: 'הנחיות יועמ"ש, פרקליט המדינה ועוד — חיפוש מלא בתוכן',
    description:
      'מאגר מאוחד של הנחיות והוראות מטעם רשויות אכיפת החוק והמינהל הציבורי בישראל — היועצת המשפטית לממשלה, פרקליט המדינה, המשטרה ועוד. הכלי מאפשר חיפוש מלא בתוכן ההנחיות (בפורמט Markdown) ולא רק בכותרות, סינון לפי מקור, וצפייה ישירה בקובץ ה-PDF המקורי או בטקסט שחולץ ממנו.',
    url: "/guidelines",
    icon: "BookOpen",
    tags: ["הנחיות", "פרקליטות", 'יועמ"ש', "חיפוש מלא"],
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

// Media articles to seed if they're not already present. Identity is the URL —
// if a MediaAppearance with the same URL already exists in the DB (whether the
// admin added it manually or a previous deploy seeded it), the row is left
// untouched so admin edits aren't blown away on every redeploy.
//
// IMPORTANT: dates are stored as YYYY-MM-DD strings to match the existing
// rows. /media + /admin/media-appearances sort by `date` descending, and the
// sort is lexicographic on the raw string — DD.MM.YYYY would sort below every
// ISO-formatted date in the table (because "2"... > "1"...), pushing these
// articles to the bottom of the list instead of the top.
const MEDIA_ARTICLES_TO_SEED = [
  {
    title:
      'סכנה להדלפות? בית המשפט קבע: מותר לפרסם מידע רפואי ותעודת זהות',
    description:
      "פסק דין קבע כי ניתן לפרסם מידע מתוך הליכים משפטיים, גם כאשר מדובר במידע אישי ורגיש במיוחד. בפסק הדין הודגש כי עקרון פומביות הדיון הוא עקרון יסוד חוקתי.",
    type: "article",
    source: "ישראל היום",
    date: "2026-05-10",
    url: "https://www.israelhayom.co.il/news/law/article/20503250",
  },
  {
    title:
      'ת"א 56708-12-22 אומן נ\' התמנון — מידע ציבורי לכל (ע"ר) ואח\'',
    description:
      "סקירה משפטית של פסק הדין שעוסק באיזון בין הזכות לפרטיות לעקרון פומביות הדיון בפרסום מסמכים משפטיים.",
    type: "article",
    source: "law.co.il",
    date: "2026-05-11",
    url: "https://www.law.co.il/computer-law/2026/05/11/uman-v-the-octopus-public-information-for-all-ra/",
  },
  {
    title: "בית המשפט: פרסום פסקי דין מותר — גם כשהוא פוגע בפרטיות",
    description:
      "בית משפט בירושלים דחה תביעה של אדם שפרטיו הרפואיים ומספר תעודת הזהות פורסמו באתר 'תולעת המשפט'. השופטת קבעה שפרסום מידע משפטי מדויק מוגן בחוק.",
    type: "article",
    source: "ביזפורטל",
    date: "2026-05-15",
    url: "https://www.bizportal.co.il/takdin/news/article/20031848",
  },
] as const;

// Convert "DD.MM.YYYY" → "YYYY-MM-DD" if the input matches that shape, else
// return null. Used to backfill the three rows the first deploy of this
// script inserted in the wrong format. Admin-edited dates in any other format
// won't match the regex and stay untouched.
function ddmmyyyyToIso(date: string): string | null {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(date);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}

async function ensureMediaArticles() {
  let inserted = 0;
  let backfilled = 0;
  let skipped = 0;
  for (const article of MEDIA_ARTICLES_TO_SEED) {
    // Match by URL — that's the natural identity for an external article and
    // is more robust than title (titles get edited; the URL is the canonical
    // reference). `findFirst` rather than `findUnique` because url isn't a
    // unique index in the schema.
    const existing = await prisma.mediaAppearance.findFirst({
      where: { url: article.url },
      select: { id: true, date: true },
    });
    if (existing) {
      // One-time migration: if a previous deploy stored the date as
      // DD.MM.YYYY, rewrite to ISO so this row sorts chronologically with
      // the rest of the table. Once converted, the regex won't match again
      // and the update is skipped.
      const fixed = ddmmyyyyToIso(existing.date);
      if (fixed) {
        await prisma.mediaAppearance.update({
          where: { id: existing.id },
          data: { date: fixed },
        });
        backfilled += 1;
      } else {
        skipped += 1;
      }
      continue;
    }
    await prisma.mediaAppearance.create({ data: article });
    inserted += 1;
  }
  console.log(
    `  · media articles: inserted ${inserted}, backfilled ${backfilled}, skipped ${skipped} (already in ISO format)`,
  );
}

// One-time normalization: bump the rulings card pages from the old default
// page size (12) to 24. backfillMissingKeys won't touch an existing key, so
// this targeted update is needed for rows already in the DB. Only fires when
// the value is exactly the old default, so a deliberate admin choice isn't
// overwritten on every deploy.
async function bumpRulingsPageSize() {
  const slugs = ["defamation-rulings", "foi-judgments", "foi-costs", "foi-rulings"];
  for (const slug of slugs) {
    const page = await prisma.page.findUnique({ where: { slug } });
    if (!page) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fix = (c: any): boolean => {
      if (c && c.query && c.query.pageSize === 12) {
        c.query.pageSize = 24;
        return true;
      }
      return false;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const content = page.content as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const draft = page.draftContent as any;
    const a = fix(content);
    const b = fix(draft);
    if (a || b) {
      await prisma.page.update({
        where: { slug },
        data: { content, draftContent: draft },
      });
      console.log(`  ~ ${slug}: pageSize 12 → 24`);
    }
  }
}

// Repair corrupted displayFields on defamation-rulings. A field key got
// mangled in the admin (non-breaking spaces   + a lone surrogate where a
// Hebrew letter should be), so the compensation field never matched and the
// card header was wrong. Replace with the intended clean, ordered set when
// corruption is detected (empty entries, nbsp, or surrogate code units).
async function repairDefamationDisplayFields() {
  const slug = "defamation-rulings";
  const clean = [
    "ai.שם_התיק",
    "ai.תקציר",
    "ai.בית_משפט",
    "meta.document_date",
    "ai.שופטים",
    "sql.היבטים_פיננסיים.סכום_פיצוי_נפסק",
  ];
  const page = await prisma.page.findUnique({ where: { slug } });
  if (!page) return;
  const isCorrupt = (fields: unknown): boolean =>
    Array.isArray(fields) &&
    fields.some((f) => {
      if (typeof f !== "string") return false;
      if (f === "") return true; // stray empty entry
      for (let i = 0; i < f.length; i++) {
        const code = f.charCodeAt(i);
        if (code === 0xa0) return true; // non-breaking space
        if (code >= 0xd800 && code <= 0xdfff) return true; // lone surrogate
      }
      return false;
    });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fix = (c: any): boolean => {
    if (c && c.query && isCorrupt(c.query.displayFields)) {
      c.query.displayFields = [...clean];
      return true;
    }
    return false;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content = page.content as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const draft = page.draftContent as any;
  const a = fix(content);
  const b = fix(draft);
  if (a || b) {
    await prisma.page.update({
      where: { slug },
      data: { content, draftContent: draft },
    });
    console.log(`  ~ ${slug}: repaired corrupted displayFields`);
  }
}

async function main() {
  console.log("Ensuring dashboard content is in sync...");

  await ensureDashboardPage("sanegoria", "דשבורד סניגוריה", SANEGORIA_DEFAULT);
  await ensureDashboardPage("class-actions", "דשבורד תובענות ייצוגיות", CLASS_ACTIONS_DEFAULT);
  await ensureDashboardPage("guidelines", "מאגר הנחיות", GUIDELINES_DEFAULT);
  await ensureDashboardPage(
    "defamation-rulings",
    "פסקי דין בלשון הרע",
    DEFAMATION_RULINGS_DEFAULT,
  );
  await ensureDashboardPage(
    "foi-rulings",
    "פסקי דין בעתירות חופש מידע",
    FOI_RULINGS_DEFAULT,
  );
  await ensureDashboardPage("leam", "לעם — אתרים אזרחיים", LEAM_DEFAULT);
  await bumpRulingsPageSize();
  await repairDefamationDisplayFields();
  await ensureProjectsPage();
  await ensureMediaArticles();

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
