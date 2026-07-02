import type { Metadata } from "next";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import { prisma } from "@/lib/prisma";
import DictionaryBrowser, { type MilonEntryRow } from "./DictionaryBrowser";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: 'מילון | עו"ד גיא זומר',
  description:
    "מילון ז'רגון אישי — ביטויים ומונחים שהמצאתי סביב הפעילות בתחומי משפט, טכנולוגיה ושקיפות ממשלתית.",
};

/* ─── Data ─── */

async function getEntries(): Promise<MilonEntryRow[]> {
  try {
    const rows = await prisma.milonEntry.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { order: "asc" },
    });
    return rows as unknown as MilonEntryRow[];
  } catch {
    return [];
  }
}

/* ─── Page ─── */

export default async function MilonPage() {
  const entries = await getEntries();

  return (
    <PublicLayout>
      {/* ── Hero ── */}
      <section className="bg-primary py-16 sm:py-20" aria-labelledby="milon-heading">
        <Container className="text-center">
          <div
            className="mx-auto mb-4 h-1 w-16 rounded-full bg-accent"
            aria-hidden="true"
          />
          <h1
            id="milon-heading"
            className="font-serif text-5xl font-bold tracking-tight text-white sm:text-6xl"
          >
            מִילוֹן
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
            ביטויים ומונחים שהמצאתי סביב הפעילות בתחומי משפט, טכנולוגיה ושקיפות
            ממשלתית — כי לפעמים השפה הקיימת לא מספיקה.
          </p>
        </Container>
      </section>

      {/* ── Interactive lexicon ── */}
      <section className="bg-muted-bg py-12 sm:py-16">
        <Container>
          {entries.length === 0 ? (
            <div className="py-16 text-center text-muted">
              <p className="text-lg">המילון עדיין ריק</p>
              <p className="mt-1 text-sm">בקרוב יתמלא בביטויים.</p>
            </div>
          ) : (
            <DictionaryBrowser entries={entries} />
          )}
        </Container>
      </section>
    </PublicLayout>
  );
}
