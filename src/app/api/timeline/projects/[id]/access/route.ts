// /api/timeline/projects/[id]/access — ADMIN-only.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOnly } from "@/lib/timeline-auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminOnly();
  if (guard) return guard;

  const { id } = await ctx.params;
  let body: { email?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON לא תקין" }, { status: 400 });
  }
  const raw = typeof body.email === "string" ? body.email.trim() : "";
  if (!EMAIL_RE.test(raw)) {
    return NextResponse.json({ error: "כתובת דוא״ל לא תקינה" }, { status: 400 });
  }
  const email = raw.toLowerCase();

  const proj = await prisma.timelineProject.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!proj) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });

  try {
    const row = await prisma.timelineProjectAccess.create({
      data: { projectId: id, email },
      select: { id: true, email: true, createdAt: true },
    });
    return NextResponse.json({ access: row }, { status: 201 });
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "P2002"
    ) {
      return NextResponse.json({ error: "כבר ברשימה" }, { status: 409 });
    }
    console.error("add timeline access failed:", err);
    return NextResponse.json({ error: "שגיאה" }, { status: 500 });
  }
}
