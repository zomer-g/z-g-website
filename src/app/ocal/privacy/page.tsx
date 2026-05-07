import type { Metadata } from "next";
import { ExtensionPageShell } from "@/components/extension-pages/extension-page-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "מדיניות פרטיות — תוסף Ocal",
  description:
    "מדיניות פרטיות מלאה לתוסף הדפדפן Ocal: איזה מידע נשלח לשרת, איזה מידע לא נאסף, ומי המפתח האחראי.",
  alternates: { canonical: "/ocal/privacy" },
  robots: { index: true, follow: true },
};

export default function OcalPrivacyPage() {
  return (
    <ExtensionPageShell
      slug="ocal-privacy"
      title="מדיניות פרטיות — תוסף Ocal"
      subtitle="איזה מידע נשלח, איזה לא נאסף, ומי האחראי"
    />
  );
}
