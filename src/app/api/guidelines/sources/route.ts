import { NextResponse } from "next/server";
import type { Guideline } from "@/types/guideline";
import {
  getCached,
  getStale,
  setCached,
  findUnfilteredKey,
  UNFILTERED_KEY,
} from "@/lib/guidelines-cache";
import { getPageContent } from "@/lib/content";
import type { GuidelinesPageContent } from "@/types/content";
import {
  fetchAllUpstreamGuidelines,
  getGuidelinesApiKey,
  stripUrls,
} from "@/lib/guidelines-upstream";
import { prisma } from "@/lib/prisma";

const DEFAULT_TTL_MINUTES = 60;
const MIN_TTL_MINUTES = 1;
const MAX_TTL_MINUTES = 1440;

async function readTtlMs(): Promise<number> {
  try {
    const content = await getPageContent<GuidelinesPageContent>("guidelines");
    const raw = Number(content?.cacheTtlMinutes);
    if (!Number.isFinite(raw)) return DEFAULT_TTL_MINUTES * 60_000;
    const clamped = Math.max(MIN_TTL_MINUTES, Math.min(MAX_TTL_MINUTES, raw));
    return clamped * 60_000;
  } catch {
    return DEFAULT_TTL_MINUTES * 60_000;
  }
}

export async function GET() {
  const apiKey = getGuidelinesApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "API not configured" }, { status: 503 });
  }

  // Reuse the unfiltered cache populated by /documents if present.
  const unfilteredKey = findUnfilteredKey();
  let items: Guideline[] | null = unfilteredKey ? getCached(unfilteredKey) : null;

  if (!items) {
    try {
      const [rawItems, ttlMs] = await Promise.all([
        fetchAllUpstreamGuidelines(),
        readTtlMs(),
      ]);
      if (rawItems === null) {
        // Refresh failed — fall back to the last-known-good corpus if we have
        // one, so facets keep rendering instead of 502-ing.
        const stale = getStale(UNFILTERED_KEY);
        if (!stale) {
          return NextResponse.json(
            { error: "Upstream fetch failed" },
            { status: 502 },
          );
        }
        console.warn("[guidelines-sources] upstream refresh failed — serving stale corpus");
        items = stale;
      } else {
        const cleaned = stripUrls(rawItems);
        setCached(UNFILTERED_KEY, cleaned, ttlMs);
        items = cleaned;
      }
    } catch (err) {
      console.error("guidelines sources error:", err);
      const stale = getStale(UNFILTERED_KEY);
      if (!stale) {
        return NextResponse.json({ error: "Upstream fetch failed" }, { status: 502 });
      }
      items = stale;
    }
  }

  const counts: Record<string, number> = {};
  const idsBySource = new Map<string, number[]>();
  for (const it of items) {
    const label = it.source_label;
    if (!label || !label.trim()) continue;
    counts[label] = (counts[label] ?? 0) + 1;
    const arr = idsBySource.get(label) ?? [];
    arr.push(it.id);
    idsBySource.set(label, arr);
  }
  const sources = Object.keys(counts).sort((a, b) => a.localeCompare(b, "he"));

  // Per-source last-indexed timestamp + indexed count. Lets the admin
  // panel show "אונדקס לאחרונה: לפני 3 שעות" so the operator knows
  // which sources need re-indexing after a catalog change. We pull all
  // embedding (id, updatedAt) rows in one query and bucket them by source.
  let indexedCounts: Record<string, number> = {};
  let lastIndexedAt: Record<string, string | null> = {};
  try {
    const rows = await prisma.guidelineEmbedding.findMany({
      select: { id: true, updatedAt: true },
    });
    const byId = new Map(rows.map((r) => [r.id, r.updatedAt]));
    for (const label of sources) {
      const ids = idsBySource.get(label) ?? [];
      let count = 0;
      let newest: Date | null = null;
      for (const id of ids) {
        const ua = byId.get(id);
        if (!ua) continue;
        count += 1;
        if (!newest || ua.getTime() > newest.getTime()) newest = ua;
      }
      indexedCounts[label] = count;
      lastIndexedAt[label] = newest ? newest.toISOString() : null;
    }
  } catch (err) {
    console.error("guidelines sources index stats error:", err);
    // Leave the maps empty — UI will fall back to "לא ידוע".
    indexedCounts = {};
    lastIndexedAt = {};
  }

  // sourceCounts is additive — existing public callers reading `sources`
  // keep working unchanged. The admin "ייבוא לפי מקור" panel uses the
  // detail fields (indexed, lastIndexedAt) to render the freshness UI.
  const sourceCounts = sources.map((label) => ({
    label,
    count: counts[label],
    indexed: indexedCounts[label] ?? 0,
    lastIndexedAt: lastIndexedAt[label] ?? null,
  }));

  return NextResponse.json(
    { sources, sourceCounts },
    {
      headers: {
        // Bypass CDN cache — the admin panel needs current numbers, and
        // these queries are cheap. Public callers (the user-facing
        // facet pills) can still rely on their own caching layer.
        "Cache-Control": "no-store",
      },
    },
  );
}
