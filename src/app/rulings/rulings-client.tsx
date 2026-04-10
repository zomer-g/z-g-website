"use client";

import { useState, useEffect, useCallback } from "react";
import { Container } from "@/components/ui/container";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Calendar,
  Scale,
  FileText,
  ExternalLink,
  Loader2,
  Users,
  Gavel,
  AlertCircle,
} from "lucide-react";

/* ─── Types ─── */

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

interface Category {
  key: string;
  label: string;
  icon: typeof Scale;
  description: string;
  enabled: boolean;
}

const CATEGORIES: Category[] = [
  {
    key: "defamation",
    label: "לשון הרע",
    icon: Gavel,
    description: "פסקי דין לפי חוק איסור לשון הרע",
    enabled: true,
  },
  {
    key: "foi",
    label: "חופש מידע",
    icon: FileText,
    description: "החלטות בעתירות חופש מידע",
    enabled: true,
  },
  {
    key: "class-actions",
    label: "תובענות ייצוגיות",
    icon: Users,
    description: "כתבי טענות בתובענות ייצוגיות",
    enabled: false,
  },
];

/* ─── Component ─── */

export function RulingsClient() {
  const [activeCategory, setActiveCategory] = useState("defamation");
  const [rulings, setRulings] = useState<Ruling[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchRulings = useCallback(async (category: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/rulings?category=${category}&limit=5`);
      if (!res.ok) throw new Error("שגיאה בטעינת נתונים");
      const data = await res.json();
      setRulings(data.rulings || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
      setRulings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const cat = CATEGORIES.find((c) => c.key === activeCategory);
    if (cat?.enabled) fetchRulings(activeCategory);
  }, [activeCategory, fetchRulings]);

  const activeCat = CATEGORIES.find((c) => c.key === activeCategory);

  return (
    <>
      {/* Category Tabs */}
      <section className="border-b border-border bg-muted-bg">
        <Container>
          <div className="flex flex-wrap justify-center gap-2 py-4">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.key}
                  onClick={() => cat.enabled && setActiveCategory(cat.key)}
                  disabled={!cat.enabled}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200",
                    activeCategory === cat.key
                      ? "bg-primary text-white shadow-md"
                      : cat.enabled
                        ? "bg-white text-foreground hover:bg-primary/5 border border-border"
                        : "bg-gray-100 text-muted/50 cursor-not-allowed border border-border/50",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {cat.label}
                  {!cat.enabled && (
                    <span className="text-[10px] font-normal text-muted/40">(בקרוב)</span>
                  )}
                </button>
              );
            })}
          </div>
        </Container>
      </section>

      {/* Rulings List */}
      <section className="py-12 sm:py-16">
        <Container>
          {activeCat && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-primary-dark">{activeCat.label}</h2>
              <p className="mt-1 text-sm text-muted">{activeCat.description}</p>
              {total > 0 && (
                <p className="mt-1 text-xs text-muted/60">{total.toLocaleString()} מסמכים במאגר</p>
              )}
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center gap-2 py-16 text-red-500">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && rulings.length > 0 && (
            <div className="space-y-4">
              {rulings.map((ruling) => (
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
                          <p className="mt-0.5 text-sm font-medium text-accent-text">{ruling.title}</p>
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

          {!loading && !error && rulings.length === 0 && activeCat?.enabled && (
            <div className="py-16 text-center text-muted">
              <FileText className="mx-auto h-12 w-12 text-muted/30" />
              <p className="mt-4">לא נמצאו תוצאות בקטגוריה זו</p>
            </div>
          )}

          {activeCat && !activeCat.enabled && (
            <div className="py-16 text-center text-muted">
              <FileText className="mx-auto h-12 w-12 text-muted/30" />
              <p className="mt-4 text-lg font-medium">קטגוריה זו תהיה זמינה בקרוב</p>
            </div>
          )}
        </Container>
      </section>
    </>
  );
}
