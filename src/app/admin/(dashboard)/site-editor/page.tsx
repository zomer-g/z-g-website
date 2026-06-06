"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronLeft } from "lucide-react";
import {
  PAGE_GROUPS,
  ALL_PAGE_DEFS,
  type PageDef,
} from "@/lib/admin-page-map";

/* ─── Types ─── */

interface PageData {
  title: string;
  status: string;
  updatedAt: string;
  publishedAt: string | null;
  content: unknown;
}

interface SiteEditorCard {
  slug: string;
  data: PageData | null;
  error: boolean;
}

// Page registry now lives in @/lib/admin-page-map so the same data backs
// this grid, the AdminBar's reverse-lookup, and the editor templates'
// "open in new tab" + "copy URL" buttons.
const PAGE_DEFS: PageDef[] = ALL_PAGE_DEFS;

/* ─── Site Editor Page ─── */

export default function SiteEditorPage() {
  const [cards, setCards] = useState<SiteEditorCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAllPages() {
      try {
        const results = await Promise.allSettled(
          PAGE_DEFS.map(async (def) => {
            const res = await fetch(`/api/content/${def.slug}?draft=true`);
            if (!res.ok) return null;
            return (await res.json()) as PageData;
          }),
        );

        const mapped: SiteEditorCard[] = PAGE_DEFS.map((def, i) => {
          const result = results[i];
          return {
            slug: def.slug,
            data:
              result.status === "fulfilled" ? result.value : null,
            error: result.status === "rejected",
          };
        });

        setCards(mapped);
      } catch {
        // Set all as errored
        setCards(
          PAGE_DEFS.map((def) => ({
            slug: def.slug,
            data: null,
            error: true,
          })),
        );
      } finally {
        setLoading(false);
      }
    }

    fetchAllPages();
  }, []);

  /* ── Loading ── */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // O(1) lookup of the fetched data by slug so each group can render with the
  // same fresh state without iterating the whole `cards` array per item.
  const cardBySlug = new Map(cards.map((c) => [c.slug, c]));

  // Shared card renderer — used both for standalone group items and for items
  // inside a project sub-group, so the visual treatment stays identical.
  const renderCard = (def: PageDef) => {
    const card = cardBySlug.get(def.slug);
    const Icon = def.icon;
    const isPublished = card?.data?.status === "PUBLISHED";

    return (
      <Link
        key={def.slug}
        href={def.editHref || `/admin/site-editor/${def.slug}`}
      >
        <Card
          className={cn(
            "cursor-pointer transition-all duration-200",
            "hover:shadow-md hover:border-primary/30",
            "h-full",
          )}
        >
          <CardContent className="flex flex-col gap-4 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Icon size={20} className="text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">{def.label}</h3>
              </div>
              <ChevronLeft size={20} className="text-muted shrink-0" />
            </div>

            <div className="flex items-center justify-between">
              {card?.data ? (
                <Badge variant={isPublished ? "success" : "muted"}>
                  {isPublished ? "פורסם" : "טיוטה"}
                </Badge>
              ) : (
                <Badge variant="muted">
                  {card?.error ? "שגיאה" : "לא נמצא"}
                </Badge>
              )}

              {card?.data?.updatedAt && (
                <span className="text-xs text-muted">
                  עודכן {formatDate(card.data.updatedAt)}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  };

  return (
    <div className="space-y-10">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary-dark">עורך האתר</h1>
      </div>

      {/* ── Grouped Sections ── */}
      {PAGE_GROUPS.map((group) => {
        const standaloneItems = group.items ?? [];
        const projects = group.projects ?? [];
        const total =
          standaloneItems.length +
          projects.reduce((n, p) => n + p.items.length, 0);

        return (
          <section key={group.title} className="space-y-4">
            <div className="flex items-baseline justify-between border-b border-border pb-2">
              <h2 className="text-lg font-semibold text-foreground">
                {group.title}
              </h2>
              <span className="text-xs text-muted">{total} עמודים</span>
            </div>

            {/* Standalone items (no sub-header) */}
            {standaloneItems.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {standaloneItems.map(renderCard)}
              </div>
            )}

            {/* Per-project sub-groups */}
            {projects.map((project) => (
              <div key={project.title} className="space-y-3">
                <div className="flex items-baseline gap-3 pt-2">
                  <h3 className="text-base font-semibold text-primary-dark">
                    {project.title}
                  </h3>
                  <span className="text-xs text-muted">
                    {project.items.length} עמודים
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {project.items.map(renderCard)}
                </div>
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
