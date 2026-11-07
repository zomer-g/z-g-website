import Link from "next/link";
import type { DocLink, PracticeLink } from "@/lib/seo-docs";

/**
 * Server-rendered block under a document page: the practice area a reader of
 * this document may need, and nearby documents in the same corpus. Plain
 * links in the initial HTML, which is the point — crawlers follow them.
 */
export function RelatedDocs({
  practice,
  related,
  relatedHeading,
  collection,
}: {
  practice: PracticeLink[];
  related: DocLink[];
  relatedHeading: string;
  collection?: { href: string; label: string };
}) {
  if (practice.length === 0 && related.length === 0) return null;
  return (
    <aside dir="rtl" className="max-w-3xl mx-auto mt-8 space-y-6" aria-label="קישורים נוספים">
      {practice.length > 0 ? (
        <div className="rounded-xl border border-accent/40 bg-accent/5 p-5">
          <p className="text-sm font-semibold text-gray-800 mb-2">צריכים עזרה משפטית בנושא?</p>
          <ul className="space-y-2">
            {practice.map((p) => (
              <li key={p.href} className="text-sm text-gray-700">
                <Link href={p.href} className="font-semibold text-primary hover:underline">
                  {p.label}
                </Link>{" "}
                — {p.blurb}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm">
            <Link href="/contact" className="font-semibold text-primary hover:underline">
              לתיאום שיחת ייעוץ עם עו&quot;ד גיא זומר
            </Link>
          </p>
        </div>
      ) : null}

      {related.length > 0 ? (
        <nav aria-label={relatedHeading}>
          <h2 className="text-base font-bold text-gray-800 mb-2">{relatedHeading}</h2>
          <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
            {related.map((d) => (
              <li key={d.href}>
                <Link href={d.href} className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary">
                  {d.title}
                </Link>
              </li>
            ))}
          </ul>
          {collection ? (
            <p className="mt-2 text-sm">
              <Link href={collection.href} className="text-primary hover:underline">
                {collection.label}
              </Link>
            </p>
          ) : null}
        </nav>
      ) : null}
    </aside>
  );
}
