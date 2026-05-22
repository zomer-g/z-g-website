// /api/timeline/events/[id]/tags — attach a tag to an event (admin).
// Twin of /api/whatsapp/messages/[id]/tags.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionAccess } from "@/lib/timeline-auth";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const access = await getSessionAccess();
  if (!access.isAdmin) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 401 });
  }

  const { id: eventId } = await ctx.params;
  const event = await prisma.timelineEvent.findUnique({
    where: { id: eventId },
    select: { id: true, layer: { select: { projectId: true } } },
  });
  if (!event) {
    return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  }
  const projectId = event.layer.projectId;

  let body: { tagId?: unknown; name?: unknown; color?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON לא תקין" }, { status: 400 });
  }

  let resolvedTagId: string | null = null;
  if (typeof body.tagId === "string" && body.tagId.trim()) {
    const tag = await prisma.timelineTag.findUnique({
      where: { id: body.tagId },
      select: { id: true, projectId: true },
    });
    if (!tag || tag.projectId !== projectId) {
      return NextResponse.json({ error: "תגית לא נמצאה" }, { status: 404 });
    }
    resolvedTagId = tag.id;
  } else if (typeof body.name === "string" && body.name.trim()) {
    const name = body.name.trim();
    if (name.length > 60) {
      return NextResponse.json({ error: "שם ארוך מדי" }, { status: 400 });
    }
    const color =
      typeof body.color === "string" && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(body.color)
        ? body.color
        : null;
    const tag = await prisma.timelineTag.upsert({
      where: { projectId_name: { projectId, name } },
      update: {},
      create: { projectId, name, color },
      select: { id: true },
    });
    resolvedTagId = tag.id;
  } else {
    return NextResponse.json({ error: "נדרש tagId או name" }, { status: 400 });
  }

  try {
    await prisma.timelineEventTag.create({
      data: { eventId, tagId: resolvedTagId },
    });
  } catch (err) {
    const code =
      typeof err === "object" && err !== null && "code" in err
        ? (err as { code?: string }).code
        : null;
    if (code !== "P2002") {
      console.error("attach timeline tag failed:", err);
      return NextResponse.json({ error: "שגיאה" }, { status: 500 });
    }
  }

  const tag = await prisma.timelineTag.findUnique({
    where: { id: resolvedTagId },
    select: { id: true, name: true, color: true },
  });
  return NextResponse.json({ tag }, { status: 201 });
}
