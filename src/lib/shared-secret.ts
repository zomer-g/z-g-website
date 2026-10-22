import { timingSafeEqual } from "crypto";

/**
 * Compares a secret from a request header against the configured value.
 *
 * `===` returns as soon as a byte differs, which leaks how much of the secret
 * a guess got right. Lengths are compared first (that leak is unavoidable and
 * harmless for a random secret), then the bytes in constant time. Missing on
 * either side is a mismatch: an unset env var must never match an empty header.
 */
export function secretMatches(given: string | null | undefined, expected: string | undefined): boolean {
  if (!given || !expected) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
