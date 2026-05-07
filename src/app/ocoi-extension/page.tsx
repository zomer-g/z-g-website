import type { Metadata } from "next";
import { ExtensionPageShell } from "@/components/extension-pages/extension-page-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "תוסף הניגוד עניינים לעם — OCOI",
  description:
    "תוסף חינמי לדפדפן Chrome — מסמן בכל אתר את אישי הציבור, החברות והעמותות שמופיעים ב-OCOI ומציג את מפת הקשרים שלהם בלחיצה אחת.",
  alternates: { canonical: "/ocoi-extension" },
};

export default function OcoiExtensionPage() {
  return (
    <ExtensionPageShell
      slug="ocoi-extension"
      title="תוסף הניגוד עניינים לעם"
      subtitle="תוסף חינמי לדפדפן Chrome — מסמן בכל אתר אישי ציבור, חברות ועמותות מתוך OCOI ומציג את מפת הקשרים שלהם בלחיצה אחת."
    />
  );
}
