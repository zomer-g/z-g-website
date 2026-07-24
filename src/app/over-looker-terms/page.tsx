import type { Metadata } from "next";
import { ExtensionPageShell } from "@/components/extension-pages/extension-page-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "תנאי שימוש — מחבר Looker Studio של גרסאות לעם",
  description:
    "תנאי השימוש במחבר ה-Looker Studio של גרסאות לעם: מהות השירות, מקור הנתונים והגבלת אחריות, שימוש הוגן ומכסות, ודין וסמכות שיפוט.",
  alternates: { canonical: "/over-looker-terms" },
  robots: { index: true, follow: true },
};

export default function OverLookerTermsPage() {
  return (
    <ExtensionPageShell
      slug="over-looker-terms"
      title="תנאי שימוש — מחבר Looker Studio"
      subtitle="השירות, הנתונים, שימוש הוגן ואחריות"
    />
  );
}
