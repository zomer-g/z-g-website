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
  title: "מאגר הנחיות יועמ\"ש, פרקליט המדינה ומשטרה",
  description:
    "מאגר ההנחיות הציבורי של עו\"ד גיא זומר — חיפוש מלא בהנחיות יועמ\"ש, הנחיות פרקליט המדינה, נהלי משטרה והנחיות רשויות אכיפה נוספות, עם גישה ישירה לקבצים המקוריים. שירות חינמי לציבור.",
  keywords: [
    "מאגר הנחיות",
    "הנחיות יועמ\"ש",
    "הנחיות היועץ המשפטי לממשלה",
    "הנחיות פרקליט המדינה",
    "נהלי משטרה",
    "הנחיות רשויות",
    "גיא זומר הנחיות",
    "עו\"ד גיא זומר",
  ],
  alternates: {
    canonical: "/guidelines",
  },
  openGraph: {
    type: "website",
    locale: "he_IL",
    url: "https://z-g.co.il/guidelines",
    siteName: "עו\"ד גיא זומר",
    title: "מאגר הנחיות יועמ\"ש, פרקליט המדינה ומשטרה | עו\"ד גיא זומר",
    description:
      "חיפוש מלא במאגר ההנחיות הציבורי הגדול בישראל — הנחיות יועמ\"ש, פרקליט המדינה, נהלי משטרה ועוד. גישה ישירה לקבצים המקוריים.",
    images: ["/images/guy-zomer.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "מאגר הנחיות יועמ\"ש, פרקליט המדינה ומשטרה | עו\"ד גיא זומר",
    description:
      "חיפוש מלא במאגר ההנחיות הציבורי — הנחיות יועמ\"ש, פרקליט המדינה, נהלי משטרה ועוד.",
    images: ["/images/guy-zomer.jpg"],
  },
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
