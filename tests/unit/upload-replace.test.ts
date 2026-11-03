import { test } from "node:test";
import assert from "node:assert/strict";
import {
  backupNameFor,
  isPdf,
  isReplaceableName,
  STAMP_RE,
  todayStamp,
} from "../../src/lib/upload-replace-names";

test("backupNameFor puts the stamp before .pdf", () => {
  assert.equal(
    backupNameFor("api-oman-v-tamnun-claim-2022-12-27.pdf", "20261103"),
    "api-oman-v-tamnun-claim-2022-12-27-pre-redaction-20261103.pdf",
  );
  assert.equal(backupNameFor("tm-ruling.PDF", "20261103"), "tm-ruling-pre-redaction-20261103.pdf");
});

test("isReplaceableName accepts bare PDF names, any prefix", () => {
  assert.ok(isReplaceableName("api-oman-v-tamnun-judgment-2026-05-08.pdf"));
  assert.ok(isReplaceableName("tm-ruling-2026-05-08-ta-56708-12-22-jerusalem.pdf"));
});

test("isReplaceableName rejects paths, non-PDFs and backups", () => {
  for (const bad of [
    "../x.pdf",
    "a/b.pdf",
    "a\\b.pdf",
    "x.png",
    "x.pdf.png",
    "api-x-pre-redaction-20261103.pdf",
    ".pdf",
  ]) {
    assert.equal(isReplaceableName(bad), false, bad);
  }
});

test("STAMP_RE and todayStamp", () => {
  assert.ok(STAMP_RE.test("20261103"));
  assert.ok(!STAMP_RE.test("2026-11-03"));
  assert.ok(!STAMP_RE.test("20261103x"));
  assert.equal(todayStamp(new Date("2026-11-03T12:00:00Z")), "20261103");
});

test("isPdf checks the magic bytes", () => {
  const enc = new TextEncoder();
  assert.ok(isPdf(enc.encode("%PDF-1.7\n")));
  assert.ok(!isPdf(enc.encode("<html>")));
  assert.ok(!isPdf(enc.encode("%PDF")));
});
