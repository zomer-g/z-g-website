import { test } from "node:test";
import assert from "node:assert/strict";
import {
  caseDocumentSchema,
  parseUpdate,
  plilistPostSchema,
  serviceSchema,
} from "../../src/lib/validations";

test("a partial post update does not reset status or tags", () => {
  const r = parseUpdate(plilistPostSchema, { title: "כותרת חדשה", content: { type: "doc" } });
  assert.equal(r.success, true);
  if (!r.success) return;
  assert.deepEqual(Object.keys(r.data).sort(), ["content", "title"]);
  assert.equal("status" in r.data, false);
  assert.equal("tags" in r.data, false);
  assert.equal("attachments" in r.data, false);
});

test("fields that are sent are still parsed and transformed", () => {
  const r = parseUpdate(plilistPostSchema, { status: "PUBLISHED", caseTag: "  " });
  assert.equal(r.success, true);
  if (!r.success) return;
  assert.equal(r.data.status, "PUBLISHED");
  assert.equal(r.data.caseTag, null);
});

test("a partial service or case document update keeps isActive and order", () => {
  const s = parseUpdate(serviceSchema, { title: "x" });
  assert.equal(s.success, true);
  if (s.success) assert.deepEqual(Object.keys(s.data), ["title"]);
  const d = parseUpdate(caseDocumentSchema, { description: "y" });
  assert.equal(d.success, true);
  if (d.success) assert.deepEqual(Object.keys(d.data), ["description"]);
});

test("invalid values are still rejected", () => {
  const r = parseUpdate(plilistPostSchema, { status: "LIVE" });
  assert.equal(r.success, false);
});
