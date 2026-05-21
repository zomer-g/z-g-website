// /api/whatsapp/chats/[chatId]/messages
//
// Read-side endpoint used by the workspace shell. Returns the chat's
// messages paginated by `skip`/`limit`, with media METADATA only — no
// bytes. The bytes are served per-message by /api/whatsapp/media/[id]
// which performs its own access check.
//
// Gated by requireChatAccess: anonymous → 401, logged-in-but-no-access
// → 404 (no enumeration leak).

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireChatAccess } from "@/lib/whatsapp-auth";

const DEFAULT_LIMIT = 1000;
const MAX_LIMIT = 5000;

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ chatId: string }> },
) {
  const { chatId } = await ctx.params;
  const gate = await requireChatAccess(chatId);
  if ("response" in gate) return gate.response;

  const sp = req.nextUrl.searchParams;
  const skipRaw = Number(sp.get("skip"));
  const limitRaw = Number(sp.get("limit"));
  const skip = Number.isFinite(skipRaw) && skipRaw > 0 ? Math.floor(skipRaw) : 0;
  const limit =
    Number.isFinite(limitRaw) && limitRaw > 0
      ? Math.min(Math.floor(limitRaw), MAX_LIMIT)
      : DEFAULT_LIMIT;

  const [total, messages] = await Promise.all([
    prisma.whatsappMessage.count({ where: { chatId } }),
    prisma.whatsappMessage.findMany({
      where: { chatId },
      orderBy: { order: "asc" },
      skip,
      take: limit,
      select: {
        id: true,
        timestamp: true,
        sender: true,
        isSystem: true,
        text: true,
        media: {
          select: {
            id: true,
            filename: true,
            mimeType: true,
            size: true,
          },
        },
      },
    }),
  ]);

  return NextResponse.json(
    {
      total,
      skip,
      limit,
      items: messages.map((m) => ({
        id: m.id,
        timestamp: m.timestamp.toISOString(),
        sender: m.sender,
        isSystem: m.isSystem,
        text: m.text,
        media: m.media,
      })),
    },
    {
      // Per-user content — every byte that flows through here is keyed
      // to the session. Make sure nothing along the way caches it.
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}
