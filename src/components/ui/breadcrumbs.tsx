import Link from "next/link";
import { cn } from "@/lib/utils";

export interface Crumb {
  label: string;
  /** Omit on the final crumb — the current page is not a link to itself. */
  href?: string;
}

/**
 * WCAG 2.4.8 (Location) asks that a reader can tell where they are inside
 * the site. Detail pages already had a hand-rolled trail; this is the same
 * pattern as a shared component so the dashboards and project pages can
 * carry one too, consistently.
 *
 * The separators are aria-hidden: a screen reader gets the structure from
 * the list, and "›" read aloud between every step is noise.
 */
export function Breadcrumbs({
  items,
  className,
}: {
  items: Crumb[];
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <nav
      aria-label="פירורי לחם"
      className={cn("text-xs text-gray-600", className)}
    >
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1">
              {i > 0 && <span aria-hidden="true">›</span>}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="hover:text-gray-900 hover:underline"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className="text-gray-800"
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
