// /api/whatsapp/messages/[id]/tags/[tagId] — ADMIN: detach a tag from a message.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionAccess } from "@/lib/whatsapp-auth";

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; tagId: string }> },
) {
  const access = await getSessionAccess();
  if (!access.isAdmin) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 401 });
  }
  const { id: messageId, tagId } = await ctx.params;
  try {
    await prisma.whatsappMessageTag.delete({
      where: { messageId_tagId: { messageId, tagId } },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const code =
      typeof err === "object" && err !== null && "code" in err
        ? (err as { code?: string }).code
        : null;
    if (code === "P2025") {
      // Not attached — idempotent success.
      return NextResponse.json({ ok: true });
    }
    console.error("detach whatsapp tag failed:", err);
    return NextResponse.json({ error: "שגיאה" }, { status: 500 });
  }
}
