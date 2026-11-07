import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import type { Guideline } from "@/types/guideline";
import { getGuidelinesApiKey } from "@/lib/guidelines-upstream";
import { GuidelineDetail } from "./guideline-detail";
import Link from "next/link";
import { BreadcrumbSchema, DocumentSchema } from "@/components/seo/json-ld";
import { RelatedDocs } from "@/components/seo/related-docs";
import {
  guidelineDescription,
  practiceLinksForGuideline,
  relatedGuidelines,
} from "@/lib/seo-docs";

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
      title: "הנחיה",
      description: "הנחיה ממאגר ההנחיות הציבוריות.",
    };
  }
  const doc = await getGuideline(id);
  if (!doc) {
    return {
      title: `הנחיה ${id}`,
      description: "הנחיה ממאגר ההנחיות הציבוריות.",
    };
  }

  const title = `${doc.document_title || doc.filename || "הנחיה"} | מאגר הנחיות`;
  // Was summary || topic, and for about half the corpus that was a single
  // word ("משפט מנהלי"). See guidelineDescription.
  const description = guidelineDescription(doc);

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

  const related = await relatedGuidelines(id, doc.source_label);
  const name = doc.document_title || doc.filename || `הנחיה ${id}`;
  const url = `/guidelines/${id}`;

  return (
    <PublicLayout>
      <BreadcrumbSchema
        items={[
          { name: "ראשי", url: "/" },
          { name: "מאגר הנחיות", url: "/guidelines" },
          { name, url },
        ]}
      />
      <DocumentSchema
        url={url}
        name={name}
        description={doc.summary || undefined}
        datePublished={doc.document_date || undefined}
        issuer={doc.source_label || undefined}
        issuerIsGovernment
        identifier={doc.directive_number || undefined}
        genre="הנחיה"
        collection={{ name: "מאגר הנחיות", url: "/guidelines" }}
      />
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
        <nav
          aria-label="פירורי לחם"
          className="mb-4 text-xs text-gray-500 flex items-center flex-wrap gap-1"
          dir="rtl"
        >
          <Link href="/" className="hover:text-gray-800 hover:underline">ראשי</Link>
          <span aria-hidden="true">›</span>
          <Link href="/guidelines" className="hover:text-gray-800 hover:underline">מאגר הנחיות</Link>
          <span aria-hidden="true">›</span>
          <span className="text-gray-700 truncate max-w-[60%]">{name}</span>
        </nav>
        <GuidelineDetail doc={doc} />
        <RelatedDocs
          practice={practiceLinksForGuideline(doc.source_label)}
          related={related}
          relatedHeading={
            doc.source_label ? `הנחיות נוספות של ${doc.source_label.replace(/^הנחיות\s+/, "")}` : "הנחיות נוספות"
          }
          collection={{ href: "/guidelines", label: "לחיפוש במאגר ההנחיות המלא" }}
        />
      </Container>
    </PublicLayout>
  );
}
