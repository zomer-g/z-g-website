import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Per-call log for the FOI Guide MCP. Used by the admin UI to debug
// hallucination episodes — when Claude cites a case that doesn't appear in
// the chapter, the first question is "what query did it actually send, and
// did our search even return that chapter".

export async function GET(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "נדרשת הזדהות" }, { status: 401 });
  }

  const limit = Math.max(1, Math.min(200, Number(req.nextUrl.searchParams.get("limit")) || 50));
  const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase();

  const usage = await prisma.mcpUsage.findMany({
    where: email ? { email } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      email: true,
      tool: true,
      query: true,
      resultCount: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ usage });
}
