import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getBillingSnapshot } from "@/lib/billing";

export const dynamic = "force-dynamic";

// Read-only multi-provider billing snapshot for /admin/billing. ADMIN only.
// GET /api/admin/billing        → cached snapshot (30-min TTL)
// GET /api/admin/billing?refresh=1 → bypass cache and re-fetch every provider
export async function GET(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "נדרשת הזדהות" }, { status: 401 });
  }

  const refresh = req.nextUrl.searchParams.get("refresh") === "1";
  try {
    const snapshot = await getBillingSnapshot(refresh);
    return NextResponse.json(snapshot);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "שגיאה בטעינת נתוני חיוב" },
      { status: 500 },
    );
  }
}
