// /api/timeline/projects/[id]/tags/[tagId] — admin PATCH/DELETE.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/timeline-auth";
import { validateTagPayload } from "@/lib/tags-helpers";

async function assertTagInProject(tagId: string, projectId: string) {
  const tag = await prisma.timelineTag.findUnique({
    where: { id: tagId },
    select: { projectId: true },
  });
  return tag && tag.projectId === projectId;
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; tagId: string }> },
) {
  const { id, tagId } = await ctx.params;
  const gate = await requireProjectAccess({ id }, { adminOnly: true });
  if ("response" in gate) return gate.response;
  if (!(await assertTagInProject(tagId, gate.project.id))) {
    return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON לא תקין" }, { status: 400 });
  }
  const parsed = validateTagPayload(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  try {
    const tag = await prisma.timelineTag.update({
      where: { id: tagId },
      data: { name: parsed.data.name, color: parsed.data.color ?? null },
      select: { id: true, name: true, color: true },
    });
    return NextResponse.json({ tag });
  } catch (err) {
    const code =
      typeof err === "object" && err !== null && "code" in err
        ? (err as { code?: string }).code
        : null;
    if (code === "P2002") {
      return NextResponse.json({ error: "השם כבר תפוס" }, { status: 409 });
    }
    console.error("PATCH timeline tag failed:", err);
    return NextResponse.json({ error: "שגיאה" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; tagId: string }> },
) {
  const { id, tagId } = await ctx.params;
  const gate = await requireProjectAccess({ id }, { adminOnly: true });
  if ("response" in gate) return gate.response;
  if (!(await assertTagInProject(tagId, gate.project.id))) {
    return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  }
  await prisma.timelineTag.delete({ where: { id: tagId } });
  return NextResponse.json({ ok: true });
}
