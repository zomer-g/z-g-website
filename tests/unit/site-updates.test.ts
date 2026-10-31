import { test } from "node:test";
import assert from "node:assert/strict";
import {
  changeKind,
  parseLimit,
  parseSince,
  parseTypes,
  renderRss,
  selectUpdates,
  type SiteUpdate,
} from "../../src/lib/site-updates-format";

const item = (id: string, type: SiteUpdate["type"], published: string, updated = published): SiteUpdate => ({
  id: `${type}:${id}`,
  type,
  typeLabel: type,
  title: `title ${id}`,
  url: `https://www.z-g.co.il/x/${id}`,
  excerpt: null,
  published,
  updated,
  category: null,
  tags: [],
  parentUrl: null,
});

const all = [
  item("a", "article", "2026-01-01T00:00:00.000Z", "2026-10-20T00:00:00.000Z"),
  item("b", "blog", "2026-10-10T00:00:00.000Z"),
  item("c", "document", "2026-10-15T00:00:00.000Z"),
  item("d", "media", "2025-05-01T00:00:00.000Z"),
];

test("selectUpdates sorts newest first and filters by type", () => {
  assert.deepEqual(
    selectUpdates(all, { types: null, since: null, limit: 50 }).map((u) => u.id),
    ["document:c", "blog:b", "article:a", "media:d"],
  );
  assert.deepEqual(
    selectUpdates(all, { types: ["article", "media"], since: null, limit: 50 }).map((u) => u.id),
    ["article:a", "media:d"],
  );
  assert.equal(selectUpdates(all, { types: null, since: null, limit: 2 }).length, 2);
});

test("since includes items published OR edited after it, and labels them", () => {
  const since = new Date("2026-10-12T00:00:00Z");
  const got = selectUpdates(all, { types: null, since, limit: 50 });
  assert.deepEqual(got.map((u) => u.id), ["document:c", "article:a"]);
  assert.equal(changeKind(got[0], since), "new");
  assert.equal(changeKind(got[1], since), "updated");
  assert.equal(changeKind(got[1], null), "new");
});

test("query parsing rejects bad input instead of ignoring it", () => {
  assert.deepEqual(parseTypes("article, blog,article"), ["article", "blog"]);
  assert.equal(parseTypes(""), null);
  assert.ok("error" in (parseTypes("article,nope") as object));
  assert.ok(parseSince("2026-10-01") instanceof Date);
  assert.ok("error" in (parseSince("yesterday") as object));
  assert.equal(parseLimit("500"), 200);
  assert.equal(parseLimit("-3"), 50);
  assert.equal(parseLimit(undefined), 50);
});

test("renderRss escapes free text and names the exact self URL", () => {
  const evil = { ...item("e", "blog", "2026-10-30T00:00:00.000Z"), title: "a <b> & ]]> \u0001", excerpt: "x\"y" };
  const xml = renderRss([evil], { selfUrl: "https://www.z-g.co.il/feed.xml?type=blog", types: ["blog"], now: new Date() });
  assert.ok(xml.includes("a &lt;b&gt; &amp; ]]&gt; "));
  assert.ok(!xml.includes("\u0001"));
  assert.ok(xml.includes('href="https://www.z-g.co.il/feed.xml?type=blog"'));
  assert.ok(xml.includes("<guid isPermaLink=\"false\">https://www.z-g.co.il#blog:e</guid>"));
  assert.ok(xml.includes("<pubDate>Fri, 30 Oct 2026 00:00:00 GMT</pubDate>"));
});
