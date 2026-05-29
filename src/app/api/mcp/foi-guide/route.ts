import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { siteOrigin } from "@/lib/mcp-oauth";
import { searchFoiGuide } from "@/lib/foi-guide-search";

// MCP server (Streamable HTTP transport). Implements the minimum JSON-RPC
// surface needed for the FOI Guide:
//   - initialize
//   - tools/list
//   - tools/call (foi_guide_search)
//
// Spec: https://modelcontextprotocol.io/docs/specs

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PROTOCOL_VERSION = "2024-11-05";
const SERVER_NAME = "foi-guide";
const SERVER_VERSION = "0.1.0";

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: unknown;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

function rpcOk(id: JsonRpcRequest["id"], result: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id: id ?? null, result };
}

function rpcError(
  id: JsonRpcRequest["id"],
  code: number,
  message: string,
  data?: unknown,
): JsonRpcResponse {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message, data } };
}

function challenge401() {
  return new NextResponse(
    JSON.stringify({ error: "unauthorized" }),
    {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        // Per RFC 9728 — point the client at the protected-resource metadata
        // so it can discover the authorization server and start the flow.
        "WWW-Authenticate": `Bearer realm="MCP", resource_metadata="${siteOrigin()}/.well-known/oauth-protected-resource"`,
      },
    },
  );
}

async function authenticate(req: NextRequest): Promise<{ email: string } | null> {
  const header = req.headers.get("authorization");
  if (!header) {
    console.error("[mcp/foi-guide] auth: no Authorization header");
    return null;
  }
  if (!header.toLowerCase().startsWith("bearer ")) {
    console.error(
      `[mcp/foi-guide] auth: non-Bearer scheme (got "${header.slice(0, 20)}…")`,
    );
    return null;
  }
  const token = header.slice(7).trim();
  if (!token) {
    console.error("[mcp/foi-guide] auth: empty token after Bearer");
    return null;
  }

  const record = await prisma.mcpOauthAccessToken.findUnique({
    where: { token },
  });
  if (!record) {
    console.error(
      `[mcp/foi-guide] auth: token not found in DB (prefix=${token.slice(0, 8)}…)`,
    );
    return null;
  }
  if (record.expiresAt.getTime() < Date.now()) {
    console.error(
      `[mcp/foi-guide] auth: token expired at ${record.expiresAt.toISOString()}`,
    );
    return null;
  }

  // Confirm the invite is still live — admin revocation should take effect
  // on the next call without us having to chase active tokens.
  const invite = await prisma.mcpInvite.findUnique({
    where: { email: record.email },
  });
  if (!invite) {
    console.error(
      `[mcp/foi-guide] auth: invite revoked for email=${record.email}`,
    );
    return null;
  }

  return { email: record.email };
}

// ─── Tool definitions ───

const TOOLS = [
  {
    name: "foi_guide_search",
    description:
      "חיפוש סמנטי + טקסטואלי במדריך חופש המידע (foiguide.org.il). " +
      "מחזיר עד top_k התאמות; לכל התאמה מצורף קישור לפרק המקור ורשימת פסקי דין רלוונטיים מהערות השוליים.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "שאילתה בעברית. תומך בביטויים מצוטטים (\"...\") ו-AND/OR.",
        },
        top_k: {
          type: "number",
          description: "מספר התוצאות המרבי (1-25, ברירת מחדל 8).",
        },
      },
      required: ["query"],
    },
  },
] as const;

interface FoiGuideSearchArgs {
  query?: string;
  top_k?: number;
}

async function callFoiGuideSearch(args: FoiGuideSearchArgs, email: string) {
  const query = typeof args.query === "string" ? args.query.trim() : "";
  if (!query) {
    return {
      content: [{ type: "text" as const, text: "Missing required field: query" }],
      isError: true,
    };
  }
  const topK = typeof args.top_k === "number" ? args.top_k : undefined;

  const response = await searchFoiGuide(query, { topK });

  await prisma.mcpUsage.create({
    data: {
      email,
      tool: "foi_guide_search",
      query,
      resultCount: response.resultCount,
    },
  });

  // Build a human-readable Markdown rendering for clients that surface text
  // (most chat UIs do). The structured JSON is also returned so tool-using
  // agents can parse case-law links programmatically.
  const md = renderResultsMarkdown(response);

  return {
    content: [
      { type: "text" as const, text: md },
      {
        type: "text" as const,
        text: JSON.stringify(response, null, 2),
      },
    ],
    structuredContent: response,
  };
}

function renderResultsMarkdown(
  r: Awaited<ReturnType<typeof searchFoiGuide>>,
): string {
  const lines: string[] = [];
  lines.push(`# תוצאות חיפוש: "${r.query}"`);
  lines.push(`*${r.disclaimer}*`);
  if (r.resultCount === 0) {
    lines.push("\nלא נמצאו תוצאות.");
    return lines.join("\n");
  }
  r.results.forEach((res, idx) => {
    lines.push(`\n## ${idx + 1}. ${res.chapter}`);
    lines.push(`קישור לפרק: ${res.chapterUrl}`);
    if (res.matchedSection === "case-law") {
      lines.push(`*(התאמה בתת-סקשן "דוגמאות שהוכרעו בבתי-המשפט")*`);
    }
    lines.push("");
    lines.push(`> ${res.snippet.replace(/\n+/g, " ")}`);
    if (res.caseLaw.length > 0) {
      lines.push("");
      lines.push("**פסיקה רלוונטית (מהערות השוליים בפרק):**");
      for (const c of res.caseLaw.slice(0, 12)) {
        const link = c.links[0];
        lines.push(
          link
            ? `- [[${c.footnoteId}]] ${c.text} — ${link}`
            : `- [[${c.footnoteId}]] ${c.text}`,
        );
      }
      if (res.caseLaw.length > 12) {
        lines.push(`- (ועוד ${res.caseLaw.length - 12} פסקי דין נוספים בפרק)`);
      }
    }
  });
  return lines.join("\n");
}

// ─── JSON-RPC dispatch ───

async function handleRpc(
  req: JsonRpcRequest,
  email: string,
): Promise<JsonRpcResponse | null> {
  switch (req.method) {
    case "initialize":
      return rpcOk(req.id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
        instructions:
          "כלי חיפוש במדריך חופש המידע של ישראל. מחזיר קישור לפרק במדריך " +
          "ופסיקה רלוונטית לכל תוצאה. אנא הזכר את המקור (foiguide.org.il) " +
          "בתשובות למשתמש.",
      });

    case "notifications/initialized":
    case "notifications/cancelled":
      // Notifications have no `id` and no response.
      return null;

    case "ping":
      return rpcOk(req.id, {});

    case "tools/list":
      return rpcOk(req.id, { tools: TOOLS });

    case "tools/call": {
      const params = (req.params ?? {}) as { name?: string; arguments?: unknown };
      if (params.name !== "foi_guide_search") {
        return rpcError(req.id, -32602, `Unknown tool: ${params.name}`);
      }
      try {
        const result = await callFoiGuideSearch(
          (params.arguments ?? {}) as FoiGuideSearchArgs,
          email,
        );
        return rpcOk(req.id, result);
      } catch (err) {
        console.error("tools/call foi_guide_search failed:", err);
        return rpcError(
          req.id,
          -32000,
          err instanceof Error ? err.message : "internal error",
        );
      }
    }

    default:
      return rpcError(req.id, -32601, `Method not found: ${req.method}`);
  }
}

export async function POST(req: NextRequest) {
  const ua = req.headers.get("user-agent") ?? "<none>";
  const authHeader = req.headers.get("authorization");
  console.error(
    `[mcp/foi-guide] POST ua="${ua.slice(0, 40)}" ` +
      `has-auth=${authHeader ? "yes" : "no"} ` +
      `ct=${req.headers.get("content-type") ?? "<none>"}`,
  );

  const auth = await authenticate(req);
  if (!auth) return challenge401();

  let body: JsonRpcRequest | JsonRpcRequest[];
  try {
    body = (await req.json()) as JsonRpcRequest | JsonRpcRequest[];
  } catch {
    return NextResponse.json(
      rpcError(null, -32700, "Parse error"),
      { status: 400 },
    );
  }
  console.error(
    `[mcp/foi-guide] dispatched email=${auth.email} batch=${Array.isArray(body)} ` +
      `method=${Array.isArray(body) ? body.map((b) => b.method).join("|") : body.method}`,
  );

  const isBatch = Array.isArray(body);
  const requests: JsonRpcRequest[] = isBatch
    ? (body as JsonRpcRequest[])
    : [body as JsonRpcRequest];

  const responses: JsonRpcResponse[] = [];
  for (const r of requests) {
    if (!r || r.jsonrpc !== "2.0" || typeof r.method !== "string") {
      responses.push(rpcError(null, -32600, "Invalid Request"));
      continue;
    }
    const res = await handleRpc(r, auth.email);
    if (res) responses.push(res);
  }

  // If every request was a notification, return 202 with no body.
  if (responses.length === 0) {
    return new NextResponse(null, { status: 202 });
  }

  return NextResponse.json(isBatch ? responses : responses[0]);
}

export async function GET() {
  // The MCP Streamable HTTP transport allows GET for SSE streaming. We don't
  // push server-initiated messages, so just inform the client.
  return new NextResponse(
    "MCP FOI Guide — POST JSON-RPC requests here. SSE not implemented.",
    { status: 405, headers: { Allow: "POST" } },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type, Mcp-Session-Id",
      "Access-Control-Expose-Headers": "WWW-Authenticate",
    },
  });
}
