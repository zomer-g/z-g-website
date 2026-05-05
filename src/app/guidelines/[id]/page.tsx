import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import type { Guideline } from "@/types/guideline";
import { getGuidelinesApiKey } from "@/lib/guidelines-upstream";
import { GuidelineDetail } from "./guideline-detail";

export const dynamic = "force-dynamic";

const UPSTREAM = "https://tag-it.biz/api/public/over-guidelines/documents";

async function getGuideline(id: number): Promise<Guideline | null> {
  const apiKey = getGuidelinesApiKey();
  if (!apiKey) return null;

  const res = await fetch(`${UPSTREAM}/${id}`, {
    headers: { "X-API-Key": apiKey, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const doc = (await res.json()) as Guideline & {
    file_url?: string;
    text_url?: string;
    content_text?: string;
  };
  // Strip upstream-key-bearing URLs and the heavy content_text — neither is
  // needed by the detail page.
  const { file_url, text_url, content_text, ...rest } = doc;
  void file_url;
  void text_url;
  void content_text;
  return rest as Guideline;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id) || id <= 0) {
    return {
      title: "הנחיה | זומר עורך דין",
      description: "הנחיה ממאגר ההנחיות הציבוריות.",
    };
  }
  const doc = await getGuideline(id);
  if (!doc) {
    return {
      title: `הנחיה ${id} | זומר עורך דין`,
      description: "הנחיה ממאגר ההנחיות הציבוריות.",
    };
  }

  const title = `${doc.document_title || doc.filename || "הנחיה"} | מאגר הנחיות`;
  const rawDesc = (doc.summary || doc.topic || "").replace(/\s+/g, " ").trim();
  const fallback = `הנחיה של ${doc.source_label || "רשות אכיפת חוק"}${doc.directive_number ? ` (${doc.directive_number})` : ""}.`;
  const description =
    rawDesc.length > 200
      ? `${rawDesc.slice(0, 197)}…`
      : rawDesc || fallback;

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

export default async function GuidelineDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const doc = await getGuideline(id);
  if (!doc) notFound();

  return (
    <PublicLayout>
      <section className="bg-gradient-to-br from-primary to-primary-dark py-8 sm:py-12">
        <Container>
          <div className="text-center">
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              מאגר הנחיות
            </h2>
            <p className="text-white/80 text-sm mt-1">
              הנחיות יועמ&quot;ש, פרקליט המדינה, משטרה ועוד
            </p>
          </div>
        </Container>
      </section>
      <Container className="py-8">
        <GuidelineDetail doc={doc} />
      </Container>
    </PublicLayout>
  );
}
