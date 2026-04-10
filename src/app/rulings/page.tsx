import type { Metadata } from "next";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import { RulingsClient } from "./rulings-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "עדכוני פסיקה",
  description: "מאגר החלטות ופסקי דין עדכניים בתחומים נבחרים",
  robots: { index: false, follow: false },
};

export default function RulingsPage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="bg-primary py-16 sm:py-20">
        <Container>
          <div className="text-center">
            <div className="mx-auto mb-4 h-1 w-16 rounded-full bg-accent" aria-hidden="true" />
            <h1 className="text-3xl font-bold leading-snug tracking-tight text-white sm:text-4xl lg:text-5xl">
              עדכוני פסיקה
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-white/80">
              מאגר החלטות ופסקי דין עדכניים בתחומים נבחרים
            </p>
          </div>
        </Container>
      </section>

      {/* Client-side interactive section */}
      <RulingsClient />
    </PublicLayout>
  );
}
