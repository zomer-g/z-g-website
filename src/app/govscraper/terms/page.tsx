import type { Metadata } from "next";
import { ExtensionPageShell } from "@/components/extension-pages/extension-page-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "תנאי שימוש — GovScraper",
  description:
    "תנאי השימוש בתוסף הדפדפן 'GovScraper': שימוש מותר, שימוש הוגן בשרתי המקור, אחריות המשתמש, אספקה כמות שהיא, הגבלת אחריות, מעמד בלתי-רשמי, ודין חל.",
  alternates: { canonical: "/govscraper/terms" },
  robots: { index: true, follow: true },
};

export default function GovScraperTermsPage() {
  return (
    <ExtensionPageShell
      slug="govscraper-terms"
      title="תנאי שימוש"
      subtitle="שימוש מותר, שימוש הוגן בשרתי המקור, אחריות המשתמש, ודין חל"
    />
  );
}
