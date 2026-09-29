import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Revokes a key. Revocation is permanent; the row stays for the audit log. */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "נדרשת הזדהות" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const updated = await prisma.apiKey.updateMany({
    where: { id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (updated.count === 0) {
    return NextResponse.json({ error: "המפתח לא נמצא או שכבר בוטל" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
