import type { Metadata } from "next";
import { ExtensionPageShell } from "@/components/extension-pages/extension-page-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "לץ הממשל — מוריד מאגרי ממשלה",
  description:
    "תוסף Chrome שמזהה מאגרי נתונים פתוחים באתרי ממשלה ישראליים (gov.il, נדל\"ן, GovMap, מנהל התכנון, צה\"ל וחצב) ומאפשר להוריד אותם בלחיצה אחת כ-CSV/GeoJSON/ZIP — הכל מקומי בדפדפן, ללא שרת ביניים. חלק ממיזם השקיפות גרסאות לעם (over.org.il).",
  alternates: { canonical: "/govscraper" },
};

export default function GovScraperPage() {
  return (
    <ExtensionPageShell
      slug="govscraper"
      title="לץ הממשל"
      subtitle="תוסף Chrome שהופך כל מאגר נתונים פתוח באתרי ממשלה לקובץ מסודר בלחיצה אחת."
      englishLabel="GovScraper"
    />
  );
}
