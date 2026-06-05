import type { Metadata } from "next";
import { ExtensionPageShell } from "@/components/extension-pages/extension-page-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "מדיניות פרטיות — לץ המשפט",
  description:
    "מדיניות פרטיות מלאה לתוסף הדפדפן 'לץ המשפט': כל העיבוד נשאר במחשב המשתמש. אין שרת ביניים, אין אנליטיקס, אין טלמטריה. סיווג נתונים לפי Chrome Web Store.",
  alternates: { canonical: "/court-downloader/privacy" },
  robots: { index: true, follow: true },
};

export default function CourtDownloaderPrivacyPage() {
  return (
    <ExtensionPageShell
      slug="court-downloader-privacy"
      title="מדיניות פרטיות"
      subtitle="מה התוסף עושה במחשב שלך, מה הוא לא עושה, ואילו הרשאות הוא מבקש"
    />
  );
}
