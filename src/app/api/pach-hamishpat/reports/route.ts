import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

/**
 * Ported from pach-hamishpat/server/routes/status-reports.js.
 *
 * Public GET — anyone can read non-hidden reports. Admin can pass
 * is_hidden=true to see moderated entries.
 *
 * Public POST — anyone can submit a status report. Reporter type is
 * forced to "admin" when an authenticated admin session is present so
 * the timeline labels stay honest, regardless of what the client sends.
 *
 * PATCH lives at /reports/[id] (admin only).
 */

function serialize(r: {
  id: number;
  status: string;
  description: string | null;
  reporterType: string;
  createdDate: Date;
  expiresAt: Date | null;
  isHidden: boolean;
  isScheduled: boolean;
  scheduledFrom: Date | null;
  scheduledUntil: Date | null;
}) {
  return {
    id: r.id,
    status: r.status,
    description: r.description,
    reporter_type: r.reporterType,
    created_date: r.createdDate.toISOString(),
    expires_at: r.expiresAt?.toISOString() ?? null,
    is_hidden: r.isHidden,
    is_scheduled: r.isScheduled,
    scheduled_from: r.scheduledFrom?.toISOString() ?? null,
    scheduled_until: r.scheduledUntil?.toISOString() ?? null,
  };
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const isHiddenRaw = sp.get("is_hidden");
  const status = sp.get("status");
  const limitRaw = sp.get("limit");
  const sortRaw = sp.get("sort") || "-created_date";

  const where: Record<string, unknown> = {};
  if (isHiddenRaw !== null) {
    where.isHidden = isHiddenRaw === "true" || isHiddenRaw === "1";
  }
  if (status) where.status = status;

  const desc = sortRaw.startsWith("-");
  const col = desc ? sortRaw.slice(1) : sortRaw;
  const sortMap: Record<string, "createdDate" | "id" | "status"> = {
    created_date: "createdDate",
    id: "id",
    status: "status",
  };
  const orderBy = { [sortMap[col] ?? "createdDate"]: desc ? "desc" : "asc" } as const;

  const limit = limitRaw ? Math.min(500, Math.max(1, Number(limitRaw) || 50)) : 500;

  try {
    const rows = await prisma.pachReport.findMany({
      where,
      orderBy,
      take: limit,
    });
    return NextResponse.json(rows.map(serialize));
  } catch (e) {
    console.error("GET /api/pach-hamishpat/reports", e);
    return NextResponse.json({ error: "שגיאה בטעינת דיווחים" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const session = await auth();
    const isAdmin = session?.user?.role === "ADMIN";

    const status =
      body.status === "red" || body.status === "orange" || body.status === "green"
        ? body.status
        : "green";

    const created = await prisma.pachReport.create({
      data: {
        status,
        description: typeof body.description === "string" ? body.description : null,
        // Trust admin status from the session, not from the client payload.
        reporterType: isAdmin ? "admin" : "user",
        expiresAt: body.expires_at ? new Date(body.expires_at) : null,
        isHidden: !!body.is_hidden,
        isScheduled: !!body.is_scheduled,
        scheduledFrom: body.scheduled_from ? new Date(body.scheduled_from) : null,
        scheduledUntil: body.scheduled_until ? new Date(body.scheduled_until) : null,
      },
    });
    return NextResponse.json(serialize(created));
  } catch (e) {
    console.error("POST /api/pach-hamishpat/reports", e);
    return NextResponse.json({ error: "שגיאה ביצירת דיווח" }, { status: 500 });
  }
}
