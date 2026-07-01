import type { Metadata } from "next";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: 'מילון | עו"ד גיא זומר',
  description:
    "מילון ז'רגון אישי — ביטויים ומונחים שהמצאתי סביב הפעילות בתחומי משפט, טכנולוגיה ושקיפות ממשלתית.",
};

/* ─── Types ─── */

interface Definition {
  text: string;
  label?: string;
}

interface MilonEntryRow {
  id: string;
  term: string;
  vocalized: string;
  partOfSpeech: string;
  etymology: string | null;
  inflections: string | null;
  domains: string[];
  definitions: Definition[];
  example: string;
  order: number;
}

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

/* ─── Entry Component ─── */

function DictionaryEntry({
  entry,
  index,
}: {
  entry: MilonEntryRow;
  index: number;
}) {
  return (
    <article
      id={entry.term}
      className="border-b border-border/60 py-10 last:border-0"
      lang="he"
    >
      {/* ── Header line: vocalized term • part of speech ── */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="font-serif text-3xl font-bold leading-tight text-primary">
          {entry.vocalized}
        </h2>
        <span className="text-muted select-none" aria-hidden="true">
          •
        </span>
        <span className="text-base font-medium text-foreground/70">
          [{entry.partOfSpeech}]
        </span>
        <span className="mr-auto text-sm font-light tabular-nums text-muted/50 select-none">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>

      {/* ── Etymology / Root ── */}
      {entry.etymology && (
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {entry.etymology}
        </p>
      )}

      {/* ── Inflections ── */}
      {entry.inflections && (
        <p className="mt-0.5 text-sm leading-relaxed text-muted">
          {entry.inflections}
        </p>
      )}

      {/* ── Domain tags ── */}
      {entry.domains.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {entry.domains.map((d) => (
            <span
              key={d}
              className="rounded border border-primary/20 bg-primary/5 px-2 py-0.5 text-xs font-medium text-primary"
            >
              {d}
            </span>
          ))}
        </div>
      )}

      {/* ── Definitions ── */}
      <ol className="mt-4 space-y-2.5">
        {entry.definitions.map((def, i) => (
          <li key={i} className="flex gap-3 text-base leading-relaxed text-foreground">
            <span className="mt-0.5 shrink-0 select-none text-sm font-semibold text-primary/60">
              {i + 1}.
            </span>
            <span>
              {def.label && (
                <span className="ml-1 font-semibold text-foreground/60">
                  [{def.label}]
                </span>
              )}
              {def.text}
            </span>
          </li>
        ))}
      </ol>

      {/* ── Example quote ── */}
      <blockquote className="mt-5 border-r-2 border-accent/50 pr-4 text-sm leading-relaxed text-foreground/70 italic">
        <span className="not-italic font-semibold text-muted text-xs block mb-1">
          ציטוט מהשטח
        </span>
        {entry.example}
      </blockquote>
    </article>
  );
}

/* ─── Page ─── */

export default async function MilonPage() {
  const entries = await getEntries();

  return (
    <PublicLayout>
      {/* ── Hero ── */}
      <section className="bg-primary py-20 sm:py-28" aria-labelledby="milon-heading">
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
          <p className="mt-2 text-sm text-white/45">
            {entries.length} {entries.length === 1 ? "ערך" : "ערכים"}
          </p>
        </Container>
      </section>

      {/* ── Entries ── */}
      <section className="bg-background py-16 sm:py-24">
        <Container>
          {entries.length === 0 ? (
            <div className="py-16 text-center text-muted">
              <p className="text-lg">המילון עדיין ריק</p>
              <p className="mt-1 text-sm">בקרוב יתמלא בביטויים.</p>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl">
              {entries.map((entry, i) => (
                <DictionaryEntry key={entry.id} entry={entry} index={i} />
              ))}
            </div>
          )}
        </Container>
      </section>
    </PublicLayout>
  );
}
