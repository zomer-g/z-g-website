import { NextRequest, NextResponse } from "next/server";
import type {
  ClassActionDocument,
  ClassActionCase,
} from "@/types/class-action";
import {
  fetchAllUpstreamClassActions,
  stripClassActionUrls,
} from "@/lib/class-actions-upstream";

// Returns a single grouped case by its case_number. Used by the dedicated
// detail page (/class-actions/<case_number>). Re-derives the same grouping +
// document classification the list endpoint applies, so the shape is identical
// and the detail page can render with the same components.
//
// We don't share the in-memory cache with the list route — this is a per-case
// hit that goes straight to the upstream `case_number` filter, which returns
// only the relevant documents (typically <10 per case) and is cheap.

function pickFirstNonEmpty<K extends keyof ClassActionDocument>(
  docs: ClassActionDocument[],
  key: K,
): ClassActionDocument[K] {
  for (const d of docs) {
    const v = d[key];
    if (v !== null && v !== undefined && v !== "") return v;
  }
  return docs[0][key];
}

function groupSingleCase(
  caseNumber: string,
  docs: ClassActionDocument[],
): ClassActionCase | null {
  if (docs.length === 0) return null;

  // Sort: primary docs before attachments, then newest date first.
  const sorted = [...docs].sort((a, b) => {
    if (a.is_attachment !== b.is_attachment) return a.is_attachment ? 1 : -1;
    const da = a.document_date ?? "";
    const db = b.document_date ?? "";
    if (db < da) return -1;
    if (db > da) return 1;
    return 0;
  });

  const latest = sorted.reduce<string>((acc, d) => {
    const dd = d.document_date ?? "";
    return dd > acc ? dd : acc;
  }, "");

  return {
    case_number: caseNumber,
    case_name: pickFirstNonEmpty(sorted, "case_name") as string,
    court_name: pickFirstNonEmpty(sorted, "court_name") as string,
    case_open_date: pickFirstNonEmpty(sorted, "case_open_date") as string,
    claim_amount: pickFirstNonEmpty(sorted, "claim_amount") as number,
    is_appeal: sorted[0].is_appeal,
    class_definition: pickFirstNonEmpty(sorted, "class_definition") as string,
    legal_question: pickFirstNonEmpty(sorted, "legal_question") as string,
    requested_aid: pickFirstNonEmpty(sorted, "requested_aid") as string,
    latest_document_date: latest,
    documents: sorted,
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ caseNumber: string }> },
) {
  const apiKey = process.env.CLASS_ACTION_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API not configured" }, { status: 503 });
  }

  const { caseNumber: rawCaseNumber } = await params;
  const caseNumber = decodeURIComponent(rawCaseNumber).trim();
  if (!caseNumber) {
    return NextResponse.json({ error: "Missing caseNumber" }, { status: 400 });
  }

  // Hit the upstream with the case_number filter — this returns only the
  // documents for this specific case, so it's a small response regardless of
  // corpus size.
  const rawItems = await fetchAllUpstreamClassActions({
    filters: { case_number: caseNumber },
  });

  if (rawItems === null) {
    return NextResponse.json(
      { error: "Upstream fetch failed" },
      { status: 502 },
    );
  }

  if (rawItems.length === 0) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  const cleaned = stripClassActionUrls(rawItems);
  // The upstream filter is substring-based on some fields, so double-check we
  // really have the right case_number — defensive against fuzzy upstream matches.
  const exact = cleaned.filter((d) => (d.case_number ?? "").trim() === caseNumber);
  const docsToGroup = exact.length > 0 ? exact : cleaned;

  const caseObj = groupSingleCase(caseNumber, docsToGroup);
  if (!caseObj) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  return NextResponse.json(caseObj, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}
