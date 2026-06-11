import type { Metadata } from "next";
import { ExtensionPageShell } from "@/components/extension-pages/extension-page-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "GovScraper — מוריד מאגרי ממשלה",
  description:
    "תוסף Chrome שמזהה מאגרי נתונים פתוחים באתרי ממשלה ישראליים (gov.il, nadlan.gov.il, govmap.gov.il, idf.il) ומאפשר להוריד אותם בלחיצה אחת כ-CSV/ZIP — הכל מקומי בדפדפן, ללא שרת ביניים. חלק ממיזם השקיפות גרסאות לעם (over.org.il).",
  alternates: { canonical: "/govscraper" },
};

export default function GovScraperPage() {
  return (
    <ExtensionPageShell
      slug="govscraper"
      title="GovScraper — מוריד מאגרי ממשלה"
      subtitle="תוסף Chrome שהופך כל מאגר נתונים פתוח באתרי ממשלה לקובץ מסודר בלחיצה אחת."
    />
  );
}
