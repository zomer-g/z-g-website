// /api/timeline/layers/[layerId]/events/import — ADMIN-only bulk import.
//
// Accepts either:
//   - text/csv      with columns: timestamp,category,actor,title,body
//   - application/json — an array of objects with the same keys
//
// Strict validation: any row that fails ISO parsing or misses required
// fields halts the whole batch (no partial insert). The admin can fix
// the file and retry.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOnly } from "@/lib/timeline-auth";

const KNOWN_CATEGORIES = new Set(["action", "search", "message", "meeting", "note"]);

interface ImportRow {
  timestamp: string;
  category?: string;
  actor: string;
  title?: string | null;
  body?: string | null;
}

// Tiny CSV parser — handles quoted fields, escaped quotes, and CRLF.
// Avoids pulling in a CSV dep for what's effectively a 100-line file.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let i = 0;
  let cur = "";
  let row: string[] = [];
  let inQuotes = false;
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      cur += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ",") {
      row.push(cur);
      cur = "";
      i++;
      continue;
    }
    if (ch === "\r") {
      // skip CRLF — the LF handler emits the row
      i++;
      continue;
    }
    if (ch === "\n") {
      row.push(cur);
      cur = "";
      rows.push(row);
      row = [];
      i++;
      continue;
    }
    cur += ch;
    i++;
  }
  // Flush trailing line if no terminating newline.
  if (cur.length > 0 || row.length > 0) {
    row.push(cur);
    rows.push(row);
  }
  return rows;
}

function csvToRows(csv: string): ImportRow[] {
  const grid = parseCsv(csv.replace(/^﻿/, ""));
  if (grid.length === 0) return [];
  const header = grid[0].map((h) => h.trim().toLowerCase());
  const idx = {
    timestamp: header.indexOf("timestamp"),
    category: header.indexOf("category"),
    actor: header.indexOf("actor"),
    title: header.indexOf("title"),
    body: header.indexOf("body"),
  };
  if (idx.timestamp < 0 || idx.actor < 0) {
    throw new Error("CSV חסר את העמודות הנדרשות: timestamp, actor");
  }
  return grid
    .slice(1)
    .filter((r) => r.some((cell) => cell.trim() !== ""))
    .map((r): ImportRow => ({
      timestamp: r[idx.timestamp] ?? "",
      category: idx.category >= 0 ? r[idx.category] : undefined,
      actor: r[idx.actor] ?? "",
      title: idx.title >= 0 ? r[idx.title] : undefined,
      body: idx.body >= 0 ? r[idx.body] : undefined,
    }));
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

  const contentType = req.headers.get("content-type") ?? "";
  let raw: ImportRow[];
  try {
    if (contentType.includes("application/json")) {
      const json = await req.json();
      if (!Array.isArray(json)) {
        return NextResponse.json(
          { error: "מצופה מערך של אובייקטים" },
          { status: 400 },
        );
      }
      raw = json as ImportRow[];
    } else {
      // Treat anything else (text/csv, text/plain, no header) as CSV.
      const text = await req.text();
      raw = csvToRows(text);
    }
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "כשל בקריאת הקובץ",
      },
      { status: 400 },
    );
  }

  if (raw.length === 0) {
    return NextResponse.json(
      { error: "לא נמצאו שורות בקובץ" },
      { status: 400 },
    );
  }
  if (raw.length > 5000) {
    return NextResponse.json(
      { error: `יותר מדי שורות (${raw.length}) — מקסימום 5000` },
      { status: 400 },
    );
  }

  // Validate everything before any insert so we can reject the entire
  // batch on a single bad row.
  const errors: { row: number; reason: string }[] = [];
  const validated: {
    timestamp: Date;
    actor: string;
    category: string;
    title: string | null;
    body: string | null;
  }[] = [];
  for (let i = 0; i < raw.length; i++) {
    const r = raw[i];
    const ts = r.timestamp ? new Date(String(r.timestamp).trim()) : null;
    if (!ts || Number.isNaN(ts.getTime())) {
      errors.push({ row: i + 2, reason: "timestamp לא תקין" });
      continue;
    }
    const actor = String(r.actor ?? "").trim();
    if (!actor) {
      errors.push({ row: i + 2, reason: "actor חסר" });
      continue;
    }
    const cat = String(r.category ?? "").trim();
    const category = cat && KNOWN_CATEGORIES.has(cat) ? cat : "note";
    const title = r.title ? String(r.title).trim() : "";
    const text = r.body ? String(r.body).trim() : "";
    if (!title && !text) {
      errors.push({ row: i + 2, reason: "נדרש title או body" });
      continue;
    }
    validated.push({
      timestamp: ts,
      actor,
      category,
      title: title || null,
      body: text || null,
    });
  }
  if (errors.length > 0) {
    return NextResponse.json(
      { error: "כשלים באימות הקובץ", details: errors.slice(0, 20) },
      { status: 400 },
    );
  }

  // Use the current max order so a re-import appends rather than
  // colliding with existing events.
  const maxOrder = await prisma.timelineEvent.aggregate({
    where: { layerId },
    _max: { order: true },
  });
  const startOrder = (maxOrder._max.order ?? -1) + 1;

  await prisma.timelineEvent.createMany({
    data: validated.map((v, idx) => ({
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
    { inserted: validated.length, firstOrder: startOrder },
    { status: 201 },
  );
}
