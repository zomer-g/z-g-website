import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import { getPageContent } from "@/lib/content";
import { auth } from "@/lib/auth";
import type { FoiJudgmentsPageContent } from "@/types/content";
import { EditableSection } from "@/components/admin/editable-section";
import { RulingsList } from "../rulings/rulings-list";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "פסיקות חופש מידע | זומר עורך דין",
  description:
    "רשימת פסקי דין בעתירות לפי חוק חופש המידע מבתי המשפט בישראל, מהחדש לישן.",
};

export default async function FoiJudgmentsPage() {
  const [content, session] = await Promise.all([
    getPageContent<FoiJudgmentsPageContent>("foi-judgments"),
    auth(),
  ]);

  const isAdmin = session?.user?.role === "ADMIN";
  if (!content.isPublic && !isAdmin) {
    notFound();
  }

  return (
    <PublicLayout>
      <EditableSection
        editHref="/admin/site-editor/foi-judgments"
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
        <RulingsList category="foi-judgments" />
      </Container>
    </PublicLayout>
  );
}
