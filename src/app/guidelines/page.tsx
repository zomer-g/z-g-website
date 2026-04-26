import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import { GuidelinesDashboard } from "./guidelines-dashboard";
import { getPageContent } from "@/lib/content";
import { auth } from "@/lib/auth";
import type { GuidelinesPageContent } from "@/types/content";
import { EditableSection } from "@/components/admin/editable-section";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "הנחיות | זומר עורך דין",
  description:
    "מאגר הנחיות יועמ\"ש, פרקליט המדינה, משטרה ועוד — חיפוש מלא בתוכן ההנחיות וגישה ישירה לקבצים המקוריים.",
};

export default async function GuidelinesPage() {
  const [content, session] = await Promise.all([
    getPageContent<GuidelinesPageContent>("guidelines"),
    auth(),
  ]);

  const isAdmin = !!session?.user;
  if (!content.isPublic && !isAdmin) {
    notFound();
  }

  return (
    <PublicLayout>
      <EditableSection editHref="/admin/site-editor/guidelines" editLabel="באנר">
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
        <GuidelinesDashboard />
      </Container>
    </PublicLayout>
  );
}
