import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { API_SCOPES, MAX_KEY_DAYS, generateKey, isApiScope } from "@/lib/api-keys";

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

  const [keys, logs] = await Promise.all([
    prisma.apiKey.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, prefix: true, scopes: true, createdAt: true,
        expiresAt: true, revokedAt: true, lastUsedAt: true, lastUsedIp: true,
      },
    }),
    prisma.apiKeyLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { key: { select: { name: true } } },
    }),
  ]);

  return NextResponse.json({ scopes: API_SCOPES, keys, logs });
}

/** Creates a key. The plain key is in this response only — it is never stored. */
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    scopes?: unknown;
    days?: number;
  };

  const name = (body.name ?? "").trim().slice(0, 100);
  if (!name) return NextResponse.json({ error: "נדרש שם למפתח" }, { status: 400 });

  const scopes = Array.isArray(body.scopes) ? [...new Set(body.scopes.filter((s): s is string => typeof s === "string"))] : [];
  if (scopes.length === 0 || !scopes.every(isApiScope)) {
    return NextResponse.json({ error: "יש לבחור לפחות הרשאה אחת תקינה" }, { status: 400 });
  }

  const days = Math.round(Number(body.days));
  if (!Number.isFinite(days) || days < 1 || days > MAX_KEY_DAYS) {
    return NextResponse.json({ error: `תוקף בין 1 ל-${MAX_KEY_DAYS} ימים` }, { status: 400 });
  }

  const { key, prefix, keyHash } = generateKey();
  const row = await prisma.apiKey.create({
    data: {
      name,
      prefix,
      keyHash,
      scopes,
      createdBy: guard.session.user.id,
      expiresAt: new Date(Date.now() + days * 24 * 3600 * 1000),
    },
  });

  return NextResponse.json(
    { id: row.id, key, prefix, scopes, expiresAt: row.expiresAt },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
