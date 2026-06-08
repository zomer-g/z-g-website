import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import {
  WhatsappShell,
  timelineApiPaths,
} from "@/components/conversation/conversation-shell";
import {
  MOCK_TIMELINE_WORKSPACE,
  MOCK_TIMELINE_ITEMS,
  MOCK_TIMELINE_TAGS,
} from "@/components/whatsapp/timeline-mock";

export const metadata: Metadata = {
  title: "ציר זמן — הדגמת ממשק | זומר עורך דין",
  description:
    "הדגמה אינטראקטיבית של ממשק ציר הזמן לאיסוף וניתוח פעולות חקירה, תכתובות, פגישות והערות סביב תיק יחיד.",
  openGraph: {
    title: "ציר זמן — הדגמת ממשק",
    description:
      "הדגמה ויזואלית של ציר זמן רב-שכבתי. אין כאן נתונים אמיתיים — כולם דמה.",
    type: "website",
  },
};

// ?view=clean → bare shell, no page chrome (same set as /timeline/[slug]).
const CLEAN_VIEW_VALUES = new Set(["clean", "0", "embed", "raw"]);
function isCleanView(v: string | string[] | undefined): boolean {
  const s = Array.isArray(v) ? v[0] : v;
  return typeof s === "string" && CLEAN_VIEW_VALUES.has(s.toLowerCase());
}

export default async function TimelineLandingPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const sp = await searchParams;
  if (isCleanView(sp.view)) {
    return (
      <div dir="rtl" className="flex h-screen flex-col bg-[#dadbd3]">
        <WhatsappShell
          workspace={MOCK_TIMELINE_WORKSPACE}
          mode="mock"
          apiPaths={timelineApiPaths}
          mockItems={MOCK_TIMELINE_ITEMS}
          mockTags={MOCK_TIMELINE_TAGS}
        />
      </div>
    );
  }

  return (
    <PublicLayout>
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
              ציר זמן
            </h1>
            <p className="mt-2 text-sm text-gray-700 leading-relaxed">
              העמוד הזה מציג הדגמה של ממשק ציר זמן רב-שכבתי. כל
              האירועים שמופיעים כאן הם <strong>אירועי הדגמה סינתטיים</strong>{" "}
              ולא חומר מתיק אמיתי.
            </p>
            <div className="mt-2 inline-block rounded-md bg-yellow-50 border border-yellow-200 px-3 py-1 text-xs text-yellow-800">
              אזור עבודה אמיתי? התחברו דרך הכתובת הייעודית ששוּתפה אתכם.
            </div>
          </header>

          <div
            className="rounded-xl overflow-hidden border border-gray-200 shadow-sm"
            style={{ height: "calc(100dvh - 340px)", minHeight: "460px" }}
          >
            <div className="flex h-full min-h-0">
              <WhatsappShell
                workspace={MOCK_TIMELINE_WORKSPACE}
                mode="mock"
                apiPaths={timelineApiPaths}
                mockItems={MOCK_TIMELINE_ITEMS}
                mockTags={MOCK_TIMELINE_TAGS}
              />
            </div>
          </div>
        </div>
      </Container>
    </PublicLayout>
  );
}
