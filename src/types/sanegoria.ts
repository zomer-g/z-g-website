export interface GroupedCount {
  group: string;
  category: string;
  count: number;
}

export interface MetricRow {
  group: string;
  avg: number;
  std: number;
  median: number;
  n: number;
}

export interface SanegoriaFilters {
  courts?: string[];
  yearMin?: number;
  yearMax?: number;
  verdicts?: string[];
  sole?: "all" | "sole" | "multi";
  offenses?: string[];
}

export interface SanegoriaData {
  kpis: {
    totalCases: number;
    pctPd: string;
    pctSole: string;
    avgHearings: string;
    avgDaysFirst: string;
    avgOffenses: string;
  };
  annual: GroupedCount[];
  verdicts: GroupedCount[];
  courts: GroupedCount[];
  pie: { pd: number; other: number };
  hearingTypes: GroupedCount[];
  hearingStatuses: GroupedCount[];
  hearingsPerCase: MetricRow[];
  daysToFirst: MetricRow[];
  duration: MetricRow[];
  topOffenses: GroupedCount[];
  offensesPerCase: MetricRow[];
  offenseCategories: GroupedCount[];
}

export interface SanegoriaFilterOptions {
  courts: string[];
  verdicts: string[];
  offenses: { label: string; value: string }[];
  yearRange: [number, number];
}
