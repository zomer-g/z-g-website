import type { Metadata } from "next";
import { ExtensionPageShell } from "@/components/extension-pages/extension-page-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "לץ המשפט",
  description:
    "תוסף Chrome לעורכי דין, מתמחים ובעלי דין: מזהה תיק בנט המשפט ומוריד את כל המסמכים כ-ZIP עם אינדקס CSV, ורשימות דיונים כ-CSV/ICS, כולל סנכרון ל-Google Calendar. יעדים: הורדה מקומית, Google Drive או שרת API אישי — הכל מקומי בדפדפן, ללא שרת ביניים.",
  alternates: { canonical: "/court-downloader" },
};

export default function CourtDownloaderPage() {
  return (
    <ExtensionPageShell
      slug="court-downloader"
      title="לץ המשפט"
      subtitle="תוסף Chrome לעורכי דין, מתמחים ובעלי דין המנהלים תיקים בנט המשפט."
    />
  );
}
