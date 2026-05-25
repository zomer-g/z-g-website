import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import { ConditionalArrangementsDashboard } from "./conditional-arrangements-dashboard";
import { getPageContent } from "@/lib/content";
import { auth } from "@/lib/auth";
import type { ConditionalArrangementsPageContent } from "@/types/content";
import { EditableSection } from "@/components/admin/editable-section";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "הסדרים מותנים — משטרה ופרקליטות | זומר עורך דין",
  description:
    "מאגר הסדרים מותנים של המשטרה והפרקליטות — חיפוש, סינון ומיון לפי מקור, תאריך, עבירה ומחוז.",
};

export default async function ConditionalArrangementsPage() {
  const [content, session] = await Promise.all([
    getPageContent<ConditionalArrangementsPageContent>("conditional-arrangements"),
    auth(),
  ]);

  const isAdmin = session?.user?.role === "ADMIN";
  if (!content.isPublic && !isAdmin) {
    notFound();
  }

  return (
    <PublicLayout>
      <EditableSection
        editHref="/admin/site-editor/conditional-arrangements"
        editLabel="באנר"
      >
        <section className="bg-gradient-to-br from-primary to-primary-dark py-12 sm:py-16">
          <Container>
            <div className="text-center">
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
                {content.hero.title}
              </h1>
              <p className="text-white text-lg">{content.hero.subtitle}</p>
            </div>
          </Container>
        </section>
      </EditableSection>
      <Container className="py-8">
        <ConditionalArrangementsDashboard />
      </Container>
    </PublicLayout>
  );
}
