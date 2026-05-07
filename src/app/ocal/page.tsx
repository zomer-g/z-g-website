import type { Metadata } from "next";
import { ExtensionPageShell } from "@/components/extension-pages/extension-page-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ocal — תוסף לכרום לחיפוש פגישות של נבחרי ציבור",
  description:
    "תוסף חינמי לדפדפן Chrome המסמן בכל דף שמות של נבחרי ציבור ובכירי ממשל ישראלים, ומציג בריחוף עכבר את הפגישות האחרונות שלהם מתוך ocal.org.il.",
  alternates: { canonical: "/ocal" },
};

export default function OcalPage() {
  return (
    <ExtensionPageShell
      slug="ocal"
      title="Ocal"
      subtitle="תוסף חינמי ל-Chrome לחיפוש פגישות של נבחרי ציבור"
    />
  );
}
