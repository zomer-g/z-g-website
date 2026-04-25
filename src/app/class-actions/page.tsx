import type { Metadata } from "next";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import { ClassActionsDashboard } from "./class-actions-dashboard";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "תובענות ייצוגיות — תובענות אחרונות שהוגשו | זומר עורך דין",
  description:
    "רשימת תובענות ייצוגיות אחרונות שהוגשו בבתי המשפט בישראל, עם קישור לכתבי הטענות.",
};

export default function ClassActionsPage() {
  return (
    <PublicLayout>
      <section className="bg-gradient-to-br from-primary to-primary-dark py-12 sm:py-16">
        <Container>
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
              תובענות ייצוגיות — תובענות אחרונות
            </h1>
            <p className="text-primary-light/80 text-lg">
              רשימת התובענות הייצוגיות החדשות שנפתחו בפנקס
            </p>
          </div>
        </Container>
      </section>
      <Container className="py-8">
        <ClassActionsDashboard />
      </Container>
    </PublicLayout>
  );
}
