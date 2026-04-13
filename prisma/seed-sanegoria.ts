/**
 * One-time migration: Load Sanegoria data from CSV/XLSX into PostgreSQL.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." npx tsx prisma/seed-sanegoria.ts
 *
 * Data sources (from C:\Users\zomer\CLAUDE CODE\Sanegoria\):
 *   - תיקים מצומצם 2.csv  (cases)
 *   - סניגורים ציבוריים - Sheet1.csv  (PD flag)
 *   - דיונים.csv  (hearings)
 *   - -474-25-.xlsx  (police offenses)
 */

import pg from "pg";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

const DATA_DIR = String.raw`C:\Users\zomer\CLAUDE CODE\Sanegoria`;

const TIKIM_CSV = path.join(DATA_DIR, "תיקים מצומצם 2.csv");
const SNEG_CSV = path.join(DATA_DIR, "סניגורים ציבוריים - Sheet1.csv");
const DIYUN_CSV = path.join(DATA_DIR, "דיונים.csv");

// We'll use a simpler approach for XLSX - pre-exported CSV from DuckDB
const OFFENSES_CSV = path.join(DATA_DIR, "offenses_export.csv");

const BATCH_SIZE = 5000;
const YEAR_MIN = 2014;

// ── Helpers ──

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

async function readLines(filePath: string): Promise<readline.Interface> {
  return readline.createInterface({
    input: fs.createReadStream(filePath, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  });
}

function parseDate(s: string | undefined): Date | null {
  if (!s || s.trim() === "") return null;
  const v = s.trim();
  // Handle DD/MM/YYYY HH:MM:SS format
  const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{2}:\d{2}:\d{2})$/);
  if (m) {
    const [, day, month, year, time] = m;
    return new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${time}`);
  }
  // Handle YYYY-MM-DD or ISO
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function convertPoliceId(pid: string): string | null {
  const m = pid.trim().match(/^(.+)-(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, num, month, year] = m;
  return `n:${num}-${month.padStart(2, "0")}-${year.slice(2)}`;
}

// ── Main ──

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("ERROR: Set DATABASE_URL environment variable");
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  const client = await pool.connect();

  try {
    console.log("=== Sanegoria Data Migration ===\n");

    // Step 0: Export offenses from XLSX using DuckDB (if not already done)
    if (!fs.existsSync(OFFENSES_CSV)) {
      console.log("Exporting offenses from XLSX (requires Python + DuckDB)...");
      const { execSync } = await import("child_process");
      execSync(`python -c "
import duckdb, pandas as pd, re
dx = pd.read_excel('${DATA_DIR.replace(/\\/g, "/")}/-474-25-.xlsx', header=0)
dx.columns = ['case_id_police','court_name','offense','count','c4','c5','c6']
dx = dx[dx['court_name']!='Total'].dropna(subset=['offense'])
def conv(pid):
    m = re.match(r'^(.+)-(\\\\d{1,2})/(\\\\d{4})$', str(pid).strip())
    if not m: return ''
    return f'n:{m.group(1)}-{m.group(2).zfill(2)}-{m.group(3)[2:]}'
dx['case_id'] = dx['case_id_police'].apply(conv)
dx['offense_code'] = dx['offense'].str.extract(r'^(\\\\d+)')
dx['offense_name'] = dx['offense'].str.replace(r'^\\\\d+ - ','',regex=True)
dx[dx['case_id']!=''][['case_id','offense_code','offense_name']].to_csv('${OFFENSES_CSV.replace(/\\/g, "/")}', index=False, encoding='utf-8-sig')
print('Exported offenses CSV')
"`, { stdio: "inherit" });
    }

    // Step 1: Load PD case IDs
    console.log("Step 1: Loading PD case IDs...");
    const pdSet = new Set<string>();
    const snegLines = await readLines(SNEG_CSV);
    let snegFirst = true;
    for await (const line of snegLines) {
      if (snegFirst) { snegFirst = false; continue; }
      const cols = parseCsvLine(line);
      // cols: מספר הליך מלא, מספר נקי, קובץ מקור
      const cleanNum = cols[1]?.trim();
      if (cleanNum) pdSet.add(`n:${cleanNum}`);
    }
    console.log(`  Loaded ${pdSet.size.toLocaleString()} PD case IDs`);

    // Step 2: Truncate existing tables
    console.log("\nStep 2: Clearing existing data...");
    await client.query("TRUNCATE sanegoria_offenses, sanegoria_hearings, sanegoria_cases RESTART IDENTITY");

    // Step 3: Import cases (2014+)
    console.log("\nStep 3: Importing cases (2014+)...");
    const tikimLines = await readLines(TIKIM_CSV);
    let tikimFirst = true;
    let casesBatch: (string | null)[][] = [];
    let casesTotal = 0;
    const caseIdSet = new Set<string>(); // track which case_ids are in DB

    async function flushCases() {
      if (casesBatch.length === 0) return;
      const values: string[] = [];
      const params: any[] = [];
      let pi = 1;
      for (const row of casesBatch) {
        values.push(`($${pi},$${pi+1},$${pi+2},$${pi+3},$${pi+4},$${pi+5},$${pi+6},$${pi+7})`);
        params.push(row[0], row[1] || null, row[2] || null, row[3] || null, row[4] || null, row[5] || null, row[6] === "true", row[7] === "true");
        pi += 8;
      }
      await client.query(
        `INSERT INTO sanegoria_cases (case_id, case_name, acceptance_date, closed_date, verdict, court_id, is_pd, is_sole)
         VALUES ${values.join(",")} ON CONFLICT (case_id) DO NOTHING`,
        params
      );
      casesTotal += casesBatch.length;
      casesBatch = [];
      if (casesTotal % 50000 === 0) process.stdout.write(`  ${casesTotal.toLocaleString()} cases...\r`);
    }

    for await (const line of tikimLines) {
      if (tikimFirst) { tikimFirst = false; continue; }
      const cols = parseCsvLine(line);
      // cols: casename, case_id, acceptancedate, casestatusstartdate, verdictresultname, courtid, judge
      const caseId = cols[1]?.trim();
      const acceptDate = parseDate(cols[2]);
      if (!caseId || !acceptDate) continue;
      if (acceptDate.getFullYear() < YEAR_MIN) continue;

      const isPd = pdSet.has(caseId);
      const isSole = !(cols[0] || "").includes("ואח");

      caseIdSet.add(caseId);
      casesBatch.push([
        caseId,
        cols[0]?.trim() || null,
        acceptDate.toISOString(),
        parseDate(cols[3])?.toISOString() || null,
        cols[4]?.trim() || null,
        cols[5]?.trim() || null,
        String(isPd),
        String(isSole),
      ]);

      if (casesBatch.length >= BATCH_SIZE) await flushCases();
    }
    await flushCases();
    console.log(`  Imported ${casesTotal.toLocaleString()} cases`);

    // Build isPd lookup for hearings
    const pdCaseIds = new Set<string>();
    for (const cid of caseIdSet) {
      if (pdSet.has(cid)) pdCaseIds.add(cid);
    }

    // Step 4: Import hearings (only for 2014+ cases)
    console.log("\nStep 4: Importing hearings...");
    const diyunLines = await readLines(DIYUN_CSV);
    let diyunFirst = true;
    let hearBatch: (string | null)[][] = [];
    let hearTotal = 0;

    async function flushHearings() {
      if (hearBatch.length === 0) return;
      const values: string[] = [];
      const params: any[] = [];
      let pi = 1;
      for (const row of hearBatch) {
        values.push(`($${pi},$${pi+1},$${pi+2},$${pi+3},$${pi+4})`);
        params.push(row[0], row[1] || null, row[2] || null, row[3] || null, row[4] === "true");
        pi += 5;
      }
      await client.query(
        `INSERT INTO sanegoria_hearings (case_id, meeting_date, status, type, is_pd)
         VALUES ${values.join(",")}`,
        params
      );
      hearTotal += hearBatch.length;
      hearBatch = [];
      if (hearTotal % 100000 === 0) process.stdout.write(`  ${hearTotal.toLocaleString()} hearings...\r`);
    }

    for await (const line of diyunLines) {
      if (diyunFirst) { diyunFirst = false; continue; }
      const cols = parseCsvLine(line);
      // cols: case_id, meetingdate, sittingactivitystatusname, sittingtypename, scrape_date
      const caseId = cols[0]?.trim();
      if (!caseId || !caseIdSet.has(caseId)) continue;

      hearBatch.push([
        caseId,
        parseDate(cols[1])?.toISOString() || "",
        cols[2]?.trim() || "",
        cols[3]?.trim() || "",
        String(pdCaseIds.has(caseId)),
      ]);

      if (hearBatch.length >= BATCH_SIZE) await flushHearings();
    }
    await flushHearings();
    console.log(`  Imported ${hearTotal.toLocaleString()} hearings`);

    // Step 5: Import offenses
    console.log("\nStep 5: Importing offenses...");
    const offLines = await readLines(OFFENSES_CSV);
    let offFirst = true;
    let offBatch: string[][] = [];
    let offTotal = 0;

    async function flushOffenses() {
      if (offBatch.length === 0) return;
      const values: string[] = [];
      const params: any[] = [];
      let pi = 1;
      for (const row of offBatch) {
        values.push(`($${pi},$${pi+1},$${pi+2})`);
        params.push(row[0], row[1], row[2]);
        pi += 3;
      }
      await client.query(
        `INSERT INTO sanegoria_offenses (case_id, offense_code, offense_name)
         VALUES ${values.join(",")}`,
        params
      );
      offTotal += offBatch.length;
      offBatch = [];
    }

    for await (const line of offLines) {
      if (offFirst) { offFirst = false; continue; }
      const cols = parseCsvLine(line);
      const caseId = cols[0]?.trim();
      if (!caseId || !caseIdSet.has(caseId)) continue;

      offBatch.push([caseId, cols[1]?.trim() || "", cols[2]?.trim() || ""]);
      if (offBatch.length >= BATCH_SIZE) await flushOffenses();
    }
    await flushOffenses();
    console.log(`  Imported ${offTotal.toLocaleString()} offenses`);

    // Step 6: Create additional indexes for performance
    console.log("\nStep 6: Creating additional indexes...");
    await client.query("CREATE INDEX IF NOT EXISTS idx_cases_year ON sanegoria_cases (EXTRACT(YEAR FROM acceptance_date))");
    await client.query("CREATE INDEX IF NOT EXISTS idx_hear_ispd_case ON sanegoria_hearings (is_pd, case_id)");
    await client.query("ANALYZE sanegoria_cases");
    await client.query("ANALYZE sanegoria_hearings");
    await client.query("ANALYZE sanegoria_offenses");

    console.log("\n=== Migration Complete ===");
    console.log(`Cases:    ${casesTotal.toLocaleString()}`);
    console.log(`Hearings: ${hearTotal.toLocaleString()}`);
    console.log(`Offenses: ${offTotal.toLocaleString()}`);

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
