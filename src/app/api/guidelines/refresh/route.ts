import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { clearCache } from "@/lib/guidelines-cache";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "נדרשת הזדהות" }, { status: 401 });
  }

  const cleared = clearCache();
  return NextResponse.json({
    cleared,
    message:
      cleared > 0
        ? `נוקו ${cleared} רשומות מהקאש. הבקשה הבאה תשלוף נתונים טריים.`
        : "הקאש כבר היה ריק. הבקשה הבאה תשלוף נתונים טריים.",
  });
}
