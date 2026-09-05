import { ArrowUpLeft, FileText, Gavel, Newspaper, Scale } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { cn, safeHref } from "@/lib/utils";

/**
 * The case file that hangs under a post: the press coverage of the case, the
 * documents filed in it, and the case-law it leans on.
 *
 * All three lists are DB-driven (MediaAppearance.caseTag + CaseDocument), so a
 * case keeps growing from /admin long after the post is published. A section
 * with nothing in it renders nothing at all.
 */

interface CaseFileProps {
  caseTag: string;
  /** Heading level for the section titles. Defaults to h2. */
  headingLevel?: "h2" | "h3";
}

/* ─── Data ─── */

async function getCaseData(caseTag: string) {
  try {
    const [coverage, documents] = await Promise.all([
      prisma.mediaAppearance.findMany({
        where: { caseTag, isActive: true },
        orderBy: [{ order: "asc" }, { date: "asc" }],
      }),
      prisma.caseDocument.findMany({
        where: { caseTag, isActive: true },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      }),
    ]);
    return { coverage, documents };
  } catch {
    return { coverage: [], documents: [] };
  }
}

/* ─── Section header ─── */

function SectionHeader({
  id,
  as: Heading,
  icon: Icon,
  title,
  subtitle,
  count,
}: {
  id: string;
  as: "h2" | "h3";
  icon: React.ElementType;
  title: string;
  subtitle: string;
  count: number;
}) {
  return (
    <div className="mb-6 border-b border-border pb-4">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
          aria-hidden="true"
        >
          <Icon className="h-5 w-5" />
        </span>
        <Heading
          id={id}
          className="text-2xl font-bold leading-snug tracking-tight text-primary-dark"
        >
          {title}
        </Heading>
        <Badge variant="outline">{count}</Badge>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted">{subtitle}</p>
    </div>
  );
}

/* ─── Coverage card ─── */

/**
 * MediaAppearance.date is a free-text column that /media sorts as a string, so
 * everything is stored ISO. Readers want the Israeli form.
 */
function formatCaseDate(value: string): string {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!iso) return value;
  const [, year, month, day] = iso;
  return `${Number(day)}.${Number(month)}.${year}`;
}

const COVERAGE_TYPE_LABELS: Record<string, string> = {
  article: "כתבה",
  video: "וידאו",
  podcast: "פודקאסט",
  academic: "מחקר",
};

function CoverageCard({
  item,
}: {
  item: {
    title: string;
    description: string;
    source: string;
    date: string;
    url: string | null;
    type: string;
  };
}) {
  const body = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="accent">{item.source}</Badge>
        <span className="text-xs text-muted">{formatCaseDate(item.date)}</span>
        {item.type !== "article" && (
          <Badge variant="muted">
            {COVERAGE_TYPE_LABELS[item.type] ?? item.type}
          </Badge>
        )}
      </div>
      <h4
        className={cn(
          "mt-3 font-bold leading-snug text-primary-dark",
          item.url &&
            "transition-colors duration-200 group-hover:text-accent-text",
        )}
      >
        {item.title}
      </h4>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {item.description}
      </p>
      {item.url && (
        <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors duration-200 group-hover:text-accent-text">
          לכתבה המלאה
          <ArrowUpLeft
            className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5 group-hover:-translate-y-0.5"
            aria-hidden="true"
          />
          <span className="sr-only"> (נפתח בלשונית חדשה)</span>
        </span>
      )}
    </>
  );

  const shell =
    "block h-full rounded-xl border border-border bg-card p-5 shadow-sm shadow-primary/5 transition-all duration-200";

  return (
    <li>
      {item.url ? (
        <a
          href={safeHref(item.url)}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            shell,
            "group hover:border-accent/40 hover:shadow-md hover:shadow-primary/10",
          )}
        >
          {body}
        </a>
      ) : (
        <div className={shell}>{body}</div>
      )}
    </li>
  );
}

/* ─── Document row ─── */

function DocumentRow({
  doc,
  icon: Icon,
}: {
  doc: {
    title: string;
    description: string | null;
    docDate: string | null;
    citation: string | null;
    authority: string | null;
    fileUrl: string | null;
    sourceUrl: string | null;
  };
  icon: React.ElementType;
}) {
  // The hosted file wins; an external source is the fallback for a document we
  // point at but do not host ourselves.
  const href = doc.fileUrl || doc.sourceUrl;
  const meta = [doc.citation, doc.authority, doc.docDate].filter(Boolean);

  const body = (
    <>
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
        aria-hidden="true"
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block font-bold leading-snug text-primary-dark",
            href &&
              "transition-colors duration-200 group-hover:text-accent-text",
          )}
        >
          {doc.title}
        </span>
        {meta.length > 0 && (
          <span className="mt-1 block text-xs text-muted">
            {meta.join(" · ")}
          </span>
        )}
        {doc.description && (
          <span className="mt-2 block text-sm leading-relaxed text-muted">
            {doc.description}
          </span>
        )}
        {href && (
          <span className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors duration-200 group-hover:text-accent-text">
            {doc.fileUrl ? "לצפייה במסמך" : "למקור"}
            <ArrowUpLeft className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only"> (נפתח בלשונית חדשה)</span>
          </span>
        )}
      </span>
    </>
  );

  const shell =
    "flex gap-4 rounded-xl border border-border bg-card p-5 shadow-sm shadow-primary/5 transition-all duration-200";

  return (
    <li>
      {href ? (
        <a
          href={safeHref(href)}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            shell,
            "group hover:border-accent/40 hover:shadow-md hover:shadow-primary/10",
          )}
        >
          {body}
        </a>
      ) : (
        <div className={shell}>{body}</div>
      )}
    </li>
  );
}

/* ─── Component ─── */

export async function CaseFile({
  caseTag,
  headingLevel = "h2",
}: CaseFileProps) {
  const { coverage, documents } = await getCaseData(caseTag);

  const letters = documents.filter((d) => d.category === "letter");
  const rulings = documents.filter((d) => d.category === "ruling");

  if (coverage.length === 0 && letters.length === 0 && rulings.length === 0) {
    return null;
  }

  return (
    <div className="space-y-16">
      {/* ── Press coverage ── */}
      {coverage.length > 0 && (
        <section aria-labelledby={`case-${caseTag}-coverage`}>
          <SectionHeader
            id={`case-${caseTag}-coverage`}
            as={headingLevel}
            icon={Newspaper}
            title="הסיקור התקשורתי"
            subtitle="כל הפרסומים שאיתרתי על הפרשה, לפי סדר הופעתם. הרשימה מתעדכנת."
            count={coverage.length}
          />
          <ul role="list" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {coverage.map((item) => (
              <CoverageCard key={item.id} item={item} />
            ))}
          </ul>
        </section>
      )}

      {/* ── Case documents ── */}
      {letters.length > 0 && (
        <section aria-labelledby={`case-${caseTag}-letters`}>
          <SectionHeader
            id={`case-${caseTag}-letters`}
            as={headingLevel}
            icon={FileText}
            title="מסמכי התיק"
            subtitle="ההתכתבות בתיק, כלשונה. כל מסמך נפתח כקובץ PDF מלא."
            count={letters.length}
          />
          <ul role="list" className="space-y-4">
            {letters.map((doc) => (
              <DocumentRow key={doc.id} doc={doc} icon={FileText} />
            ))}
          </ul>
        </section>
      )}

      {/* ── Case-law ── */}
      {rulings.length > 0 && (
        <section aria-labelledby={`case-${caseTag}-rulings`}>
          <SectionHeader
            id={`case-${caseTag}-rulings`}
            as={headingLevel}
            icon={Scale}
            title="הפסיקה הרלוונטית"
            subtitle="פסקי הדין וההחלטות שעליהם נשענת העמדה המשפטית. איסוף מתמשך."
            count={rulings.length}
          />
          <ul role="list" className="space-y-4">
            {rulings.map((doc) => (
              <DocumentRow key={doc.id} doc={doc} icon={Gavel} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
