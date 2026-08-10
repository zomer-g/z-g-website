/**
 * The two resiliency behaviours added after the 2026-08-10 incident, where a
 * ~1-minute TAG-IT self-restart took /class-actions down completely while
 * every mirrored page carried on.
 *
 * Run:  node --import tsx --test tests/unit/class-actions-cache.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import type { ClassActionDocument } from "../../src/types/class-action";
import {
  clearCache,
  getCached,
  getStale,
  inFlightCount,
  runSingleFlight,
  setCached,
} from "../../src/lib/class-actions-cache";

const doc = (id: number) => ({ id, case_name: `case ${id}` }) as ClassActionDocument;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

test("a fresh entry is served normally", () => {
  clearCache();
  setCached("k", [doc(1)], 60_000);
  assert.equal(getCached("k")?.length, 1);
});

test("an expired entry stops being served fresh but is KEPT for fallback", async () => {
  clearCache();
  setCached("k", [doc(1), doc(2)], 20);
  await sleep(40);
  assert.equal(getCached("k"), null, "expired entry must not be served as fresh");
  const stale = getStale("k");
  assert.ok(stale, "expired entry must still be available as a fallback");
  assert.equal(stale.items.length, 2);
  assert.ok(stale.ageMs >= 20, "reports how old the copy is");
});

test("getStale on an unknown key is null — nothing to fall back to", () => {
  clearCache();
  assert.equal(getStale("never-seen"), null);
});

test("concurrent callers share ONE crawl per key", async () => {
  clearCache();
  let invocations = 0;
  const slowFetch = async () => {
    invocations++;
    await sleep(60);
    return [doc(1)];
  };
  const results = await Promise.all(
    [0, 1, 2, 3, 4].map(() => runSingleFlight("same-key", slowFetch)),
  );
  assert.equal(invocations, 1, "five concurrent callers must trigger one crawl");
  for (const r of results) assert.equal(r?.length, 1, "all callers get the result");
  assert.equal(inFlightCount(), 0, "the in-flight entry is released when done");
});

test("different keys still crawl independently", async () => {
  clearCache();
  let invocations = 0;
  const f = async () => {
    invocations++;
    await sleep(20);
    return [doc(1)];
  };
  await Promise.all([runSingleFlight("a", f), runSingleFlight("b", f)]);
  assert.equal(invocations, 2);
});

test("a failed crawl is not cached as in-flight — the next caller retries", async () => {
  clearCache();
  let invocations = 0;
  const failing = async (): Promise<ClassActionDocument[] | null> => {
    invocations++;
    await sleep(10);
    throw new Error("upstream down");
  };
  await assert.rejects(() => runSingleFlight("k", failing));
  assert.equal(inFlightCount(), 0, "a rejection must clear the in-flight slot");
  await assert.rejects(() => runSingleFlight("k", failing));
  assert.equal(invocations, 2, "the next caller gets a fresh attempt, not the old rejection");
});

test("the incident shape end to end: cache goes stale, upstream dies, page still answers", async () => {
  clearCache();
  setCached("corpus", [doc(1), doc(2), doc(3)], 20);
  await sleep(40);                                   // TTL lapses
  assert.equal(getCached("corpus"), null);           // → the route takes the miss path
  await assert.rejects(() =>                          // → TAG-IT is restarting
    runSingleFlight("corpus", async () => {
      throw new Error("ECONNREFUSED");
    }),
  );
  const stale = getStale("corpus");                  // → serve the last known list
  assert.equal(stale?.items.length, 3);
});
