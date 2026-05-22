// /api/timeline/layers/[layerId]/events/import — ADMIN-only bulk import.
//
// Accepts multiple shapes:
//   - text/csv                                         → CSV table
//   - application/json                                 → JSON array
//   - application/vnd.openxmlformats-...spreadsheetml  → XLSX
//   - application/zip                                  → WhatsApp ZIP (or XLSX-as-ZIP)
//
// The frontend should pass `?filename=<name>` so we can dispatch by
// extension when content-type is ambiguous (browsers sometimes send
// application/octet-stream for .xlsx and .zip).
//
// Strict validation: any non-parseable timestamp / missing required
// field yields a warning per row; rows with warnings are skipped, but
// remaining valid rows still insert. The response includes both the
// inserted count and the warnings list.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOnly } from "@/lib/timeline-auth";
import {
  parseCsv,
  parseJsonArray,
  parseXlsxBuffer,
  parseWhatsappZipForTimeline,
  isWhatsappZipShape,
  type ImportResult,
} from "@/lib/timeline-import";

type Kind = "csv" | "json" | "xlsx" | "zip";

function detectKind(contentType: string, filename: string | null): Kind | null {
  const ct = contentType.toLowerCase();
  const fn = (filename ?? "").toLowerCase();

  if (fn.endsWith(".csv")) return "csv";
  if (fn.endsWith(".json")) return "json";
  if (fn.endsWith(".xlsx") || fn.endsWith(".xls") || fn.endsWith(".xlsm"))
    return "xlsx";
  if (fn.endsWith(".zip")) return "zip";

  if (ct.includes("application/json")) return "json";
  if (ct.includes("text/csv") || ct.includes("text/plain")) return "csv";
  if (ct.includes("spreadsheetml") || ct.includes("ms-excel")) return "xlsx";
  if (ct.includes("application/zip") || ct.includes("application/x-zip"))
    return "zip";

  return null;
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ layerId: string }> },
) {
  const guard = await requireAdminOnly();
  if (guard) return guard;

  const { layerId } = await ctx.params;
  const layer = await prisma.timelineLayer.findUnique({
    where: { id: layerId },
    select: { id: true },
  });
  if (!layer) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });

  const url = new URL(req.url);
  const filename = url.searchParams.get("filename");
  const contentType = req.headers.get("content-type") ?? "";

  let kind = detectKind(contentType, filename);
  // No detection → try CSV as a last resort (legacy behavior).
  if (!kind) kind = "csv";

  let result: ImportResult;
  try {
    if (kind === "json") {
      const json = await req.json();
      result = parseJsonArray(json);
    } else if (kind === "csv") {
      const text = await req.text();
      result = parseCsv(text);
    } else if (kind === "xlsx") {
      const buf = Buffer.from(await req.arrayBuffer());
      result = await parseXlsxBuffer(buf);
    } else {
      // zip — could be WhatsApp ZIP, or .xlsx mis-typed by the browser.
      const buf = Buffer.from(await req.arrayBuffer());
      if (await isWhatsappZipShape(buf)) {
        result = await parseWhatsappZipForTimeline(buf);
      } else {
        // Fall through to XLSX (xlsx files are zip archives too).
        result = await parseXlsxBuffer(buf);
      }
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "כשל בקריאת הקובץ" },
      { status: 400 },
    );
  }

  if (result.events.length === 0) {
    return NextResponse.json(
      {
        error: "לא נמצאו אירועים תקינים בקובץ",
        warnings: result.warnings.slice(0, 50),
      },
      { status: 400 },
    );
  }
  if (result.events.length > 5000) {
    return NextResponse.json(
      {
        error: `יותר מדי שורות (${result.events.length}) — מקסימום 5000`,
      },
      { status: 400 },
    );
  }

  // Append at the end of the layer so re-imports don't collide.
  const maxOrder = await prisma.timelineEvent.aggregate({
    where: { layerId },
    _max: { order: true },
  });
  const startOrder = (maxOrder._max.order ?? -1) + 1;

  await prisma.timelineEvent.createMany({
    data: result.events.map((v, idx) => ({
      layerId,
      timestamp: v.timestamp,
      actor: v.actor,
      category: v.category,
      title: v.title,
      body: v.body,
      order: startOrder + idx,
    })),
  });

  return NextResponse.json(
    {
      inserted: result.events.length,
      firstOrder: startOrder,
      warnings: result.warnings.slice(0, 50),
    },
    { status: 201 },
  );
}
