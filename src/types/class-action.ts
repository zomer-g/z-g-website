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

export interface ClassActionListResponse {
  total: number;
  skip: number;
  limit: number;
  items: ClassActionDocument[];
}
