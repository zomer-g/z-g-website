import { NextRequest, NextResponse } from "next/server";
import { originFromRequest, MCP_OAUTH_BASE_PATH } from "@/lib/mcp-oauth";

// RFC 8414 — Authorization Server Metadata.
// See oauth-protected-resource/route.ts for why the origin must be derived
// from the request (host) rather than from env vars.

export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  const origin = originFromRequest(req);
  return NextResponse.json({
    issuer: origin,
    authorization_endpoint: `${origin}${MCP_OAUTH_BASE_PATH}/authorize`,
    token_endpoint: `${origin}${MCP_OAUTH_BASE_PATH}/token`,
    registration_endpoint: `${origin}${MCP_OAUTH_BASE_PATH}/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: ["mcp:foi-guide:read"],
  });
}
