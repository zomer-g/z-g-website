"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Home,
  Info,
  Phone,
  PanelTop,
  PanelBottom,
  ChevronLeft,
} from "lucide-react";

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
  label: string;
  icon: React.ElementType;
  data: PageData | null;
  error: boolean;
}

/* ─── Page Definitions ─── */

const PAGE_DEFS: { slug: string; label: string; icon: React.ElementType }[] = [
  { slug: "home", label: "דף הבית", icon: Home },
  { slug: "about", label: "אודות", icon: Info },
  { slug: "contact", label: "צור קשר", icon: Phone },
  { slug: "header", label: "כותרת עליונה", icon: PanelTop },
  { slug: "footer", label: "כותרת תחתונה", icon: PanelBottom },
];

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
            label: def.label,
            icon: def.icon,
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
            label: def.label,
            icon: def.icon,
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

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary-dark">עורך האתר</h1>
      </div>

      {/* ── Cards Grid ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          const isPublished = card.data?.status === "PUBLISHED";

          return (
            <Link key={card.slug} href={`/admin/site-editor/${card.slug}`}>
              <Card
                className={cn(
                  "cursor-pointer transition-all duration-200",
                  "hover:shadow-md hover:border-primary/30",
                  "h-full",
                )}
              >
                <CardContent className="flex flex-col gap-4 p-5">
                  {/* ── Icon + Title Row ── */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Icon size={20} className="text-primary" />
                      </div>
                      <h3 className="font-semibold text-foreground">
                        {card.label}
                      </h3>
                    </div>
                    <ChevronLeft size={20} className="text-muted shrink-0" />
                  </div>

                  {/* ── Status + Date ── */}
                  <div className="flex items-center justify-between">
                    {card.data ? (
                      <Badge variant={isPublished ? "success" : "muted"}>
                        {isPublished ? "פורסם" : "טיוטה"}
                      </Badge>
                    ) : (
                      <Badge variant="muted">
                        {card.error ? "שגיאה" : "לא נמצא"}
                      </Badge>
                    )}

                    {card.data?.updatedAt && (
                      <span className="text-xs text-muted">
                        עודכן {formatDate(card.data.updatedAt)}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
