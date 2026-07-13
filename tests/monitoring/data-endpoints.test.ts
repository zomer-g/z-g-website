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
// Retry transient failures (timeout / 5xx) before declaring a break. The first
// hit to a cold TAG-IT scope can 504→502 or time out; a warmed retry usually
// succeeds, so this keeps a *scheduled* alert from flapping on warm-up blips
// while still failing hard on genuine outages.
const RETRIES = Number(process.env.MONITOR_RETRIES || 3);
const RETRY_DELAY_MS = Number(process.env.MONITOR_RETRY_DELAY_MS || 5_000);

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
    // NOTE: test the REAL page size, not limit=1. A limit=1 probe returned fast
    // while the actual page (limit=24, since capped to 12) sorted by
    // meta.document_date timed out at 50s → 502. Mirror what the page requests
    // so size/sort-scaling regressions surface here.
    name: "דוחות מבקר המדינה (comptroller · scope 13)",
    page: "/comptroller-reports",
    upstream: "TAG-IT · rulings scope 13",
    path: "/api/comptroller-reports/documents?limit=12&skip=0",
    count: (j) => j.total,
  },
  {
    name: "מסמכי מרכז המחקר והמידע — מ.מ.מ (mmm · scope 14)",
    page: "/mmm",
    upstream: "TAG-IT · rulings scope 14",
    path: "/api/mmm/documents?limit=12&skip=0",
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

/**
 * Fetch with transient-failure retries. Returns as soon as a request comes
 * back HTTP 200; otherwise retries (with a warm-up delay) up to RETRIES times
 * and returns the LAST attempt's result — so a persistent break (e.g. a 400
 * unknown_field wrapped as 502) still surfaces after exhausting retries.
 */
/**
 * A permanent error won't fix itself on retry — e.g. our route wraps a TAG-IT
 * 4xx (unknown_field, bad category) as a 502 carrying `upstreamStatus` in the
 * body, or the route itself returns a 4xx. Fail fast on those instead of
 * burning the full retry budget; keep retrying genuine transients (timeout,
 * upstream 5xx, network).
 */
function isPermanent(r: { status: number; json: any } | null): boolean {
  if (!r) return false;
  if (r.status >= 400 && r.status < 500) return true;
  const up = Number(r.json?.upstreamStatus);
  return up >= 400 && up < 500;
}

async function fetchJsonWithRetry(path: string) {
  let last: Awaited<ReturnType<typeof fetchJson>> | null = null;
  let lastErr: Error | null = null;
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      last = await fetchJson(path);
      if (last.status === 200) return { result: last, attempts: attempt };
      if (isPermanent(last)) return { result: last, attempts: attempt };
    } catch (err) {
      lastErr = err as Error;
    }
    if (attempt < RETRIES) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }
  if (last) return { result: last, attempts: RETRIES };
  throw lastErr ?? new Error("request failed");
}

console.log(
  `\n[monitor] target: ${BASE}  (timeout ${TIMEOUT_MS}ms, up to ${RETRIES} attempts)\n`,
);

for (const check of CHECKS) {
  test(`${check.name}  →  ${check.path}`, async () => {
    const { result, attempts } = await fetchJsonWithRetry(check.path);
    const { status, ms, json, bodyText } = result;
    const retryNote = attempts > 1 ? ` (after ${attempts} attempts)` : "";

    assert.equal(
      status,
      200,
      `${check.page} [${check.upstream}] returned HTTP ${status}${retryNote} in ${ms}ms\n  body: ${bodyText.slice(0, 300)}`,
    );
    assert.ok(json, `${check.page}: response was not valid JSON: ${bodyText.slice(0, 200)}`);

    const n = check.count(json);
    assert.ok(
      Number.isFinite(n) && n > 0,
      `${check.page} [${check.upstream}] returned 0 records — data likely not loaded / upstream empty\n  body: ${bodyText.slice(0, 300)}`,
    );

    if (ms > SLOW_MS) {
      console.warn(
        `[monitor] SLOW  ${check.page}: ${n} records in ${ms}ms${retryNote} (> ${SLOW_MS}ms)`,
      );
    } else {
      console.log(`[monitor] ok    ${check.page}: ${n} records in ${ms}ms${retryNote}`);
    }
  });
}
