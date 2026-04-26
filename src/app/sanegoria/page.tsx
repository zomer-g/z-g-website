import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import { SanegoriaDashboard } from "./sanegoria-dashboard";
import { getPageContent } from "@/lib/content";
import { auth } from "@/lib/auth";
import type { SanegoriaPageContent } from "@/types/content";
import { EditableSection } from "@/components/admin/editable-section";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "דשבורד סניגוריה ציבורית | ניתוח הליכים פליליים",
  description:
    "ניתוח ייצוג סניגוריה ציבורית בהליכים פליליים בישראל — השוואת תיקים, דיונים ועבירות",
};

export default async function SanegoriaPage() {
  const [content, session] = await Promise.all([
    getPageContent<SanegoriaPageContent>("sanegoria"),
    auth(),
  ]);

  const isAdmin = !!session?.user;
  if (!content.isPublic && !isAdmin) {
    notFound();
  }

  return (
    <PublicLayout>
      <EditableSection editHref="/admin/site-editor/sanegoria" editLabel="באנר">
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
        <SanegoriaDashboard disclaimerParagraphs={content.disclaimer.paragraphs} />
      </Container>
    </PublicLayout>
  );
}
