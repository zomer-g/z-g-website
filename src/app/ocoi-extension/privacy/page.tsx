import type { Metadata } from "next";
import { ExtensionPageShell } from "@/components/extension-pages/extension-page-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "מדיניות פרטיות — תוסף ניגוד עניינים לעם",
  description:
    "מדיניות פרטיות מלאה לתוסף הדפדפן OCOI: מה נשלח לשרת, מה לא נאסף, ואיך לבקש מחיקת נתונים.",
  alternates: { canonical: "/ocoi-extension/privacy" },
  robots: { index: true, follow: true },
};

export default function OcoiExtensionPrivacyPage() {
  return (
    <ExtensionPageShell
      slug="ocoi-extension-privacy"
      title="מדיניות פרטיות — תוסף ניגוד עניינים לעם"
      subtitle="מה נשלח לשרת, מה לא נאסף, ואיך לבקש מחיקה"
    />
  );
}
