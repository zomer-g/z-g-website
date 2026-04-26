import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import { ClassActionsDashboard } from "./class-actions-dashboard";
import { getPageContent } from "@/lib/content";
import { auth } from "@/lib/auth";
import type { ClassActionsPageContent } from "@/types/content";
import { EditableSection } from "@/components/admin/editable-section";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "תובענות ייצוגיות — תובענות אחרונות שהוגשו | זומר עורך דין",
  description:
    "רשימת תובענות ייצוגיות אחרונות שהוגשו בבתי המשפט בישראל, עם קישור לכתבי הטענות.",
};

export default async function ClassActionsPage() {
  const [content, session] = await Promise.all([
    getPageContent<ClassActionsPageContent>("class-actions"),
    auth(),
  ]);

  const isAdmin = !!session?.user;
  if (!content.isPublic && !isAdmin) {
    notFound();
  }

  return (
    <PublicLayout>
      <EditableSection editHref="/admin/site-editor/class-actions" editLabel="באנר">
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
        <ClassActionsDashboard />
      </Container>
    </PublicLayout>
  );
}
