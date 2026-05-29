import { NextResponse } from "next/server";
import { siteOrigin, MCP_RESOURCE_PATH } from "@/lib/mcp-oauth";

// RFC 9728 — Protected Resource Metadata.
// MCP clients fetch this from the root of the host (not under /api) to learn
// which authorization server protects the MCP endpoint.

export const dynamic = "force-static";

export function GET() {
  const origin = siteOrigin();
  return NextResponse.json({
    resource: `${origin}${MCP_RESOURCE_PATH}`,
    authorization_servers: [origin],
    bearer_methods_supported: ["header"],
    scopes_supported: ["mcp:foi-guide:read"],
    resource_documentation: "https://z-g.co.il/foi-guide",
  });
}
