// /api/timeline/projects/[id]/access/[email] — ADMIN-only delete.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOnly } from "@/lib/timeline-auth";

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; email: string }> },
) {
  const guard = await requireAdminOnly();
  if (guard) return guard;

  const { id, email: encoded } = await ctx.params;
  const email = decodeURIComponent(encoded).toLowerCase();

  try {
    await prisma.timelineProjectAccess.delete({
      where: { projectId_email: { projectId: id, email } },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "P2025"
    ) {
      return NextResponse.json({ error: "לא נמצא ברשימה" }, { status: 404 });
    }
    console.error("remove timeline access failed:", err);
    return NextResponse.json({ error: "שגיאה" }, { status: 500 });
  }
}
