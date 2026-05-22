// /api/whatsapp/messages/[id]/tags
//   POST — admin: attach a tag to this message. Accepts either:
//          - { tagId: "<existing tag id>" } (use a tag already in the pool)
//          - { name: "<new or existing name>" } (upsert — create if missing)
//          - { name: ..., color: "#..." } when creating with a colour.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionAccess } from "@/lib/whatsapp-auth";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const access = await getSessionAccess();
  if (!access.isAdmin) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 401 });
  }

  const { id: messageId } = await ctx.params;

  // Resolve the message → chat → workspace so we know which tag pool
  // to use (and to surface 404 cleanly when the message id is wrong).
  const message = await prisma.whatsappMessage.findUnique({
    where: { id: messageId },
    select: { id: true, chat: { select: { workspaceId: true } } },
  });
  if (!message) {
    return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  }
  const workspaceId = message.chat.workspaceId;

  let body: { tagId?: unknown; name?: unknown; color?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON לא תקין" }, { status: 400 });
  }

  // Branch 1: tagId points at an existing tag — must belong to the
  // same workspace.
  let resolvedTagId: string | null = null;
  if (typeof body.tagId === "string" && body.tagId.trim()) {
    const tag = await prisma.whatsappTag.findUnique({
      where: { id: body.tagId },
      select: { id: true, workspaceId: true, name: true, color: true },
    });
    if (!tag || tag.workspaceId !== workspaceId) {
      return NextResponse.json({ error: "תגית לא נמצאה" }, { status: 404 });
    }
    resolvedTagId = tag.id;
  } else if (typeof body.name === "string" && body.name.trim()) {
    // Branch 2: name. Upsert (find by unique workspaceId+name; create
    // if missing). Lets the picker accept free-text + create in one shot.
    const name = body.name.trim();
    if (name.length > 60) {
      return NextResponse.json({ error: "שם ארוך מדי" }, { status: 400 });
    }
    const color =
      typeof body.color === "string" && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(body.color)
        ? body.color
        : null;
    const tag = await prisma.whatsappTag.upsert({
      where: { workspaceId_name: { workspaceId, name } },
      update: {},
      create: { workspaceId, name, color },
      select: { id: true, name: true, color: true },
    });
    resolvedTagId = tag.id;
  } else {
    return NextResponse.json(
      { error: "נדרש tagId או name" },
      { status: 400 },
    );
  }

  // Idempotent attach — composite PK on the join table means a duplicate
  // attach throws P2002, which we treat as success.
  try {
    await prisma.whatsappMessageTag.create({
      data: { messageId, tagId: resolvedTagId },
    });
  } catch (err) {
    const code =
      typeof err === "object" && err !== null && "code" in err
        ? (err as { code?: string }).code
        : null;
    if (code !== "P2002") {
      console.error("attach whatsapp tag failed:", err);
      return NextResponse.json({ error: "שגיאה" }, { status: 500 });
    }
  }

  const tag = await prisma.whatsappTag.findUnique({
    where: { id: resolvedTagId },
    select: { id: true, name: true, color: true },
  });
  return NextResponse.json({ tag }, { status: 201 });
}
