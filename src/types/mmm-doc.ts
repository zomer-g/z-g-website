/**
 * Knesset Research & Information Center document (מסמך מרכז המחקר והמידע של
 * הכנסת — מ.מ.מ) — TAG-IT scope 14.
 *
 * The public page is styled like the comptroller-reports / guidelines search: a
 * card per document with a full-text snippet + relevance when the user searched.
 * The card consumes the same flat fields the comptroller card does, so the
 * mapping from TAG-IT's {id, ai, sql, meta} shape lives in one place
 * (`mapMmmDoc` in lib/mmm-upstream.ts). The exact scope-specific field paths are
 * finalized once the scope-14 schema is confirmed; this interface stays flexible
 * via the index signature so unmapped fields survive for display.
 */
export interface MmmDoc {
  id: number;
  filename?: string;
  document_title?: string;
  document_date?: string;
  // Document type (e.g. "מסמך רקע", "סקירה", "מענה לבקשת חבר כנסת") — drives the
  // badge + the "type" facet pills. Populated from the scope-specific meta field.
  doc_type?: string;
  // Full category/type array (a doc may carry several) — powers the facet pills
  // (matched via the category `in` filter).
  categories?: string[];
  // Author / researcher who wrote the document (ai.מחבר).
  author?: string;
  // Subject / domain of the document.
  topic?: string;
  // Short abstract shown on the card.
  summary?: string;
  // Carry-through for any additional configured display fields.
  [key: string]: unknown;
}

export interface MmmDocsListResponse {
  total: number;
  skip: number;
  limit: number;
  items: MmmDoc[];
  snippets?: string[];
  relevance?: number[];
}
