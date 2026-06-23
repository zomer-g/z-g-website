import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { readFileSync } from "fs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const SLUG = "foi-judgments"; // GUARD: this script must NEVER touch foi-costs.

// Cascade map (law → its closed list of sections) + lawOrder (laws by doc
// frequency), built by scripts/foi-build-lawsection-map.ts from a corpus scan.
const LAW_SECTION_DATA: { map: Record<string, string[]>; lawOrder: string[] } =
  JSON.parse(readFileSync("scripts/lawsection-map.json", "utf-8"));

// FOI ("חופש מידע") detailed-view config — mirrors the defamation page's
// rich card layout, using the fields TAG-IT extracts for scope-6 documents
// (verified against live data, e.g. doc 156666).
const QUERY = {
  customQuery: null,
  scope: 6,
  pageSize: 24,
  // First field = card header. Long text (תקציר) auto-renders as a paragraph;
  // booleans render as כן/לא; ai.אזכורי_חוק is an array-of-objects and gets the
  // StructuredFieldRows "table inside the case" treatment (the FOI analog of
  // defamation's רשימת_פרסומים / הגנות_שנטענו).
  displayFields: [
    "ai.שם_התיק",
    "ai.תקציר",
    "ai.תגיות",
    "ai.בית_משפט",
    "meta.document_date",
    "ai.שופטים",
    "ai.מספר_הליך",
    "ai.עתירת_אי_מתן_מענה",
    "ai.האם_הורו_על_מסירת_מידע",
    "ai.האם_הורו_על_החזר_אגרה",
    "sql.סכום_הוצאות_שקלים",
    // The "טענות סעיפי חוק שנדונו" table: each row = law name + section badge +
    // section description + accepted/rejected pill (האם_הטענה_התקבלה → כן/לא).
    // Renders via StructuredFieldRows exactly like the TAG-IT viewer's table.
    "sql.טענות_סעיפי_חוק_שנדונו",
  ],
  filterFields: [
    { key: "ai.שם_התיק", label: "חיפוש בשם התיק", control: "text" },
    { key: "ai.בית_משפט", label: "בית משפט", control: "select" },
    { key: "meta.document_date", label: "תאריך", control: "date" },
    { key: "ai.שופטים", label: "שופט/ת", control: "text" },
    // NOTE: ai.אזכורי_חוק is shown as a list but is NOT filterable — TAG-IT's
    // scope-6 schema rejects the nested array path (unknown_field), so no
    // per-section filter control is exposed (it would error the filter bar).
    // Outcome flags (כן/לא).
    { key: "ai.עתירת_אי_מתן_מענה", label: "עתירת אי-מתן מענה", control: "boolean" },
    { key: "ai.האם_הורו_על_מסירת_מידע", label: "הורה על מסירת מידע", control: "boolean" },
    { key: "ai.האם_הורו_על_החזר_אגרה", label: "הורה על החזר אגרה", control: "boolean" },
    { key: "sql.סכום_הוצאות_שקלים", label: "סכום הוצאות (₪)", control: "number" },
  ],
  // Mirror defamation: no sort dropdown — rely on TAG-IT's newest-first order
  // (matches the "מהחדש לישן" subtitle).
  sortFields: [],
  // Cascading law→section filter. TAG-IT can't match the parenthesised section
  // values, so the API narrows by law upstream then filters sections in memory
  // (OR/AND). The closed dropdown lists come from `map`.
  lawSectionFilter: {
    label: "סינון לפי חוק וסעיף",
    arrayKey: "טענות_סעיפי_חוק_שנדונו",
    lawSubKeys: ["שם_חוק_רשמי", "שם_החוק"],
    sectionSubKey: "סעיף_החוק",
    upstreamLawField: "sql.טענות_סעיפי_חוק_שנדונו.שם_חוק_רשמי",
    map: LAW_SECTION_DATA.map,
    // Explicit display order (laws by doc frequency) — jsonb won't preserve the
    // map's key order, so the dropdown reads this instead of Object.keys(map).
    lawOrder: LAW_SECTION_DATA.lawOrder,
  },
};

async function main() {
  const page = await prisma.page.findUnique({ where: { slug: SLUG } });
  if (!page) throw new Error(`page ${SLUG} not found`);

  const apply = (c: any) => ({ ...(c ?? {}), query: QUERY });
  const newContent = apply(page.content);
  const newDraft = apply(page.draftContent ?? page.content);

  await prisma.page.update({
    where: { slug: SLUG },
    data: {
      content: newContent as any,
      draftContent: newDraft as any,
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
  });
  console.log(`✓ updated ${SLUG} (displayFields=${QUERY.displayFields.length}, filterFields=${QUERY.filterFields.length})`);
}

main().finally(() => prisma.$disconnect());
