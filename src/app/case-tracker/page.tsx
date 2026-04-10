import type { Metadata } from "next";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import { prisma } from "@/lib/prisma";
import { TipTapRenderer } from "@/components/tiptap-renderer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "איתור אסמכתאות משפטיות | תוסף דפדפן",
  description: "תוסף חינמי לדפדפן Chrome המזהה אסמכתאות לתיקים משפטיים ישראליים בדפי אינטרנט ומציג תקצירי פסיקה.",
};

async function getContent() {
  try {
    const page = await prisma.page.findUnique({ where: { slug: "case-tracker" }, select: { content: true } });
    if (page?.content && typeof page.content === "object" && (page.content as Record<string, unknown>).type === "doc") {
      return page.content as Record<string, unknown>;
    }
    return null;
  } catch { return null; }
}

export default async function CaseTrackerPage() {
  const content = await getContent();

  return (
    <PublicLayout>
      <section className="bg-primary py-16 sm:py-20 text-center">
        <Container>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">איתור אסמכתאות משפטיות</h1>
          <p className="mt-4 text-lg text-white/80 max-w-2xl mx-auto">תוסף חינמי לדפדפן Chrome לעורכי דין, חוקרים ואנשי מקצוע משפטיים</p>
          <p className="mt-2 text-sm text-white/50">Israeli Legal Case Finder — Chrome Extension</p>
        </Container>
      </section>

      <section className="py-16">
        <Container narrow>
          {content ? (
            <div className="prose-rtl"><TipTapRenderer content={content} /></div>
          ) : (
            <p className="text-muted">תוכן בטעינה...</p>
          )}
        </Container>
      </section>
    </PublicLayout>
  );
}
