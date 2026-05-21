// /api/whatsapp/workspaces/[id]/access/[email] — ADMIN-only.
//
// DELETE → remove an allowlisted email from a workspace. The [email]
// segment is URL-encoded by the client; we decode + lowercase before
// looking it up in the unique (workspaceId, email) index.

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
  ctx: { params: Promise<{ id: string; email: string }> },
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id, email: encoded } = await ctx.params;
  const email = decodeURIComponent(encoded).toLowerCase();

  try {
    await prisma.whatsappWorkspaceAccess.delete({
      where: { workspaceId_email: { workspaceId: id, email } },
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
    console.error("remove access failed:", err);
    return NextResponse.json({ error: "שגיאה" }, { status: 500 });
  }
}
