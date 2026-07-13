import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const SLUG = "mmm"; // GUARD: only ever touch this page.

// The document-type dimension (ai.תחום) is shown as clickable facet pills in the
// filter screen (computed from the corpus, with counts), NOT as a select
// dropdown — so it's intentionally NOT in filterFields here; the native
// source-pill UI + the `source`→ai.תחום `eq` filter handle it. The curated pill
// values live in DOC_TYPE_SERIES in src/lib/mmm-upstream.ts.

const QUERY = {
  // No base filter — scope 14 is exclusively מ.מ.מ documents already.
  customQuery: null,
  scope: 14,
  pageSize: 12,
  // The card renders title/date/type badge/snippet itself; no extra fields.
  displayFields: [],
  // No configured extra filters: all search controls live in the single main
  // filter block (free-text full-text search + date range + type pills).
  filterFields: [],
  // Default (no text_query) listing is newest-first; user can pick date order.
  // With a text_query the route omits sort so TAG-IT returns relevance order.
  sortFields: [{ key: "meta.document_date", label: "תאריך המסמך", defaultDir: "desc" }],
};

const HERO = {
  title: "מסמכי מרכז המחקר והמידע של הכנסת",
  subtitle:
    "מאגר מסמכי המ.מ.מ — חיפוש חופשי בתוך תוכן המסמכים, לפי סוג ותאריך",
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
        title: "מסמכי מרכז המחקר והמידע של הכנסת",
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
