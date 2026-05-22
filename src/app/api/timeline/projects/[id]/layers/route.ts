// /api/timeline/projects/[id]/layers — ADMIN: create layer.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOnly } from "@/lib/timeline-auth";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminOnly();
  if (guard) return guard;

  const { id } = await ctx.params;
  let body: { title?: unknown; description?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON לא תקין" }, { status: 400 });
  }
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "כותרת שכבה נדרשת" }, { status: 400 });
  }
  if (title.length > 200) {
    return NextResponse.json({ error: "כותרת ארוכה מדי" }, { status: 400 });
  }
  const description =
    typeof body.description === "string" && body.description.trim()
      ? body.description.trim()
      : null;

  // Confirm parent project exists so we surface 404 instead of an FK
  // violation error if the admin pasted a bad id.
  const proj = await prisma.timelineProject.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!proj) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });

  const layer = await prisma.timelineLayer.create({
    data: { projectId: id, title, description },
    select: {
      id: true,
      title: true,
      description: true,
      selfActor: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ layer }, { status: 201 });
}
