/* ─── Conditional Arrangements (הסדרים מותנים) Types ─── */

export type ArrangementSource = "police" | "prosecutor";

// Raw record as it comes off the CSV — field names are Hebrew strings.
export type RawRecord = Record<string, string>;

// Normalised record consumed by the API and UI.
// Best-effort mapped fields are null when the source CSV lacks them.
export interface ConditionalArrangement {
  _id: string;                 // `${source}:${index}`
  source: ArrangementSource;
  date: string | null;         // ISO date string, null when unparseable
  offense: string | null;      // סוג עבירה / עבירה
  district: string | null;     // מחוז
  fine: number | null;         // קנס
  compensation: number | null; // פיצוי
  // All raw fields preserved verbatim for full-text search and display.
  raw: RawRecord;
}

// Paginated response from the API route.
export interface ArrangementsResponse {
  total: number;
  skip: number;
  limit: number;
  records: ConditionalArrangement[];
  // Sorted, deduplicated categorical values seen across filtered records.
  // Used to populate dynamic filter dropdowns in the UI.
  facets: {
    districts: string[];
    offenses: string[];
  };
}

// Minimal over.org.il version object shape.
export interface OverVersionObject {
  id: string;
  version_number: number;
  resource_mappings: Record<string, string>;
  change_summary?: {
    total_rows?: number;
    resources?: Array<{ name: string; rows: number; format: string }>;
  };
}
