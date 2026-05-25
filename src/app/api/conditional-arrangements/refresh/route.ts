import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { clearArrangementsCache } from "@/lib/conditional-arrangements-cache";

export async function POST() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "נדרשת הזדהות" }, { status: 401 });
  }

  const cleared = clearArrangementsCache();
  return NextResponse.json({
    cleared,
    message:
      cleared > 0
        ? `נוקו ${cleared} רשומות מהקאש. הבקשה הבאה תשלוף נתונים טריים.`
        : "הקאש כבר היה ריק. הבקשה הבאה תשלוף נתונים טריים.",
  });
}
