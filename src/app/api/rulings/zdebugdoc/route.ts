import { NextRequest, NextResponse } from "next/server";

// TEMPORARY debug — probes candidate upstream single-document endpoints to find
// which one returns a ruling's metadata (with sql.*). Guarded by a secret.
const SECRET = "zg-doc-7f3a91";
const BASE = process.env.TAGIT_API_URL || "https://tag-it.biz";
function key() {
  return process.env.RULINGS_API_KEY || process.env.CLASS_ACTION_API_KEY;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("k") !== SECRET) {
    return NextResponse.json({ error: "nope" }, { status: 404 });
  }
  const id = searchParams.get("id") || "151465";
  const apiKey = key();
  if (!apiKey) return NextResponse.json({ error: "no key" }, { status: 503 });
  const h = { "X-API-Key": apiKey, Accept: "application/json" };

  const candidates: { name: string; url: string }[] = [
    { name: "documents/{id}", url: `${BASE}/api/public/rulings/documents/${id}` },
    {
      name: "list filter meta.id scope4",
      url: `${BASE}/api/public/rulings/documents?scope=4&size=1&filter=${encodeURIComponent(
        JSON.stringify({ field: "meta.id", op: "eq", value: Number(id) }),
      )}`,
    },
    {
      name: "list filter meta.id scope6",
      url: `${BASE}/api/public/rulings/documents?scope=6&size=1&filter=${encodeURIComponent(
        JSON.stringify({ field: "meta.id", op: "eq", value: Number(id) }),
      )}`,
    },
  ];

  const out: Record<string, unknown> = {};
  for (const c of candidates) {
    try {
      const r = await fetch(c.url, { headers: h, cache: "no-store" });
      const text = await r.text();
      let keys: string[] = [];
      let hasSql = false;
      try {
        const j = JSON.parse(text);
        const doc = Array.isArray(j?.items) ? j.items[0] : j;
        if (doc && typeof doc === "object") {
          keys = Object.keys(doc);
          hasSql = !!doc.sql || !!doc.ai_analysis || !!doc.ai;
        }
      } catch {
        /* not json */
      }
      out[c.name] = { status: r.status, keys: keys.slice(0, 12), hasSql, snippet: text.slice(0, 120) };
    } catch (e) {
      out[c.name] = { error: String(e) };
    }
  }
  return NextResponse.json(out);
}
