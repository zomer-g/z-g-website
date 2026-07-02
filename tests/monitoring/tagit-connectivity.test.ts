/**
 * Direct TAG-IT connectivity check.
 *
 * Talks straight to tag-it.biz (bypassing our API routes) to answer one
 * question when the data-endpoints suite goes red: is TAG-IT itself the
 * problem, or is it our code? Runs per public scope.
 *
 * Requires an API key. It is NOT in local .env (only in the deployed env), so
 * this suite SKIPS when no key is present and is meant to run where the key is
 * available (CI / production cron). The data-endpoints.test.ts suite covers the
 * full chain without secrets.
 *
 * Run with a key:
 *   RULINGS_API_KEY=xxxx npm run test:monitor
 */
import { test } from "node:test";
import assert from "node:assert/strict";

const BASE = (process.env.TAGIT_API_URL || "https://tag-it.biz").replace(
  /\/$/,
  "",
);
const API_KEY =
  process.env.RULINGS_API_KEY || process.env.CLASS_ACTION_API_KEY;
const TIMEOUT_MS = Number(process.env.MONITOR_TIMEOUT_MS || 90_000);

// The scopes our pages depend on. If TAG-IT drops one from its public
// allow-list, its direct probe here fails while the others stay green.
const SCOPES: { id: number; label: string }[] = [
  { id: 1, label: "drug-sentencing" },
  { id: 4, label: "defamation" },
  { id: 6, label: "foi" },
  { id: 13, label: "comptroller" },
];

async function probeScope(scopeId: number) {
  const url = `${BASE}/api/public/rulings/documents?scope=${scopeId}&page=1&size=1`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const started = Date.now();
  try {
    const res = await fetch(url, {
      headers: { "X-API-Key": API_KEY as string, Accept: "application/json" },
      signal: ctrl.signal,
    });
    const ms = Date.now() - started;
    const bodyText = await res.text();
    return { status: res.status, ms, bodyText };
  } finally {
    clearTimeout(timer);
  }
}

const skip = API_KEY
  ? false
  : "no RULINGS_API_KEY / CLASS_ACTION_API_KEY in env — direct TAG-IT probe skipped (runs in deployed env)";

console.log(
  `\n[monitor] TAG-IT direct: ${BASE}  ${API_KEY ? "(key present)" : "(no key — skipping)"}\n`,
);

for (const scope of SCOPES) {
  test(`TAG-IT direct · scope ${scope.id} (${scope.label})`, { skip }, async () => {
    const { status, ms, bodyText } = await probeScope(scope.id);
    assert.equal(
      status,
      200,
      `TAG-IT scope ${scope.id} returned HTTP ${status} in ${ms}ms\n  body: ${bodyText.slice(0, 300)}`,
    );
    const json = JSON.parse(bodyText);
    const total = Number(json.total) || 0;
    assert.ok(
      total > 0,
      `TAG-IT scope ${scope.id} reported 0 docs — scope may be disabled/empty upstream`,
    );
    console.log(`[monitor] ok    TAG-IT scope ${scope.id} (${scope.label}): ${total} docs in ${ms}ms`);
  });
}
