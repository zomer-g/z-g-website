import type { Metadata } from "next";
import { ExtensionPageShell } from "@/components/extension-pages/extension-page-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "תנאי שימוש — תוסף ניגוד עניינים לעם",
  description:
    "תנאי השימוש בתוסף הדפדפן OCOI: היקף השירות, הגבלת אחריות, מקורות הנתונים, והתחייבויות הצדדים.",
  alternates: { canonical: "/ocoi-extension/terms" },
};

export default function OcoiExtensionTermsPage() {
  return (
    <ExtensionPageShell
      slug="ocoi-extension-terms"
      title="תנאי שימוש — תוסף ניגוד עניינים לעם"
      subtitle="היקף השירות, מקורות הנתונים והגבלת אחריות"
    />
  );
}
