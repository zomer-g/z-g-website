export interface Guideline {
  id: number;
  filename: string;
  document_title: string;
  document_date: string;
  directive_number: string;
  source_label: string;
  topic: string;
  summary: string;
  effective_date: string | null;
  supersedes: string | string[] | null;
  has_text: boolean;
  text_chars: number;
  upload_date: string;
}

export interface UpstreamGuidelinesListResponse {
  total: number;
  skip: number;
  limit: number;
  items: Guideline[];
}

export interface GuidelinesListResponse {
  total: number;
  skip: number;
  limit: number;
  items: Guideline[];
}
