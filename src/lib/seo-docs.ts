import { prisma } from "./prisma";
import { RULING_HAS_TITLE } from "./sitemap-documents";

/**
 * Internal linking and descriptions for the document pages (/rulings/[id],
 * /guidelines/[id]).
 *
 * Search Console showed ~29,000 document URLs submitted and 409 indexed. The
 * document pages linked to nothing but the site nav, so the only way in was
 * the sitemap, and each page sat alone with no signal of where it belongs.
 * Every page now links to its neighbours in the same corpus (by id — a cheap
 * primary-key range read, and a chain that reaches every document from any
 * other), and to the practice-area page a reader of that document might need.
 */

export interface DocLink {
  href: string;
  title: string;
}

const RELATED_EACH_SIDE = 4;

/** Rulings in the same scope with the nearest ids, titled ones only. */
export async function relatedRulings(scopeId: number, docId: number): Promise<DocLink[]> {
  const nameExpr = `COALESCE(
    NULLIF(TRIM(data::jsonb->'ai'->>'שם_התיק'), ''),
    NULLIF(TRIM(data::jsonb->'meta'->>'case_name'), ''),
    NULLIF(TRIM(data::jsonb->>'case_name'), ''),
    NULLIF(TRIM(data::jsonb->>'filename'), '')
  )`;
  try {
    const rows = await prisma.$queryRawUnsafe<{ doc_id: number; name: string }[]>(
      `(SELECT doc_id, ${nameExpr} AS name FROM tagit_docs
          WHERE scope_id = $1 AND doc_id < $2 AND ${RULING_HAS_TITLE}
          ORDER BY doc_id DESC LIMIT $3)
       UNION ALL
       (SELECT doc_id, ${nameExpr} AS name FROM tagit_docs
          WHERE scope_id = $1 AND doc_id > $2 AND ${RULING_HAS_TITLE}
          ORDER BY doc_id ASC LIMIT $3)`,
      scopeId,
      docId,
      RELATED_EACH_SIDE,
    );
    return rows
      .sort((a, b) => a.doc_id - b.doc_id)
      .map((r) => ({ href: `/rulings/${r.doc_id}`, title: r.name }));
  } catch (err) {
    console.error("[seo-docs] related rulings failed:", err);
    return [];
  }
}

/** Guidelines from the same issuing body with the nearest ids. */
export async function relatedGuidelines(
  id: number,
  sourceLabel: string | null | undefined,
): Promise<DocLink[]> {
  try {
    const where = sourceLabel ? { sourceLabel } : {};
    const [before, after] = await Promise.all([
      prisma.guidelineDoc.findMany({
        where: { ...where, id: { lt: id } },
        orderBy: { id: "desc" },
        take: RELATED_EACH_SIDE,
        select: { id: true, data: true },
      }),
      prisma.guidelineDoc.findMany({
        where: { ...where, id: { gt: id } },
        orderBy: { id: "asc" },
        take: RELATED_EACH_SIDE,
        select: { id: true, data: true },
      }),
    ]);
    return [...before.reverse(), ...after]
      .map((r) => {
        const d = (r.data ?? {}) as { document_title?: string; filename?: string };
        const title = (d.document_title || d.filename || "").trim();
        return title ? { href: `/guidelines/${r.id}`, title } : null;
      })
      .filter((x): x is DocLink => x !== null);
  } catch (err) {
    console.error("[seo-docs] related guidelines failed:", err);
    return [];
  }
}

export {
  guidelineDescription,
  practiceLinksForGuideline,
  practiceLinksForScope,
  rulingDescription,
  type PracticeLink,
} from "./seo-text";
