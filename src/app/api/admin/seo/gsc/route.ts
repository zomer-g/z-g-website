import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getGscAuthStatus,
  getGscConfig,
  fetchOpportunities,
  fetchLowCtrTopRanks,
  fetchTopPages,
} from "@/lib/gsc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = await getGscAuthStatus(session.user.id);
  if (status.kind === "no-site-url") {
    return NextResponse.json(
      {
        error: "GSC_NOT_CONFIGURED",
        message:
          "GSC_SITE_URL לא הוגדר. הגדר במשתני הסביבה את כתובת הנכס המאומת ב-Search Console.",
      },
      { status: 503 },
    );
  }
  if (status.kind === "user-missing-scope") {
    return NextResponse.json(
      {
        error: "GSC_SIGNIN_REQUIRED",
        message:
          "ההרשאה לקריאת Search Console טרם ניתנה. צא ובצע התחברות מחדש כדי לאשר את ההרשאה החדשה.",
      },
      { status: 403 },
    );
  }

  const url = new URL(req.url);
  const days = Math.max(7, Math.min(90, Number(url.searchParams.get("days")) || 28));

  try {
    const config = await getGscConfig({ userId: session.user.id });
    const [opportunities, lowCtr, topPages] = await Promise.all([
      fetchOpportunities(config, { days, minImpressions: 20, limit: 50 }),
      fetchLowCtrTopRanks(config, { days, minImpressions: 100, limit: 30 }),
      fetchTopPages(config, { days, limit: 30 }),
    ]);

    return NextResponse.json({
      days,
      opportunities,
      lowCtr,
      topPages,
      generatedAt: new Date().toISOString(),
      authKind: status.kind,
    });
  } catch (err) {
    console.error("GET /api/admin/seo/gsc error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "GSC_REQUEST_FAILED", message },
      { status: 500 },
    );
  }
}
