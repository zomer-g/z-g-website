// /api/timeline/projects/[id]/layers/[layerId] — ADMIN PATCH/DELETE.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOnly } from "@/lib/timeline-auth";

async function assertLayerInProject(layerId: string, projectId: string) {
  const layer = await prisma.timelineLayer.findUnique({
    where: { id: layerId },
    select: { projectId: true },
  });
  return layer && layer.projectId === projectId;
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; layerId: string }> },
) {
  const guard = await requireAdminOnly();
  if (guard) return guard;

  const { id, layerId } = await ctx.params;
  if (!(await assertLayerInProject(layerId, id))) {
    return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  }

  let body: { title?: unknown; description?: unknown; selfActor?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON לא תקין" }, { status: 400 });
  }
  const data: {
    title?: string;
    description?: string | null;
    selfActor?: string | null;
  } = {};
  if (typeof body.title === "string") {
    const t = body.title.trim();
    if (!t) {
      return NextResponse.json({ error: "כותרת לא יכולה להיות ריקה" }, { status: 400 });
    }
    data.title = t;
  }
  if ("description" in body) {
    data.description =
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim()
        : null;
  }
  if ("selfActor" in body) {
    const v = body.selfActor;
    if (v === null || (typeof v === "string" && v.trim() === "")) {
      data.selfActor = null;
    } else if (typeof v === "string") {
      data.selfActor = v;
    } else {
      return NextResponse.json({ error: "selfActor לא תקין" }, { status: 400 });
    }
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "אין שדות לעדכון" }, { status: 400 });
  }

  const layer = await prisma.timelineLayer.update({
    where: { id: layerId },
    data,
    select: { id: true, title: true, description: true, selfActor: true },
  });
  return NextResponse.json({ layer });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; layerId: string }> },
) {
  const guard = await requireAdminOnly();
  if (guard) return guard;

  const { id, layerId } = await ctx.params;
  if (!(await assertLayerInProject(layerId, id))) {
    return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  }
  await prisma.timelineLayer.delete({ where: { id: layerId } });
  return NextResponse.json({ ok: true });
}
