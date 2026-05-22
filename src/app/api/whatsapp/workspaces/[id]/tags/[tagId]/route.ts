// /api/whatsapp/workspaces/[id]/tags/[tagId] — ADMIN PATCH/DELETE.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceAccess } from "@/lib/whatsapp-auth";
import { validateTagPayload } from "@/lib/tags-helpers";

async function assertTagInWorkspace(tagId: string, workspaceId: string) {
  const tag = await prisma.whatsappTag.findUnique({
    where: { id: tagId },
    select: { workspaceId: true },
  });
  return tag && tag.workspaceId === workspaceId;
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; tagId: string }> },
) {
  const { id, tagId } = await ctx.params;
  const gate = await requireWorkspaceAccess({ id }, { adminOnly: true });
  if ("response" in gate) return gate.response;
  if (!(await assertTagInWorkspace(tagId, gate.workspace.id))) {
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
    const tag = await prisma.whatsappTag.update({
      where: { id: tagId },
      data: { name: parsed.data.name, color: parsed.data.color ?? null },
      select: { id: true, name: true, color: true },
    });
    return NextResponse.json({ tag });
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "P2002"
    ) {
      return NextResponse.json({ error: "השם כבר תפוס" }, { status: 409 });
    }
    console.error("PATCH whatsapp tag failed:", err);
    return NextResponse.json({ error: "שגיאה" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; tagId: string }> },
) {
  const { id, tagId } = await ctx.params;
  const gate = await requireWorkspaceAccess({ id }, { adminOnly: true });
  if ("response" in gate) return gate.response;
  if (!(await assertTagInWorkspace(tagId, gate.workspace.id))) {
    return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  }
  await prisma.whatsappTag.delete({ where: { id: tagId } });
  return NextResponse.json({ ok: true });
}
