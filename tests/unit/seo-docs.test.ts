import { test } from "node:test";
import assert from "node:assert/strict";
import { safeLastModified } from "../../src/lib/seo-text";
import {
  guidelineDescription,
  practiceLinksForGuideline,
  practiceLinksForScope,
  rulingDescription,
} from "../../src/lib/seo-text";

test("safeLastModified drops dates Search Console rejects", () => {
  assert.equal(safeLastModified(null), undefined);
  assert.equal(safeLastModified(new Date("1900-01-01")), undefined);
  assert.equal(safeLastModified(new Date("1969-08-21")), undefined);
  assert.equal(safeLastModified(new Date("2076-06-23")), undefined);
  assert.equal(safeLastModified(new Date("invalid")), undefined);
  const ok = new Date("2023-04-20");
  assert.equal(safeLastModified(ok), ok);
});

test("guideline description: a long summary is used as is, clipped", () => {
  const summary = "א".repeat(300);
  const d = guidelineDescription({ summary });
  assert.ok(d.length <= 158);
  assert.ok(d.endsWith("…"));
});

test("guideline description: a one-word topic is expanded", () => {
  const d = guidelineDescription({
    document_title: "משך טיפול התביעה עד להגשת כתב אישום",
    source_label: "הנחיות פרקליט המדינה",
    directive_number: "14.21",
    document_date: "2023-04-20",
    topic: "משפט פלילי",
    summary: "",
  });
  assert.match(d, /משך טיפול התביעה/);
  assert.match(d, /הנחיה של פרקליט המדינה/);
  assert.match(d, /14\.21/);
  assert.match(d, /נושא: משפט פלילי/);
  assert.ok(d.length > 60 && d.length <= 158);
});

test("ruling description keeps a real summary", () => {
  const summary = "התובע הגיש תביעת לשון הרע נגד גופי תקשורת בגין פרסומים שעסקו במעצרו ובכתב האישום שהוגש נגדו, ובית המשפט דחה את התביעה.";
  assert.equal(rulingDescription({ summary, court: "שלום", date: "", caseName: "x" }), summary);
});

test("practice links by scope and issuer", () => {
  assert.equal(practiceLinksForScope(6)[0].href, "/services/foi");
  assert.equal(practiceLinksForScope(4)[0].href, "/services/privacy-harassment");
  assert.equal(practiceLinksForGuideline("הנחיות פרקליט המדינה")[0].href, "/services/preinvestigationadvice");
  assert.equal(practiceLinksForGuideline("היחידה הממשלתית לחופש המידע")[0].href, "/services/foi");
});
