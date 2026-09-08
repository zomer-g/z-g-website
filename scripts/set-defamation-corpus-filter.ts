/**
 * Install the defamation base query on the /defamation-rulings Page row.
 *
 * The rule itself — and the measurements behind it — live in
 * src/lib/defamation-corpus-filter.ts. It goes in the DB, not in
 * content-defaults.ts, for the reason the drug-sentencing default already
 * records: deepMerge would mix a non-null default leaf into the DB's AND-tree.
 *
 * Writes `query.customQuery` on both the published content and the draft, and
 * leaves every other key alone. Idempotent.
 *
 *   npx tsx scripts/set-defamation-corpus-filter.ts            # dry run
 *   npx tsx scripts/set-defamation-corpus-filter.ts --apply
 *   npx tsx scripts/set-defamation-corpus-filter.ts --revert   # back to null
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { DEFAMATION_CORPUS_FILTER } from "../src/lib/defamation-corpus-filter";

const APPLY = process.argv.includes("--apply");
const REVERT = process.argv.includes("--revert");
const SLUG = "defamation-rulings";
const TARGET = REVERT ? null : DEFAMATION_CORPUS_FILTER;

/** Key-order-insensitive compare — Postgres jsonb reorders object keys, so a
    plain stringify makes an unchanged row look changed on every re-run. */
function canon(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canon).join(",")}]`;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${canon(o[k])}`).join(",")}}`;
  }
  return JSON.stringify(v ?? null);
}

function setQuery(container: unknown): boolean {
  const c = container as Record<string, unknown> | null;
  if (!c) return false;
  const query = (c.query ?? null) as Record<string, unknown> | null;
  if (!query) return false;
  const before = canon(query.customQuery ?? null);
  query.customQuery = TARGET;
  return before !== canon(TARGET);
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const page = await prisma.page.findUnique({ where: { slug: SLUG } });
  if (!page) {
    console.log(`✗ ${SLUG}: אין שורת Page`);
    await prisma.$disconnect();
    return;
  }
  const content = JSON.parse(JSON.stringify(page.content ?? {}));
  const draft = JSON.parse(JSON.stringify(page.draftContent ?? page.content ?? {}));
  const changed = setQuery(content);
  setQuery(draft);

  console.log(`\n${SLUG}: customQuery ${REVERT ? "→ null (שחזור)" : "→ סינון לפי תוכן"}`);
  console.log(changed ? "   ✎ שונה" : "   · כבר במצב הרצוי");
  if (!REVERT) console.log(JSON.stringify(TARGET, null, 1));

  if (APPLY && changed) {
    await prisma.page.update({
      where: { slug: SLUG },
      data: { content, draftContent: draft },
    });
    console.log("   ✓ נשמר");
  }
  console.log(APPLY ? "\n✓ הוחל" : "\n(הרצה יבשה — הוסף --apply כדי לשמור)");
  await prisma.$disconnect();
}

main();
