// /api/timeline/projects — ADMIN-only listing/creation.
// Mirrors /api/whatsapp/workspaces.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOnly } from "@/lib/timeline-auth";

// Same shape rule as whatsapp slugs: lowercase letters / digits / dashes,
// 2-64 chars, can't start/end with a dash.
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$/;
const RESERVED_SLUGS = new Set(["timeline", "admin", "api"]);

export async function GET() {
  const guard = await requireAdminOnly();
  if (guard) return guard;

  const projects = await prisma.timelineProject.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { layers: true, access: true } },
    },
  });
  return NextResponse.json({ projects });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdminOnly();
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
  if (RESERVED_SLUGS.has(slug)) {
    return NextResponse.json({ error: "slug שמור" }, { status: 400 });
  }

  try {
    const project = await prisma.timelineProject.create({
      data: { slug, title, description },
      select: { id: true, slug: true, title: true },
    });
    return NextResponse.json({ project }, { status: 201 });
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "P2002"
    ) {
      return NextResponse.json({ error: "ה-slug כבר בשימוש" }, { status: 409 });
    }
    console.error("create timeline project failed:", err);
    return NextResponse.json({ error: "שגיאה ביצירה" }, { status: 500 });
  }
}
