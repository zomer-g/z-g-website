import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import { WhatsappShell } from "@/components/conversation/conversation-shell";
import { MOCK_WORKSPACE, MOCK_ITEMS } from "@/components/whatsapp/mock-data";

// Force-static — this page never reads from the DB. Synthetic chats only.
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "תצוגת ווטסאפ — הדגמת ממשק | זומר עורך דין",
  description:
    "הדגמה אינטראקטיבית של ממשק WhatsApp Web/Mobile ששימוש בו לבחינת חומרי ראייה ולהצגת התכתבויות.",
  openGraph: {
    title: "תצוגת ווטסאפ — הדגמת ממשק",
    description:
      "הדגמה ויזואלית של ממשק ווטסאפ. אין כאן שיחות אמיתיות — כולן דמה.",
    type: "website",
  },
};

export default function WhatsappLandingPage() {
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
              תצוגת ווטסאפ
            </h1>
            <p className="mt-2 text-sm text-gray-700 leading-relaxed">
              העמוד הזה מציג הדגמה ויזואלית של ממשק WhatsApp Web. כל
              השיחות שמופיעות כאן הן <strong>שיחות הדגמה סינתטיות</strong>{" "}
              ולא תכתובות אמיתיות.
            </p>
            <div className="mt-2 inline-block rounded-md bg-yellow-50 border border-yellow-200 px-3 py-1 text-xs text-yellow-800">
              אזור עבודה אמיתי? התחברו דרך הכתובת הייעודית ששוּתפה אתכם.
            </div>
          </header>

          <div
            className="rounded-xl overflow-hidden border border-gray-200 shadow-sm"
            // Fixed visual height so the chat sample feels like the
            // real app even on a tall landing page.
            style={{ height: "calc(100dvh - 340px)", minHeight: "460px" }}
          >
            <div className="flex h-full min-h-0">
              <WhatsappShell
                workspace={MOCK_WORKSPACE}
                mode="mock"
                mockItems={MOCK_ITEMS}
              />
            </div>
          </div>
        </div>
      </Container>
    </PublicLayout>
  );
}
