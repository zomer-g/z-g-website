import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import { ConditionalArrangementsDashboard } from "./conditional-arrangements-dashboard";
import { getPageContent } from "@/lib/content";
import { auth } from "@/lib/auth";
import type { ConditionalArrangementsPageContent } from "@/types/content";
import { EditableSection } from "@/components/admin/editable-section";
import {
  getCachedDefaultPage,
  getFacets,
  ensureData,
  SyncInProgressError,
} from "@/lib/conditional-arrangements-db";
import type { ArrangementsResponse, ArrangementsFacets } from "@/types/conditional-arrangement";

// Remove force-dynamic so Next.js can cooperate with unstable_cache for the
// initial records + facets queries. The page still renders dynamically because
// it calls auth() and getPageContent() which read cookies/DB at runtime.
// Removing force-dynamic lets the getCachedDefaultPage / getFacets cache work.

export const metadata: Metadata = {
  title: "הסדרים מותנים — משטרה, פרקליטות ומשרד העבודה | זומר עורך דין",
  description:
    "מאגר הסדרים מותנים של המשטרה, הפרקליטות ומשרד העבודה — חיפוש, סינון ומיון לפי מקור, תאריך, עבירה ומחוז.",
};

export default async function ConditionalArrangementsPage() {
  const [content, session] = await Promise.all([
    getPageContent<ConditionalArrangementsPageContent>("conditional-arrangements"),
    auth(),
  ]);

  const isAdmin = session?.user?.role === "ADMIN";
  if (!content.isPublic && !isAdmin) {
    notFound();
  }

  // Pre-fetch the default first page + facets server-side so the dashboard
  // renders real cards immediately — no loading skeleton on first paint.
  // Both calls use unstable_cache so they only hit the DB once per 60 s.
  // If the DB is empty (initial sync in progress) we fall back gracefully
  // and the dashboard handles the 503 retry loop itself.
  let initialData: ArrangementsResponse | undefined;
  let initialFacets: ArrangementsFacets | undefined;
  try {
    await ensureData();
    [initialData, initialFacets] = await Promise.all([
      getCachedDefaultPage(),
      getFacets(),
    ]);
  } catch (err) {
    if (!(err instanceof SyncInProgressError)) {
      console.error("conditional-arrangements page: SSR prefetch failed:", err);
    }
    // initialData / initialFacets stay undefined → dashboard falls back to client fetch
  }

  return (
    <PublicLayout>
      <EditableSection
        editHref="/admin/site-editor/conditional-arrangements"
        editLabel="באנר"
      >
        <section className="bg-gradient-to-br from-primary to-primary-dark py-12 sm:py-16">
          <Container>
            <div className="text-center">
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
                {content.hero.title}
              </h1>
              <p className="text-white text-lg">{content.hero.subtitle}</p>
            </div>
          </Container>
        </section>
      </EditableSection>
      <Container className="py-8">
        <ConditionalArrangementsDashboard
          initialData={initialData}
          initialFacets={initialFacets}
        />
      </Container>
    </PublicLayout>
  );
}
