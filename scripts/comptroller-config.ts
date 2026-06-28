import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const SLUG = "comptroller-reports"; // GUARD: only ever touch this page.

// report_group (meta.report_group, string[]) — the report-type dimension — is
// now shown as clickable facet pills in the filter screen (computed from the
// corpus, with counts), NOT as a select dropdown. So it's intentionally NOT in
// filterFields here; the native source-pill UI + the `source`→report_group `in`
// filter handle it.

const QUERY = {
  // No base filter — scope 13 is exclusively comptroller reports already.
  customQuery: null,
  scope: 13,
  pageSize: 24,
  // The card renders title/date/category badge/snippet itself; no extra fields.
  displayFields: [],
  // No configured extra filters: all search controls live in the single main
  // filter block (free-text full-text search + date range + report-type pills).
  // A separate title filter is redundant with the full-text search and would
  // render as a confusing second block with its own apply button.
  filterFields: [],
  // Default (no text_query) listing is newest-first; user can pick date order.
  // With a text_query the route omits sort so TAG-IT returns relevance order.
  sortFields: [{ key: "meta.document_date", label: "תאריך הדוח", defaultDir: "desc" }],
};

const HERO = {
  title: "דוחות מבקר המדינה",
  subtitle: "מאגר דוחות מבקר המדינה — חיפוש חופשי בתוך תוכן הדוחות, לפי גוף מבוקר ותאריך",
};

// Pass "publish" as argv to also flip isPublic=true; default leaves it as-is so
// we can verify privately first.
const PUBLISH = process.argv[2] === "publish";

async function main() {
  let page = await prisma.page.findUnique({ where: { slug: SLUG } });
  if (!page) {
    page = await prisma.page.create({
      data: {
        slug: SLUG,
        title: "דוחות מבקר המדינה",
        content: {} as any,
        draftContent: {} as any,
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });
  }
  const apply = (c: any) => ({
    // Carry any existing keys, then override the ones we own.
    ...(c ?? {}),
    isPublic: PUBLISH ? true : ((c && c.isPublic) ?? false),
    hero: HERO,
    cacheTtlMinutes: (c && c.cacheTtlMinutes) ?? 60,
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
  console.log(`✓ ${SLUG} config set (publish=${PUBLISH})`);
}

main().finally(() => prisma.$disconnect());
