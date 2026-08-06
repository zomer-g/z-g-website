/**
 * Repair the filter defects the page audit found (tests/benchmarks/
 * RULINGS-PAGES-REPORT.md). Surgical and idempotent: it edits only the named
 * filter fields in place and leaves the rest of each page's config untouched,
 * because these pages have no single source-of-truth config script the way
 * drug-sentencing does — rewriting their `query` wholesale would silently
 * revert whatever was last tuned in the admin UI.
 *
 *   npx tsx scripts/fix-rulings-page-filters.ts            # dry run
 *   npx tsx scripts/fix-rulings-page-filters.ts --apply
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const APPLY = process.argv.includes("--apply");

interface FilterField {
  key: string;
  label: string;
  control: string;
  [k: string]: unknown;
}

/** One repair: find the field by key, replace the listed properties. */
interface Fix {
  slug: string;
  matchKey: string;
  set: Partial<FilterField>;
  why: string;
}

const FIXES: Fix[] = [
  // ── defamation: two filters pointed at keys that do not exist ──
  // TAG-IT nests both booleans under רשימת_פרסומים. As configured they matched
  // nothing on any of 4,483 documents while costing ~40s upstream per query.
  // Repointed (not removed): the data is there — 1,050/425 and 421/914.
  {
    slug: "defamation-rulings",
    matchKey: "sql.נקבע_כלשון_הרע",
    set: { key: "sql.רשימת_פרסומים.נקבע_כלשון_הרע" },
    why: "מפתח לא קיים → הנתיב האמיתי תחת רשימת_פרסומים (1050 כן / 425 לא)",
  },
  {
    slug: "defamation-rulings",
    matchKey: "sql.חלו_הגנות",
    set: { key: "sql.רשימת_פרסומים.חלו_הגנות" },
    why: "מפתח לא קיים → הנתיב האמיתי תחת רשימת_פרסומים (421 כן / 914 לא)",
  },
  // ── foi-costs: a boolean field behind a `select` ──
  // The select sends the STRING "true"; the mirror compiles `@ == "true"` and
  // jsonpath equality is type-strict, so it can never match a stored boolean.
  // 120 documents qualify and the filter returned none. /foi-judgments wires
  // the same field as `boolean` and works. The label was the raw field name.
  {
    slug: "foi-costs",
    matchKey: "ai.עתירת_אי_מתן_מענה",
    set: { control: "boolean", label: "עתירת אי-מתן מענה", options: undefined },
    why: "שדה בוליאני מאחורי select → פקד boolean + תווית מתורגמת",
  },
  // ── both FOI pages: the judge box demands an exact full name ──
  // ai.שופטים is declared string[], so `contains` is an exact element match
  // and a partial name structurally cannot hit. The filter works; the label
  // was promising a search it can't do.
  {
    slug: "foi-judgments",
    matchKey: "ai.שופטים",
    set: { label: "שופט/ת (שם מלא)" },
    why: "contains על string[] = התאמה מדויקת; התווית לא רמזה שנדרש שם מלא",
  },
  {
    slug: "foi-costs",
    matchKey: "ai.שופטים",
    set: { label: "חיפוש לפי שם השופט (שם מלא)" },
    why: "contains על string[] = התאמה מדויקת; התווית לא רמזה שנדרש שם מלא",
  },
];

function applyTo(container: unknown, fix: Fix): string | null {
  const c = container as Record<string, unknown> | null;
  const query = (c?.query ?? null) as Record<string, unknown> | null;
  const fields = query?.filterFields as FilterField[] | undefined;
  if (!Array.isArray(fields)) return null;
  const f = fields.find((x) => x.key === fix.matchKey);
  if (!f) return null;
  const before = JSON.stringify({ key: f.key, label: f.label, control: f.control });
  for (const [k, v] of Object.entries(fix.set)) {
    if (v === undefined) delete f[k];
    else f[k] = v;
  }
  const after = JSON.stringify({ key: f.key, label: f.label, control: f.control });
  return before === after ? null : `${before} → ${after}`;
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  const bySlug = new Map<string, Fix[]>();
  for (const f of FIXES) bySlug.set(f.slug, [...(bySlug.get(f.slug) ?? []), f]);

  for (const [slug, fixes] of bySlug) {
    const page = await prisma.page.findUnique({ where: { slug } });
    if (!page) {
      console.log(`✗ ${slug}: no Page row`);
      continue;
    }
    const content = JSON.parse(JSON.stringify(page.content ?? {}));
    const draft = JSON.parse(JSON.stringify(page.draftContent ?? page.content ?? {}));
    const changes: string[] = [];
    for (const fix of fixes) {
      const a = applyTo(content, fix);
      applyTo(draft, fix);
      changes.push(`   ${a ? "✎" : "· (כבר מתוקן)"} ${fix.matchKey}${a ? `  ${a}` : ""}\n      ${fix.why}`);
    }
    console.log(`\n${slug}:`);
    console.log(changes.join("\n"));
    if (APPLY) {
      await prisma.page.update({
        where: { slug },
        data: { content, draftContent: draft },
      });
      console.log(`   ✓ נשמר`);
    }
  }
  console.log(APPLY ? "\n✓ הוחל" : "\n(הרצה יבשה — הוסף --apply כדי לשמור)");
  await prisma.$disconnect();
}

main();
