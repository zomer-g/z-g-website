// /api/whatsapp/workspaces/[id]/chats/[chatId]
//
// PATCH  — admin: rename contactName (the chat's display name shown
//          in the sidebar). The parsed contactName from the ZIP filename
//          is a best-guess starting point; admins almost always want to
//          replace it with the real person's name.
// DELETE — admin: cascade-deletes messages and media via the
//          onDelete: Cascade FK on WhatsappChat.

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

// Single ownership check used by both PATCH and DELETE. Without this a
// crafted URL like /workspaces/<otherId>/chats/<thisChatId> would hit
// the chat row even though it lives under a different workspace.
async function assertChatBelongsToWorkspace(chatId: string, workspaceId: string) {
  const chat = await prisma.whatsappChat.findUnique({
    where: { id: chatId },
    select: { workspaceId: true },
  });
  return chat && chat.workspaceId === workspaceId;
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; chatId: string }> },
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id, chatId } = await ctx.params;
  if (!(await assertChatBelongsToWorkspace(chatId, id))) {
    return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  }

  let body: { contactName?: unknown; selfSender?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON לא תקין" }, { status: 400 });
  }

  // Build the update payload from whichever fields the caller provided.
  // Both contactName and selfSender are independently optional — the
  // admin UI uses two separate calls.
  const data: { contactName?: string; selfSender?: string | null } = {};
  if ("contactName" in body) {
    const name = typeof body.contactName === "string" ? body.contactName.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "שם נדרש" }, { status: 400 });
    }
    if (name.length > 120) {
      return NextResponse.json(
        { error: "שם ארוך מדי (עד 120 תווים)" },
        { status: 400 },
      );
    }
    data.contactName = name;
  }
  if ("selfSender" in body) {
    // Empty string / null → unset (no message is treated as outgoing).
    // Anything else: store as-is (we'll compare against the raw sender
    // strings on the messages, not against any cleaned/lowercased form).
    const v = body.selfSender;
    if (v === null || (typeof v === "string" && v.trim() === "")) {
      data.selfSender = null;
    } else if (typeof v === "string") {
      data.selfSender = v;
    } else {
      return NextResponse.json({ error: "selfSender לא תקין" }, { status: 400 });
    }
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "אין שדות לעדכון" }, { status: 400 });
  }

  const chat = await prisma.whatsappChat.update({
    where: { id: chatId },
    data,
    select: { id: true, contactName: true, selfSender: true },
  });
  return NextResponse.json({ chat });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; chatId: string }> },
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id, chatId } = await ctx.params;
  if (!(await assertChatBelongsToWorkspace(chatId, id))) {
    return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  }
  await prisma.whatsappChat.delete({ where: { id: chatId } });
  return NextResponse.json({ ok: true });
}
