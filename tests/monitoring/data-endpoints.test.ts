/**
 * Data-endpoint monitoring suite.
 *
 * Hits the LIVE production API endpoints that back every data-driven page and
 * asserts each one still returns real data. This exercises the full chain the
 * user experiences — page → API route → upstream (TAG-IT / CKAN / DB) — so a
 * break anywhere (TAG-IT down, API key expired, a scope disabled, a renamed
 * filter field, a bad deploy) turns this suite red early.
 *
 * WHY hit production instead of calling the upstream libs directly:
 *   The TAG-IT API keys (RULINGS_API_KEY / GUIDELINES_API_KEY / …) live only in
 *   the deployed environment, not in local .env. Hitting the live endpoints
 *   needs no secrets and verifies the real thing end-to-end.
 *
 * Run:
 *   npm run test:monitor
 *   # or against another origin / with a longer timeout:
 *   MONITOR_BASE_URL=https://staging.example  MONITOR_TIMEOUT_MS=90000 npm run test:monitor
 *
 * Exit code is non-zero if any check fails — wire it into cron / uptime.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

const BASE = (process.env.MONITOR_BASE_URL || "https://www.z-g.co.il").replace(
  /\/$/,
  "",
);
// Generous default: a COLD TAG-IT scope (first hit after the ~5 min catalog
// cache expires) can legitimately take tens of seconds on a big scope.
const TIMEOUT_MS = Number(process.env.MONITOR_TIMEOUT_MS || 90_000);
// Above this we still PASS but warn — a canary for creeping slowness.
const SLOW_MS = Number(process.env.MONITOR_SLOW_MS || 15_000);

interface Check {
  /** Human label shown in the test name. */
  name: string;
  /** Page this endpoint backs (for the report). */
  page: string;
  /** Upstream system, for triage when it breaks. */
  upstream: string;
  /** Endpoint path (query included). */
  path: string;
  /** Pull the record count out of the JSON body. Must be > 0 to pass. */
  count: (json: any) => number;
}

/**
 * One entry per data-driven page. `count` returns the number of records the
 * endpoint reports; a healthy endpoint always returns > 0.
 */
const CHECKS: Check[] = [
  {
    name: "הנחיות (guidelines)",
    page: "/guidelines",
    upstream: "TAG-IT · over-guidelines",
    path: "/api/guidelines/documents?limit=1",
    count: (j) => j.total,
  },
  {
    name: "תובענות ייצוגיות (class-actions)",
    page: "/class-actions",
    upstream: "TAG-IT · class-action",
    path: "/api/class-actions/documents?limit=1",
    count: (j) => j.total,
  },
  {
    name: "פסקי דין בלשון הרע (defamation · scope 4)",
    page: "/defamation-rulings",
    upstream: "TAG-IT · rulings scope 4",
    path: "/api/rulings?category=defamation&page=1",
    count: (j) => j.total,
  },
  {
    name: "פסיקות חופש מידע (foi-judgments · scope 6)",
    page: "/foi-judgments",
    upstream: "TAG-IT · rulings scope 6",
    path: "/api/rulings?category=foi-judgments&page=1",
    count: (j) => j.total,
  },
  {
    name: "הוצאות חופש מידע (foi-costs · scope 6)",
    page: "/foi-costs",
    upstream: "TAG-IT · rulings scope 6",
    path: "/api/rulings?category=foi-costs&page=1",
    count: (j) => j.total,
  },
  {
    name: "גזרי דין בעבירות סמים (drug-sentencing · scope 1)",
    page: "/drug-sentencing",
    upstream: "TAG-IT · rulings scope 1",
    path: "/api/rulings?category=drug-sentencing&page=1",
    count: (j) => j.total,
  },
  {
    name: "דוחות מבקר המדינה (comptroller · scope 13)",
    page: "/comptroller-reports",
    upstream: "TAG-IT · rulings scope 13",
    path: "/api/comptroller-reports/documents?limit=1",
    count: (j) => j.total,
  },
  {
    name: "הסדרים מותנים (conditional-arrangements · CKAN)",
    page: "/conditional-arrangements",
    upstream: "over.org.il / odata.org.il (CKAN)",
    path: "/api/conditional-arrangements/records?limit=1",
    count: (j) => j.total,
  },
  {
    name: "סניגוריה (sanegoria)",
    page: "/sanegoria",
    upstream: "Prisma DB (sanegoria_*)",
    path: "/api/sanegoria?filters=1",
    // The filters endpoint returns option lists rather than a total.
    count: (j) => (Array.isArray(j.courts) ? j.courts.length : 0),
  },
];

async function fetchJson(
  path: string,
): Promise<{ status: number; ms: number; json: any; bodyText: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const started = Date.now();
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { Accept: "application/json" },
      signal: ctrl.signal,
    });
    const ms = Date.now() - started;
    const bodyText = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(bodyText);
    } catch {
      /* leave json null — reported below */
    }
    return { status: res.status, ms, json, bodyText };
  } catch (err) {
    const ms = Date.now() - started;
    const reason =
      (err as Error)?.name === "AbortError"
        ? `timed out after ${TIMEOUT_MS}ms`
        : `network error: ${(err as Error)?.message}`;
    throw new Error(`${reason} (elapsed ${ms}ms)`);
  } finally {
    clearTimeout(timer);
  }
}

console.log(`\n[monitor] target: ${BASE}  (timeout ${TIMEOUT_MS}ms)\n`);

for (const check of CHECKS) {
  test(`${check.name}  →  ${check.path}`, async () => {
    const { status, ms, json, bodyText } = await fetchJson(check.path);

    assert.equal(
      status,
      200,
      `${check.page} [${check.upstream}] returned HTTP ${status} in ${ms}ms\n  body: ${bodyText.slice(0, 300)}`,
    );
    assert.ok(json, `${check.page}: response was not valid JSON: ${bodyText.slice(0, 200)}`);

    const n = check.count(json);
    assert.ok(
      Number.isFinite(n) && n > 0,
      `${check.page} [${check.upstream}] returned 0 records — data likely not loaded / upstream empty\n  body: ${bodyText.slice(0, 300)}`,
    );

    if (ms > SLOW_MS) {
      console.warn(
        `[monitor] SLOW  ${check.page}: ${n} records in ${ms}ms (> ${SLOW_MS}ms)`,
      );
    } else {
      console.log(`[monitor] ok    ${check.page}: ${n} records in ${ms}ms`);
    }
  });
}
