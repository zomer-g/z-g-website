import { createHash, timingSafeEqual } from "node:crypto";

// Server-to-server access to the FOI guide MCP, without the OAuth/SSO flow.
//
// FOI_GUIDE_SHARED_TOKENS holds a comma-separated list of `name=token`
// entries (e.g. `foi-zomerg=<secret>`). A bare token with no `name=` gets the
// name "server". Tokens shorter than MIN_TOKEN_LENGTH are ignored so a
// mistyped or placeholder value can never open the endpoint.
//
// Only SHA-256 digests are compared, with timingSafeEqual, and every
// configured token is checked so the time taken does not reveal which entry
// (if any) matched.

export const MIN_TOKEN_LENGTH = 32;
const NAME_RE = /^[A-Za-z0-9._-]{1,64}$/;

interface SharedToken {
  name: string;
  digest: Buffer;
}

function sha256(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

export function parseSharedTokens(raw: string | undefined): SharedToken[] {
  if (!raw) return [];
  const out: SharedToken[] = [];
  for (const part of raw.split(",")) {
    const entry = part.trim();
    if (!entry) continue;
    const eq = entry.indexOf("=");
    let name = "server";
    let token = entry;
    // A bare base64 token ends in "=" padding; anything else after a
    // name-shaped prefix is a `name=token` entry, and its token alone must
    // meet the length rule.
    if (eq > 0 && NAME_RE.test(entry.slice(0, eq).trim())) {
      const rest = entry.slice(eq + 1).trim();
      if (!/^=*$/.test(rest)) {
        name = entry.slice(0, eq).trim();
        token = rest;
      }
    }
    if (token.length < MIN_TOKEN_LENGTH) {
      console.error(
        `[mcp-shared-token] ignoring entry "${name}": token shorter than ${MIN_TOKEN_LENGTH} chars`,
      );
      continue;
    }
    out.push({ name, digest: sha256(token) });
  }
  return out;
}

/**
 * Returns the configured name of the shared token that matches `presented`,
 * or null. Reads FOI_GUIDE_SHARED_TOKENS on every call (cheap) so tests and
 * env changes take effect without a module reload.
 */
export function matchSharedToken(
  presented: string,
  raw: string | undefined = process.env.FOI_GUIDE_SHARED_TOKENS,
): string | null {
  if (!presented) return null;
  const tokens = parseSharedTokens(raw);
  if (tokens.length === 0) return null;
  const digest = sha256(presented);
  let matched: string | null = null;
  for (const t of tokens) {
    if (timingSafeEqual(digest, t.digest) && matched === null) {
      matched = t.name;
    }
  }
  return matched;
}
