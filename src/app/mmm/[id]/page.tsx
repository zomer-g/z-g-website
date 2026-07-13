import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import { fetchMmmById } from "@/lib/mmm-upstream";
import { MmmDetail } from "./mmm-detail";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id) || id <= 0) {
    return {
      title: "מסמך מרכז המחקר והמידע של הכנסת | עו\"ד גיא זומר",
      description: "מסמך ממאגר מרכז המחקר והמידע של הכנסת (מ.מ.מ).",
    };
  }
  const doc = await fetchMmmById(id).catch(() => null);
  if (!doc) {
    return {
      title: `מסמך ${id} | מאגר מרכז המחקר והמידע של הכנסת`,
      description: "מסמך ממאגר מרכז המחקר והמידע של הכנסת (מ.מ.מ).",
    };
  }

  const title = `${doc.document_title || doc.filename || "מסמך מרכז המחקר והמידע"} | מסמכי מ.מ.מ`;
  const rawDesc = (doc.summary || doc.topic || "").replace(/\s+/g, " ").trim();
  const fallback = `מסמך מרכז המחקר והמידע של הכנסת${doc.doc_type ? ` — ${doc.doc_type}` : ""}.`;
  const description =
    rawDesc.length > 200 ? `${rawDesc.slice(0, 197)}…` : rawDesc || fallback;

  return {
    title,
    description,
    openGraph: { title, description, type: "article" },
    twitter: { card: "summary", title, description },
  };
}

export default async function MmmDocDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const doc = await fetchMmmById(id).catch(() => null);
  if (!doc) notFound();

  return (
    <PublicLayout>
      <section className="bg-gradient-to-br from-primary to-primary-dark py-8 sm:py-12">
        <Container>
          <div className="text-center">
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              מסמכי מרכז המחקר והמידע של הכנסת
            </h2>
            <p className="text-white/80 text-sm mt-1">
              חיפוש בתוכן המסמכים וגישה לקבצים המקוריים
            </p>
          </div>
        </Container>
      </section>
      <Container className="py-8">
        <MmmDetail doc={doc} />
      </Container>
    </PublicLayout>
  );
}
