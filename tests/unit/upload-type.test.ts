import { test } from "node:test";
import assert from "node:assert/strict";
import { checkUpload, kindFromName, sniffKind } from "../../src/lib/upload-type";

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52]);
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const webp = new Uint8Array([...Buffer.from("RIFF"), 0x24, 0, 0, 0, ...Buffer.from("WEBPVP8 ")]);
const pdf = new Uint8Array(Buffer.from("%PDF-1.7\n"));
const svg = new Uint8Array(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'));

test("a valid PNG is accepted as image/png", () => {
  assert.deepEqual(checkUpload("api-shot-1.png", png), { ok: true, kind: "png", mimeType: "image/png" });
});

test("a valid JPEG is accepted under .jpg and .jpeg", () => {
  for (const name of ["api-shot.jpg", "api-shot.jpeg"]) {
    assert.deepEqual(checkUpload(name, jpeg), { ok: true, kind: "jpeg", mimeType: "image/jpeg" }, name);
  }
});

test("WebP and PDF are still accepted", () => {
  assert.deepEqual(checkUpload("api-x.webp", webp), { ok: true, kind: "webp", mimeType: "image/webp" });
  assert.deepEqual(checkUpload("api-x.pdf", pdf), { ok: true, kind: "pdf", mimeType: "application/pdf" });
});

test("a PNG named .pdf is refused", () => {
  const r = checkUpload("api-sneaky.pdf", png);
  assert.equal(r.ok, false);
  assert.equal(!r.ok && r.status, 415);
});

test("SVG is refused, by name and by content", () => {
  assert.equal(kindFromName("api-x.svg"), null);
  assert.equal(sniffKind(svg), null);
  for (const name of ["api-x.svg", "api-x.png"]) {
    const r = checkUpload(name, svg);
    assert.equal(r.ok, false, name);
  }
});

test("names without the api- prefix or with odd characters are refused", () => {
  for (const name of ["shot.png", "api-.png", "api-Shot.png", "api-a/b.png", "api-x.gif", "api-x.png.svg"]) {
    assert.equal(kindFromName(name), null, name);
  }
});

test("a RIFF file that is not WebP is refused", () => {
  const wav = new Uint8Array([...Buffer.from("RIFF"), 0x24, 0, 0, 0, ...Buffer.from("WAVEfmt ")]);
  assert.equal(sniffKind(wav), null);
});
