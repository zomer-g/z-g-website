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
  // Base = drug cases (meta.topics ⊇ סמים) that ALSO have a non-empty drug-
  // offenses table (meta.has_drug_type) — so the opening page only shows cards
  // with a drug type. AND-tree works because the code default customQuery is
  // null (deepMerge takes this wholesale). (~4,665 docs as of the 100% backfill.)
  customQuery: NO_FILTER
    ? null
    : {
        op: "and",
        clauses: [
          { field: "meta.topics", op: "contains", value: "סמים" },
          { field: "meta.has_drug_type", op: "eq", value: true },
        ],
      },
  scope: 1,
  pageSize: 24,
  // Show only 6 results until the user applies a filter (then 24) — keeps the
  // initial (slow, full-corpus) load light and nudges toward filtering.
  initialPageSize: 6,
  // Free-text content search box (TAG-IT text_query over the full judgment text;
  // enabled for scope 1 after TAG-IT FTS-indexed the content). Results carry
  // meta.snippet (highlighted «…») + meta.rank.
  fullTextSearch: true,
  displayFields: [
    // The document date is now shown in the card title (in parentheses), so
    // it's intentionally NOT a separate row here.
    "ai.שם_התיק",
    "ai.תקציר",
    "meta.topics",
    "ai.בית_משפט",
    "ai.שופטים",
    // array tables with dedicated renderers (DefendantsList / DrugOffensesTable).
    // DefendantsList also renders the doc-level sql.מתחמי_ענישה inside each
    // defendant block (between convictions and punishment) — no display field
    // needed for it (read straight from the flattened fields).
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
        // Case name is searched via meta.case_name (a scalar string TAG-IT can
        // filter with `contains`) — it embeds the case number, so the search
        // covers it. The old ai.שם_התיק filter wasn't TAG-IT-filterable.
        { key: "meta.case_name", label: "חיפוש בשם התיק (לרבות מספר התיק)", control: "text" },
        // Court ערכאה — exact match on the new indexed meta.court_instance (works).
        { key: "meta.court_instance", label: "ערכאה", control: "select", options: ["שלום", "מחוזי", "עליון", "תעבורה", "נוער"] },
        // City — open text search over meta.court_city (the chip selector of ~49
        // cities looked cluttered). meta.court_city is now a GIN array, so
        // `contains` matches the exact city name typed.
        { key: "meta.court_city", label: "חיפוש לפי עיר", control: "text" },
        // Judge — free-text over meta.judges. TAG-IT stripped titles so the clean
        // name works ("שי ברגר" → 31), BUT `contains` is exact-element, so a
        // partial ("ברגר") returns 0 → label asks for the full name. (A real
        // substring match or a populated judges enum is still a TAG-IT follow-up.)
        { key: "meta.judges", label: "חיפוש לפי שם השופט (שם מלא, ללא תואר)", control: "text" },
        // Year range instead of a full date picker.
        { key: "meta.document_date", label: "טווח שנים", control: "yearrange" },
        // ── Group "סמים" (collapsible) ──
        // GIN-indexed array (like meta.topics) — a select must send `contains`
        // (not eq) to match an array element. Curated options override the noisy
        // mid-backfill enum sample; swap for TAG-IT's full canonical list later.
        {
          // Multi-select → OR (`in`) over the GIN array meta.drug_types.
          key: "meta.drug_types",
          label: "סוג הסם",
          control: "multiselect",
          // Ordered by prod frequency (קנאביס 2.3k, קוקאין 1.1k, חשיש 1k…).
          options: ["קנאביס", "קוקאין", "חשיש", "MDMA", "הרואין", "קטמין", "LSD", "מתאמפטמין", "בופרנורפין", "פסילוצין"],
          group: "סמים",
        },
        { key: "meta.drug_max_grams", label: "כמות סם (גרם)", control: "number", group: "סמים" },
        // ── Group "ענישה" (collapsible) — value ranges per component type ──
        // Filter by the MOST-SEVERE punishment component in the case (the new
        // indexed meta.primary_punishment_type = the harshest defendant's
        // primary component, clean canonical name). So selecting "מאסר על תנאי"
        // returns only cases whose harshest component is מאסר על תנאי — i.e. with
        // no מאסר בפועל. Options come from TAG-IT's schema enum (exact values).
        {
          key: "meta.primary_punishment_type",
          label: "רכיב הענישה החמור ביותר בתיק",
          control: "select",
          // Schema enum is empty for this field, so options are curated from the
          // corpus (clean canonical names). Severity order high→low.
          options: ["מאסר בפועל", "מאסר בעבודות שירות", "מאסר על תנאי", "קנס", "פיצוי", "התחייבות"],
          group: "ענישה",
        },
        { key: "meta.prison_actual_months", label: "מאסר בפועל (חודשים)", control: "number", group: "ענישה" },
        { key: "meta.prison_suspended_months", label: "מאסר על תנאי (חודשים)", control: "number", group: "ענישה" },
        { key: "meta.community_service_hours", label: "של\"צ (שעות)", control: "number", group: "ענישה" },
        { key: "meta.fine_shekels", label: "קנס (₪)", control: "number", group: "ענישה" },
        { key: "meta.compensation_shekels", label: "פיצוי (₪)", control: "number", group: "ענישה" },
        // ── Group "עבירה" (collapsible) ──
        // First row: drug-ordinance section TAGS — multi-select (OR via `in`) over
        // the GIN array meta.drug_ordinance_sections (base sections under פקודת
        // הסמים המסוכנים only). Options are CURATED in frequency order (most-common
        // first: 7=possession 837, 13=trafficking 217, 19א, 6, 10…); the client
        // shows the top few and collapses the rare ones behind a "show more".
        // Renders full-width → its own row.
        {
          key: "meta.drug_ordinance_sections",
          label: "סעיף בפקודת הסמים",
          control: "multiselect",
          // Cleaned list (TAG-IT validated sections 1–42 + real letter-sections).
          // 13א was merged into 13; 0/113/413/384/7ק were invalid and removed.
          options: ["7", "13", "19א", "6", "10", "3", "9", "2", "31", "12", "25", "1", "9א", "21", "36", "19", "10א", "36א", "14", "4"],
          // Marginal headings (כותרות שוליים) from פקודת הסמים המסוכנים [נוסח
          // חדש], תשל"ג-1973 (he.wikisource). Display-only — the filter value
          // stays the bare section number. NOTE: "9א" has no fallback here on
          // purpose — there is no section 9א in the ordinance (9=חצרים →
          // 10=כלים → 10א=כלים אסורים), so it shows bare; it's a TAG-IT
          // cataloging artifact worth cleaning up upstream.
          optionLabels: {
            "1": "1 הגדרות",
            "2": "2 פרטי היתר יבוא",
            "3": "3 פרטי היתר יצוא",
            "4": "4 פרטי היתר הטיה",
            "6": "6 ייצור, הכנה והפקה",
            "7": "7 החזקה ושימוש",
            "9": "9 חצרים",
            "10": "10 כלים",
            "10א": "10א כלים אסורים",
            "12": "12 שימוש מותר",
            "13": "13 יצוא, יבוא, מסחר והספקה",
            "14": "14 תיווך",
            "19": "19 סייג",
            "19א": "19א עונשין",
            "21": "21 הדחת קטין לסמים מסוכנים",
            "25": "25 מאסר חובה",
            "31": "31 חזקות",
            "36": "36 חילוט רשות",
            "36א": "36א חילוט רכוש בהליך פלילי",
          },
          group: "עבירה",
        },
        // Second row: the other-law name + a free-text section (any law).
        {
          key: "meta.offense_laws",
          label: "חוק העבירה (שאינו פקודת הסמים)",
          control: "select",
          matchOp: "contains",
          options: ["חוק העונשין", "חוק הכניסה לישראל", "חוק כלי הירייה", "פקודת התעבורה"],
          group: "עבירה",
        },
        { key: "meta.offense_sections", label: "סעיף עבירה (כל חוק)", control: "text", group: "עבירה" },
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
