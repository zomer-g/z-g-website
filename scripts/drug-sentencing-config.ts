import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const SLUG = "drug-sentencing"; // GUARD: only ever touch this page.

// Toggle the drug base-filter. Pass "nofilter" as argv to recon the raw scope-1
// corpus; default applies the topic filter. NOTE: TAG-IT now exposes a
// normalized, GIN-indexed `meta.topics` array (distinct tokens of
// סוגיות_ענישה) — filter on THAT (fast, indexed array-containment), NOT on the
// raw sql.סוגיות_ענישה text (which was a full-corpus regex scan).
const NO_FILTER = process.argv[2] === "nofilter";
// "probe" mode swaps in candidate domain filters to recon values + filterability.
const PROBE = process.argv[2] === "probe";

const QUERY = {
  customQuery: NO_FILTER
    ? null
    : { field: "meta.topics", op: "contains", value: "סמים" },
  scope: 1,
  pageSize: 24,
  displayFields: [
    "ai.שם_התיק",
    "ai.תקציר",
    "meta.topics",
    "ai.בית_משפט",
    "meta.document_date",
    "ai.שופטים",
    // array tables with dedicated renderers (DefendantsList / DrugOffensesTable):
    "sql.נאשמים",
    "sql.פירוט_עבירות_סמים",
  ],
  filterFields: PROBE
    ? [
        { key: "sql.פירוט_עבירות_סמים.סוג_הסם", label: "סוג הסם", control: "select" },
        { key: "sql.נאשמים.פירוט_ענישה.סוג_העונש", label: "רכיב ענישה", control: "select" },
        { key: "sql.נאשמים.הרשעות.תיאור_העבירה", label: "עבירה", control: "select" },
        { key: "sql.נאשמים.הרשעות.סעיף_מהותי", label: "סעיף עבירה", control: "text" },
        { key: "sql.פירוט_עבירות_סמים.מספר_כמות", label: "כמות סם", control: "number" },
      ]
    : [
        // ── Always-visible (ungrouped) ──
        { key: "ai.שם_התיק", label: "חיפוש בשם התיק", control: "text" },
        { key: "ai.בית_משפט", label: "בית משפט", control: "select" },
        { key: "meta.document_date", label: "תאריך", control: "date" },
        // ── Group "סמים" (collapsible) ──
        // GIN-indexed array (like meta.topics) — a select must send `contains`
        // (not eq) to match an array element. Curated options override the noisy
        // mid-backfill enum sample; swap for TAG-IT's full canonical list later.
        {
          key: "meta.drug_types",
          label: "סוג הסם",
          control: "select",
          matchOp: "contains",
          options: ["קוקאין", "קנאביס", "חשיש", "MDMA", "הרואין", "קטמין", "LSD", "מתאמפטמין", "בופרנורפין", "פסילוצין"],
          group: "סמים",
        },
        { key: "meta.drug_max_grams", label: "כמות סם (גרם)", control: "number", group: "סמים" },
        // ── Group "ענישה" (collapsible) — value ranges per component type ──
        {
          key: "meta.punishment_types",
          label: "רכיב ענישה",
          control: "select",
          matchOp: "contains",
          options: ["מאסר בפועל", "מאסר על תנאי", "מאסר בעבודות שירות", "קנס", "פיצוי", "שירות לתועלת הציבור", "צו מבחן", "חילוט", "התחייבות", "פסילת רישיון נהיגה"],
          group: "ענישה",
        },
        { key: "meta.prison_actual_months", label: "מאסר בפועל (חודשים)", control: "number", group: "ענישה" },
        { key: "meta.prison_suspended_months", label: "מאסר על תנאי (חודשים)", control: "number", group: "ענישה" },
        { key: "meta.community_service_hours", label: "של\"צ (שעות)", control: "number", group: "ענישה" },
        { key: "meta.fine_shekels", label: "קנס (₪)", control: "number", group: "ענישה" },
        { key: "meta.compensation_shekels", label: "פיצוי (₪)", control: "number", group: "ענישה" },
        // ── Group "עבירה" (collapsible) ──
        {
          key: "meta.offense_laws",
          label: "חוק העבירה",
          control: "select",
          matchOp: "contains",
          options: ["פקודת הסמים המסוכנים", "חוק העונשין", "חוק הכניסה לישראל", "חוק כלי הירייה"],
          group: "עבירה",
        },
        // Offense section — array of section tokens (full "144(א)" + basic
        // "144"); contains = exact-token match, so the user types a section.
        { key: "meta.offense_sections", label: "סעיף עבירה", control: "text", group: "עבירה" },
        // ── Group "הודאה ותוצאה" — any-defendant boolean flags (Phase 3) ──
        // TAG-IT-indexed meta.* booleans (eq pushed to index); the raw nested
        // sql.נאשמים[] booleans time out and must NOT be used.
        { key: "meta.confessed", label: "הודה באשמה", control: "boolean", group: "הודאה ותוצאה" },
        { key: "meta.agreed_sentence", label: "עונש מוסכם", control: "boolean", group: "הודאה ותוצאה" },
        { key: "meta.conviction_annulled", label: "ביטול הרשעה", control: "boolean", group: "הודאה ותוצאה" },
        { key: "meta.rehab_deviation", label: "סטייה משיקולי שיקום", control: "boolean", group: "הודאה ותוצאה" },
      ],
  // meta.severity_score (promoted from ai._חומרת_ציון) is index-sortable.
  // Default sort = severity ascending (מקל לחמור) — first entry + defaultDir asc
  // → the route applies it server-side on initial load.
  sortFields: [
    { key: "meta.severity_score", label: "חומרת העונש", defaultDir: "asc" },
    { key: "meta.document_date", label: "תאריך המסמך" },
  ],
};

async function main() {
  let page = await prisma.page.findUnique({ where: { slug: SLUG } });
  if (!page) {
    page = await prisma.page.create({
      data: {
        slug: SLUG,
        title: "גזרי דין בעבירות סמים",
        content: {} as any,
        draftContent: {} as any,
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });
  }
  const apply = (c: any) => ({
    isPublic: (c && c.isPublic) ?? false,
    hero: (c && c.hero) ?? {
      title: "גזרי דין בעבירות סמים",
      subtitle: "גזרי דין אחרונים בעבירות סמים — נאשמים, הרשעות, ענישה וסוגי הסמים",
    },
    cacheTtlMinutes: (c && c.cacheTtlMinutes) ?? 60,
    legislation: (c && c.legislation) ?? [],
    allowedDocTypes: (c && c.allowedDocTypes) ?? [],
    ...(c ?? {}),
    query: QUERY,
  });
  await prisma.page.update({
    where: { slug: SLUG },
    data: {
      content: apply(page.content) as any,
      draftContent: apply(page.draftContent ?? page.content) as any,
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
  });
  console.log(`✓ ${SLUG} updated (filter=${NO_FILTER ? "NONE (recon)" : "סוגיות_ענישה contains סמים"})`);
}

main().finally(() => prisma.$disconnect());
