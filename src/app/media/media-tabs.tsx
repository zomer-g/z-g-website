"use client";

import { useState } from "react";
import { Play, Newspaper, Mic, BookOpen, Presentation } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { mediaBrand } from "@/lib/media-brands";

/* ─── Types ─── */

type MediaType = "video" | "article" | "podcast" | "academic" | "lecture";

interface MediaItem {
  id: string;
  title: string;
  description: string;
  type: string;
  source: string;
  date: string;
  url: string | null;
  thumbnailUrl: string | null;
}

interface Props {
  items: MediaItem[];
  typeLabels: Record<string, string>;
}

/* ─── Icon Config ─── */

const MEDIA_TYPE_ICONS: Record<MediaType, { icon: React.ElementType; color: string }> = {
  video:    { icon: Play,        color: "bg-red-500/10 text-red-800" },
  article:  { icon: Newspaper,   color: "bg-blue-500/10 text-blue-600" },
  podcast:  { icon: Mic,         color: "bg-purple-500/10 text-purple-600" },
  academic: { icon: BookOpen,    color: "bg-emerald-500/10 text-emerald-700" },
  lecture:  { icon: Presentation, color: "bg-amber-500/10 text-amber-800" },
};

const DEFAULT_ICON = MEDIA_TYPE_ICONS.article;

/* ─── Brand banner ─── */

// Drawn for every item without a thumbnail image: the outlet's colour, its
// name and the headline — the same look the old generated PNGs had, but with
// nothing to generate, so new items get it automatically. Decorative: the
// headline is repeated as the card's <h3> right below.
function BrandBanner({ source, title }: { source: string; title: string }) {
  const brand = mediaBrand(source);
  return (
    <div
      className="relative flex h-48 flex-col items-center justify-center overflow-hidden px-6 text-center"
      style={{ backgroundColor: brand.bg }}
      aria-hidden="true"
    >
      <span className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: brand.accent }} />
      <span
        className="absolute -left-6 -top-6 h-20 w-20 rounded-full opacity-10"
        style={{ backgroundColor: brand.accent }}
      />
      <span
        className="absolute -bottom-10 -right-10 h-28 w-28 rounded-full opacity-10"
        style={{ backgroundColor: brand.accent }}
      />
      <span className="line-clamp-1 text-lg font-bold text-white">{brand.label}</span>
      <span className="my-2.5 h-0.5 w-12 rounded-full" style={{ backgroundColor: brand.accent }} />
      <span className="line-clamp-3 text-sm font-semibold leading-relaxed text-white">{title}</span>
    </div>
  );
}

/* ─── Card ─── */

function MediaCard({ item, typeLabels }: { item: MediaItem; typeLabels: Record<string, string> }) {
  const mediaType = item.type as MediaType;
  const typeIcon = MEDIA_TYPE_ICONS[mediaType] ?? DEFAULT_ICON;
  const TypeIcon = typeIcon.icon;
  const label = typeLabels[mediaType] ?? item.type;

  // Split description on double-newline to support footnotes / multi-paragraph text
  const paragraphs = item.description.split(/\n\n+/).filter(Boolean);

  const cardContent = (
    <Card
      role="listitem"
      className={cn(
        "group flex flex-col overflow-hidden",
        "hover:shadow-md hover:border-accent/30",
      )}
    >
      {/* Thumbnail / Icon placeholder */}
      {item.thumbnailUrl ? (
        <div className="relative h-48 overflow-hidden">
          <img
            src={item.thumbnailUrl}
            alt={item.title}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
            loading="lazy"
          />
        </div>
      ) : (
        <BrandBanner source={item.source} title={item.title} />
      )}

      <CardContent className="flex flex-1 flex-col">
        {/* Type badge & Date */}
        <div className="mb-3 flex items-center justify-between">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
              typeIcon.color,
            )}
          >
            <TypeIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {label}
          </span>
          <time className="text-xs text-muted">{item.date}</time>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold leading-snug text-primary-dark">
          {item.title}
        </h3>

        {/* Description (multi-paragraph: first is main, rest are footnote-style) */}
        <div className="mt-2 flex-1 space-y-2">
          {paragraphs.map((para, i) => (
            <p
              key={i}
              className={cn(
                "text-sm leading-relaxed",
                i === 0
                  ? "text-muted"
                  : "border-t border-border/60 pt-2 text-xs italic text-muted/80",
              )}
            >
              {para}
            </p>
          ))}
        </div>

        {/* Source */}
        <p className="mt-4 border-t border-border pt-3 text-xs font-medium text-muted">
          מקור:{" "}
          <span className="text-primary-dark">{item.source}</span>
        </p>
      </CardContent>
    </Card>
  );

  if (item.url) {
    return (
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        {cardContent}
        <span className="sr-only"> (נפתח בחלון חדש)</span>
      </a>
    );
  }

  return <div>{cardContent}</div>;
}

/* ─── Grid ─── */

function MediaGrid({ items, typeLabels, emptyMessage }: { items: MediaItem[]; typeLabels: Record<string, string>; emptyMessage: string }) {
  if (items.length === 0) {
    return (
      <div className="py-12 text-center">
        <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted" />
        <p className="text-muted">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
      role="list"
      aria-label="רשימת פרסומים"
    >
      {items.map((item) => (
        <MediaCard key={item.id} item={item} typeLabels={typeLabels} />
      ))}
    </div>
  );
}

/* ─── Filter + grid ─── */

// One list, newest first, with a filter chip per type (only types that have
// items). "all" is the default.
const TYPE_ORDER: MediaType[] = ["article", "video", "podcast", "academic", "lecture"];

export function MediaTabs({ items, typeLabels }: Props) {
  const [active, setActive] = useState<MediaType | "all">("all");

  const counts = new Map<string, number>();
  for (const i of items) counts.set(i.type, (counts.get(i.type) ?? 0) + 1);

  const filters: { id: MediaType | "all"; label: string; count: number }[] = [
    { id: "all", label: "הכל", count: items.length },
    ...TYPE_ORDER.filter((t) => counts.has(t)).map((t) => ({
      id: t,
      label: typeLabels[t] ?? t,
      count: counts.get(t) ?? 0,
    })),
  ];

  const shown = active === "all" ? items : items.filter((i) => i.type === active);

  return (
    <div>
      <div className="mb-8 flex flex-wrap gap-2" role="group" aria-label="סינון לפי סוג פרסום">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={active === f.id}
            onClick={() => setActive(f.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors duration-150",
              active === f.id
                ? "border-primary bg-primary text-white"
                : "border-border bg-white text-primary-dark hover:border-primary/40 hover:bg-muted-bg",
            )}
          >
            {f.label}
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-xs font-medium",
                active === f.id ? "bg-white/20 text-white" : "bg-muted-bg text-muted",
              )}
            >
              {f.count}
            </span>
          </button>
        ))}
      </div>

      <p className="sr-only" aria-live="polite">
        מוצגים {shown.length} פרסומים
      </p>

      <MediaGrid items={shown} typeLabels={typeLabels} emptyMessage="אין פרסומים מהסוג הזה." />
    </div>
  );
}
