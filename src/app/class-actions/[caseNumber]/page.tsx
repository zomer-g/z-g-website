import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import {
  fetchAllUpstreamClassActions,
  stripClassActionUrls,
} from "@/lib/class-actions-upstream";
import type {
  ClassActionDocument,
  ClassActionCase,
} from "@/types/class-action";
import { ClassActionDetail } from "./case-detail";

export const dynamic = "force-dynamic";

// ─── Shared fetch + group helper ───────────────────────────────────────────
//
// Both `generateMetadata` and the page itself need the case object. Next.js
// dedupes identical fetches across these calls when they live in the same
// render, so calling this twice is cheap.

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

async function getCase(caseNumber: string): Promise<ClassActionCase | null> {
  if (!caseNumber) return null;

  const rawItems = await fetchAllUpstreamClassActions({
    filters: { case_number: caseNumber },
  });
  if (!rawItems || rawItems.length === 0) return null;

  const cleaned = stripClassActionUrls(rawItems);
  // The upstream filter is permissive — narrow to exact match defensively so
  // we don't fold a different case that happened to share a substring.
  const exact = cleaned.filter((d) => (d.case_number ?? "").trim() === caseNumber);
  const docs = exact.length > 0 ? exact : cleaned;
  if (docs.length === 0) return null;

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

// ─── Metadata (OG tags for WhatsApp / Telegram link previews) ──────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ caseNumber: string }>;
}): Promise<Metadata> {
  const { caseNumber: raw } = await params;
  const caseNumber = decodeURIComponent(raw).trim();
  const caseItem = await getCase(caseNumber);

  if (!caseItem) {
    return {
      title: `תובענה ייצוגית ${caseNumber} | זומר עורך דין`,
      description: "תובענה ייצוגית מפנקס התובענות הייצוגיות.",
    };
  }

  const title = `${caseItem.case_name || `תובענה ${caseItem.case_number}`} | תובענות ייצוגיות`;
  // Prefer legal_question for the description because it's typically the
  // shortest, most informative summary; fall back to class_definition.
  const rawDesc = (caseItem.legal_question || caseItem.class_definition || "")
    .replace(/\s+/g, " ")
    .trim();
  const description = rawDesc.length > 200
    ? `${rawDesc.slice(0, 197)}…`
    : rawDesc || `תובענה ייצוגית ${caseItem.case_number} בבית משפט ${caseItem.court_name || ""}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default async function ClassActionDetailPage({
  params,
}: {
  params: Promise<{ caseNumber: string }>;
}) {
  const { caseNumber: raw } = await params;
  const caseNumber = decodeURIComponent(raw).trim();
  const caseItem = await getCase(caseNumber);

  if (!caseItem) notFound();

  return (
    <PublicLayout>
      <section className="bg-gradient-to-br from-primary to-primary-dark py-8 sm:py-12">
        <Container>
          <div className="text-center">
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              תובענות ייצוגיות
            </h2>
            <p className="text-white/80 text-sm mt-1">
              תובענות אחרונות שהוגשו בבתי המשפט בישראל
            </p>
          </div>
        </Container>
      </section>
      <Container className="py-8">
        <ClassActionDetail caseItem={caseItem} />
      </Container>
    </PublicLayout>
  );
}
