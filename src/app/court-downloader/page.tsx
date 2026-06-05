import type { Metadata } from "next";
import { ExtensionPageShell } from "@/components/extension-pages/extension-page-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "לץ המשפט",
  description:
    "תוסף Chrome לעורכי דין, מתמחים ובעלי דין: סימון מסמכים מרשימת מסמכי תיק בנט המשפט והורדת כולם כ-ZIP מסודר עם אינדקס CSV, או שליחה לשרת API אישי, Google Drive או Google Calendar — הכל מקומי בדפדפן, ללא שרת ביניים.",
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
