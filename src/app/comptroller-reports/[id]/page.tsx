import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import { fetchComptrollerById } from "@/lib/comptroller-upstream";
import { ComptrollerDetail } from "./comptroller-detail";

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
      title: "דוח מבקר המדינה | עו\"ד גיא זומר",
      description: "דוח ממאגר דוחות מבקר המדינה.",
    };
  }
  const doc = await fetchComptrollerById(id).catch(() => null);
  if (!doc) {
    return {
      title: `דוח ${id} | מאגר דוחות מבקר המדינה`,
      description: "דוח ממאגר דוחות מבקר המדינה.",
    };
  }

  const title = `${doc.document_title || doc.filename || "דוח מבקר המדינה"} | דוחות מבקר המדינה`;
  const rawDesc = (doc.summary || doc.topic || "").replace(/\s+/g, " ").trim();
  const fallback = `דוח מבקר המדינה${doc.source_label ? ` — ${doc.source_label}` : ""}.`;
  const description =
    rawDesc.length > 200 ? `${rawDesc.slice(0, 197)}…` : rawDesc || fallback;

  return {
    title,
    description,
    openGraph: { title, description, type: "article" },
    twitter: { card: "summary", title, description },
  };
}

export default async function ComptrollerReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const doc = await fetchComptrollerById(id).catch(() => null);
  if (!doc) notFound();

  return (
    <PublicLayout>
      <section className="bg-gradient-to-br from-primary to-primary-dark py-8 sm:py-12">
        <Container>
          <div className="text-center">
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              דוחות מבקר המדינה
            </h2>
            <p className="text-white/80 text-sm mt-1">
              מאגר דוחות מבקר המדינה — חיפוש בתוכן וגישה לקבצים המקוריים
            </p>
          </div>
        </Container>
      </section>
      <Container className="py-8">
        <ComptrollerDetail doc={doc} />
      </Container>
    </PublicLayout>
  );
}
