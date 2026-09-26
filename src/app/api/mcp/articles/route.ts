import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  listArticles,
  getArticle,
  searchArticles,
  listDocuments,
  getDocumentText,
} from "@/lib/articles-mcp";

// MCP server for the legal articles on z-g.co.il/articles (Streamable HTTP
// transport, JSON responses, no SSE). The articles are public, so unlike the
// invite-only FOI guide server there is no OAuth here: every method is open,
// with a per-IP rate limit. Usage is still logged to mcp_usage, under the
// email "public".
//
// Spec: https://modelcontextprotocol.io/docs/specs

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SUPPORTED_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];
const SERVER_NAME = "z-g-articles";
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

const TOOLS = [
  {
    name: "articles_list",
    description:
      "רשימת כל המאמרים המשפטיים שפורסמו באתר של עו\"ד גיא זומר (z-g.co.il/articles): " +
      "כותרת, slug, תקציר, קטגוריה, תגיות, תאריך, ומספר המסמכים (פסקי דין, החלטות) המצורפים לכל מאמר. " +
      "התחילו כאן כדי לדעת אילו מאמרים קיימים.",
    inputSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description: 'סינון לפי קטגוריה או תגית, למשל "הליכים משפטיים" או "נפגעי עבירה". לא חובה.',
        },
      },
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "articles_search",
    description:
      "חיפוש טקסט חופשי במאמרים המשפטיים: בכותרת, בתקציר, בתגיות, בגוף המאמר ובשמות המסמכים המצורפים. " +
      'תומך בביטוי מדויק במירכאות ("זכות עיון"). מחזיר מאמרים מדורגים עם קטע רלוונטי, ' +
      "ואת המסמכים המצורפים ששמם תואם לחיפוש.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "שאילתה בעברית." },
        limit: { type: "number", description: "מספר תוצאות מרבי (1-25, ברירת מחדל 10)." },
      },
      required: ["query"],
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "article_get",
    description:
      "המאמר המלא ב-Markdown, יחד עם רשימת **המסמכים המצורפים** אליו (פסקי דין והחלטות שהמאמר מקשר אליהם): " +
      "לכל מסמך — מזהה, כותרת, ציטוט ההליך (למשל ע\"א 8849/01), הפרק במאמר שבו הוא מופיע, וקישור. " +
      "כדי לקרוא מסמך, העבירו את המזהה שלו ל-document_get_text.",
    inputSchema: {
      type: "object",
      properties: {
        slug: {
          type: "string",
          description: "ה-slug של המאמר (מ-articles_list) או הקישור המלא אליו.",
        },
      },
      required: ["slug"],
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "article_documents",
    description:
      "רשימת המסמכים המצורפים למאמרים: פסקי דין, החלטות ומסמכים אחרים שמתארחים באתר או מקושרים כ-PDF. " +
      "בלי slug — כל המסמכים בכל המאמרים, ולכל מסמך באילו מאמרים הוא מופיע. עם slug — המסמכים של מאמר אחד.",
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "slug של מאמר. לא חובה." },
      },
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "document_get_text",
    description:
      "הטקסט המלא של מסמך PDF שמצורף למאמר (למשל פסק דין), מחולק לעמודים. " +
      "מסמכים ארוכים מוחזרים בחלקים: אם truncated=true, קראו שוב עם from_page=toPage+1. " +
      "מסמך סרוק ללא שכבת טקסט יסומן scanned=true, ואז יש להפנות את המשתמש לקישור. " +
      "צטטו מהמסמך רק את מה שמופיע בטקסט שהוחזר.",
    inputSchema: {
      type: "object",
      properties: {
        document: {
          type: "string",
          description: "מזהה המסמך (id) מ-article_get / article_documents, או הקישור אליו.",
        },
        from_page: { type: "number", description: "עמוד התחלה (ברירת מחדל 1)." },
        max_chars: { type: "number", description: "אורך מרבי של הטקסט המוחזר (1,000-60,000, ברירת מחדל 30,000)." },
      },
      required: ["document"],
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
] as const;

const text = (t: string) => ({ type: "text" as const, text: t });

function result(markdown: string, structured: unknown) {
  return {
    content: [text(markdown)],
    structuredContent: structured as Record<string, unknown>,
  };
}

const errorResult = (message: string) => ({ content: [text(message)], isError: true });

async function logUsage(tool: string, query: string | null, resultCount: number) {
  try {
    await prisma.mcpUsage.create({ data: { email: USAGE_EMAIL, tool, query, resultCount } });
  } catch (err) {
    console.error("[mcp/articles] usage log failed:", err);
  }
}

const docLine = (d: {
  id: string;
  title: string;
  citation: string | null;
  section: string | null;
  url: string;
  hosted: boolean;
  available: boolean;
}) =>
  `- **${d.title || d.id}**` +
  (d.citation ? ` — ${d.citation}` : "") +
  (d.section ? ` (בפרק "${d.section}")` : "") +
  `\n  id: \`${d.id}\` · ${d.url}` +
  (!d.hosted ? " · מקור חיצוני" : "") +
  (!d.available ? " · **הוסתר, אין גישה**" : "");

async function callTool(name: string, args: Record<string, unknown>) {
  switch (name) {
    case "articles_list": {
      const category = typeof args.category === "string" ? args.category : undefined;
      const articles = await listArticles(category);
      await logUsage(name, category ?? null, articles.length);
      const md = [
        `# מאמרים משפטיים באתר z-g.co.il (${articles.length})`,
        "",
        ...articles.map(
          (a) =>
            `- **${a.title}** (slug: \`${a.slug}\`)` +
            (a.category ? ` · ${a.category}` : "") +
            (a.publishedAt ? ` · ${a.publishedAt.slice(0, 10)}` : "") +
            (a.documentCount ? ` · ${a.documentCount} מסמכים מצורפים` : "") +
            (a.excerpt ? `\n  ${a.excerpt}` : "") +
            `\n  ${a.url}`,
        ),
      ].join("\n");
      return result(md, { articles });
    }

    case "articles_search": {
      const query = typeof args.query === "string" ? args.query.trim() : "";
      if (!query) return errorResult("Missing required field: query");
      const limit = typeof args.limit === "number" ? args.limit : 10;
      const hits = await searchArticles(query, limit);
      await logUsage(name, query, hits.length);
      const md = [
        `# תוצאות חיפוש: "${query}" (${hits.length})`,
        ...(hits.length === 0 ? ["", "לא נמצאו מאמרים. נסו ניסוח אחר, או articles_list לרשימה המלאה."] : []),
        ...hits.map(
          (h, i) =>
            `\n## ${i + 1}. ${h.title}\nslug: \`${h.slug}\` · ${h.url}\n\n> ${h.snippet}` +
            (h.matchedDocuments.length
              ? `\n\nמסמכים מצורפים תואמים:\n${h.matchedDocuments.map((d) => `- ${d.title} (${d.url})`).join("\n")}`
              : ""),
        ),
      ].join("\n");
      return result(md, { query, results: hits });
    }

    case "article_get": {
      const slug = typeof args.slug === "string" ? args.slug : "";
      if (!slug.trim()) return errorResult("Missing required field: slug");
      const article = await getArticle(slug);
      await logUsage(name, slug, article ? 1 : 0);
      if (!article) return errorResult(`לא נמצא מאמר שפורסם בשם "${slug}". השתמשו ב-articles_list.`);
      const md = [
        `# ${article.title}`,
        [article.author, article.category, article.publishedAt?.slice(0, 10)].filter(Boolean).join(" · "),
        article.url,
        "",
        article.markdown,
        "",
        `## מסמכים מצורפים (${article.documents.length})`,
        article.documents.length ? article.documents.map(docLine).join("\n") : "אין מסמכים מצורפים.",
        ...(article.links.length
          ? ["", `## קישורים נוספים במאמר (${article.links.length})`, ...article.links.map((l) => `- ${l.title}: ${l.url}`)]
          : []),
      ].join("\n");
      return result(md, article);
    }

    case "article_documents": {
      const slug = typeof args.slug === "string" && args.slug.trim() ? args.slug.trim() : undefined;
      const documents = await listDocuments(slug);
      await logUsage(name, slug ?? null, documents.length);
      const md = [
        `# מסמכים מצורפים${slug ? ` למאמר ${slug}` : " למאמרים"} (${documents.length})`,
        "",
        ...documents.map(
          (d) => docLine(d) + `\n  מופיע ב: ${d.articles.map((a) => a.title).join("; ")}`,
        ),
      ].join("\n");
      return result(md, { documents });
    }

    case "document_get_text": {
      const ref = typeof args.document === "string" ? args.document : "";
      if (!ref.trim()) return errorResult("Missing required field: document");
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
        `מצורף למאמר: ${d.articles.map((a) => `${a.title} (${a.url})`).join("; ")}`,
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
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION, title: "מאמרים משפטיים — עו\"ד גיא זומר" },
        instructions:
          "גישה למאמרים המשפטיים שפורסמו באתר של עו\"ד גיא זומר (z-g.co.il/articles), " +
          "ולמסמכים המצורפים אליהם — פסקי הדין וההחלטות שעליהם המאמרים מבוססים." +
          "\n\n## סדר עבודה" +
          "\n1. articles_search או articles_list כדי למצוא את המאמר הרלוונטי." +
          "\n2. article_get לקריאת המאמר המלא ולרשימת המסמכים המצורפים אליו." +
          "\n3. document_get_text כדי לקרוא פסק דין מצורף במלואו, כשהשאלה דורשת את לשון ההחלטה." +
          "\n\n## כללים" +
          "\n• ציטוט מפסק דין — רק מטקסט שהוחזר מ-document_get_text, עם שם ההליך והקישור." +
          "\n• ציינו תמיד את קישור המאמר (url) שעליו התשובה נשענת." +
          "\n• המאמרים הם מידע כללי ואינם ייעוץ משפטי; ציינו זאת כשהמשתמש שואל על עניינו האישי.",
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
        console.error(`[mcp/articles] tools/call ${params.name} failed:`, err);
        return rpcError(req.id, -32000, err instanceof Error ? err.message : "internal error");
      }
    }
    default:
      return rpcError(req.id, -32601, `Method not found: ${req.method}`);
  }
}

export async function POST(req: NextRequest) {
  const { rateLimit, getClientIp } = await import("@/lib/rate-limit");
  const limited = rateLimit(`mcp-articles:${getClientIp(req)}`, { limit: 120, windowMs: 60_000 });
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
    "MCP server: legal articles of z-g.co.il. POST JSON-RPC requests here (Streamable HTTP, no SSE).",
    { status: 405, headers: { Allow: "POST, OPTIONS", ...CORS } },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
