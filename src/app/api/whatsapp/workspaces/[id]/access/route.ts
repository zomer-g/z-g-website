// /api/whatsapp/workspaces/[id]/access — ADMIN-only.
//
// POST   → add an email to the allowlist { email }
// (DELETE per-email lives at [email]/route.ts so the email can sit in
//  the URL path; with @ and dots that still works after encoding.)

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Loose RFC-ish — we don't try to be exhaustive, just reject obvious
// nonsense. The signIn callback validates the email's effective use
// against Google's OAuth response anyway.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 401 });
  }
  return null;
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id } = await ctx.params;
  let body: { email?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON לא תקין" }, { status: 400 });
  }
  const raw = typeof body.email === "string" ? body.email.trim() : "";
  if (!EMAIL_RE.test(raw)) {
    return NextResponse.json({ error: "כתובת דוא״ל לא תקינה" }, { status: 400 });
  }
  const email = raw.toLowerCase();

  // Confirm the workspace exists first — Prisma would otherwise throw a
  // foreign-key error and we'd surface a confusing 500.
  const ws = await prisma.whatsappWorkspace.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!ws) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });

  try {
    const row = await prisma.whatsappWorkspaceAccess.create({
      data: { workspaceId: id, email },
      select: { id: true, email: true, createdAt: true },
    });
    return NextResponse.json({ access: row }, { status: 201 });
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "P2002"
    ) {
      return NextResponse.json({ error: "כבר ברשימה" }, { status: 409 });
    }
    console.error("add access failed:", err);
    return NextResponse.json({ error: "שגיאה" }, { status: 500 });
  }
}
