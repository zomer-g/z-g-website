import type { Metadata } from "next";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import { prisma } from "@/lib/prisma";
import { TipTapRenderer } from "@/components/tiptap-renderer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "מדיניות פרטיות — איתור אסמכתאות משפטיות",
  description: "מדיניות הפרטיות של תוסף איתור אסמכתאות משפטיות לדפדפן Chrome.",
};

async function getContent() {
  try {
    const page = await prisma.page.findUnique({ where: { slug: "case-tracker-privacy" }, select: { content: true } });
    if (page?.content && typeof page.content === "object" && (page.content as Record<string, unknown>).type === "doc") {
      return page.content as Record<string, unknown>;
    }
    return null;
  } catch { return null; }
}

export default async function CaseTrackerPrivacyPage() {
  const content = await getContent();

  return (
    <PublicLayout>
      <section className="bg-primary py-16 sm:py-20 text-center">
        <Container>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">מדיניות פרטיות — איתור אסמכתאות משפטיות</h1>
          <p className="mt-4 text-lg text-white/80">Privacy Policy — Israeli Legal Case Finder</p>
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
