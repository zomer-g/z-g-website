import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import { WorkflowsShell } from "@/components/workflows/workflows-shell";

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

// ?view=clean → bare shell, no page chrome.
const CLEAN_VIEW_VALUES = new Set(["clean", "0", "embed", "raw"]);
function isCleanView(v: string | string[] | undefined): boolean {
  const s = Array.isArray(v) ? v[0] : v;
  return typeof s === "string" && CLEAN_VIEW_VALUES.has(s.toLowerCase());
}

export default async function WorkflowsLandingPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const sp = await searchParams;
  if (isCleanView(sp.view)) {
    return (
      <div dir="rtl" className="flex h-screen flex-col bg-[#dadbd3]">
        <WorkflowsShell title="תצוגה לדוגמה — תהליכי עבודה" />
      </div>
    );
  }

  return (
    <PublicLayout>
      {/* pt-12/16 leaves clear breathing room under the sticky site
          header — otherwise the h1 sits flush against it. pb-8 keeps
          the bottom spacing modest. */}
      <Container className="pt-12 sm:pt-16 pb-8">
        <div dir="rtl" className="space-y-4">
          <div>
            <Link
              href="/digital-services"
              className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-primary-dark transition-colors mb-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded"
            >
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
              <span>חזרה לשירותים דיגיטליים</span>
            </Link>
          </div>
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
            style={{ height: "calc(100dvh - 365px)", minHeight: "460px" }}
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
