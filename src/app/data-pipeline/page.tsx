import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import { getPageContent } from "@/lib/content";
import { auth } from "@/lib/auth";
import type { DataPipelinePageContent } from "@/types/content";
import { EditableSection } from "@/components/admin/editable-section";
import { PipelineMap } from "./PipelineMap";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: 'זרימת המידע | עו"ד גיא זומר',
  description:
    "מפה אינטראקטיבית של זרימת המידע בין הפרויקטים: סקרייפרים שאוספים מבתי המשפט ומאתרי ממשלה, מערכות ניהול המסמכים והמאגרים, ושורת האתרים והדשבורדים שניזונים מהם.",
};

export default async function DataPipelinePage() {
  const [content, session] = await Promise.all([
    getPageContent<DataPipelinePageContent>("data-pipeline"),
    auth(),
  ]);

  const isAdmin = session?.user?.role === "ADMIN";
  if (!content.isPublic && !isAdmin) {
    notFound();
  }

  return (
    <PublicLayout>
      {/* ── Hero ── */}
      <EditableSection editHref="/admin/site-editor/data-pipeline" editLabel="באנר">
        <section className="bg-primary py-16 sm:py-20" aria-labelledby="pipeline-heading">
          <Container className="text-center">
            <div className="mx-auto mb-4 h-1 w-16 rounded-full bg-accent" aria-hidden="true" />
            <h1
              id="pipeline-heading"
              className="text-3xl font-bold leading-snug tracking-tight text-white sm:text-4xl lg:text-5xl"
            >
              {content.hero.title}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-white/80">
              {content.hero.subtitle}
            </p>
          </Container>
        </section>
      </EditableSection>

      {/* ── Map ── */}
      <section className="relative bg-muted-bg py-16 sm:py-20">
        <div
          className="absolute inset-0 opacity-[0.03]"
          aria-hidden="true"
          style={{
            backgroundImage:
              "radial-gradient(circle, var(--primary) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <Container className="relative">
          <p className="mx-auto mb-12 max-w-xl text-center text-sm text-muted">
            לחצו על כל תיבה כדי לקרוא הסבר קצר על הפרויקט, מה הוא עושה ולאן המידע ממנו זורם.
          </p>
          <PipelineMap />
        </Container>
      </section>
    </PublicLayout>
  );
}
