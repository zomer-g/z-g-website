// /api/whatsapp/workspaces/[id]/search?q=...&tag=...&tag=...
//
// Cross-chat search inside a single workspace. Returns matching
// messages from ALL chats the caller can see, each item tagged with
// its source chat id+name so the client can render in merged-mode.
//
// Filter semantics: q AND tag (AND across the two filters); ANY tag
// match within the tag list (OR-within-tags). Empty filters → empty
// response (the caller is expected to short-circuit).

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceAccess } from "@/lib/whatsapp-auth";

const MAX_LIMIT = 1000;

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const gate = await requireWorkspaceAccess({ id });
  if ("response" in gate) return gate.response;

  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").trim();
  const tagIds = sp.getAll("tag").filter(Boolean);
  if (!q && tagIds.length === 0) {
    return NextResponse.json({ items: [], total: 0 });
  }

  const limit = Math.min(MAX_LIMIT, Number(sp.get("limit")) || 500);

  // Build the WHERE — same hidden-row policy as the regular GET.
  const baseWhere = {
    chat: { workspaceId: gate.workspace.id },
    ...(gate.access.isAdmin ? {} : { isHidden: false }),
  };
  const andClauses: object[] = [baseWhere];
  if (q) {
    andClauses.push({
      OR: [
        { text: { contains: q, mode: "insensitive" as const } },
        { sender: { contains: q, mode: "insensitive" as const } },
      ],
    });
  }
  if (tagIds.length > 0) {
    andClauses.push({ tags: { some: { tagId: { in: tagIds } } } });
  }

  const messages = await prisma.whatsappMessage.findMany({
    where: { AND: andClauses },
    orderBy: { timestamp: "asc" },
    take: limit,
    select: {
      id: true,
      timestamp: true,
      sender: true,
      isSystem: true,
      isHidden: true,
      isStarred: true,
      text: true,
      media: {
        select: { id: true, filename: true, mimeType: true, size: true },
      },
      chat: { select: { id: true, contactName: true, selfSender: true } },
      tags: { select: { tag: { select: { id: true, name: true, color: true } } } },
    },
  });

  return NextResponse.json(
    {
      total: messages.length,
      isAdmin: gate.access.isAdmin,
      items: messages.map((m) => ({
        id: m.id,
        timestamp: m.timestamp.toISOString(),
        sender: m.sender,
        actor: m.sender,
        isSystem: m.isSystem,
        isHidden: gate.access.isAdmin ? m.isHidden : false,
        isStarred: gate.access.isAdmin ? m.isStarred : false,
        text: m.text,
        media: m.media,
        sourceChannelId: m.chat.id,
        sourceContact: m.chat.contactName,
        sourceSelfSender: m.chat.selfSender,
        tags: m.tags.map((t) => t.tag),
      })),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
