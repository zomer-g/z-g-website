"use client";

import { useState } from "react";
import { Play, ExternalLink, Newspaper, Mic, BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/* ─── Types ─── */

type MediaType = "video" | "article" | "podcast" | "academic";

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
  pressItems: MediaItem[];
  academicItems: MediaItem[];
  typeLabels: Record<string, string>;
}

/* ─── Icon Config ─── */

const MEDIA_TYPE_ICONS: Record<MediaType, { icon: React.ElementType; color: string }> = {
  video:    { icon: Play,        color: "bg-red-500/10 text-red-600" },
  article:  { icon: Newspaper,   color: "bg-blue-500/10 text-blue-600" },
  podcast:  { icon: Mic,         color: "bg-purple-500/10 text-purple-600" },
  academic: { icon: BookOpen,    color: "bg-emerald-500/10 text-emerald-700" },
};

const DEFAULT_ICON = MEDIA_TYPE_ICONS.article;

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
        <div
          className={cn(
            "relative flex h-48 items-center justify-center",
            "bg-gradient-to-br from-primary/5 to-primary/15",
          )}
          aria-hidden="true"
        >
          <div
            className={cn(
              "flex h-16 w-16 items-center justify-center rounded-full",
              "bg-white/90 shadow-lg",
              "transition-transform duration-200 group-hover:scale-110",
            )}
          >
            <TypeIcon className="h-7 w-7 text-primary" />
          </div>
        </div>
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

/* ─── Tabs ─── */

type Tab = "press" | "academic";

export function MediaTabs({ pressItems, academicItems, typeLabels }: Props) {
  const [active, setActive] = useState<Tab>("press");

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "press",    label: "תקשורת",  count: pressItems.length },
    { id: "academic", label: "אקדמיה",  count: academicItems.length },
  ];

  return (
    <div>
      {/* Tab strip */}
      <div className="mb-8 flex gap-1 border-b border-border" role="tablist" aria-label="סוג פרסום">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={active === tab.id}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            onClick={() => setActive(tab.id)}
            className={cn(
              "relative -mb-px px-5 py-3 text-sm font-semibold transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
              active === tab.id
                ? "border-b-2 border-accent text-primary-dark"
                : "text-muted hover:text-primary-dark",
            )}
          >
            {tab.label}
            {tab.count > 0 && (
              <span
                className={cn(
                  "ms-1.5 rounded-full px-1.5 py-0.5 text-xs font-medium",
                  active === tab.id
                    ? "bg-accent/15 text-accent-text"
                    : "bg-muted-bg text-muted",
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div
        id="panel-press"
        role="tabpanel"
        aria-labelledby="tab-press"
        hidden={active !== "press"}
      >
        <MediaGrid
          items={pressItems}
          typeLabels={typeLabels}
          emptyMessage="כתבות תקשורת יתעדכנו בקרוב."
        />
      </div>

      <div
        id="panel-academic"
        role="tabpanel"
        aria-labelledby="tab-academic"
        hidden={active !== "academic"}
      >
        <MediaGrid
          items={academicItems}
          typeLabels={typeLabels}
          emptyMessage="פרסומים אקדמיים יתעדכנו בקרוב."
        />
      </div>
    </div>
  );
}
