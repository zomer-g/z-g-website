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

import { randomBytes, createHmac, createHash, timingSafeEqual } from "crypto";

// The HMAC secret that signs the OAuth `state` token. Resolved at call time
// (not at import) so it can fail closed: in production we refuse to fall back
// to a hardcoded constant — otherwise a missing env var would let anyone forge
// `state` payloads. Non-production keeps a dev default for convenience.
export function getSigningSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXTAUTH_SECRET/AUTH_SECRET must be set in production — refusing to sign OAuth state with a known constant.",
    );
  }
  return "dev-secret-do-not-use";
}

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

// Which redirect_uris we accept at registration (RFC 7591) and re-check at
// /authorize. An auth code is a bearer credential delivered *to this URI*, so
// an unconstrained redirect_uri turns dynamic registration into a token
// phishing primitive: anyone may register a client pointing at their own
// server, walk a victim through a legitimate-looking Google screen, and
// collect the code. OAuth 2.1 §8.4 / BCP 212 draw the line at:
//   - https:// — confidentiality on the wire, and the host is DNS-owned.
//   - http:// on a loopback host only — the native-app flow (MCP Inspector,
//     local clients), where the "network" never leaves the machine.
// Everything else (http:// to a remote host, custom schemes, javascript:,
// data:) is refused. Fragments are illegal in a redirect_uri per RFC 6749
// §3.1.2, and userinfo (https://evil@good.example) is a display-spoofing
// vector on the consent screen, so both are rejected too.
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

export function isAllowedRedirectUri(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.hash) return false;
  if (url.username || url.password) return false;
  if (url.protocol === "https:") return true;
  if (url.protocol === "http:") return LOOPBACK_HOSTS.has(url.hostname);
  return false;
}

// Human-readable reason, for the 400 body — clients that fail registration
// otherwise have nothing to go on.
export function redirectUriRejection(raw: string): string {
  return (
    `"${raw}" is not an acceptable redirect_uri. ` +
    "Must be https://, or http:// on a loopback host (localhost, 127.0.0.1, [::1]), " +
    "with no fragment and no userinfo."
  );
}

// Auth codes and access tokens are stored only as sha256 digests, so a read of
// the database (dump, log, backup, SQL injection) yields nothing replayable.
// The raw value exists only in the HTTP response body that issued it and in the
// client's own storage; every lookup re-hashes the incoming value and matches
// on the digest. A plain sha256 (no salt/stretching) is right here: these are
// 256-bit random tokens, not user-chosen passwords, so there is no dictionary
// to attack and the lookup must stay a single indexed point-read.
export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
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

// A consent ticket is what the /callback consent screen hands to the browser:
// the original authorize request, now bound to the Google-verified email that
// just proved itself. It exists so the *approval* is a separate, deliberate
// step from the *authentication* — the user sees who is asking and where the
// code will be sent before any code exists.
export interface ConsentTicket extends AuthorizeState {
  email: string;
  clientName: string | null;
}

// Both token kinds are HMACs over the same secret, so the `kind` string is
// mixed into the MAC as a domain separator. Without it a signed `state`
// (which the client fully controls and which never proves identity) would
// verify as a `consent` ticket, and the consent screen could be skipped by
// replaying it into the consent endpoint.
function signPayload(kind: string, payload: object): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", getSigningSecret())
    .update(`${kind}.${body}`)
    .digest("base64url");
  return `${body}.${sig}`;
}

function verifyPayload<T extends { exp: number }>(kind: string, token: string): T | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = createHmac("sha256", getSigningSecret())
    .update(`${kind}.${body}`)
    .digest("base64url");
  // Compare as fixed-length digests to keep this constant-time.
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function signState(payload: AuthorizeState): string {
  return signPayload("state", payload);
}

export function verifyState(token: string): AuthorizeState | null {
  return verifyPayload<AuthorizeState>("state", token);
}

export function signConsent(payload: ConsentTicket): string {
  return signPayload("consent", payload);
}

export function verifyConsent(token: string): ConsentTicket | null {
  return verifyPayload<ConsentTicket>("consent", token);
}

// PKCE — we only accept S256 (plain is rejected by the OAuth 2.1 spec).
export function verifyPkce(verifier: string, challenge: string, method: string): boolean {
  if (method !== "S256") return false;
  const hash = createHash("sha256").update(verifier).digest("base64url");
  return hash === challenge;
}
