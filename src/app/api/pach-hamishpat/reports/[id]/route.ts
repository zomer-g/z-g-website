import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

/** Admin-only PATCH for status reports. Mirrors PATCH /api/status-reports/:id. */

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

const FIELD_MAP: Record<string, string> = {
  status: "status",
  description: "description",
  reporter_type: "reporterType",
  expires_at: "expiresAt",
  is_hidden: "isHidden",
  is_scheduled: "isScheduled",
  scheduled_from: "scheduledFrom",
  scheduled_until: "scheduledUntil",
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    const col = FIELD_MAP[k];
    if (!col) continue;
    if (col === "isHidden" || col === "isScheduled") {
      data[col] = !!v;
    } else if (col === "expiresAt" || col === "scheduledFrom" || col === "scheduledUntil") {
      data[col] = v ? new Date(v as string) : null;
    } else {
      data[col] = v;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  try {
    const updated = await prisma.pachReport.update({ where: { id }, data });
    return NextResponse.json(serialize(updated));
  } catch (e) {
    console.error("PATCH /api/pach-hamishpat/reports/[id]", e);
    return NextResponse.json({ error: "שגיאה בעדכון דיווח" }, { status: 500 });
  }
}
