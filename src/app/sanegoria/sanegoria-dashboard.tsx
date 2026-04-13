"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer, ErrorBar,
} from "recharts";
import type { SanegoriaData, SanegoriaFilterOptions, GroupedCount, MetricRow } from "@/types/sanegoria";

const PD = "סניגוריה ציבורית";
const OTHER = "ללא סניגוריה ציבורית";
const C_NAVY = "#2C5364";
const C_TEAL = "#17a2b8";
const C_YELLOW = "#ffc107";
const C_MUTED = "#6c757d";

// ── Reusable components ──

function KpiCard({ label, value, color = C_NAVY }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 text-center flex-1 min-w-[130px]">
      <div className="text-xs text-muted font-semibold mb-2 tracking-wide">{label}</div>
      <div className="text-xl font-bold leading-tight" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

function SectionDivider({ children, color = C_NAVY }: { children: string; color?: string }) {
  return (
    <div className="text-sm font-bold text-white rounded-lg px-4 py-2 mb-3 mt-2 tracking-wide"
         style={{ background: color }}>
      {children}
    </div>
  );
}

function ChartCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-3 flex-1">
      {title && <h3 className="text-sm font-semibold text-foreground mb-2">{title}</h3>}
      {children}
    </div>
  );
}

// ── Chart helpers ──

function GroupedBarChart({ data, catKey, title, topN, height = 300 }:
  { data: GroupedCount[]; catKey?: string; title: string; topN?: number; height?: number }) {
  // Pivot data for Recharts
  const catMap = new Map<string, { [key: string]: number }>();
  for (const d of data) {
    const cat = d.category;
    if (!catMap.has(cat)) catMap.set(cat, { category: cat, [PD]: 0, [OTHER]: 0 } as any);
    catMap.get(cat)![d.group] = d.count;
  }
  let rows = Array.from(catMap.values());

  // Compute totals and sort
  rows.forEach((r: any) => r._total = (r[PD] || 0) + (r[OTHER] || 0));
  rows.sort((a: any, b: any) => b._total - a._total);
  if (topN) rows = rows.slice(0, topN);

  // Convert to percentages within each group
  const pdTotal = rows.reduce((s, r: any) => s + (r[PD] || 0), 0);
  const otherTotal = rows.reduce((s, r: any) => s + (r[OTHER] || 0), 0);
  const grand = pdTotal + otherTotal;

  const pctRows = rows.map((r: any) => ({
    category: r.category,
    [PD]: pdTotal > 0 ? Number(((r[PD] || 0) / pdTotal * 100).toFixed(1)) : 0,
    [OTHER]: otherTotal > 0 ? Number(((r[OTHER] || 0) / otherTotal * 100).toFixed(1)) : 0,
    [`${PD}_n`]: r[PD] || 0,
    [`${OTHER}_n`]: r[OTHER] || 0,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-white border rounded-lg shadow-lg p-3 text-sm" dir="rtl">
        <div className="font-semibold mb-1">{label}</div>
        {payload.map((p: any) => (
          <div key={p.dataKey} style={{ color: p.fill }}>
            {p.dataKey}: {p.value}% (N={p.payload[`${p.dataKey}_n`]?.toLocaleString()})
          </div>
        ))}
      </div>
    );
  };

  return (
    <ChartCard title={`${title} (N=${grand.toLocaleString()})`}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={pctRows} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
          <XAxis dataKey="category" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} unit="%" />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar dataKey={PD} fill={C_NAVY} radius={[2, 2, 0, 0]} />
          <Bar dataKey={OTHER} fill={C_TEAL} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function StackedAnnualChart({ data }: { data: GroupedCount[] }) {
  const catMap = new Map<string, any>();
  for (const d of data) {
    if (!catMap.has(d.category)) catMap.set(d.category, { year: d.category, [PD]: 0, [OTHER]: 0 });
    catMap.get(d.category)![d.group] = d.count;
  }
  const rows = Array.from(catMap.values()).sort((a, b) => Number(a.year) - Number(b.year));
  const grand = rows.reduce((s, r) => s + (r[PD] || 0) + (r[OTHER] || 0), 0);

  return (
    <ChartCard title={`התפלגות שנתית (N=${grand.toLocaleString()})`}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={rows} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
          <XAxis dataKey="year" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          <Bar dataKey={PD} stackId="a" fill={C_NAVY} />
          <Bar dataKey={OTHER} stackId="a" fill={C_TEAL} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function MetricChart({ data, title, ylabel }: { data: MetricRow[]; title: string; ylabel?: string }) {
  const rows = data.flatMap(d => [
    { metric: "ממוצע", group: d.group, value: d.avg, err: d.std },
    { metric: "חציון", group: d.group, value: d.median, err: 0 },
  ]);
  const totalN = data.reduce((s, d) => s + d.n, 0);

  // Pivot for side-by-side
  const pivoted: Record<string, any>[] = [
    { metric: "ממוצע", [PD]: 0, [OTHER]: 0, [`${PD}_err`]: 0, [`${OTHER}_err`]: 0 },
    { metric: "חציון", [PD]: 0, [OTHER]: 0, [`${PD}_err`]: 0, [`${OTHER}_err`]: 0 },
  ];
  for (const r of rows) {
    const idx = r.metric === "ממוצע" ? 0 : 1;
    pivoted[idx][r.group] = r.value;
    pivoted[idx][`${r.group}_err`] = r.err;
  }

  return (
    <ChartCard title={`${title}${totalN ? ` (N=${totalN.toLocaleString()})` : ""}`}>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={pivoted} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
          <XAxis dataKey="metric" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 11 }} label={ylabel ? { value: ylabel, angle: -90, position: "insideLeft", style: { fontSize: 11 } } : undefined} />
          <Tooltip />
          <Legend />
          <Bar dataKey={PD} fill={C_NAVY} radius={[2, 2, 0, 0]}>
            <ErrorBar dataKey={`${PD}_err`} stroke={C_MUTED} width={6} />
          </Bar>
          <Bar dataKey={OTHER} fill={C_TEAL} radius={[2, 2, 0, 0]}>
            <ErrorBar dataKey={`${OTHER}_err`} stroke={C_MUTED} width={6} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function PdPieChart({ pd, other }: { pd: number; other: number }) {
  const data = [
    { name: PD, value: pd },
    { name: OTHER, value: other },
  ];
  const total = pd + other;

  return (
    <ChartCard title={`פילוח תיקים (N=${total.toLocaleString()})`}>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%"
               innerRadius={60} outerRadius={110} paddingAngle={2}
               label={(props: any) => `${props.name ?? ""} ${((props.percent ?? 0) * 100).toFixed(1)}%`}
               labelLine={false}>
            <Cell fill={C_NAVY} />
            <Cell fill={C_TEAL} />
          </Pie>
          <Tooltip formatter={(val: any) => Number(val).toLocaleString()} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ── Disclaimer ──

function Disclaimer() {
  return (
    <div className="bg-amber-50 border-r-4 border-amber-400 rounded-lg p-4 mb-4 text-sm italic leading-relaxed text-foreground">
      <p className="mb-2">
        הנתונים והעיבודים בוצעו במאמץ לשקף את המציאות בצורה מדויקת, אולם ייתכנו טעויות ואי-דיוקים, בין היתר לאור הצורך באינטגרציה של מקורות מידע שונים ללא שדות אחידים.
      </p>
      <p>
        חשוב לציין כי הפער בין תיקים בייצוג סניגוריה ציבורית לבין תיקים שלא בייצוג עשוי לנבוע לא רק מאופי הטיפול ודינמיקת ההליך, אלא גם — ואולי בעיקר — מעצם הניתוב והבחירה בייצוג סניגוריה על בסיס מאפייני התיק והנאשם. לפיכך, ההבדלים המוצגים אינם בהכרח משקפים שוני באופן הטיפול, אלא עשויים לשקף הבדלים מובנים בסוגי התיקים המנותבים לכל ערוץ ייצוג.
      </p>
    </div>
  );
}

// ── Filter Panel ──

function FilterPanel({ options, filters, onChange, onClear }: {
  options: SanegoriaFilterOptions;
  filters: any;
  onChange: (key: string, value: any) => void;
  onClear: () => void;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 mb-4 border-t-3 flex flex-wrap gap-4 items-end"
         style={{ borderTopColor: C_TEAL, borderTopWidth: 3 }}>
      <div className="flex-[2] min-w-[180px]">
        <label className="text-xs font-semibold text-primary block mb-1">בית משפט</label>
        <select multiple className="w-full border rounded p-1.5 text-sm" value={filters.courts || []}
                onChange={e => onChange("courts", Array.from(e.target.selectedOptions, o => o.value))}>
          {options.courts.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="flex-[2] min-w-[140px]">
        <label className="text-xs font-semibold text-primary block mb-1">
          שנים: {filters.yearMin || options.yearRange[0]}–{filters.yearMax || options.yearRange[1]}
        </label>
        <div className="flex gap-2">
          <input type="range" min={options.yearRange[0]} max={options.yearRange[1]}
                 value={filters.yearMin || options.yearRange[0]}
                 onChange={e => onChange("yearMin", Number(e.target.value))}
                 className="flex-1" />
          <input type="range" min={options.yearRange[0]} max={options.yearRange[1]}
                 value={filters.yearMax || options.yearRange[1]}
                 onChange={e => onChange("yearMax", Number(e.target.value))}
                 className="flex-1" />
        </div>
      </div>
      <div className="flex-[2] min-w-[160px]">
        <label className="text-xs font-semibold text-primary block mb-1">תוצאת גזר דין</label>
        <select multiple className="w-full border rounded p-1.5 text-sm" value={filters.verdicts || []}
                onChange={e => onChange("verdicts", Array.from(e.target.selectedOptions, o => o.value))}>
          {options.verdicts.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>
      <div className="flex-[1] min-w-[130px]">
        <label className="text-xs font-semibold text-primary block mb-1">נאשמים</label>
        <select className="w-full border rounded p-1.5 text-sm" value={filters.sole || "all"}
                onChange={e => onChange("sole", e.target.value)}>
          <option value="all">כולם</option>
          <option value="sole">נאשם יחיד</option>
          <option value="multi">מרובה נאשמים</option>
        </select>
      </div>
      <div className="flex-[2] min-w-[180px]">
        <label className="text-xs font-semibold text-primary block mb-1">עבירה</label>
        <select multiple className="w-full border rounded p-1.5 text-sm" value={filters.offenses || []}
                onChange={e => onChange("offenses", Array.from(e.target.selectedOptions, o => o.value))}>
          {options.offenses.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <button onClick={onClear}
              className="px-5 py-2 rounded-lg font-bold text-sm cursor-pointer whitespace-nowrap"
              style={{ background: C_YELLOW, color: "#212529", border: "none" }}>
        נקה פילטרים
      </button>
    </div>
  );
}

// ── Main Dashboard ──

export function SanegoriaDashboard() {
  const [options, setOptions] = useState<SanegoriaFilterOptions | null>(null);
  const [data, setData] = useState<SanegoriaData | null>(null);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load filter options once
  useEffect(() => {
    fetch("/api/sanegoria?filters=1")
      .then(r => r.json())
      .then(setOptions)
      .catch(e => setError(String(e)));
  }, []);

  // Load data when filters change
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.courts) filters.courts.forEach((c: string) => params.append("court", c));
      if (filters.yearMin) params.set("yearMin", String(filters.yearMin));
      if (filters.yearMax) params.set("yearMax", String(filters.yearMax));
      if (filters.verdicts) filters.verdicts.forEach((v: string) => params.append("verdict", v));
      if (filters.sole && filters.sole !== "all") params.set("sole", filters.sole);
      if (filters.offenses) filters.offenses.forEach((o: string) => params.append("offense", o));

      const res = await fetch(`/api/sanegoria?${params}`);
      if (!res.ok) throw new Error(await res.text());
      setData(await res.json());
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClear = () => setFilters({});

  if (error && !data) {
    return <div className="text-center py-20 text-muted">{error}</div>;
  }

  return (
    <div>
      {options && (
        <FilterPanel options={options} filters={filters}
                     onChange={handleFilterChange} onClear={handleClear} />
      )}

      <Disclaimer />

      {loading && (
        <div className="text-center py-8 text-muted text-sm">טוען נתונים...</div>
      )}

      {data && (
        <>
          {/* Section 1: Cases */}
          <SectionDivider>מקטע 1: תיקים</SectionDivider>
          <div className="flex gap-4 mb-5 flex-wrap">
            <KpiCard label='סה"כ תיקים' value={data.kpis.totalCases.toLocaleString()} />
            <KpiCard label="% סניגוריה ציבורית" value={data.kpis.pctPd} color={C_TEAL} />
            <KpiCard label="% נאשם יחיד" value={data.kpis.pctSole} />
          </div>
          <div className="flex gap-4 mb-4 flex-wrap">
            <div className="flex-[1.5]"><StackedAnnualChart data={data.annual} /></div>
            <div className="flex-1"><PdPieChart pd={data.pie.pd} other={data.pie.other} /></div>
          </div>
          <div className="flex gap-4 mb-4 flex-wrap">
            <div className="flex-1"><GroupedBarChart data={data.verdicts} title="תוצאות גזר דין" topN={8} /></div>
            <div className="flex-[1.4]"><GroupedBarChart data={data.courts} title="פילוח לפי בית משפט — Top 15" topN={15} /></div>
          </div>

          {/* Section 2: Hearings */}
          <SectionDivider color={C_TEAL}>מקטע 2: דיונים</SectionDivider>
          <div className="flex gap-4 mb-5 flex-wrap">
            <KpiCard label="ממוצע דיונים לתיק" value={data.kpis.avgHearings} />
            <KpiCard label="ימים לדיון ראשון" value={data.kpis.avgDaysFirst} color={C_TEAL} />
          </div>
          <div className="flex gap-4 mb-4 flex-wrap">
            <div className="flex-1"><GroupedBarChart data={data.hearingTypes} title="סוגי דיונים" topN={6} /></div>
            <div className="flex-1"><GroupedBarChart data={data.hearingStatuses} title="סטטוס דיונים" /></div>
          </div>
          <div className="flex gap-4 mb-4 flex-wrap">
            <div className="flex-1"><MetricChart data={data.hearingsPerCase} title="דיונים לתיק" ylabel="דיונים" /></div>
            <div className="flex-1"><MetricChart data={data.daysToFirst} title="ימים עד דיון ראשון" ylabel="ימים" /></div>
          </div>
          <div className="flex gap-4 mb-4 flex-wrap">
            <div className="flex-1"><MetricChart data={data.duration} title="משך הליך (ימים)" ylabel="ימים" /></div>
          </div>

          {/* Section 3: Offenses */}
          <SectionDivider color={C_MUTED}>מקטע 3: עבירות — נתוני משטרה</SectionDivider>
          <div className="flex gap-4 mb-5 flex-wrap">
            <KpiCard label="עבירות לתיק (ממוצע)" value={data.kpis.avgOffenses} />
          </div>
          <div className="flex gap-4 mb-4 flex-wrap">
            <div className="flex-[2]"><GroupedBarChart data={data.topOffenses} title="Top 10 עבירות שכיחות" topN={10} /></div>
          </div>
          <div className="flex gap-4 mb-4 flex-wrap">
            <div className="flex-1"><MetricChart data={data.offensesPerCase} title="עבירות לתיק" ylabel="עבירות" /></div>
            <div className="flex-1"><GroupedBarChart data={data.offenseCategories} title="קטגוריות עבירה" /></div>
          </div>

          <div className="text-center text-muted text-xs mt-3 pb-5">
            נתוני בתי משפט: 2014–{new Date().getFullYear()} | נתוני משטרה: קובץ 474-25
          </div>
        </>
      )}
    </div>
  );
}
