import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readJsonBody } from "@/lib/request-body";
import {
  isAllowedRedirectUri,
  randomToken,
  redirectUriRejection,
} from "@/lib/mcp-oauth";

// RFC 7591 — Dynamic Client Registration.
// MCP requires it for browser-driven clients (Claude.ai, ChatGPT) that
// don't have pre-registered credentials. We issue a public client (no
// secret); PKCE is mandatory for the auth-code grant so this is safe.

export const dynamic = "force-dynamic";

interface RegisterRequest {
  client_name?: string;
  redirect_uris?: string[];
  token_endpoint_auth_method?: string;
  grant_types?: string[];
  response_types?: string[];
}

// Registration is open to anyone, so it is bounded: a client needs a handful
// of redirect URIs at most, and a real MCP client registers once per user.
const MAX_REDIRECT_URIS = 5;
const MAX_URI_LENGTH = 500;
const MAX_CLIENT_NAME = 100;

export async function POST(req: NextRequest) {
  const { rateLimit, getClientIp } = await import("@/lib/rate-limit");
  const limited = rateLimit(`mcp-register:${getClientIp(req)}`, { limit: 10, windowMs: 60 * 60_000 });
  if (limited) return limited;

  const parsed = await readJsonBody<RegisterRequest>(req, 16 * 1024);
  if (!parsed.ok || !parsed.data || typeof parsed.data !== "object") {
    return NextResponse.json({ error: "invalid_client_metadata" }, { status: 400 });
  }
  const body = parsed.data;

  const redirectUris = Array.isArray(body.redirect_uris)
    ? body.redirect_uris.filter((u): u is string => typeof u === "string")
    : [];
  if (redirectUris.length > MAX_REDIRECT_URIS || redirectUris.some((u) => u.length > MAX_URI_LENGTH)) {
    return NextResponse.json(
      {
        error: "invalid_redirect_uri",
        error_description: `at most ${MAX_REDIRECT_URIS} redirect_uris of up to ${MAX_URI_LENGTH} characters`,
      },
      { status: 400 },
    );
  }
  const clientName =
    typeof body.client_name === "string" ? body.client_name.trim().slice(0, MAX_CLIENT_NAME) || null : null;
  if (redirectUris.length === 0) {
    return NextResponse.json(
      { error: "invalid_redirect_uri", error_description: "redirect_uris is required" },
      { status: 400 },
    );
  }
  // Registration is open to anyone, so this is the only point where we get to
  // constrain where auth codes may be delivered. Reject the whole request
  // rather than silently dropping bad entries — a client that got back fewer
  // redirect_uris than it sent would fail later at /authorize with a much more
  // confusing error.
  const bad = redirectUris.find((u) => !isAllowedRedirectUri(u));
  if (bad !== undefined) {
    return NextResponse.json(
      { error: "invalid_redirect_uri", error_description: redirectUriRejection(bad) },
      { status: 400 },
    );
  }

  const clientId = `mcp_${randomToken(12)}`;
  const created = await prisma.mcpOauthClient.create({
    data: {
      clientId,
      clientName,
      redirectUris,
    },
  });

  return NextResponse.json(
    {
      client_id: created.clientId,
      client_name: created.clientName ?? undefined,
      redirect_uris: created.redirectUris,
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      // Public clients — no client_secret returned.
    },
    { status: 201 },
  );
}
