import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import { ComptrollerDashboard } from "./comptroller-dashboard";
import { getPageContent } from "@/lib/content";
import { auth } from "@/lib/auth";
import type { ComptrollerReportsPageContent } from "@/types/content";
import { EditableSection } from "@/components/admin/editable-section";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "מאגר דוחות מבקר המדינה — חיפוש בתוכן",
  description:
    "מאגר דוחות מבקר המדינה של עו\"ד גיא זומר — חיפוש חופשי בתוך תוכן הדוחות, סינון לפי גוף מבוקר ותאריך, וגישה ישירה לקבצים המקוריים. שירות חינמי לציבור.",
  keywords: [
    "דוחות מבקר המדינה",
    "מבקר המדינה",
    "ביקורת המדינה",
    "דוח שנתי מבקר המדינה",
    "חיפוש בדוחות מבקר",
    "עו\"ד גיא זומר",
  ],
  alternates: {
    canonical: "/comptroller-reports",
  },
  openGraph: {
    type: "website",
    locale: "he_IL",
    url: "https://z-g.co.il/comptroller-reports",
    siteName: "עו\"ד גיא זומר",
    title: "מאגר דוחות מבקר המדינה — חיפוש בתוכן | עו\"ד גיא זומר",
    description:
      "חיפוש חופשי בתוך תוכן דוחות מבקר המדינה, עם סינון וגישה ישירה לקבצים המקוריים.",
    images: ["/images/guy-zomer.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "מאגר דוחות מבקר המדינה — חיפוש בתוכן | עו\"ד גיא זומר",
    description: "חיפוש חופשי בתוך תוכן דוחות מבקר המדינה.",
    images: ["/images/guy-zomer.jpg"],
  },
};

export default async function ComptrollerReportsPage() {
  const [content, session] = await Promise.all([
    getPageContent<ComptrollerReportsPageContent>("comptroller-reports"),
    auth(),
  ]);

  const isAdmin = session?.user?.role === "ADMIN";
  if (!content.isPublic && !isAdmin) {
    notFound();
  }

  return (
    <PublicLayout>
      <EditableSection editHref="/admin/site-editor/comptroller-reports" editLabel="באנר">
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
        <ComptrollerDashboard />
      </Container>
    </PublicLayout>
  );
}
