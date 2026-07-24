import type { Metadata } from "next";
import { ExtensionPageShell } from "@/components/extension-pages/extension-page-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "תמיכה — מחבר Looker Studio של גרסאות לעם",
  description:
    "תמיכה במחבר ה-Looker Studio של גרסאות לעם: פתרונות לתקלות נפוצות (שגיאות SQL, timeout, מכסות, אישור המחבר) ודרכי פנייה.",
  alternates: { canonical: "/over-looker-support" },
  robots: { index: true, follow: true },
};

export default function OverLookerSupportPage() {
  return (
    <ExtensionPageShell
      slug="over-looker-support"
      title="תמיכה — מחבר Looker Studio"
      subtitle="פתרונות לתקלות הנפוצות בחיבור ובדוחות, ודרכי פנייה"
    />
  );
}
