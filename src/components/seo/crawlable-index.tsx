import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getPageContent } from "@/lib/content";
import { queryMirrorPage } from "@/lib/rulings-mirror";
import type { FilterExpression } from "@/types/ruling-filter";
import type { DefamationRulingsPageContent } from "@/types/content";

/**
 * A server-rendered list of recent documents, shown under a dashboard.
 *
 * The dashboards fetch and render their results in the browser, so the HTML a
 * crawler receives for /guidelines contained zero links to any guideline —
 * measured, not assumed. A sitemap alone tells Google the pages exist; a real
 * link tells it they are part of the site and worth something. This is that
 * link, and it doubles as a genuinely useful "what came in recently" list for
 * a reader who has not typed a query yet.
 *
 * Reads the local mirror, so it costs one indexed SELECT and never touches the
 * upstream.
 */

const LIMIT = 60;

type Props =
  | { kind: "guidelines" }
  | {
      kind: "rulings";
      scopeId: number;
      basePath: string;
      // Page whose configured base query this list should obey. Without it the
      // list is every document in the scope — which on /defamation-rulings meant
      // sixty bank-debt and car-insurance judgments under a defamation page.
      pageSlug?: string;
    };

interface Row {
  href: string;
  title: string;
}

async function loadGuidelines(): Promise<Row[]> {
  const rows = await prisma.guidelineDoc.findMany({
    select: { id: true, data: true },
    orderBy: [{ documentDate: { sort: "desc", nulls: "last" } }, { id: "desc" }],
    take: LIMIT,
  });
  return rows
    .map((r) => {
      const d = r.data as { document_title?: string; filename?: string };
      const title = (d.document_title || d.filename || "").trim();
      return { href: `/guidelines/${r.id}`, title };
    })
    .filter((r) => r.title);
}

/** The base query the page itself filters by, when it has one. */
async function pageBaseFilter(slug: string): Promise<FilterExpression | null> {
  try {
    const content = await getPageContent<DefamationRulingsPageContent>(slug);
    return content?.query?.customQuery ?? null;
  } catch {
    return null;
  }
}

// Same title chain the detail page uses, so nothing here links to a page
// that renders as "ללא שם".
const TITLE_SQL = `COALESCE(
          NULLIF(TRIM(data::jsonb->'ai'->>'שם_התיק'), ''),
          NULLIF(TRIM(data::jsonb->'meta'->>'case_name'), ''),
          NULLIF(TRIM(data::jsonb->>'case_name'), ''),
          NULLIF(TRIM(data::jsonb->>'filename'), '')
        )`;

function itemTitle(item: Record<string, unknown>): string {
  const ai = (item.ai ?? {}) as Record<string, unknown>;
  const meta = (item.meta ?? {}) as Record<string, unknown>;
  for (const v of [ai["שם_התיק"], meta.case_name, item.case_name, item.filename]) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

async function loadRulings(
  scopeId: number,
  basePath: string,
  pageSlug?: string,
): Promise<Row[]> {
  // A page with a base query gets the SAME set it lists. No fallback to the
  // unfiltered query here on purpose — sixty wrong links are worse than none.
  const filter = pageSlug ? await pageBaseFilter(pageSlug) : null;
  if (filter) {
    const { items } = await queryMirrorPage({
      scopeId,
      filter,
      sortKey: "meta.document_date",
      sortDesc: true,
      page: 1,
      size: LIMIT,
    });
    return items
      .map((item) => ({
        href: `${basePath}/${(item as { id: number }).id}`,
        title: itemTitle(item as unknown as Record<string, unknown>),
      }))
      .filter((r) => r.title);
  }
  const rows = await prisma.$queryRawUnsafe<{ doc_id: number; title: string }[]>(
    `SELECT doc_id, ${TITLE_SQL} AS title
     FROM tagit_docs
     WHERE scope_id = $1
       AND ${TITLE_SQL} IS NOT NULL
     ORDER BY document_date DESC NULLS LAST, doc_id DESC
     LIMIT $2`,
    scopeId,
    LIMIT,
  );
  return rows.map((r) => ({ href: `${basePath}/${r.doc_id}`, title: r.title }));
}
export async function CrawlableIndex(props: Props) {
  let rows: Row[] = [];
  try {
    rows =
      props.kind === "guidelines"
        ? await loadGuidelines()
        : await loadRulings(props.scopeId, props.basePath, props.pageSlug);
  } catch {
    // Never let this take the page down — it is an enhancement, not content.
    return null;
  }
  if (rows.length === 0) return null;

  // Collapsed by default. The links are the point — they are in the HTML
  // either way, which is all a crawler needs — but sixty of them under a
  // dashboard read as the page's main content and buried the results the
  // reader came for. A closed <details> keeps the links and gives the list
  // back its weight: a footnote, opened by whoever wants it. The native
  // disclosure marker is left alone — it already points the right way in RTL.
  return (
    <nav
      aria-labelledby="recent-docs-heading"
      className="mt-12 border-t border-border pt-6"
    >
      <details>
        <summary
          id="recent-docs-heading"
          className="cursor-pointer text-sm font-bold text-primary-dark hover:text-accent-text"
        >
          מסמכים שנוספו לאחרונה ({rows.length})
        </summary>
        <ul className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <li key={r.href} className="min-w-0">
              <Link
                href={r.href}
                className="block truncate text-sm text-primary hover:text-accent-text hover:underline"
                title={r.title}
              >
                {r.title}
              </Link>
            </li>
          ))}
        </ul>
      </details>
    </nav>
  );
}
