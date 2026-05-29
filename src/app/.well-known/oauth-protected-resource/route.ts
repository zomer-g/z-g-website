import { NextRequest, NextResponse } from "next/server";
import { originFromRequest, MCP_RESOURCE_PATH } from "@/lib/mcp-oauth";

// RFC 9728 — Protected Resource Metadata.
// We derive the origin from the request so that clients that reached us at
// z-g.co.il and at www.z-g.co.il each get a self-consistent metadata
// document — otherwise the Bearer token gets stripped by a cross-host
// redirect (Cloudflare 30x z-g.co.il → www.z-g.co.il) on the very next
// authenticated request, and the MCP flow loops on 401s.

export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  const origin = originFromRequest(req);
  return NextResponse.json({
    resource: `${origin}${MCP_RESOURCE_PATH}`,
    authorization_servers: [origin],
    bearer_methods_supported: ["header"],
    scopes_supported: ["mcp:foi-guide:read"],
    resource_documentation: "https://z-g.co.il/foi-guide",
  });
}
