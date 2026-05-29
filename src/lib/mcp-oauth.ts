// OAuth 2.1 + PKCE primitives for the FOI Guide MCP server.
//
// The flow:
//   1. MCP client (Claude.ai / ChatGPT / Inspector) discovers metadata via
//      /.well-known/oauth-protected-resource → /.well-known/oauth-authorization-server.
//   2. Client dynamically registers via POST /api/mcp/foi-guide/oauth/register
//      (RFC 7591). We return a generated client_id; no secret (public client).
//   3. Client redirects user to /api/mcp/foi-guide/oauth/authorize with
//      response_type=code, code_challenge (S256), redirect_uri, state.
//   4. We bounce the user through Google OAuth (the existing public client)
//      to verify identity. On return, we check the email against McpInvite
//      and either issue an auth code or 403.
//   5. Client POSTs the code + code_verifier to /api/mcp/foi-guide/oauth/token
//      and receives access_token.
//   6. Client calls POST /api/mcp/foi-guide with Bearer access_token; we
//      validate the token, look up the email, and run the MCP tool.

import { randomBytes, createHmac, createHash } from "crypto";

const SIGNING_SECRET =
  process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "dev-secret-do-not-use";

export const MCP_RESOURCE_PATH = "/api/mcp/foi-guide";
export const MCP_OAUTH_BASE_PATH = "/api/mcp/foi-guide/oauth";

export const ACCESS_TOKEN_TTL_SECONDS = 24 * 3600;
export const AUTH_CODE_TTL_SECONDS = 10 * 60;

// Pulls the origin from env. Used only as a fallback when there's no
// request context (e.g. during build-time static generation of well-known
// metadata). Prefer originFromRequest() everywhere a request is available
// — Render hosts the site on both z-g.co.il AND www.z-g.co.il, and
// returning the "wrong" canonical host in the OAuth metadata triggers a
// 30x redirect that strips the Bearer token (RFC 7230 §5.4 behaviour in
// every HTTP client). The MCP flow then loops on 401s.
export function siteOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

// Derives the origin from the incoming request, honoring whatever host
// the client actually reached us on (so subsequent requests don't get
// cross-host redirected and lose their auth header).
import type { NextRequest } from "next/server";
export function originFromRequest(req: NextRequest): string {
  const proto =
    req.headers.get("x-forwarded-proto") ??
    (req.nextUrl.protocol.replace(":", "")) ??
    "https";
  const host =
    req.headers.get("x-forwarded-host") ??
    req.headers.get("host") ??
    req.nextUrl.host;
  return `${proto}://${host}`.replace(/\/$/, "");
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

// HMAC-signed opaque state token. We use it to round-trip the original MCP
// authorize request through the upstream Google OAuth flow without putting
// the whole payload in a query string the user might tamper with.
export interface AuthorizeState {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  state?: string;
  scope?: string;
  nonce: string;
  // Unix seconds.
  exp: number;
}

export function signState(payload: AuthorizeState): string {
  const json = JSON.stringify(payload);
  const body = Buffer.from(json, "utf8").toString("base64url");
  const sig = createHmac("sha256", SIGNING_SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyState(token: string): AuthorizeState | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = createHmac("sha256", SIGNING_SECRET).update(body).digest("base64url");
  if (expected !== sig) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as AuthorizeState;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// PKCE — we only accept S256 (plain is rejected by the OAuth 2.1 spec).
export function verifyPkce(verifier: string, challenge: string, method: string): boolean {
  if (method !== "S256") return false;
  const hash = createHash("sha256").update(verifier).digest("base64url");
  return hash === challenge;
}
