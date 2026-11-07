import "./_unreachable-db";
import { test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { decryptToken, encryptToken, isEncryptedToken } from "../../src/lib/token-crypto";
import { claimConsentOnce, originFromRequest } from "../../src/lib/mcp-oauth";

/* ── token encryption at rest ── */

test("tokens round-trip and are not stored in the clear", () => {
  process.env.NEXTAUTH_SECRET = "unit-test-secret-unit-test-secret";
  const enc = encryptToken("1//refresh-token-value")!;
  assert.ok(isEncryptedToken(enc));
  assert.ok(!enc.includes("refresh-token-value"));
  assert.equal(decryptToken(enc), "1//refresh-token-value");
  // Random IV: the same token never encrypts to the same string twice.
  assert.notEqual(encryptToken("1//refresh-token-value"), enc);
  // Already-encrypted values are not wrapped again.
  assert.equal(encryptToken(enc), enc);
});

test("legacy plain-text tokens still read, and empty values pass through", () => {
  assert.equal(decryptToken("ya29.plain"), "ya29.plain");
  assert.equal(decryptToken(null), null);
  assert.equal(encryptToken(null), null);
  assert.equal(encryptToken(undefined), undefined);
});

test("a token under another secret, or tampered with, reads as null", () => {
  process.env.NEXTAUTH_SECRET = "unit-test-secret-unit-test-secret";
  const enc = encryptToken("secret-value")!;
  const tampered = enc.slice(0, -2) + (enc.endsWith("A") ? "BB" : "AA");
  assert.equal(decryptToken(tampered), null);
  process.env.NEXTAUTH_SECRET = "a-different-secret-a-different-secret";
  assert.equal(decryptToken(enc), null);
});

/* ── OAuth metadata origin ── */

const req = (headers: Record<string, string>) => new NextRequest("https://www.z-g.co.il/x", { headers });

test("the OAuth origin only ever names a host that serves this app", () => {
  assert.equal(originFromRequest(req({ host: "www.z-g.co.il" })), "https://www.z-g.co.il");
  assert.equal(originFromRequest(req({ host: "z-g.co.il", "x-forwarded-proto": "http" })), "https://z-g.co.il");
  // A forged forwarding header falls back to the configured origin.
  process.env.NEXTAUTH_URL = "https://www.z-g.co.il";
  assert.equal(
    originFromRequest(req({ host: "www.z-g.co.il", "x-forwarded-host": "evil.example" })),
    "https://www.z-g.co.il",
  );
});

/* ── consent tickets ── */

test("a consent ticket can be used once", () => {
  const exp = Math.floor(Date.now() / 1000) + 600;
  assert.equal(claimConsentOnce("ticket-a", exp), true);
  assert.equal(claimConsentOnce("ticket-a", exp), false);
  assert.equal(claimConsentOnce("ticket-b", exp), true);
});
