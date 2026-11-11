import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_REUSE_GRACE_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  hashToken,
  randomToken,
  verifyPkce,
} from "@/lib/mcp-oauth";

// RFC 6749 §4.1.3 / OAuth 2.1 — exchange the authorization code for an
// access token. We require PKCE; no client secret (public clients only).
// RFC 6749 §6 — exchange a refresh token for a new access token. Refresh
// tokens are rotated on every use (OAuth 2.1 §4.3.1 for public clients).

export const dynamic = "force-dynamic";

function jsonError(error: string, description?: string, status = 400) {
  // Log every error path so we can debug from Render application logs.
  // OAuth clients (e.g. Claude) only show "credentials rejected" without
  // surfacing the spec error; the only place to see why is here.
  console.error(`[mcp/token] ${status} ${error}: ${description ?? ""}`);
  return NextResponse.json(
    { error, error_description: description },
    { status, headers: { "Cache-Control": "no-store", Pragma: "no-cache" } },
  );
}

// Parse the request body across the three encodings OAuth clients use:
//   1. application/x-www-form-urlencoded (the spec default)
//   2. application/json (some MCP clients)
//   3. multipart/form-data (rare but possible via formData())
// Some Next.js runtimes choke on formData() for url-encoded bodies, so we
// also support a raw-text fallback that parses URLSearchParams directly.
async function parseBody(req: NextRequest): Promise<Record<string, string>> {
  const ct = (req.headers.get("content-type") ?? "").toLowerCase();
  if (ct.includes("application/json")) {
    return (await req.json()) as Record<string, string>;
  }
  // For url-encoded bodies, read raw text and parse with URLSearchParams.
  // This is the most reliable path and avoids Next.js's quirks.
  if (ct.includes("application/x-www-form-urlencoded") || ct === "") {
    const raw = await req.text();
    const params = new URLSearchParams(raw);
    const out: Record<string, string> = {};
    params.forEach((v, k) => {
      out[k] = v;
    });
    return out;
  }
  if (ct.includes("multipart/form-data")) {
    const form = await req.formData();
    const out: Record<string, string> = {};
    form.forEach((v, k) => {
      if (typeof v === "string") out[k] = v;
    });
    return out;
  }
  // Last resort: try formData, fall back to text.
  try {
    const form = await req.formData();
    const out: Record<string, string> = {};
    form.forEach((v, k) => {
      if (typeof v === "string") out[k] = v;
    });
    return out;
  } catch {
    const raw = await req.text();
    return Object.fromEntries(new URLSearchParams(raw));
  }
}

// Per RFC 6749 §2.3.1, confidential clients MAY authenticate via HTTP Basic
// where the userid is the client_id. Some MCP clients send it this way even
// for public clients, so we accept it as an alternate source.
function clientIdFromBasic(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (!auth || !auth.toLowerCase().startsWith("basic ")) return null;
  try {
    const decoded = Buffer.from(auth.slice(6).trim(), "base64").toString("utf8");
    const [user] = decoded.split(":");
    return user || null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  let body: Record<string, string>;
  try {
    body = await parseBody(req);
  } catch (err) {
    console.error("[mcp/token] body parse failed:", err);
    return jsonError("invalid_request", "could not parse body");
  }

  // Trace what we received — keys + lengths only, no secrets in plaintext.
  console.error(
    `[mcp/token] received ct=${req.headers.get("content-type") ?? "<none>"} ` +
      `keys=${Object.keys(body).join(",")} ` +
      `code_sha=${body.code ? hashToken(body.code).slice(0, 8) + "…" : "<none>"} ` +
      `client_id=${body.client_id ?? "<none>"} ` +
      `redirect_uri=${body.redirect_uri ?? "<none>"} ` +
      `grant=${body.grant_type ?? "<none>"} ` +
      `verifier_len=${body.code_verifier?.length ?? 0}`,
  );

  const grantType = body.grant_type;
  if (grantType === "refresh_token") return refreshGrant(req, body);

  const code = body.code;
  const codeVerifier = body.code_verifier;
  const clientId = body.client_id || clientIdFromBasic(req);
  const redirectUri = body.redirect_uri;

  if (grantType !== "authorization_code") {
    return jsonError("unsupported_grant_type", `got "${grantType}"`);
  }
  const missing: string[] = [];
  if (!code) missing.push("code");
  if (!codeVerifier) missing.push("code_verifier");
  if (!clientId) missing.push("client_id");
  if (!redirectUri) missing.push("redirect_uri");
  if (missing.length > 0) {
    return jsonError("invalid_request", `missing: ${missing.join(", ")}`);
  }

  const codeHash = hashToken(code);
  const record = await prisma.mcpOauthAuthCode.findUnique({
    where: { codeHash },
  });
  if (!record) return jsonError("invalid_grant", "code not found");
  if (record.used) return jsonError("invalid_grant", "code already used");
  if (record.expiresAt.getTime() < Date.now()) {
    return jsonError("invalid_grant", "code expired");
  }
  if (record.clientId !== clientId) {
    return jsonError(
      "invalid_client",
      `client_id mismatch: token-request="${clientId}" auth-request="${record.clientId}"`,
    );
  }
  if (record.redirectUri !== redirectUri) {
    return jsonError(
      "invalid_grant",
      `redirect_uri mismatch: token-request="${redirectUri}" auth-request="${record.redirectUri}"`,
    );
  }
  if (!verifyPkce(codeVerifier, record.codeChallenge, record.codeChallengeMethod)) {
    return jsonError(
      "invalid_grant",
      `PKCE failed: method=${record.codeChallengeMethod} verifier_len=${codeVerifier.length} challenge_len=${record.codeChallenge.length}`,
    );
  }

  // Re-check the invite — covers the rare case where the admin revoked
  // access between the user clicking "authorize" and the client redeeming
  // the code.
  const invite = await prisma.mcpInvite.findUnique({
    where: { email: record.email },
  });
  if (!invite) {
    return jsonError("access_denied", "invitation revoked", 403);
  }

  // Claim the code and mint the token together, and claim it only while it is
  // still unused. The `record.used` check above reads before this write, so two
  // concurrent redemptions of one code could both pass it and each get a token.
  const issued = await prisma.$transaction(async (tx) => {
    const { count } = await tx.mcpOauthAuthCode.updateMany({
      where: { codeHash, used: false },
      data: { used: true },
    });
    if (count !== 1) return null;
    return issueTokens(tx, clientId, record.email);
  });
  if (!issued) return jsonError("invalid_grant", "code already used");

  return tokenResponse(issued, "authorization_code", record.email, clientId);
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
interface Issued {
  access: string;
  refresh: string;
}

// Mint an access token + refresh token pair. Only the sha256 of each is stored.
async function issueTokens(tx: Tx, clientId: string, email: string): Promise<Issued> {
  const access = randomToken(32);
  const refresh = randomToken(32);
  const now = Date.now();
  await tx.mcpOauthAccessToken.create({
    data: {
      tokenHash: hashToken(access),
      clientId,
      email,
      expiresAt: new Date(now + ACCESS_TOKEN_TTL_SECONDS * 1000),
    },
  });
  await tx.mcpOauthRefreshToken.create({
    data: {
      tokenHash: hashToken(refresh),
      clientId,
      email,
      expiresAt: new Date(now + REFRESH_TOKEN_TTL_SECONDS * 1000),
    },
  });
  return { access, refresh };
}

function tokenResponse(issued: Issued, grant: string, email: string, clientId: string) {
  // Identify tokens in logs by hash prefix, never the token itself — the raw
  // values appear only in the response body below.
  console.error(
    `[mcp/token] success grant=${grant} email=${email} client=${clientId} ` +
      `token_sha=${hashToken(issued.access).slice(0, 8)}… refresh_sha=${hashToken(issued.refresh).slice(0, 8)}…`,
  );
  return NextResponse.json(
    {
      access_token: issued.access,
      token_type: "Bearer",
      expires_in: ACCESS_TOKEN_TTL_SECONDS,
      refresh_token: issued.refresh,
      scope: "mcp:foi-guide:read",
    },
    { headers: { "Cache-Control": "no-store", Pragma: "no-cache" } },
  );
}

async function refreshGrant(req: NextRequest, body: Record<string, string>) {
  const refreshToken = body.refresh_token;
  if (!refreshToken) return jsonError("invalid_request", "missing: refresh_token");
  const clientId = body.client_id || clientIdFromBasic(req);

  const tokenHash = hashToken(refreshToken);
  const record = await prisma.mcpOauthRefreshToken.findUnique({ where: { tokenHash } });
  if (!record) return jsonError("invalid_grant", "refresh token not found");
  if (record.expiresAt.getTime() < Date.now()) {
    return jsonError("invalid_grant", "refresh token expired");
  }
  // client_id is optional on a refresh request from a public client, but if
  // one is sent it must be the client the token was issued to.
  if (clientId && clientId !== record.clientId) {
    return jsonError("invalid_grant", "refresh token was issued to another client");
  }

  const invite = await prisma.mcpInvite.findUnique({ where: { email: record.email } });
  if (!invite) return jsonError("invalid_grant", "invitation revoked");

  const issued = await prisma.$transaction(async (tx) => {
    // Rotate: claim the token only while it is still unrotated, so two
    // concurrent refreshes can't both silently succeed past the grace window.
    const { count } = await tx.mcpOauthRefreshToken.updateMany({
      where: { tokenHash, rotatedAt: null },
      data: { rotatedAt: new Date() },
    });
    if (count !== 1) {
      const current = await tx.mcpOauthRefreshToken.findUnique({ where: { tokenHash } });
      const rotatedAt = current?.rotatedAt?.getTime();
      const withinGrace =
        rotatedAt !== undefined && Date.now() - rotatedAt <= REFRESH_REUSE_GRACE_SECONDS * 1000;
      if (!withinGrace) return null;
    }
    return issueTokens(tx, record.clientId, record.email);
  });
  if (!issued) return jsonError("invalid_grant", "refresh token already used");

  // Opportunistic cleanup of this user's dead rows, so the tables don't grow
  // by two rows a day per user forever.
  const now = new Date();
  await Promise.all([
    prisma.mcpOauthRefreshToken.deleteMany({ where: { email: record.email, expiresAt: { lt: now } } }),
    prisma.mcpOauthAccessToken.deleteMany({ where: { email: record.email, expiresAt: { lt: now } } }),
  ]).catch((err) => console.error("[mcp/token] cleanup failed:", err));

  return tokenResponse(issued, "refresh_token", record.email, record.clientId);
}

// Some MCP/OAuth clients send a CORS preflight before the token POST.
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
    },
  });
}
