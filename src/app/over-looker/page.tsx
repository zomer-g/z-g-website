import type { Metadata } from "next";
import { ExtensionPageShell } from "@/components/extension-pages/extension-page-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "מחבר Looker Studio — גרסאות לעם",
  description:
    "מחבר (Community Connector) שמזרים כל טבלה או שאילתת SQL ממאגר גרסאות לעם ישירות ל-Looker Studio: מאגרי data.gov.il, מסד הנתונים של הכנסת, החלטות ממשלה ועוד. חינם, ללא הרשמה, בקריאה בלבד.",
  alternates: { canonical: "/over-looker" },
};

export default function OverLookerPage() {
  return (
    <ExtensionPageShell
      slug="over-looker"
      title="מחבר Looker Studio של גרסאות לעם"
      subtitle="חיבור ישיר בין המאגר הציבורי של גרסאות לעם ל-Looker Studio — דשבורדים חיים על נתונים ממשלתיים, בקריאה בלבד."
    />
  );
}
