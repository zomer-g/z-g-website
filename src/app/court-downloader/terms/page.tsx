import type { Metadata } from "next";
import { ExtensionPageShell } from "@/components/extension-pages/extension-page-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "תנאי שימוש — מוריד מסמכים אצווה לנט המשפט",
  description:
    "תנאי השימוש בתוסף הדפדפן: שימוש מותר, אחריות המשתמש, אספקה כמות שהיא, הגבלת אחריות, אי-תלות ברשות השופטת, ודין חל.",
  alternates: { canonical: "/court-downloader/terms" },
  robots: { index: true, follow: true },
};

export default function CourtDownloaderTermsPage() {
  return (
    <ExtensionPageShell
      slug="court-downloader-terms"
      title="תנאי שימוש"
      subtitle="שימוש מותר, אחריות המשתמש, ודין חל"
    />
  );
}
