// /api/whatsapp/workspaces — ADMIN-only.
//
// GET   → list all workspaces (for the admin index).
// POST  → create a new workspace { slug, title, description? }.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$/;

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 401 });
  }
  return null;
}

export async function GET() {
  const guard = await requireAdmin();
  if (guard) return guard;

  const workspaces = await prisma.whatsappWorkspace.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { chats: true, access: true } },
    },
  });
  return NextResponse.json({ workspaces });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  let body: { slug?: unknown; title?: unknown; description?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON לא תקין" }, { status: 400 });
  }
  const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : null;
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json(
      { error: "slug לא תקין — אותיות לטיניות, ספרות ומקפים, 2–64 תווים" },
      { status: 400 },
    );
  }
  if (!title) {
    return NextResponse.json({ error: "כותרת נדרשת" }, { status: 400 });
  }

  // Reserved slug: the public landing lives at /whatsapp, so don't let
  // someone create a workspace literally named "whatsapp" (would not
  // collide as URL but is confusing).
  if (slug === "whatsapp" || slug === "admin" || slug === "api") {
    return NextResponse.json({ error: "slug שמור" }, { status: 400 });
  }

  try {
    const workspace = await prisma.whatsappWorkspace.create({
      data: { slug, title, description },
      select: { id: true, slug: true, title: true },
    });
    return NextResponse.json({ workspace }, { status: 201 });
  } catch (err) {
    // Most likely cause: slug already exists. Surface that as 409 so
    // the UI can show a useful inline error.
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "P2002"
    ) {
      return NextResponse.json({ error: "ה-slug כבר בשימוש" }, { status: 409 });
    }
    console.error("create workspace failed:", err);
    return NextResponse.json({ error: "שגיאה ביצירה" }, { status: 500 });
  }
}
