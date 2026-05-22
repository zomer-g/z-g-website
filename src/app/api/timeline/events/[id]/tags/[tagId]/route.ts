// /api/timeline/events/[id]/tags/[tagId] — admin detach.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionAccess } from "@/lib/timeline-auth";

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; tagId: string }> },
) {
  const access = await getSessionAccess();
  if (!access.isAdmin) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 401 });
  }
  const { id: eventId, tagId } = await ctx.params;
  try {
    await prisma.timelineEventTag.delete({
      where: { eventId_tagId: { eventId, tagId } },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const code =
      typeof err === "object" && err !== null && "code" in err
        ? (err as { code?: string }).code
        : null;
    if (code === "P2025") return NextResponse.json({ ok: true });
    console.error("detach timeline tag failed:", err);
    return NextResponse.json({ error: "שגיאה" }, { status: 500 });
  }
}
