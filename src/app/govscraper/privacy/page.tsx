import type { Metadata } from "next";
import { ExtensionPageShell } from "@/components/extension-pages/extension-page-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "מדיניות פרטיות — GovScraper",
  description:
    "מדיניות פרטיות מלאה לתוסף הדפדפן 'GovScraper': כל העיבוד נשאר במחשב המשתמש. אין שרת ביניים, אין אנליטיקס, אין טלמטריה. סיווג נתונים לפי Chrome Web Store.",
  alternates: { canonical: "/govscraper/privacy" },
  robots: { index: true, follow: true },
};

export default function GovScraperPrivacyPage() {
  return (
    <ExtensionPageShell
      slug="govscraper-privacy"
      title="מדיניות פרטיות"
      subtitle="מה התוסף עושה במחשב שלך, מה הוא לא עושה, ואילו הרשאות הוא מבקש"
    />
  );
}
