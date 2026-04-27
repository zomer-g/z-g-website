import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  proofreadBatch,
  ProofreadError,
  PROOFREAD_BATCH_SIZE,
} from "@/lib/proofread/check";
import type { ContentItem } from "@/lib/proofread/collect";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface CheckRequestBody {
  items: ContentItem[];
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "נדרשת הזדהות" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as CheckRequestBody | null;
  if (!body || !Array.isArray(body.items)) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (body.items.length > PROOFREAD_BATCH_SIZE * 2) {
    return NextResponse.json(
      { error: `Batch too large (max ${PROOFREAD_BATCH_SIZE * 2})` },
      { status: 400 },
    );
  }

  try {
    const issues = await proofreadBatch(body.items);
    return NextResponse.json(
      { issues },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (err) {
    if (err instanceof ProofreadError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status === 401 || err.status === 503 ? 503 : 502 },
      );
    }
    console.error("Proofread batch error:", err);
    return NextResponse.json(
      { error: "Proofread call failed" },
      { status: 502 },
    );
  }
}
