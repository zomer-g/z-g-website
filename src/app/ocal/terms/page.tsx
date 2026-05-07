import type { Metadata } from "next";
import { ExtensionPageShell } from "@/components/extension-pages/extension-page-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "תנאי שימוש — תוסף Ocal",
  description:
    "תנאי השימוש בתוסף הדפדפן Ocal: היקף השירות, הגבלת אחריות, מקורות הנתונים, והתחייבויות הצדדים.",
  alternates: { canonical: "/ocal/terms" },
};

export default function OcalTermsPage() {
  return (
    <ExtensionPageShell
      slug="ocal-terms"
      title="תנאי שימוש — תוסף Ocal"
      subtitle="היקף השירות, מקורות הנתונים והגבלת אחריות"
    />
  );
}
