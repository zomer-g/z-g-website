"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Calendar,
  Scale,
  FileText,
  ExternalLink,
  Loader2,
  Users,
  AlertCircle,
} from "lucide-react";

interface Ruling {
  id: number;
  caseName: string;
  court: string;
  judges: string[];
  date: string;
  summary: string;
  title: string;
  documentUrl: string;
}

interface RulingsResponse {
  total: number;
  page: number;
  size: number;
  rulings: Ruling[];
}

const PAGE_SIZE = 12;

export function RulingsList({ category }: { category: "foi" | "defamation" }) {
  const [data, setData] = useState<RulingsResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchRulings = useCallback(async (cat: string, p: number) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/rulings?category=${cat}&limit=${PAGE_SIZE}&page=${p}`,
      );
      if (!res.ok) throw new Error("שגיאה בטעינת נתונים");
      const json = (await res.json()) as RulingsResponse;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRulings(category, page);
  }, [fetchRulings, category, page]);

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div dir="rtl">
      <div className="mb-4 text-sm text-gray-600">
        {loading ? (
          <span>בטעינה…</span>
        ) : error ? (
          <span className="text-red-600">{error}</span>
        ) : total === 0 ? (
          <span>לא נמצאו פסקי דין</span>
        ) : (
          <span>
            עמוד {page} מתוך {totalPages} — סה״כ {total.toLocaleString("he-IL")} מסמכים במאגר
          </span>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {error && !loading && (
        <div className="flex items-center justify-center gap-2 py-16 text-red-500">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && data && data.rulings.length > 0 && (
        <div className="space-y-4">
          {data.rulings.map((ruling) => (
            <Card
              key={ruling.id}
              className="group border border-border/60 transition-shadow duration-200 hover:shadow-md"
            >
              <CardContent className="p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-bold leading-snug text-primary-dark sm:text-lg">
                      {ruling.caseName}
                    </h3>

                    {ruling.title && ruling.title !== ruling.caseName && (
                      <p className="mt-0.5 text-sm font-medium text-accent-text">
                        {ruling.title}
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                      {ruling.court && (
                        <span className="flex items-center gap-1">
                          <Scale className="h-3.5 w-3.5" aria-hidden="true" />
                          {ruling.court}
                        </span>
                      )}
                      {ruling.date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                          {ruling.date}
                        </span>
                      )}
                      {Array.isArray(ruling.judges) && ruling.judges.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" aria-hidden="true" />
                          {ruling.judges.join(", ")}
                        </span>
                      )}
                    </div>

                    {ruling.summary && (
                      <p className="mt-3 text-sm leading-relaxed text-foreground/80 line-clamp-3">
                        {ruling.summary}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0">
                    <a
                      href={ruling.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2",
                        "text-xs font-semibold text-primary transition-all duration-200",
                        "hover:bg-primary hover:text-white",
                      )}
                    >
                      <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                      צפייה במסמך
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && !error && data && data.rulings.length === 0 && (
        <div className="py-16 text-center text-muted">
          <FileText className="mx-auto h-12 w-12 text-muted/30" />
          <p className="mt-4">לא נמצאו פסקי דין</p>
        </div>
      )}

      {!loading && !error && totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={!canPrev}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-md border border-primary px-4 py-2 text-sm font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            הקודם
          </button>
          <span className="text-sm text-gray-600">
            עמוד {page} מתוך {totalPages}
          </span>
          <button
            type="button"
            disabled={!canNext}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            הבא
          </button>
        </div>
      )}

      <p className="mt-8 text-xs leading-relaxed text-gray-700">
        המידע נשאב ממאגר TAG-IT ומוצג כמות שהוא. תקציר, שם תיק וזיהוי שופטים
        חולצו על-ידי AI ויכולים לכלול שגיאות — יש לוודא מול המסמך המקורי.
      </p>
    </div>
  );
}
