import type { Metadata } from "next";
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

// Force-static — public demo only, no DB calls.
export const dynamic = "force-static";

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

export default function TimelineLandingPage() {
  return (
    <PublicLayout>
      <Container className="py-8">
        <div dir="rtl" className="space-y-4">
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
            style={{ height: "min(720px, 80vh)" }}
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
