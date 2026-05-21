// /api/whatsapp/workspaces/[id]/chats/[chatId]
//
// DELETE — admin-only. Cascade-deletes messages and media via the
// onDelete: Cascade FK on WhatsappChat.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 401 });
  }
  return null;
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; chatId: string }> },
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id, chatId } = await ctx.params;

  // Defensive — confirm the chat actually belongs to the workspace.
  // Without this, a malicious admin (or a script bug) could craft a
  // URL that nukes a chat from another workspace.
  const chat = await prisma.whatsappChat.findUnique({
    where: { id: chatId },
    select: { workspaceId: true },
  });
  if (!chat || chat.workspaceId !== id) {
    return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  }

  await prisma.whatsappChat.delete({ where: { id: chatId } });
  return NextResponse.json({ ok: true });
}
