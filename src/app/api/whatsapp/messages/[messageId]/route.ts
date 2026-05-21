// /api/whatsapp/messages/[messageId]
//
// PATCH — admin-only — toggle a message's isHidden flag.
//
// We do a single round trip: resolve the message + its workspace via
// the relation, ensure the caller is ADMIN, then update. (Guests don't
// need this endpoint and never reach the UI that calls it.)

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

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ messageId: string }> },
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { messageId } = await ctx.params;
  let body: { isHidden?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON לא תקין" }, { status: 400 });
  }
  if (typeof body.isHidden !== "boolean") {
    return NextResponse.json(
      { error: "נדרש שדה isHidden מסוג boolean" },
      { status: 400 },
    );
  }

  try {
    const updated = await prisma.whatsappMessage.update({
      where: { id: messageId },
      data: { isHidden: body.isHidden },
      select: { id: true, isHidden: true },
    });
    return NextResponse.json({ message: updated });
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "P2025"
    ) {
      return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
    }
    console.error("PATCH message failed:", err);
    return NextResponse.json({ error: "שגיאה" }, { status: 500 });
  }
}
