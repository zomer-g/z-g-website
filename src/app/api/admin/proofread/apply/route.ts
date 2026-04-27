import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  parseSource,
  getValueAtPath,
  setValueAtPath,
} from "@/lib/proofread/source";

export const dynamic = "force-dynamic";

interface ApplyBody {
  source: string;
  original: string;
  suggestion: string;
}

interface FieldUpdate {
  field: "title" | "excerpt" | "description" | "source" | "seoTitle" | "seoDesc" | "draftContent" | "content";
  value: unknown;
}

// Walk the parsed path and replace the leaf, but only if the current value
// at the leaf matches `original` exactly. This keeps us safe against stale
// data: if the admin already edited the field after the proofread ran, we
// refuse to overwrite their change.
function applyToValue(
  root: unknown,
  path: string[],
  original: string,
  suggestion: string,
): { ok: true; root: unknown } | { ok: false; reason: string } {
  if (path.length === 0) {
    if (typeof root === "string" && root === original) {
      return { ok: true, root: suggestion };
    }
    return { ok: false, reason: "value mismatch" };
  }

  // Need a mutable copy of the root tree.
  const cloned = JSON.parse(JSON.stringify(root)) as unknown;
  const current = getValueAtPath(cloned, path);
  if (typeof current !== "string") {
    return { ok: false, reason: "leaf is not a string" };
  }
  if (current !== original) {
    return { ok: false, reason: "value mismatch (stale)" };
  }
  if (!setValueAtPath(cloned, path, suggestion)) {
    return { ok: false, reason: "failed to write at path" };
  }
  return { ok: true, root: cloned };
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "נדרשת הזדהות" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as ApplyBody | null;
  if (!body || !body.source || typeof body.suggestion !== "string" || typeof body.original !== "string") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const parsed = parseSource(body.source);
  if (!parsed) {
    return NextResponse.json({ error: "Source unparseable" }, { status: 400 });
  }

  if (parsed.type === "defaults") {
    return NextResponse.json(
      {
        error:
          "ברירות המחדל מוגדרות בקוד (src/lib/content-defaults.ts). תיקון אוטומטי לא אפשרי — יש לערוך את הקוד.",
      },
      { status: 400 },
    );
  }

  // ── Page ────────────────────────────────────────────────────────────────
  if (parsed.table === "Page") {
    const page = await prisma.page.findUnique({ where: { slug: parsed.key } });
    if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });

    const head = parsed.path[0];
    const updates: Record<string, unknown> = {};

    if (head === "title" || head === "seoTitle" || head === "seoDesc") {
      const current = (page as Record<string, unknown>)[head];
      if (current !== body.original) {
        return NextResponse.json({ error: "ערך השדה השתנה מאז הסריקה" }, { status: 409 });
      }
      updates[head] = body.suggestion;
    } else if (head === "content" || head === "draftContent") {
      const root = (page as Record<string, unknown>)[head];
      const result = applyToValue(root, parsed.path.slice(1), body.original, body.suggestion);
      if (!result.ok) {
        return NextResponse.json(
          { error: `לא ניתן להחיל: ${result.reason}` },
          { status: 409 },
        );
      }
      updates[head] = result.root;
      // For Page rows the user's intent is "fix it now" — sync the public
      // content if we touched the draft, and vice versa, so the change is
      // immediately visible without a separate publish step.
      const otherKey = head === "content" ? "draftContent" : "content";
      const otherRoot = (page as Record<string, unknown>)[otherKey];
      if (otherRoot != null) {
        const otherResult = applyToValue(otherRoot, parsed.path.slice(1), body.original, body.suggestion);
        if (otherResult.ok) updates[otherKey] = otherResult.root;
      }
    } else {
      return NextResponse.json({ error: "Unknown Page field" }, { status: 400 });
    }

    await prisma.page.update({ where: { slug: parsed.key }, data: updates });
    return NextResponse.json({ ok: true });
  }

  // ── Post ────────────────────────────────────────────────────────────────
  if (parsed.table === "Post") {
    const post = await prisma.post.findUnique({ where: { slug: parsed.key } });
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    const head = parsed.path[0];
    const update: Partial<FieldUpdate>[] = [];
    if (head === "title" || head === "excerpt" || head === "seoTitle" || head === "seoDesc") {
      const current = (post as Record<string, unknown>)[head];
      if (current !== body.original) {
        return NextResponse.json({ error: "ערך השדה השתנה מאז הסריקה" }, { status: 409 });
      }
      update.push({ field: head, value: body.suggestion });
    } else if (head === "content") {
      const result = applyToValue(post.content, parsed.path.slice(1), body.original, body.suggestion);
      if (!result.ok) {
        return NextResponse.json({ error: `לא ניתן להחיל: ${result.reason}` }, { status: 409 });
      }
      update.push({ field: "content", value: result.root });
    } else {
      return NextResponse.json({ error: "Unknown Post field" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    for (const u of update) if (u.field) data[u.field] = u.value;
    await prisma.post.update({ where: { slug: parsed.key }, data });
    return NextResponse.json({ ok: true });
  }

  // ── Service ─────────────────────────────────────────────────────────────
  if (parsed.table === "Service") {
    const service = await prisma.service.findUnique({ where: { slug: parsed.key } });
    if (!service) return NextResponse.json({ error: "Service not found" }, { status: 404 });

    const head = parsed.path[0];
    const data: Record<string, unknown> = {};
    if (head === "title" || head === "description" || head === "seoTitle" || head === "seoDesc") {
      const current = (service as Record<string, unknown>)[head];
      if (current !== body.original) {
        return NextResponse.json({ error: "ערך השדה השתנה מאז הסריקה" }, { status: 409 });
      }
      data[head] = body.suggestion;
    } else if (head === "content") {
      const result = applyToValue(service.content, parsed.path.slice(1), body.original, body.suggestion);
      if (!result.ok) {
        return NextResponse.json({ error: `לא ניתן להחיל: ${result.reason}` }, { status: 409 });
      }
      data.content = result.root;
    } else {
      return NextResponse.json({ error: "Unknown Service field" }, { status: 400 });
    }

    await prisma.service.update({ where: { slug: parsed.key }, data });
    return NextResponse.json({ ok: true });
  }

  // ── MediaAppearance ─────────────────────────────────────────────────────
  if (parsed.table === "MediaAppearance") {
    const id = parsed.key;
    const item = await prisma.mediaAppearance.findUnique({ where: { id } });
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

    const head = parsed.path[0];
    if (head !== "title" && head !== "description" && head !== "source") {
      return NextResponse.json({ error: "Unknown MediaAppearance field" }, { status: 400 });
    }
    const current = (item as Record<string, unknown>)[head];
    if (current !== body.original) {
      return NextResponse.json({ error: "ערך השדה השתנה מאז הסריקה" }, { status: 409 });
    }
    await prisma.mediaAppearance.update({ where: { id }, data: { [head]: body.suggestion } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown table" }, { status: 400 });
}
