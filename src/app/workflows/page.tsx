import type { Metadata } from "next";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import { WorkflowsShell } from "@/components/workflows/workflows-shell";

// Force-static — public demo only, the entire workspace is session-local.
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "ניהול תהליכי עבודה — הדגמת ממשק | זומר עורך דין",
  description:
    "הדגמה אינטראקטיבית של ממשק לניהול תהליכי עבודה משפטיים: רשימת ישויות (לקוחות, משטרה, פרקליטות) לצד רשימת תהליכים (עיון, הוכחות, הסדר). כל אירוע מתויג בכמה ממדים, וניתן להוסיף אירועים חדשים לסשן.",
  openGraph: {
    title: "ניהול תהליכי עבודה — הדגמת ממשק",
    description:
      "ממשק הדגמה לניהול תהליכים משפטיים — אירועים מתויגים לפי ישות ולפי תהליך.",
    type: "website",
  },
};

export default function WorkflowsLandingPage() {
  return (
    <PublicLayout>
      <Container className="py-8">
        <div dir="rtl" className="space-y-4">
          <header className="text-center max-w-2xl mx-auto">
            <h1 className="text-2xl sm:text-3xl font-bold text-primary-dark">
              ניהול תהליכי עבודה
            </h1>
            <p className="mt-2 text-sm text-gray-700 leading-relaxed">
              הדגמה של ממשק לניהול תהליכי עבודה משפטיים. אותו אירוע יכול
              להופיע תחת מספר ישויות (לקוח, תחנת משטרה, פרקליטות) ותחת מספר
              תהליכים (עיון בחומר חקירה, הוכחות, פגישת הסדר). אפשר להוסיף
              אירוע חדש בתחתית — הוא נשמר רק בסשן הזה ויימחק ברענון
              הדפדפן.
            </p>
            <div className="mt-2 inline-block rounded-md bg-yellow-50 border border-yellow-200 px-3 py-1 text-xs text-yellow-800">
              אזור עבודה אמיתי? התחברו דרך הכתובת הייעודית ששוּתפה אתכם.
            </div>
          </header>

          <div
            className="rounded-xl overflow-hidden border border-gray-200 shadow-sm"
            style={{ height: "min(880px, 85vh)", minHeight: "560px" }}
          >
            <div className="flex h-full min-h-0">
              <WorkflowsShell title="תצוגה לדוגמה — תהליכי עבודה" />
            </div>
          </div>
        </div>
      </Container>
    </PublicLayout>
  );
}
