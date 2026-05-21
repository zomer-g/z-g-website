import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { brainstormKeywords } from "@/lib/seo-suggestions";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  focusHint: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = rateLimit(`seo-brainstorm:${getClientIp(req)}`, {
    limit: 5,
    windowMs: 60_000,
  });
  if (limited) return limited;

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const result = await brainstormKeywords({ focusHint: parsed.data.focusHint });
    return NextResponse.json(result);
  } catch (err) {
    // Log the real error server-side; never echo it back to the client —
    // upstream errors from Gemini may include URLs/keys we don't want to expose.
    console.error("POST /api/admin/seo/brainstorm error:", err);
    return NextResponse.json(
      {
        error: "BRAINSTORM_FAILED",
        message: "שגיאה בהפעלת ה-AI. בדוק את ה-logs לפרטים.",
      },
      { status: 500 },
    );
  }
}
