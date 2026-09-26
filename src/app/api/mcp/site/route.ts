import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  CONTENT_TYPES,
  listContent,
  getContent,
  searchContent,
  listDocuments,
  getDocumentText,
  type ContentDocument,
} from "@/lib/site-content-mcp";

// MCP server for everything a visitor can read on z-g.co.il: articles,
// הפליליסט blog posts (with their attachments and case files), practice
// areas, projects, dictionary entries, media appearances and site pages —
// and the documents attached to them. Streamable HTTP, JSON responses, no SSE.
//
// The content is public, so unlike the invite-only FOI guide server there is
// no OAuth here: every method is open, with a per-IP rate limit. Usage is
// still logged to mcp_usage, under the email "public".
//
// Spec: https://modelcontextprotocol.io/docs/specs

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SUPPORTED_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];
const SERVER_NAME = "z-g-site";
const SERVER_VERSION = "1.0.0";
const USAGE_EMAIL = "public";

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

const rpcOk = (id: JsonRpcRequest["id"], result: unknown): JsonRpcResponse => ({
  jsonrpc: "2.0",
  id: id ?? null,
  result,
});

const rpcError = (id: JsonRpcRequest["id"], code: number, message: string): JsonRpcResponse => ({
  jsonrpc: "2.0",
  id: id ?? null,
  error: { code, message },
});

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Mcp-Session-Id, Mcp-Protocol-Version, Authorization",
};

/* ─── Tools ─── */

const TYPE_ENUM = Object.keys(CONTENT_TYPES);
const TYPE_HELP =
  "סוג התוכן: " +
  Object.entries(CONTENT_TYPES)
    .map(([k, v]) => `${k} (${v})`)
    .join(", ") +
  ".";

const READ_ONLY = { readOnlyHint: true, openWorldHint: false } as const;

const TOOLS = [
  {
    name: "site_list",
    description:
      "רשימת התכנים שפורסמו באתר של עו\"ד גיא זומר (z-g.co.il): מאמרים משפטיים, פוסטים בבלוג \"הפליליסט\", " +
      "תחומי עיסוק, מיזמים וכלים, ערכי מילון, הופעות בתקשורת ועמודי האתר. לכל פריט: id, כותרת, קישור, תקציר, " +
      "ומספר המסמכים המצורפים (פסקי דין, מכתבים, דוחות). סננו לפי type כדי לקבל סוג אחד.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", enum: TYPE_ENUM, description: TYPE_HELP + " לא חובה." },
        category: { type: "string", description: "סינון לפי קטגוריה או תגית. לא חובה." },
      },
    },
    annotations: READ_ONLY,
  },
  {
    name: "site_search",
    description:
      "חיפוש טקסט חופשי בכל תוכני האתר: כותרות, תקצירים, תגיות, גוף הטקסט ושמות המסמכים המצורפים. " +
      'תומך בביטוי מדויק במירכאות ("זכות עיון"). מחזיר פריטים מדורגים עם קטע רלוונטי ואת המסמכים המצורפים ששמם תואם.',
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "שאילתה בעברית." },
        type: { type: "string", enum: TYPE_ENUM, description: "הגבלה לסוג תוכן אחד. לא חובה." },
        limit: { type: "number", description: "מספר תוצאות מרבי (1-25, ברירת מחדל 10)." },
      },
      required: ["query"],
    },
    annotations: READ_ONLY,
  },
  {
    name: "site_get",
    description:
      "פריט תוכן מלא ב-Markdown — מאמר, פוסט, תחום עיסוק, מיזם, ערך מילון, הופעה בתקשורת או עמוד — " +
      "יחד עם **המסמכים המצורפים** אליו: לכל מסמך מזהה, כותרת, ציטוט ההליך (למשל ע\"א 8849/01), " +
      "הפרק שבו הוא מופיע, וקישור. בפוסט עם תיק מקרה מוחזרים גם המכתבים, הפסיקה והחקיקה של התיק. " +
      "כדי לקרוא מסמך, העבירו את המזהה שלו ל-document_get_text.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description:
            'מזהה הפריט מ-site_list / site_search ("article:court-file-inspection-rights"), slug, או הקישור המלא אליו.',
        },
        type: { type: "string", enum: TYPE_ENUM, description: "סוג התוכן, כשמעבירים slug בלבד. לא חובה." },
      },
      required: ["id"],
    },
    annotations: READ_ONLY,
  },
  {
    name: "site_documents",
    description:
      "רשימת המסמכים המצורפים לתוכני האתר: פסקי דין, החלטות, מכתבים ודוחות, שמתארחים באתר או מקושרים כ-PDF. " +
      "בלי id — כל המסמכים, ולכל מסמך באילו פריטים הוא מופיע. עם id — המסמכים של פריט אחד.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "מזהה פריט, slug או קישור. לא חובה." },
        type: { type: "string", enum: TYPE_ENUM, description: "סוג התוכן, כשמעבירים slug בלבד. לא חובה." },
      },
    },
    annotations: READ_ONLY,
  },
  {
    name: "document_get_text",
    description:
      "הטקסט המלא של מסמך PDF שמצורף לתוכן באתר (למשל פסק דין), מחולק לעמודים. " +
      "מסמכים ארוכים מוחזרים בחלקים: אם truncated=true, קראו שוב עם from_page=toPage+1. " +
      "מסמך סרוק ללא שכבת טקסט יסומן scanned=true, ואז יש להפנות את המשתמש לקישור. " +
      "צטטו מהמסמך רק את מה שמופיע בטקסט שהוחזר.",
    inputSchema: {
      type: "object",
      properties: {
        document: { type: "string", description: "מזהה המסמך (id) מ-site_get / site_documents, או הקישור אליו." },
        from_page: { type: "number", description: "עמוד התחלה (ברירת מחדל 1)." },
        max_chars: { type: "number", description: "אורך מרבי של הטקסט המוחזר (1,000-60,000, ברירת מחדל 30,000)." },
      },
      required: ["document"],
    },
    annotations: READ_ONLY,
  },
] as const;

const text = (t: string) => ({ type: "text" as const, text: t });

const result = (markdown: string, structured: unknown) => ({
  content: [text(markdown)],
  structuredContent: structured as Record<string, unknown>,
});

const errorResult = (message: string) => ({ content: [text(message)], isError: true });

async function logUsage(tool: string, query: string | null, resultCount: number) {
  try {
    await prisma.mcpUsage.create({ data: { email: USAGE_EMAIL, tool, query, resultCount } });
  } catch (err) {
    console.error("[mcp/site] usage log failed:", err);
  }
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

const docLine = (d: ContentDocument) =>
  `- **${d.title || d.id}**` +
  (d.citation ? ` — ${d.citation}` : "") +
  (d.section ? ` (בפרק "${d.section}")` : "") +
  `\n  id: \`${d.id}\` · ${d.url}` +
  (!d.hosted ? " · מקור חיצוני" : "") +
  (!d.available ? " · **הוסתר, אין גישה**" : "");

async function callTool(name: string, args: Record<string, unknown>) {
  switch (name) {
    case "site_list": {
      const items = await listContent(str(args.type), str(args.category));
      await logUsage(name, [str(args.type), str(args.category)].filter(Boolean).join(" ") || null, items.length);
      const md = [
        `# תוכן שפורסם באתר z-g.co.il (${items.length})`,
        "",
        ...items.map(
          (a) =>
            `- [${a.typeLabel}] **${a.title}** (id: \`${a.id}\`)` +
            (a.date ? ` · ${a.date.slice(0, 10)}` : "") +
            (a.documentCount ? ` · ${a.documentCount} מסמכים מצורפים` : "") +
            (a.excerpt ? `\n  ${a.excerpt.slice(0, 240)}` : "") +
            `\n  ${a.url}`,
        ),
      ].join("\n");
      return result(md, { items });
    }

    case "site_search": {
      const query = str(args.query);
      if (!query) return errorResult("Missing required field: query");
      const hits = await searchContent(query, {
        type: str(args.type),
        limit: typeof args.limit === "number" ? args.limit : 10,
      });
      await logUsage(name, query, hits.length);
      const md = [
        `# תוצאות חיפוש: "${query}" (${hits.length})`,
        ...(hits.length === 0 ? ["", "לא נמצאו תוצאות. נסו ניסוח אחר, או site_list לרשימה המלאה."] : []),
        ...hits.map(
          (h, i) =>
            `\n## ${i + 1}. [${h.typeLabel}] ${h.title}\nid: \`${h.id}\` · ${h.url}\n\n> ${h.snippet}` +
            (h.matchedDocuments.length
              ? `\n\nמסמכים מצורפים תואמים:\n${h.matchedDocuments.map((d) => `- ${d.title} (${d.url})`).join("\n")}`
              : ""),
        ),
      ].join("\n");
      return result(md, { query, results: hits });
    }

    case "site_get": {
      const id = str(args.id);
      if (!id) return errorResult("Missing required field: id");
      const item = await getContent(id, str(args.type));
      await logUsage(name, id, item ? 1 : 0);
      if (!item) return errorResult(`לא נמצא תוכן שפורסם בשם "${id}". השתמשו ב-site_list או site_search.`);
      const md = [
        `# ${item.title}`,
        [item.typeLabel, item.category, item.date?.slice(0, 10)].filter(Boolean).join(" · "),
        item.url,
        "",
        item.markdown,
        ...(item.documents.length || item.type === "article" || item.type === "blog"
          ? [
              "",
              `## מסמכים מצורפים (${item.documents.length})`,
              item.documents.length ? item.documents.map(docLine).join("\n") : "אין מסמכים מצורפים.",
            ]
          : []),
        ...(item.links.length
          ? ["", `## קישורים (${item.links.length})`, ...item.links.map((l) => `- ${l.title}: ${l.url}`)]
          : []),
      ].join("\n");
      return result(md, item);
    }

    case "site_documents": {
      const id = str(args.id);
      const documents = await listDocuments(id, str(args.type));
      await logUsage(name, id ?? null, documents.length);
      const md = [
        `# מסמכים מצורפים${id ? ` ל-${id}` : " לתוכני האתר"} (${documents.length})`,
        "",
        ...documents.map(
          (d) => docLine(d) + `\n  מופיע ב: ${d.appearsIn.map((a) => a.title).join("; ")}`,
        ),
      ].join("\n");
      return result(md, { documents });
    }

    case "document_get_text": {
      const ref = str(args.document);
      if (!ref) return errorResult("Missing required field: document");
      const res = await getDocumentText(ref, {
        fromPage: typeof args.from_page === "number" ? args.from_page : undefined,
        maxChars: typeof args.max_chars === "number" ? args.max_chars : undefined,
      });
      await logUsage(name, ref, res.ok ? res.toPage - res.fromPage + 1 : 0);
      if (!res.ok) return errorResult(res.error);
      const d = res.document;
      const header = [
        `# ${d.title || d.id}`,
        d.citation ? `ציטוט: ${d.citation}` : null,
        `מקור: ${d.url}`,
        `מצורף ל: ${d.appearsIn.map((a) => `${a.title} (${a.url})`).join("; ")}`,
        `עמודים ${res.fromPage}-${res.toPage} מתוך ${res.totalPages}` +
          (res.truncated ? ` · להמשך: from_page=${res.toPage + 1}` : ""),
      ].filter(Boolean);
      const body = res.scanned
        ? "\n**המסמך סרוק ואין בו שכבת טקסט.** אי אפשר לקרוא אותו כאן; הפנו את המשתמש לקישור."
        : `\n${res.text}`;
      return result(header.join("\n") + "\n" + body, {
        document: d,
        totalPages: res.totalPages,
        fromPage: res.fromPage,
        toPage: res.toPage,
        truncated: res.truncated,
        scanned: res.scanned,
        text: res.scanned ? "" : res.text,
      });
    }

    default:
      return null;
  }
}

/* ─── JSON-RPC dispatch ─── */

async function handleRpc(req: JsonRpcRequest): Promise<JsonRpcResponse | null> {
  switch (req.method) {
    case "initialize": {
      const asked = (req.params as { protocolVersion?: string } | undefined)?.protocolVersion;
      return rpcOk(req.id, {
        protocolVersion: asked && SUPPORTED_VERSIONS.includes(asked) ? asked : SUPPORTED_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION, title: "האתר של עו\"ד גיא זומר" },
        instructions:
          "גישה לכל התכנים שפורסמו באתר של עו\"ד גיא זומר (z-g.co.il): מאמרים משפטיים, הבלוג \"הפליליסט\" " +
          "(כולל תיקי מקרה עם מכתבים ופסיקה), תחומי עיסוק, מיזמים וכלים, מילון מונחים, הופעות בתקשורת ועמודי האתר — " +
          "ולמסמכים המצורפים אליהם." +
          "\n\n## סדר עבודה" +
          "\n1. site_search (או site_list עם type) כדי למצוא את הפריט הרלוונטי." +
          "\n2. site_get לקריאת הפריט המלא ולרשימת המסמכים המצורפים אליו." +
          "\n3. document_get_text כדי לקרוא פסק דין או מסמך מצורף במלואו, כשהשאלה דורשת את לשונו." +
          "\n\n## כללים" +
          "\n• ציטוט ממסמך — רק מטקסט שהוחזר מ-document_get_text, עם שם ההליך והקישור." +
          "\n• ציינו תמיד את הקישור (url) של הפריט שעליו התשובה נשענת." +
          "\n• התכנים הם מידע כללי ואינם ייעוץ משפטי; ציינו זאת כשהמשתמש שואל על עניינו האישי.",
      });
    }
    case "notifications/initialized":
    case "notifications/cancelled":
      return null;
    case "ping":
      return rpcOk(req.id, {});
    case "tools/list":
      return rpcOk(req.id, { tools: TOOLS });
    case "tools/call": {
      const params = (req.params ?? {}) as { name?: string; arguments?: unknown };
      try {
        const res = await callTool(String(params.name ?? ""), (params.arguments ?? {}) as Record<string, unknown>);
        if (!res) return rpcError(req.id, -32602, `Unknown tool: ${params.name}`);
        return rpcOk(req.id, res);
      } catch (err) {
        console.error(`[mcp/site] tools/call ${params.name} failed:`, err);
        return rpcError(req.id, -32000, err instanceof Error ? err.message : "internal error");
      }
    }
    default:
      return rpcError(req.id, -32601, `Method not found: ${req.method}`);
  }
}

export async function POST(req: NextRequest) {
  const { rateLimit, getClientIp } = await import("@/lib/rate-limit");
  const limited = rateLimit(`mcp-site:${getClientIp(req)}`, { limit: 120, windowMs: 60_000 });
  if (limited) return limited;

  let body: JsonRpcRequest | JsonRpcRequest[];
  try {
    body = (await req.json()) as JsonRpcRequest | JsonRpcRequest[];
  } catch {
    return NextResponse.json(rpcError(null, -32700, "Parse error"), { status: 400, headers: CORS });
  }
  const requests = Array.isArray(body) ? body : [body];
  const responses: JsonRpcResponse[] = [];
  for (const r of requests) {
    if (!r || r.jsonrpc !== "2.0" || typeof r.method !== "string") {
      responses.push(rpcError(null, -32600, "Invalid Request"));
      continue;
    }
    const res = await handleRpc(r);
    if (res) responses.push(res);
  }
  if (responses.length === 0) return new NextResponse(null, { status: 202, headers: CORS });
  return NextResponse.json(Array.isArray(body) ? responses : responses[0], { headers: CORS });
}

export async function GET() {
  return new NextResponse(
    "MCP server: content of z-g.co.il. POST JSON-RPC requests here (Streamable HTTP, no SSE).",
    { status: 405, headers: { Allow: "POST, OPTIONS", ...CORS } },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
