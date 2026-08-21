/**
 * The gate that decides whether the guidelines mirror is trustworthy.
 *
 * This is the safety-critical half of the mirror: if it says yes when the
 * mirror is short, /guidelines serves a corpus with holes and a reader
 * searching for one of the missing documents is told it does not exist. That
 * is a worse failure than the slow upstream path it replaces, and it is
 * silent, so it gets a test.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { isMirrorUsable } from "../../src/lib/guidelines-mirror-state";

test("an unsynced mirror is never used", () => {
  assert.equal(isMirrorUsable(null), false);
  assert.equal(
    isMirrorUsable({ mirroredCount: 0, upstreamTotal: 12281, lastSyncAt: null }),
    false,
  );
});

test("a complete mirror is used", () => {
  assert.equal(
    isMirrorUsable({
      mirroredCount: 12281,
      upstreamTotal: 12281,
      lastSyncAt: new Date(),
    }),
    true,
  );
});

test("a sync that died partway through is rejected", () => {
  // The real failure mode: the 2026-08-20 logs show walks bailing at 500 of
  // 12,281. Serving that would hide 96% of the corpus.
  assert.equal(
    isMirrorUsable({
      mirroredCount: 500,
      upstreamTotal: 12281,
      lastSyncAt: new Date(),
    }),
    false,
  );
  // Even a nearly-complete walk is rejected — 3% missing is ~370 documents.
  assert.equal(
    isMirrorUsable({
      mirroredCount: 11900,
      upstreamTotal: 12281,
      lastSyncAt: new Date(),
    }),
    false,
  );
});

test("a handful of documents removed upstream since the sync still counts", () => {
  // Upstream deletions between syncs leave the mirror a little over or under;
  // the threshold has to tolerate that or the mirror would flap out of use.
  assert.equal(
    isMirrorUsable({
      mirroredCount: 12200,
      upstreamTotal: 12281,
      lastSyncAt: new Date(),
    }),
    true,
  );
});

test("a mirror that was never compared against an upstream total is trusted", () => {
  // upstreamTotal is null only before the first successful sync recorded one;
  // a non-zero count means rows are actually there.
  assert.equal(
    isMirrorUsable({ mirroredCount: 12281, upstreamTotal: null, lastSyncAt: new Date() }),
    true,
  );
});
