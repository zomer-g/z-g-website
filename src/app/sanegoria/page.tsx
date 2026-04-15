import type { Metadata } from "next";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import { SanegoriaDashboard } from "./sanegoria-dashboard";

export const revalidate = 3600; // ISR: regenerate every hour

export const metadata: Metadata = {
  title: "דשבורד סניגוריה ציבורית | ניתוח הליכים פליליים",
  description: "ניתוח ייצוג סניגוריה ציבורית בהליכים פליליים בישראל — השוואת תיקים, דיונים ועבירות",
};

export default function SanegoriaPage() {
  return (
    <PublicLayout>
      <section className="bg-gradient-to-br from-primary to-primary-dark py-12 sm:py-16">
        <Container>
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
              ניתוח ייצוג סניגוריה ציבורית
            </h1>
            <p className="text-primary-light/80 text-lg">
              הליכים פליליים בישראל — 2022 ואילך
            </p>
          </div>
        </Container>
      </section>
      <Container className="py-8">
        <SanegoriaDashboard />
      </Container>
    </PublicLayout>
  );
}
