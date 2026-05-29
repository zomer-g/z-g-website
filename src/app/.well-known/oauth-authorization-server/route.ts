import { NextResponse } from "next/server";
import { siteOrigin, MCP_OAUTH_BASE_PATH } from "@/lib/mcp-oauth";

// RFC 8414 — Authorization Server Metadata.
// MCP clients use this to discover the authorize/token/registration endpoints.

export const dynamic = "force-static";

export function GET() {
  const origin = siteOrigin();
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
