import { test } from "node:test";
import assert from "node:assert/strict";
import {
  matchSharedToken,
  parseSharedTokens,
} from "../../src/lib/mcp-shared-token";

const A = "a".repeat(40);
const B = "b".repeat(48);

test("named entry matches and returns its name", () => {
  assert.equal(matchSharedToken(A, `foi-zomerg=${A}`), "foi-zomerg");
});

test("bare token gets the name 'server'", () => {
  assert.equal(matchSharedToken(B, B), "server");
});

test("several entries, whitespace tolerated", () => {
  const raw = ` foi-zomerg = ${A} , other=${B} ,`;
  assert.equal(matchSharedToken(A, raw), "foi-zomerg");
  assert.equal(matchSharedToken(B, raw), "other");
});

test("wrong, empty or near-miss tokens do not match", () => {
  const raw = `foi-zomerg=${A}`;
  assert.equal(matchSharedToken(B, raw), null);
  assert.equal(matchSharedToken("", raw), null);
  assert.equal(matchSharedToken(A.slice(1), raw), null);
  assert.equal(matchSharedToken(A + "x", raw), null);
});

test("bare base64 token with '=' padding still matches as 'server'", () => {
  const padded = "Q".repeat(42) + "==";
  assert.equal(matchSharedToken(padded, padded), "server");
});

test("tokens shorter than 32 chars are rejected", () => {
  const short = "s".repeat(31);
  assert.equal(parseSharedTokens(`x=${short}`).length, 0);
  assert.equal(matchSharedToken(short, `x=${short}`), null);
  assert.equal(matchSharedToken(short, short), null);
});

test("unset or empty env opens nothing", () => {
  assert.equal(matchSharedToken(A, undefined), null);
  assert.equal(matchSharedToken(A, ""), null);
  assert.equal(matchSharedToken(A, " , ,"), null);
});
