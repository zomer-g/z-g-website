"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer, ErrorBar,
} from "recharts";
import type { SanegoriaData, SanegoriaFilterOptions, GroupedCount, MetricRow } from "@/types/sanegoria";

const PD = "סניגוריה ציבורית";
const OTHER = "ללא סניגוריה ציבורית";

// Site palette
const C_PRIMARY = "#1a365d";      // כחול כהה — כותרות, טקסט
const C_ACCENT  = "#c9a84c";      // זהב — הדגשות
const C_PD      = "#2a6f97";      // כחול-טורקיז — עמודות סניגוריה
const C_OTHER   = "#e07b54";      // כתום-חום — עמודות ללא סניגוריה
const C_MUTED   = "#4b5563";      // אפור

// ── Reusable components ──

function KpiCard({ label, value, color = C_PRIMARY }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 text-center flex-1 min-w-[130px]">
      <div className="text-xs text-muted font-semibold mb-2 tracking-wide">{label}</div>
      <div className="text-xl font-bold leading-tight" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

function SectionDivider({ children, color = C_PRIMARY }: { children: string; color?: string }) {
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
      {/* Force LTR inside chart area so Recharts renders Y-axis on the left correctly */}
      <div dir="ltr">{children}</div>
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
      <ResponsiveContainer width="100%" height={height + 80}>
        <BarChart data={pctRows} margin={{ top: 20, right: 20, left: 40, bottom: 90 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
          <XAxis
            dataKey="category"
            tick={{ fontSize: 11, fill: C_PRIMARY }}
            angle={-45}
            textAnchor="end"
            interval={0}
            height={80}
          />
          <YAxis tick={{ fontSize: 12, fill: C_PRIMARY }} unit="%" width={60} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
          <Legend wrapperStyle={{ fontSize: 13, paddingTop: 10 }} />
          <Bar dataKey={PD} fill={C_PD} radius={[2, 2, 0, 0]} />
          <Bar dataKey={OTHER} fill={C_OTHER} radius={[2, 2, 0, 0]} />
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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    const total = payload.reduce((s: number, p: any) => s + (p.value || 0), 0);
    return (
      <div className="bg-white border rounded-lg shadow-lg p-3 text-sm" dir="rtl">
        <div className="font-semibold mb-1">{label} (סה"כ {total.toLocaleString()})</div>
        {payload.map((p: any) => (
          <div key={p.dataKey} style={{ color: p.fill }}>
            {p.dataKey}: {Number(p.value).toLocaleString()} ({total > 0 ? ((p.value / total) * 100).toFixed(1) : 0}%)
          </div>
        ))}
      </div>
    );
  };

  return (
    <ChartCard title={`התפלגות שנתית (N=${grand.toLocaleString()})`}>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={rows} margin={{ top: 20, right: 20, left: 40, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
          <XAxis dataKey="year" tick={{ fontSize: 13, fill: C_PRIMARY }} />
          <YAxis tick={{ fontSize: 12, fill: C_PRIMARY }} width={60} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
          <Legend wrapperStyle={{ fontSize: 13, paddingTop: 10 }} />
          <Bar dataKey={PD} stackId="a" fill={C_PD} />
          <Bar dataKey={OTHER} stackId="a" fill={C_OTHER} />
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
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={pivoted} margin={{ top: 20, right: 20, left: 50, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
          <XAxis dataKey="metric" tick={{ fontSize: 13, fill: C_PRIMARY }} />
          <YAxis
            tick={{ fontSize: 12, fill: C_PRIMARY }}
            width={60}
            label={ylabel ? { value: ylabel, angle: -90, position: "insideLeft", style: { fontSize: 12, fill: C_PRIMARY }, offset: -5 } : undefined}
          />
          <Tooltip cursor={{ fill: "rgba(0,0,0,0.03)" }} />
          <Legend wrapperStyle={{ fontSize: 13, paddingTop: 10 }} />
          <Bar dataKey={PD} fill={C_PD} radius={[2, 2, 0, 0]}>
            <ErrorBar dataKey={`${PD}_err`} stroke={C_MUTED} width={6} />
          </Bar>
          <Bar dataKey={OTHER} fill={C_OTHER} radius={[2, 2, 0, 0]}>
            <ErrorBar dataKey={`${OTHER}_err`} stroke={C_MUTED} width={6} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function PdPieChart({ pd, other }: { pd: number; other: number }) {
  const data = [
    { name: PD, value: pd, color: C_PD },
    { name: OTHER, value: other, color: C_OTHER },
  ];
  const total = pd + other;

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    const p = payload[0];
    const pct = total > 0 ? ((p.value / total) * 100).toFixed(1) : 0;
    return (
      <div className="bg-white border rounded-lg shadow-lg p-3 text-sm" dir="rtl">
        <div className="font-semibold" style={{ color: p.payload.color }}>{p.name}</div>
        <div>{Number(p.value).toLocaleString()} ({pct}%)</div>
      </div>
    );
  };

  // Custom label rendering — white text centered inside each slice
  const renderLabel = (props: any) => {
    const RADIAN = Math.PI / 180;
    const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text
        x={x}
        y={y}
        fill="#ffffff"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={14}
        fontWeight={700}
      >
        {`${(percent * 100).toFixed(1)}%`}
      </text>
    );
  };

  return (
    <ChartCard title={`פילוח תיקים (N=${total.toLocaleString()})`}>
      <ResponsiveContainer width="100%" height={320}>
        <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 30 }}>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="45%"
               innerRadius={55} outerRadius={95} paddingAngle={2}
               label={renderLabel}
               labelLine={false}>
            <Cell fill={C_PD} />
            <Cell fill={C_OTHER} />
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            align="center"
            iconType="circle"
            wrapperStyle={{ fontSize: 13, paddingTop: 12 }}
            formatter={(value, entry: any) => {
              const item = data.find(d => d.name === value);
              const pct = total > 0 && item ? ((item.value / total) * 100).toFixed(1) : 0;
              return (
                <span style={{ color: entry.color }}>
                  {value}: {item?.value.toLocaleString()} ({pct}%)
                </span>
              );
            }}
          />
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
        שיוך העבירות מבוסס על נתוני תביעות משטרה בלבד (ללא פרקליטות) לשנים 2022–2025.
      </p>
      <p className="mb-2">
        הנתונים והעיבודים בוצעו במאמץ לשקף את המציאות בצורה מדויקת, אולם ייתכנו טעויות ואי-דיוקים, בין היתר לאור הצורך באינטגרציה של מקורות מידע שונים ללא שדות אחידים.
      </p>
      <p>
        חשוב לציין כי הפער בין תיקים בייצוג סניגוריה ציבורית לבין תיקים שלא בייצוג עשוי לנבוע לא רק מאופי הטיפול ודינמיקת ההליך, אלא גם — ואולי בעיקר — מעצם הניתוב והבחירה בייצוג סניגוריה על בסיס מאפייני התיק והנאשם. לפיכך, ההבדלים המוצגים אינם בהכרח משקפים שוני באופן הטיפול, אלא עשויים לשקף הבדלים מובנים בסוגי התיקים המנותבים לכל ערוץ ייצוג.
      </p>
    </div>
  );
}

// ── Multi-select dropdown ──

function MultiDropdown({ label, options, selected, onChange, searchable = false }:
  { label: string; options: { label: string; value: string }[]; selected: string[];
    onChange: (vals: string[]) => void; searchable?: boolean }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = searchable && search
    ? options.filter(o => o.label.includes(search))
    : options;

  const toggle = (val: string) => {
    onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]);
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} type="button"
              className="w-full border rounded-lg p-2 text-sm text-right bg-white flex justify-between items-center gap-2 hover:border-gray-400">
        <span className="truncate text-gray-500">
          {selected.length > 0 ? `${selected.length} נבחרו` : "הכל"}
        </span>
        <span className="text-xs text-gray-400">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto" dir="rtl">
          {searchable && (
            <input type="text" placeholder="חפש..." value={search} onChange={e => setSearch(e.target.value)}
                   className="w-full border-b p-2 text-sm outline-none sticky top-0 bg-white" />
          )}
          {filtered.slice(0, 100).map(o => (
            <label key={o.value} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-sm">
              <input type="checkbox" checked={selected.includes(o.value)} onChange={() => toggle(o.value)}
                     className="rounded" />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
      )}
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
    <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex flex-wrap gap-4 items-end"
         style={{ borderTopColor: C_PRIMARY, borderTopWidth: 3 }}>
      <div className="flex-[2] min-w-[180px]">
        <label className="text-xs font-semibold block mb-1" style={{ color: C_PRIMARY }}>בית משפט</label>
        <MultiDropdown label="בית משפט"
          options={options.courts.map(c => ({ label: c, value: c }))}
          selected={filters.courts || []}
          onChange={vals => onChange("courts", vals)} searchable />
      </div>
      <div className="flex-[2] min-w-[160px]">
        <label className="text-xs font-semibold block mb-1" style={{ color: C_PRIMARY }}>
          שנים: {filters.yearMin || options.yearRange[0]}–{filters.yearMax || options.yearRange[1]}
        </label>
        <div className="flex gap-1 items-center">
          <select className="border rounded-lg p-2 text-sm bg-white w-20"
                  value={filters.yearMin || options.yearRange[0]}
                  onChange={e => onChange("yearMin", Number(e.target.value))}>
            {Array.from({ length: options.yearRange[1] - options.yearRange[0] + 1 }, (_, i) => options.yearRange[0] + i)
              .map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <span className="text-gray-400 text-xs">עד</span>
          <select className="border rounded-lg p-2 text-sm bg-white w-20"
                  value={filters.yearMax || options.yearRange[1]}
                  onChange={e => onChange("yearMax", Number(e.target.value))}>
            {Array.from({ length: options.yearRange[1] - options.yearRange[0] + 1 }, (_, i) => options.yearRange[0] + i)
              .map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>
      <div className="flex-[2] min-w-[160px]">
        <label className="text-xs font-semibold block mb-1" style={{ color: C_PRIMARY }}>תוצאת גזר דין</label>
        <MultiDropdown label="תוצאה"
          options={options.verdicts.map(v => ({ label: v, value: v }))}
          selected={filters.verdicts || []}
          onChange={vals => onChange("verdicts", vals)} />
      </div>
      <div className="flex-[1] min-w-[130px]">
        <label className="text-xs font-semibold block mb-1" style={{ color: C_PRIMARY }}>נאשמים</label>
        <select className="w-full border rounded-lg p-2 text-sm bg-white" value={filters.sole || "all"}
                onChange={e => onChange("sole", e.target.value)}>
          <option value="all">כולם</option>
          <option value="sole">נאשם יחיד</option>
          <option value="multi">מרובה נאשמים</option>
        </select>
      </div>
      <div className="flex-[2] min-w-[180px]">
        <label className="text-xs font-semibold block mb-1" style={{ color: C_PRIMARY }}>עבירה</label>
        <MultiDropdown label="עבירה"
          options={options.offenses}
          selected={filters.offenses || []}
          onChange={vals => onChange("offenses", vals)} searchable />
      </div>
      <button onClick={onClear}
              className="px-5 py-2 rounded-lg font-bold text-sm cursor-pointer whitespace-nowrap"
              style={{ background: C_ACCENT, color: "#212529", border: "none" }}>
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

  // Load data when filters change (debounced 500ms)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadData = useCallback(async (f: Record<string, any>) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (f.courts?.length) f.courts.forEach((c: string) => params.append("court", c));
      if (f.yearMin) params.set("yearMin", String(f.yearMin));
      if (f.yearMax) params.set("yearMax", String(f.yearMax));
      if (f.verdicts?.length) f.verdicts.forEach((v: string) => params.append("verdict", v));
      if (f.sole && f.sole !== "all") params.set("sole", f.sole);
      if (f.offenses?.length) f.offenses.forEach((o: string) => params.append("offense", o));

      const res = await fetch(`/api/sanegoria?${params}`);
      if (!res.ok) throw new Error(await res.text());
      setData(await res.json());
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => loadData(filters), 500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [filters, loadData]);

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

      {loading && !data && (
        <div className="text-center py-16 text-muted">
          <div className="inline-block w-8 h-8 border-3 border-t-primary border-gray-200 rounded-full animate-spin mb-3"></div>
          <div className="text-sm">טוען נתונים...</div>
        </div>
      )}

      {data && (
        <>
        {loading && (
          <div className="fixed inset-0 bg-white/50 z-40 flex items-center justify-center pointer-events-none">
            <div className="bg-white rounded-xl shadow-lg px-6 py-4 flex items-center gap-3 pointer-events-auto">
              <div className="w-5 h-5 border-2 border-t-primary border-gray-200 rounded-full animate-spin"></div>
              <span className="text-sm text-gray-600">מעדכן...</span>
            </div>
          </div>
        )}
        <>
          {/* Section 1: Cases */}
          <SectionDivider>מקטע 1: תיקים</SectionDivider>
          <div className="flex gap-4 mb-5 flex-wrap">
            <KpiCard label='סה"כ תיקים' value={data.kpis.totalCases.toLocaleString()} />
            <KpiCard label="% סניגוריה ציבורית" value={data.kpis.pctPd} color={C_PD} />
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
          <SectionDivider color="#2a4a7f">מקטע 2: דיונים</SectionDivider>
          <div className="flex gap-4 mb-5 flex-wrap">
            <KpiCard label="ממוצע דיונים לתיק" value={data.kpis.avgHearings} />
            <KpiCard label="ימים לדיון ראשון" value={data.kpis.avgDaysFirst} color={C_PD} />
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
            <div className="flex-1"><GroupedBarChart data={data.offenseCategories} title="קטגוריות עבירה" /></div>
          </div>

          <div className="text-center text-muted text-xs mt-3 pb-5">
            נתוני בתי משפט: 2014–{new Date().getFullYear()} | נתוני משטרה: קובץ 474-25
          </div>
        </>
        </>
      )}
    </div>
  );
}
