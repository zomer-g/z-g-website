import type { Metadata } from "next";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import { PachDashboard } from "./pach-dashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "פח המשפט — סטטוס נט המשפט בזמן אמת",
  description:
    "פלטפורמה קהילתית לדיווח על תקלות במערכת נט המשפט. סטטוס בזמן אמת, דיווחי משתמשים והודעות מערכת — הכל במקום אחד.",
  alternates: { canonical: "/pach-hamishpat" },
  openGraph: {
    type: "website",
    locale: "he_IL",
    url: "https://z-g.co.il/pach-hamishpat",
    siteName: "עו\"ד גיא זומר",
    title: "פח המשפט — סטטוס נט המשפט בזמן אמת",
    description:
      "פלטפורמה קהילתית לדיווח על תקלות במערכת נט המשפט. סטטוס בזמן אמת, דיווחי משתמשים והודעות מערכת.",
  },
};

export default function PachHamishpatPage() {
  return (
    <PublicLayout>
      {/* Hero — same shape as /legal-tools and /case-tracker so the page
          feels integrated with the rest of the projects series. */}
      <section className="bg-primary py-16 sm:py-20 text-center">
        <Container>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            פח המשפט
          </h1>
          <p className="mt-4 text-lg text-white/80 max-w-2xl mx-auto">
            פלטפורמה קהילתית לדיווח על סטטוס נט המשפט בזמן אמת — דיווחים, הודעות
            מערכת ועדכוני מנהל.
          </p>
        </Container>
      </section>

      <section className="py-12 sm:py-16">
        <Container>
          <PachDashboard />
        </Container>
      </section>
    </PublicLayout>
  );
}
