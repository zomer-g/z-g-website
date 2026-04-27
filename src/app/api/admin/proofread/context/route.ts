import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  parseSource,
  buildContext,
  getValueAtPath,
} from "@/lib/proofread/source";
import { CONTENT_DEFAULTS } from "@/lib/content-defaults";

export const dynamic = "force-dynamic";

interface ContextBody {
  source: string;
}

interface ContextResponse {
  before: string;
  after: string;
  editUrl: string | null;
  editLabel: string | null;
  applicable: boolean;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "נדרשת הזדהות" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as ContextBody | null;
  if (!body || !body.source) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const parsed = parseSource(body.source);
  if (!parsed) {
    return NextResponse.json({ error: "Source unparseable" }, { status: 400 });
  }

  if (parsed.type === "defaults") {
    const root = (CONTENT_DEFAULTS as Record<string, unknown>)[parsed.slug] ?? null;
    const context = root ? buildContext(root, parsed.path) : { before: "", after: "" };
    const out: ContextResponse = {
      ...context,
      editUrl: `/admin/site-editor/${parsed.slug}`,
      editLabel: "פתח בעורך האתר",
      applicable: false,
    };
    return NextResponse.json(out);
  }

  // ── DB sources ──────────────────────────────────────────────────────────
  if (parsed.table === "Page") {
    const page = await prisma.page.findUnique({
      where: { slug: parsed.key },
      select: { content: true, draftContent: true, title: true, seoTitle: true, seoDesc: true, slug: true },
    });
    if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });
    const head = parsed.path[0];
    let context = { before: "", after: "" };
    if (head === "content" || head === "draftContent") {
      const root = (page as Record<string, unknown>)[head];
      context = root ? buildContext(root, parsed.path.slice(1)) : context;
    }
    return NextResponse.json<ContextResponse>({
      ...context,
      editUrl: `/admin/site-editor/${page.slug}`,
      editLabel: "פתח בעורך האתר",
      applicable: true,
    });
  }

  if (parsed.table === "Post") {
    const post = await prisma.post.findUnique({
      where: { slug: parsed.key },
      select: { id: true, content: true },
    });
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    let context = { before: "", after: "" };
    if (parsed.path[0] === "content" && post.content) {
      context = buildContext(post.content, parsed.path.slice(1));
    }
    return NextResponse.json<ContextResponse>({
      ...context,
      editUrl: `/admin/posts/${post.id}`,
      editLabel: "פתח את המאמר",
      applicable: true,
    });
  }

  if (parsed.table === "Service") {
    const service = await prisma.service.findUnique({
      where: { slug: parsed.key },
      select: { id: true, content: true },
    });
    if (!service) return NextResponse.json({ error: "Service not found" }, { status: 404 });
    let context = { before: "", after: "" };
    if (parsed.path[0] === "content" && service.content) {
      context = buildContext(service.content, parsed.path.slice(1));
    }
    return NextResponse.json<ContextResponse>({
      ...context,
      editUrl: `/admin/services`,
      editLabel: "פתח רשימת תחומי עיסוק",
      applicable: true,
    });
  }

  if (parsed.table === "MediaAppearance") {
    return NextResponse.json<ContextResponse>({
      before: "",
      after: "",
      editUrl: `/admin/media-appearances`,
      editLabel: "פתח רשימת הופעות מדיה",
      applicable: true,
    });
  }

  // Suppress an unused-import warning when nothing is reached.
  void getValueAtPath;
  return NextResponse.json({ error: "Unknown table" }, { status: 400 });
}
