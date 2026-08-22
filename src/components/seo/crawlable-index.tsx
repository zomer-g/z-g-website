import Link from "next/link";
import { prisma } from "@/lib/prisma";

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
  | { kind: "rulings"; scopeId: number; basePath: string };

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

async function loadRulings(scopeId: number, basePath: string): Promise<Row[]> {
  // Same title chain the detail page uses, so nothing here links to a page
  // that renders as "ללא שם".
  const rows = await prisma.$queryRawUnsafe<{ doc_id: number; title: string }[]>(
    `SELECT doc_id,
            COALESCE(
              NULLIF(TRIM(data::jsonb->'ai'->>'שם_התיק'), ''),
              NULLIF(TRIM(data::jsonb->'meta'->>'case_name'), ''),
              NULLIF(TRIM(data::jsonb->>'case_name'), ''),
              NULLIF(TRIM(data::jsonb->>'filename'), '')
            ) AS title
     FROM tagit_docs
     WHERE scope_id = $1
       AND COALESCE(
             NULLIF(TRIM(data::jsonb->'ai'->>'שם_התיק'), ''),
             NULLIF(TRIM(data::jsonb->'meta'->>'case_name'), ''),
             NULLIF(TRIM(data::jsonb->>'case_name'), ''),
             NULLIF(TRIM(data::jsonb->>'filename'), '')
           ) IS NOT NULL
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
        : await loadRulings(props.scopeId, props.basePath);
  } catch {
    // Never let this take the page down — it is an enhancement, not content.
    return null;
  }
  if (rows.length === 0) return null;

  return (
    <nav
      aria-labelledby="recent-docs-heading"
      className="mt-12 border-t border-border pt-6"
    >
      <h2
        id="recent-docs-heading"
        className="mb-3 text-sm font-bold text-primary-dark"
      >
        מסמכים שנוספו לאחרונה
      </h2>
      <ul className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
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
    </nav>
  );
}
