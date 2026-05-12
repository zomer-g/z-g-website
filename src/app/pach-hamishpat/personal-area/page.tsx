import type { Metadata } from "next";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import { PersonalArea } from "./personal-area";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "אזור אישי חדש — פח המשפט",
  description:
    "אזור אישי חדש בפח המשפט — סטטוס מעודכן ופעולות דיווח מהירות.",
  alternates: { canonical: "/pach-hamishpat/personal-area" },
};

export default function PachPersonalAreaPage() {
  return (
    <PublicLayout>
      <section className="py-12 sm:py-16" style={{ backgroundColor: "#EAF2FD" }}>
        <Container>
          <PersonalArea />
        </Container>
      </section>
    </PublicLayout>
  );
}
