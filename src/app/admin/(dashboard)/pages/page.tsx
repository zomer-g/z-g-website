"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Layers, ChevronLeft } from "lucide-react";

/* ─── Types ─── */

interface PageItem {
  id: string;
  slug: string;
  title: string;
  updatedAt: string;
  seoTitle?: string | null;
  seoDesc?: string | null;
}

/* ─── Page Label Map ─── */

const PAGE_LABELS: Record<string, string> = {
  home: "עמוד הבית",
  about: "אודות",
  privacy: "מדיניות פרטיות",
  accessibility: "הצהרת נגישות",
  terms: "תנאי שימוש",
  "legal-tools": "כלים משפטיים (ראשי)",
  "legal-tools-privacy": "כלים משפטיים — פרטיות",
  "legal-tools-terms": "כלים משפטיים — תנאי שימוש",
  "legal-tools-support": "כלים משפטיים — תמיכה",
};

/* ─── Pages Management Page ─── */

export default function AdminPagesPage() {
  const [pages, setPages] = useState<PageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPages() {
      try {
        const res = await fetch("/api/pages");
        if (!res.ok) throw new Error("שגיאה בטעינת העמודים");
        const data = await res.json();
        setPages(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "שגיאה בטעינת העמודים");
      } finally {
        setLoading(false);
      }
    }

    fetchPages();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary-dark">ניהול עמודים</h1>
      </div>

      {/* ── Pages List ── */}
      {pages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Layers className="mx-auto mb-3 h-10 w-10 text-muted" />
            <p className="text-muted">לא נמצאו עמודים במערכת</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pages.map((page) => (
            <Link key={page.id} href={`/admin/pages/${page.slug}`}>
              <Card
                className={cn(
                  "cursor-pointer transition-all duration-200",
                  "hover:shadow-md hover:border-primary/30",
                )}
              >
                <CardContent className="flex items-center justify-between p-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Layers size={20} className="text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {PAGE_LABELS[page.slug] || page.title}
                      </h3>
                      <p className="text-sm text-muted">
                        /{page.slug} &middot; עודכן {formatDate(page.updatedAt)}
                      </p>
                    </div>
                  </div>

                  <ChevronLeft size={20} className="text-muted shrink-0" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
