import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  randomToken,
  verifyPkce,
} from "@/lib/mcp-oauth";

// RFC 6749 §4.1.3 / OAuth 2.1 — exchange the authorization code for an
// access token. We require PKCE; no client secret (public clients only).

export const dynamic = "force-dynamic";

function jsonError(error: string, description?: string, status = 400) {
  return NextResponse.json(
    { error, error_description: description },
    { status },
  );
}

export async function POST(req: NextRequest) {
  // Spec allows form-encoded OR JSON; supporting both makes client integration
  // easier — MCP Inspector sends form-encoded, some clients send JSON.
  const contentType = req.headers.get("content-type") ?? "";
  let body: Record<string, string> = {};
  try {
    if (contentType.includes("application/json")) {
      body = (await req.json()) as Record<string, string>;
    } else {
      const form = await req.formData();
      form.forEach((v, k) => {
        if (typeof v === "string") body[k] = v;
      });
    }
  } catch {
    return jsonError("invalid_request", "could not parse body");
  }

  const grantType = body.grant_type;
  const code = body.code;
  const codeVerifier = body.code_verifier;
  const clientId = body.client_id;
  const redirectUri = body.redirect_uri;

  if (grantType !== "authorization_code") {
    return jsonError("unsupported_grant_type");
  }
  if (!code || !codeVerifier || !clientId || !redirectUri) {
    return jsonError("invalid_request", "missing required fields");
  }

  const record = await prisma.mcpOauthAuthCode.findUnique({
    where: { code },
  });
  if (!record) return jsonError("invalid_grant", "code not found");
  if (record.used) return jsonError("invalid_grant", "code already used");
  if (record.expiresAt.getTime() < Date.now()) {
    return jsonError("invalid_grant", "code expired");
  }
  if (record.clientId !== clientId) {
    return jsonError("invalid_client", "client_id mismatch");
  }
  if (record.redirectUri !== redirectUri) {
    return jsonError("invalid_grant", "redirect_uri mismatch");
  }
  if (!verifyPkce(codeVerifier, record.codeChallenge, record.codeChallengeMethod)) {
    return jsonError("invalid_grant", "PKCE verification failed");
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
      where: { code },
      data: { used: true },
    }),
    prisma.mcpOauthAccessToken.create({
      data: {
        token,
        clientId,
        email: record.email,
        expiresAt,
      },
    }),
  ]);

  return NextResponse.json({
    access_token: token,
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
    scope: "mcp:foi-guide:read",
  });
}
