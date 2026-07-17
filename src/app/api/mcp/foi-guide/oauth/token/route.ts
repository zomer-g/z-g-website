import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  hashToken,
  randomToken,
  verifyPkce,
} from "@/lib/mcp-oauth";

// RFC 6749 §4.1.3 / OAuth 2.1 — exchange the authorization code for an
// access token. We require PKCE; no client secret (public clients only).

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

  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000);

  await prisma.$transaction([
    prisma.mcpOauthAuthCode.update({
      where: { codeHash },
      data: { used: true },
    }),
    prisma.mcpOauthAccessToken.create({
      data: {
        tokenHash: hashToken(token),
        clientId,
        email: record.email,
        expiresAt,
      },
    }),
  ]);

  // Identify the token in logs by its hash prefix, never the token itself —
  // the raw value appears only in the response body below.
  console.error(
    `[mcp/token] success email=${record.email} client=${clientId} token_sha=${hashToken(token).slice(0, 8)}…`,
  );

  return NextResponse.json(
    {
      access_token: token,
      token_type: "Bearer",
      expires_in: ACCESS_TOKEN_TTL_SECONDS,
      scope: "mcp:foi-guide:read",
    },
    { headers: { "Cache-Control": "no-store", Pragma: "no-cache" } },
  );
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
