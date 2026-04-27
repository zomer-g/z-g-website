import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { collectAllContent } from "@/lib/proofread/collect";
import { PROOFREAD_BATCH_SIZE } from "@/lib/proofread/check";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "נדרשת הזדהות" }, { status: 401 });
  }
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured" },
      { status: 503 },
    );
  }

  const items = await collectAllContent();

  return NextResponse.json(
    {
      items,
      total: items.length,
      batchSize: PROOFREAD_BATCH_SIZE,
      totalBatches: Math.ceil(items.length / PROOFREAD_BATCH_SIZE),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
