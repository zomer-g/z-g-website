import { test } from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";

import "./_unreachable-db";
import { canonicalPath, uploadNameFromPath, getPrivateFiles } from "../../src/lib/private-files";
import { kindFromName } from "../../src/lib/upload-type";
import { getClientIp } from "../../src/lib/rate-limit";
import { upstreamFileResponse } from "../../src/lib/upstream-file";
import { assertZipWithinLimits, parseWhatsappZip, ZIP_MAX_ENTRIES } from "../../src/lib/whatsapp-zip";

/* ── private-file paths ── */

test("encoded and dotted spellings of an upload path resolve to the same file", () => {
  const variants = [
    "/uploads/secret.pdf",
    "/%75ploads/secret.pdf",
    "/upload%73/secret.pdf",
    "/uploads%2fsecret.pdf",
    "/uploads%2Fsecret.pdf",
    "/%2575ploads/secret.pdf", // double-encoded
    "/uploads/%73ecret.pdf",
    "/./uploads/secret.pdf",
    "/x/../uploads/secret.pdf",
    "//uploads//secret.pdf",
    "/uploads\\secret.pdf",
    "/Uploads/secret.pdf",
    "/uploads/secret.pdf?download=1",
  ];
  for (const v of variants) assert.equal(uploadNameFromPath(v), "secret.pdf", v);
  for (const v of ["/seed-uploads/s.pdf", "/seed%2duploads/s.pdf", "/%73eed-uploads/s.pdf"]) {
    assert.equal(uploadNameFromPath(v), "s.pdf", v);
  }
});

test("Hebrew file names survive decoding", () => {
  const name = "1784649034817-דוח_הצוות.pdf";
  assert.equal(uploadNameFromPath(`/uploads/${encodeURIComponent(name)}`), name);
});

test("paths that are not a single upload file are not matched", () => {
  for (const v of ["/", "/about", "/uploads/", "/uploads/a/b.pdf", "/uploadsx/a.pdf", "/api/uploads/a.pdf"]) {
    assert.equal(uploadNameFromPath(v), null, v);
  }
  assert.equal(canonicalPath("/a/../../b"), "/b");
});

test("the private list fails closed when the database is unreachable", async () => {
  const set = await getPrivateFiles();
  assert.equal(set.has("anything.pdf"), true);
});

/* ── v1 uploads ── */

test("backup names cannot be created through the upload API", () => {
  assert.equal(kindFromName("api-x-pre-redaction-20261107.pdf"), null);
  assert.equal(kindFromName("api-x.pdf"), "pdf");
});

/* ── client IP ── */

const req = (headers: Record<string, string>) => new Request("https://x/", { headers });

test("the client IP is the entry the edge proxy appended, not one the client chose", () => {
  assert.equal(getClientIp(req({ "x-forwarded-for": "6.6.6.6, 1.2.3.4" })), "1.2.3.4");
  assert.equal(getClientIp(req({ "x-real-ip": "6.6.6.6" })), "unknown");
  process.env.TRUSTED_PROXY_HOPS = "2";
  try {
    assert.equal(getClientIp(req({ "x-forwarded-for": "6.6.6.6, 1.2.3.4, 10.0.0.1" })), "1.2.3.4");
  } finally {
    delete process.env.TRUSTED_PROXY_HOPS;
  }
});

/* ── upstream file proxy ── */

const upstream = (body: string, headers: Record<string, string>) => new Response(body, { headers });

test("a PDF from upstream is served inline as application/pdf, whatever it was labelled", async () => {
  const pdf = "%PDF-1.7\nrest of the file";
  const res = await upstreamFileResponse(
    upstream(pdf, { "content-type": "application/octet-stream", "content-disposition": 'attachment; filename="a.pdf"' }),
  );
  assert.equal(res.headers.get("content-type"), "application/pdf");
  assert.equal(res.headers.get("content-disposition"), 'inline; filename="a.pdf"');
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  assert.equal(await res.text(), pdf);
});

test("HTML from upstream is never served as HTML", async () => {
  const html = "<script>alert(document.cookie)</script>";
  const res = await upstreamFileResponse(
    upstream(html, { "content-type": "text/html", "content-disposition": 'inline; filename="x"; evil="1' }),
  );
  assert.equal(res.headers.get("content-type"), "application/octet-stream");
  assert.match(res.headers.get("content-disposition") ?? "", /^attachment/);
  assert.match(res.headers.get("content-security-policy") ?? "", /sandbox/);
  assert.equal(await res.text(), html);
});

test("an empty upstream body does not crash the proxy", async () => {
  const res = await upstreamFileResponse(upstream("", { "content-type": "application/pdf" }));
  assert.equal(res.headers.get("content-type"), "application/octet-stream");
  assert.equal(await res.text(), "");
});

/* ── zip limits ── */

test("an archive with too many entries is refused before inflating", async () => {
  const zip = new JSZip();
  for (let i = 0; i <= ZIP_MAX_ENTRIES; i++) zip.file(`f${i}.txt`, "");
  const loaded = await JSZip.loadAsync(await zip.generateAsync({ type: "uint8array" }));
  assert.throws(() => assertZipWithinLimits(loaded));
});

test("a normal chat export still parses", async () => {
  const zip = new JSZip();
  zip.file("_chat.txt", "[01/02/24, 10:00:00] Dana: hello\n[01/02/24, 10:01:00] Dana: IMG-1.jpg (file attached)\n");
  zip.file("IMG-1.jpg", new Uint8Array([0xff, 0xd8, 0xff, 1, 2, 3]));
  const parsed = await parseWhatsappZip(Buffer.from(await zip.generateAsync({ type: "uint8array" })));
  assert.ok(parsed.messages.length >= 1);
  assert.equal(parsed.media.length, 1);
  assert.deepEqual([...parsed.media[0].data], [0xff, 0xd8, 0xff, 1, 2, 3]);
});
