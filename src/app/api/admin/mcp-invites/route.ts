import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "נדרשת הזדהות" }, { status: 401 }) };
  }
  return { session };
}

export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const invites = await prisma.mcpInvite.findMany({
    orderBy: { createdAt: "desc" },
  });

  // Last-7-day usage per email — gives the admin a sense of who's actually
  // hitting the MCP without having to query the usage table separately.
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const usage = await prisma.mcpUsage.groupBy({
    by: ["email"],
    where: { createdAt: { gte: sevenDaysAgo } },
    _count: { _all: true },
  });
  const usageByEmail = new Map(usage.map((u) => [u.email, u._count._all]));

  return NextResponse.json({
    invites: invites.map((i) => ({
      ...i,
      callsLast7Days: usageByEmail.get(i.email) ?? 0,
    })),
  });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const body = (await req.json().catch(() => ({}))) as { email?: string };
  const email = (body.email ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "כתובת אימייל לא חוקית" }, { status: 400 });
  }

  const invite = await prisma.mcpInvite.upsert({
    where: { email },
    create: { email, invitedBy: guard.session.user?.email ?? null },
    update: {},
  });

  return NextResponse.json({ invite });
}

export async function DELETE(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "missing email" }, { status: 400 });
  }

  await prisma.mcpInvite.delete({ where: { email } }).catch(() => null);
  // Tokens already issued to this email remain valid until expiry. The next
  // /authorize will refuse to issue a new code, so revocation is "soft" —
  // matches the typical OAuth model and is good enough for closed beta.
  return NextResponse.json({ ok: true });
}
