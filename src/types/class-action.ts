export interface ClassActionDocument {
  id: number;
  filename: string;
  case_name: string;
  case_number: string;
  court_name: string;
  document_title: string;
  document_date: string;
  case_open_date: string;
  claim_amount: number;
  is_appeal: boolean;
  is_attachment: boolean;
  is_published: boolean;
  class_definition: string;
  legal_question: string;
  requested_aid: string;
  document_type: string;
  case_id_internal: number;
  document_id_internal: number;
  upload_date: string;
}

// Raw response shape from tag-it.biz upstream.
export interface UpstreamListResponse {
  total: number;
  skip: number;
  limit: number;
  items: ClassActionDocument[];
}

// One case = a group of documents that share the same case_number.
export interface ClassActionCase {
  case_number: string;
  case_name: string;
  court_name: string;
  case_open_date: string;
  claim_amount: number;
  is_appeal: boolean;
  class_definition: string;
  legal_question: string;
  requested_aid: string;
  latest_document_date: string;
  documents: ClassActionDocument[];
}

// Response shape our /api/class-actions/documents endpoint returns to the client.
export interface CasesListResponse {
  total: number;
  skip: number;
  limit: number;
  cases: ClassActionCase[];
}
