import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { SanegoriaData, SanegoriaFilterOptions, GroupedCount, MetricRow } from "@/types/sanegoria";

// Simple in-memory cache (survives across requests in same worker)
const cache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 3600_000; // 1 hour

function getCached(key: string) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return null;
}
function setCache(key: string, data: any) {
  cache.set(key, { data, ts: Date.now() });
  // Limit cache size
  if (cache.size > 200) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
}

const PD = "סניגוריה ציבורית";
const OTHER = "ללא סניגוריה ציבורית";

function grpLabel(isPd: boolean) {
  return isPd ? PD : OTHER;
}

function buildWhere(params: URLSearchParams): { sql: string; vals: any[] } {
  const clauses: string[] = ["1=1", "EXTRACT(YEAR FROM c.acceptance_date) >= 2022"];
  const vals: any[] = [];
  let pi = 1;

  const courts = params.getAll("court");
  if (courts.length > 0) {
    clauses.push(`c.court_id = ANY($${pi}::text[])`);
    vals.push(courts);
    pi++;
  }

  const yearMin = params.get("yearMin");
  const yearMax = params.get("yearMax");
  if (yearMin) { clauses.push(`EXTRACT(YEAR FROM c.acceptance_date) >= $${pi}`); vals.push(Number(yearMin)); pi++; }
  if (yearMax) { clauses.push(`EXTRACT(YEAR FROM c.acceptance_date) <= $${pi}`); vals.push(Number(yearMax)); pi++; }

  const verdicts = params.getAll("verdict");
  if (verdicts.length > 0) {
    clauses.push(`c.verdict = ANY($${pi}::text[])`);
    vals.push(verdicts);
    pi++;
  }

  const sole = params.get("sole");
  if (sole === "sole") { clauses.push("c.is_sole = TRUE"); }
  else if (sole === "multi") { clauses.push("c.is_sole = FALSE"); }

  const offenses = params.getAll("offense");
  if (offenses.length > 0) {
    clauses.push(`c.case_id IN (SELECT case_id FROM sanegoria_offenses WHERE offense_name = ANY($${pi}::text[]))`);
    vals.push(offenses);
    pi++;
  }

  return { sql: clauses.join(" AND "), vals };
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;

  // If requesting filter options only
  if (params.get("filters") === "1") {
    const [courts, verdicts, offenses, yearRange] = await Promise.all([
      prisma.$queryRaw<{v:string}[]>`SELECT DISTINCT court_id AS v FROM sanegoria_cases WHERE court_id IS NOT NULL AND court_id != '' AND EXTRACT(YEAR FROM acceptance_date) >= 2022 ORDER BY 1`,
      prisma.$queryRaw<{v:string}[]>`SELECT DISTINCT verdict AS v FROM sanegoria_cases WHERE verdict IS NOT NULL AND verdict != '' AND EXTRACT(YEAR FROM acceptance_date) >= 2022 ORDER BY 1`,
      prisma.$queryRaw<{v:string;n:number}[]>`
        SELECT o.offense_name AS v, COUNT(DISTINCT o.case_id)::int AS n
        FROM sanegoria_offenses o INNER JOIN sanegoria_cases c ON o.case_id = c.case_id
        WHERE EXTRACT(YEAR FROM c.acceptance_date) >= 2022
        GROUP BY 1 HAVING COUNT(DISTINCT o.case_id) > 0 ORDER BY 2 DESC`,
      prisma.$queryRaw<{mn:number;mx:number}[]>`
        SELECT 2022 AS mn, MAX(EXTRACT(YEAR FROM acceptance_date))::int AS mx
        FROM sanegoria_cases WHERE acceptance_date IS NOT NULL`,
    ]);

    const opts: SanegoriaFilterOptions = {
      courts: courts.map(r => r.v),
      verdicts: verdicts.map(r => r.v),
      offenses: offenses.map(r => ({ label: `${r.v} (${r.n})`, value: r.v })),
      yearRange: [yearRange[0]?.mn || 2014, yearRange[0]?.mx || 2025],
    };
    return NextResponse.json(opts, {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=172800" },
    });
  }

  // Build WHERE clause
  const { sql: where, vals } = buildWhere(params);
  const cacheKey = `data:${where}:${JSON.stringify(vals)}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200", "X-Cache": "HIT" },
    });
  }

  try {
    // All queries in parallel
    const [
      baseRows, soleRow, annualRows, verdictRows, courtRows,
      hpcRows, firstRows, statusRows, typeRows, durRows,
      offTopRows, offPcRows, offCatRows,
    ] = await Promise.all([
      // Section 1: Cases
      prisma.$queryRawUnsafe<{is_pd:boolean;n:number}[]>(
        `SELECT is_pd, COUNT(*)::int AS n FROM sanegoria_cases c WHERE ${where} GROUP BY 1`, ...vals),
      prisma.$queryRawUnsafe<{pct:number}[]>(
        `SELECT ROUND(SUM(CASE WHEN is_sole THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(*),0),1) AS pct FROM sanegoria_cases c WHERE ${where}`, ...vals),
      prisma.$queryRawUnsafe<{is_pd:boolean;yr:number;n:number}[]>(
        `SELECT is_pd, EXTRACT(YEAR FROM acceptance_date)::int AS yr, COUNT(*)::int AS n FROM sanegoria_cases c WHERE ${where} AND acceptance_date IS NOT NULL GROUP BY 1,2 ORDER BY 2`, ...vals),
      prisma.$queryRawUnsafe<{is_pd:boolean;v:string;n:number}[]>(
        `SELECT is_pd, verdict AS v, COUNT(*)::int AS n FROM sanegoria_cases c WHERE ${where} AND verdict IS NOT NULL AND verdict != '' GROUP BY 1,2`, ...vals),
      prisma.$queryRawUnsafe<{is_pd:boolean;ct:string;n:number}[]>(
        `SELECT is_pd, court_id AS ct, COUNT(*)::int AS n FROM sanegoria_cases c WHERE ${where} AND court_id IS NOT NULL AND court_id != ''
         GROUP BY 1,2 ORDER BY n DESC LIMIT 30`, ...vals),

      // Section 2: Hearings
      prisma.$queryRawUnsafe<{is_pd:boolean;avg:number;std:number;med:number;n:number}[]>(
        `SELECT sub.is_pd, ROUND(AVG(sub.cnt)::numeric,2) AS avg, ROUND(STDDEV_SAMP(sub.cnt)::numeric,2) AS std,
                PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sub.cnt)::int AS med, COUNT(*)::int AS n
         FROM (SELECT h.case_id, h.is_pd, COUNT(*)::int AS cnt
               FROM sanegoria_hearings h INNER JOIN sanegoria_cases c ON h.case_id = c.case_id
               WHERE ${where} GROUP BY 1,2) sub GROUP BY 1`, ...vals),
      prisma.$queryRawUnsafe<{is_pd:boolean;avg:number;std:number;med:number;n:number}[]>(
        `WITH fh AS (
           SELECT h.case_id, MIN(h.meeting_date) AS first_date
           FROM sanegoria_hearings h INNER JOIN sanegoria_cases c ON h.case_id = c.case_id
           WHERE h.status = 'התקיים' AND ${where} GROUP BY 1)
         SELECT c.is_pd, ROUND(AVG(EXTRACT(DAY FROM (fh.first_date - c.acceptance_date)))::numeric,1) AS avg,
                ROUND(STDDEV_SAMP(EXTRACT(DAY FROM (fh.first_date - c.acceptance_date)))::numeric,1) AS std,
                PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(DAY FROM (fh.first_date - c.acceptance_date)))::int AS med,
                COUNT(*)::int AS n
         FROM sanegoria_cases c INNER JOIN fh ON c.case_id = fh.case_id
         WHERE c.acceptance_date IS NOT NULL
           AND EXTRACT(DAY FROM (fh.first_date - c.acceptance_date)) BETWEEN 0 AND 3650
         GROUP BY 1`, ...vals),
      prisma.$queryRawUnsafe<{is_pd:boolean;s:string;n:number}[]>(
        `SELECT h.is_pd, h.status AS s, COUNT(*)::int AS n
         FROM sanegoria_hearings h INNER JOIN sanegoria_cases c ON h.case_id = c.case_id
         WHERE ${where} AND h.status IS NOT NULL AND h.status != '' GROUP BY 1,2`, ...vals),
      prisma.$queryRawUnsafe<{is_pd:boolean;t:string;n:number}[]>(
        `WITH ranked AS (
           SELECT h.is_pd, h.type AS t, COUNT(*)::int AS n
           FROM sanegoria_hearings h INNER JOIN sanegoria_cases c ON h.case_id = c.case_id
           WHERE ${where} AND h.type IS NOT NULL AND h.type != '' GROUP BY 1,2)
         SELECT * FROM ranked WHERE t IN (
           SELECT t FROM ranked GROUP BY t ORDER BY SUM(n) DESC LIMIT 8)`, ...vals),
      prisma.$queryRawUnsafe<{is_pd:boolean;avg:number;std:number;med:number;n:number}[]>(
        `SELECT sub.is_pd, ROUND(AVG(sub.d)::numeric) AS avg, ROUND(STDDEV_SAMP(sub.d)::numeric) AS std,
                PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sub.d)::int AS med, COUNT(*)::int AS n
         FROM (SELECT c.is_pd, EXTRACT(DAY FROM (c.closed_date - c.acceptance_date)) AS d
               FROM sanegoria_cases c
               WHERE c.closed_date IS NOT NULL AND c.acceptance_date IS NOT NULL AND ${where}) sub
         WHERE sub.d BETWEEN 0 AND 10000 GROUP BY 1`, ...vals),

      // Section 3: Offenses (INNER JOIN only)
      prisma.$queryRawUnsafe<{is_pd:boolean;name:string;n:number}[]>(
        `WITH ranked AS (
           SELECT c.is_pd, o.offense_name AS name, COUNT(DISTINCT o.case_id)::int AS n
           FROM sanegoria_offenses o INNER JOIN sanegoria_cases c ON o.case_id = c.case_id
           WHERE ${where} GROUP BY 1,2)
         SELECT * FROM ranked WHERE name IN (
           SELECT name FROM ranked GROUP BY name ORDER BY SUM(n) DESC LIMIT 10)`, ...vals),
      prisma.$queryRawUnsafe<{is_pd:boolean;avg:number;std:number;med:number;n:number}[]>(
        `SELECT c.is_pd, ROUND(AVG(cnt)::numeric,2) AS avg, ROUND(STDDEV_SAMP(cnt)::numeric,2) AS std,
                PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY cnt)::int AS med, COUNT(*)::int AS n
         FROM (SELECT o.case_id, COUNT(*)::int AS cnt FROM sanegoria_offenses o GROUP BY 1) sub
         INNER JOIN sanegoria_cases c ON sub.case_id = c.case_id
         WHERE ${where} GROUP BY 1`, ...vals),
      prisma.$queryRawUnsafe<{is_pd:boolean;code:string;n:number}[]>(
        `SELECT c.is_pd, o.offense_code AS code, COUNT(DISTINCT o.case_id)::int AS n
         FROM sanegoria_offenses o INNER JOIN sanegoria_cases c ON o.case_id = c.case_id
         WHERE ${where} GROUP BY 1,2`, ...vals),
    ]);

    // Transform results
    const totalCases = baseRows.reduce((s, r) => s + Number(r.n), 0);
    const pdCount = baseRows.find(r => r.is_pd)?.n || 0;
    const pctPd = totalCases > 0 ? `${(Number(pdCount) / totalCases * 100).toFixed(1)}%` : "–";
    const pctSole = soleRow[0]?.pct != null ? `${Number(soleRow[0].pct).toFixed(1)}%` : "–";

    const fmtMetric = (rows: typeof hpcRows, field: string): string => {
      const parts: string[] = [];
      for (const r of rows) {
        const lbl = r.is_pd ? "סנצ" : "אחר";
        parts.push(`${lbl}: ${Number(r[field as keyof typeof r]).toFixed(field === "avg" ? 1 : 0)}`);
      }
      return parts.join(" | ") || "–";
    };

    const toGrouped = (rows: {is_pd:boolean;[k:string]:any}[], catKey: string): GroupedCount[] =>
      rows.map(r => ({ group: grpLabel(r.is_pd), category: String(r[catKey]), count: Number(r.n) }));

    const toMetric = (rows: typeof hpcRows): MetricRow[] =>
      rows.map(r => ({ group: grpLabel(r.is_pd), avg: Number(r.avg), std: Number(r.std || 0), median: Number(r.med || 0), n: Number(r.n) }));

    // Offense categories mapping
    const CAT_MAP: Record<string, string> = {
      "0":"אחר","1":"ביטחון/הגירה","2":"עבירות מין","3":"רכוש וגוף",
      "4":"נשק/חומרים","5":"כלכליות","6":"תעבורה מיוחדת","7":"תעבורה","8":"תעבורה","9":"אחר"
    };
    const offCats: GroupedCount[] = [];
    const catAgg = new Map<string, number>();
    for (const r of offCatRows) {
      const cat = CAT_MAP[r.code?.[0]] || "אחר";
      const key = `${grpLabel(r.is_pd)}|${cat}`;
      catAgg.set(key, (catAgg.get(key) || 0) + Number(r.n));
    }
    for (const [key, count] of catAgg) {
      const [group, category] = key.split("|");
      offCats.push({ group, category, count });
    }

    const data: SanegoriaData = {
      kpis: {
        totalCases,
        pctPd,
        pctSole,
        avgHearings: fmtMetric(hpcRows, "avg"),
        avgDaysFirst: fmtMetric(firstRows, "avg"),
        avgOffenses: fmtMetric(offPcRows, "avg"),
      },
      annual: toGrouped(annualRows, "yr"),
      verdicts: toGrouped(verdictRows, "v"),
      courts: toGrouped(courtRows, "ct"),
      pie: { pd: Number(pdCount), other: totalCases - Number(pdCount) },
      hearingTypes: toGrouped(typeRows, "t"),
      hearingStatuses: toGrouped(statusRows, "s"),
      hearingsPerCase: toMetric(hpcRows),
      daysToFirst: toMetric(firstRows),
      duration: toMetric(durRows),
      topOffenses: toGrouped(offTopRows, "name"),
      offensesPerCase: toMetric(offPcRows),
      offenseCategories: offCats,
    };

    setCache(cacheKey, data);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" },
    });

  } catch (error) {
    console.error("Sanegoria API error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
