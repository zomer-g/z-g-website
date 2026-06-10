import { NextRequest, NextResponse } from "next/server";
import { fetchUpstreamRulingsSchema } from "@/lib/rulings-upstream";

// TEMPORARY debug route — returns TAG-IT's filterable field registry (names
// only) so we can wire boolean/text filters to the exact registered keys.
// Guarded by a secret query param. Delete after use.
const SECRET = "zg-schema-7f3a91";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("k") !== SECRET) {
    return NextResponse.json({ error: "nope" }, { status: 404 });
  }
  const scope = Number(searchParams.get("scope") || "4");
  const fields = await fetchUpstreamRulingsSchema(scope);
  if (!fields) {
    return NextResponse.json({ error: "no key / fetch failed" }, { status: 503 });
  }
  return NextResponse.json({
    scope,
    count: fields.length,
    fields: fields.map((f) => ({ key: f.key, type: f.type, label: f.label })),
  });
}
