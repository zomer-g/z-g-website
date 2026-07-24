import type { Metadata } from "next";
import { ExtensionPageShell } from "@/components/extension-pages/extension-page-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "מדיניות פרטיות — מחבר Looker Studio של גרסאות לעם",
  description:
    "מדיניות פרטיות למחבר ה-Looker Studio של גרסאות לעם: מה נשלח לשרת, למה המחבר אינו ניגש בחשבון Google, ומה נשמר ביומני התפעול.",
  alternates: { canonical: "/over-looker-privacy" },
  robots: { index: true, follow: true },
};

export default function OverLookerPrivacyPage() {
  return (
    <ExtensionPageShell
      slug="over-looker-privacy"
      title="מדיניות פרטיות — מחבר Looker Studio"
      subtitle="מה נשלח לשרת, מה לא נאסף, ומה מנוהל אצל Google"
    />
  );
}
