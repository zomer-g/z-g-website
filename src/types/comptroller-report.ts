/**
 * State Comptroller report (דוח מבקר המדינה) — TAG-IT scope 13.
 *
 * The public page is styled like the guidelines search: a card per report with
 * a full-text snippet + relevance when the user searched. The card consumes the
 * same flat fields the guidelines card does, so the mapping from TAG-IT's
 * {id, ai, sql, meta} shape lives in one place (`mapComptrollerDoc` in
 * lib/comptroller-upstream.ts). The exact source field paths are finalized once
 * the scope-13 schema arrives; this interface stays flexible via the index
 * signature so unmapped fields survive for display.
 */
export interface ComptrollerReport {
  id: number;
  filename?: string;
  document_title?: string;
  document_date?: string;
  // Audited body / ministry — drives the "source" facet pills + badge.
  source_label?: string;
  // Subject / domain of the report.
  topic?: string;
  // Short abstract shown on the card.
  summary?: string;
  // Optional extras (finalized with schema): report series/type, year, etc.
  report_type?: string;
  report_year?: string;
  // Carry-through for any additional configured display fields.
  [key: string]: unknown;
}

export interface ComptrollerReportsListResponse {
  total: number;
  skip: number;
  limit: number;
  items: ComptrollerReport[];
  snippets?: string[];
  relevance?: number[];
}
