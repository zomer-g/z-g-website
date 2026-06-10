import type { LegislationLink } from "@/types/content";

// Relevant-legislation panel shown above a rulings list: the primary law and
// any secondary legislation (regulations). Renders nothing when empty. When
// both kinds are present they're grouped under subtitles; a single kind shows
// as a flat list.
export function LegislationLinks({ items }: { items?: LegislationLink[] }) {
  const links = (items || []).filter((l) => l && l.label && l.url);
  if (links.length === 0) return null;

  const laws = links.filter((l) => l.kind !== "regulation");
  const regs = links.filter((l) => l.kind === "regulation");
  const grouped = laws.length > 0 && regs.length > 0;

  const renderList = (list: LegislationLink[]) => (
    <ul className="flex flex-wrap gap-2">
      {list.map((l, i) => (
        <li key={i}>
          <a
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-primary hover:bg-gray-50 hover:border-primary transition"
          >
            {l.label}
            <span aria-hidden="true">↗</span>
          </a>
        </li>
      ))}
    </ul>
  );

  return (
    <section
      dir="rtl"
      className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4"
      aria-label="חקיקה רלוונטית"
    >
      <h2 className="text-sm font-bold text-primary mb-3">חקיקה וחקיקת משנה</h2>
      {grouped ? (
        <div className="space-y-3">
          <div>
            <h3 className="text-xs font-semibold text-gray-500 mb-1.5">
              חקיקה ראשית
            </h3>
            {renderList(laws)}
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-500 mb-1.5">
              חקיקת משנה (תקנות)
            </h3>
            {renderList(regs)}
          </div>
        </div>
      ) : (
        renderList(links)
      )}
    </section>
  );
}
