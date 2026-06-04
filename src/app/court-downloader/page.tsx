import type { Metadata } from "next";
import { ExtensionPageShell } from "@/components/extension-pages/extension-page-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "מוריד מסמכים אצווה — נט המשפט",
  description:
    "תוסף Chrome לעורכי דין: סימון מסמכים מרשימת מסמכי תיק בנט המשפט והורדת כולם כ-ZIP מסודר עם אינדקס CSV, או שליחה לשרת API אישי או ל-Google Drive — הכל מקומי בדפדפן, ללא שרת ביניים.",
  alternates: { canonical: "/court-downloader" },
};

export default function CourtDownloaderPage() {
  return (
    <ExtensionPageShell
      slug="court-downloader"
      title="מוריד מסמכים אצווה — נט המשפט"
      subtitle="תוסף Chrome לעורכי דין — הורדה אצווה של מסמכי תיק כ-ZIP אחד עם אינדקס CSV, או שליחה ליעדים שאתה מגדיר. הכל מקומי בדפדפן, ללא שרת ביניים."
    />
  );
}
