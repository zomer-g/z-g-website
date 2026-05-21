// /api/whatsapp/workspaces/[id]
//
// GET    → workspace details (admin or allowlisted user)
// PATCH  → edit title/description (admin only)
// DELETE → cascade-delete (admin only; nukes chats + media + access)

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceAccess } from "@/lib/whatsapp-auth";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 401 });
  }
  return null;
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const gate = await requireWorkspaceAccess({ id });
  if ("response" in gate) return gate.response;

  const full = await prisma.whatsappWorkspace.findUnique({
    where: { id: gate.workspace.id },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      access: gate.access.isAdmin
        ? {
            select: { id: true, email: true, createdAt: true },
            orderBy: { createdAt: "asc" },
          }
        : false,
      chats: {
        select: {
          id: true,
          contactName: true,
          selfSender: true,
          zipFilename: true,
          messageCount: true,
          firstAt: true,
          lastAt: true,
          uploadedAt: true,
        },
        orderBy: { uploadedAt: "desc" },
      },
    },
  });

  // Admin-only enrichment: for each chat, the distinct non-system senders
  // + their message counts, so the admin UI can offer a "who's me?"
  // dropdown without a second roundtrip. Guests don't need this and the
  // groupBy is cheap because chatId+order is already indexed.
  let chatsWithSenders = full?.chats ?? [];
  if (full && gate.access.isAdmin) {
    const grouped = await prisma.whatsappMessage.groupBy({
      by: ["chatId", "sender"],
      where: {
        chatId: { in: full.chats.map((c) => c.id) },
        isSystem: false,
        NOT: { sender: "" },
      },
      _count: { _all: true },
    });
    const sendersByChat = new Map<string, { sender: string; count: number }[]>();
    for (const g of grouped) {
      const arr = sendersByChat.get(g.chatId) ?? [];
      arr.push({ sender: g.sender, count: g._count._all });
      sendersByChat.set(g.chatId, arr);
    }
    chatsWithSenders = full.chats.map((c) => ({
      ...c,
      senders: (sendersByChat.get(c.id) ?? []).sort((a, b) => b.count - a.count),
    }));
  }

  return NextResponse.json({
    workspace: full ? { ...full, chats: chatsWithSenders } : null,
  });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id } = await ctx.params;
  let body: { title?: unknown; description?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON לא תקין" }, { status: 400 });
  }
  const data: { title?: string; description?: string | null } = {};
  if (typeof body.title === "string") data.title = body.title.trim();
  if (typeof body.description === "string" || body.description === null) {
    data.description =
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim()
        : null;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "אין שדות לעדכון" }, { status: 400 });
  }
  try {
    const workspace = await prisma.whatsappWorkspace.update({
      where: { id },
      data,
      select: { id: true, slug: true, title: true, description: true },
    });
    return NextResponse.json({ workspace });
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "P2025"
    ) {
      return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
    }
    console.error("patch workspace failed:", err);
    return NextResponse.json({ error: "שגיאה" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id } = await ctx.params;
  try {
    await prisma.whatsappWorkspace.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "P2025"
    ) {
      return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
    }
    console.error("delete workspace failed:", err);
    return NextResponse.json({ error: "שגיאה" }, { status: 500 });
  }
}
