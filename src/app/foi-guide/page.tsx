import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import { BookOpen, ExternalLink, Sparkles } from "lucide-react";

// Hidden page. Until the public search UI is launched, only ADMINs can
// see this; everyone else gets a 404. The route is not linked from the
// site header or footer — it's reachable only by direct URL.
export const metadata: Metadata = {
  title: "מדריך חופש המידע",
  description: "תצוגה מקדימה — לא לפרסום ציבורי.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function FoiGuidePage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    notFound();
  }

  const docs = await prisma.foiGuideDoc.findMany({
    orderBy: { order: "asc" },
    select: {
      id: true,
      title: true,
      slug: true,
      url: true,
      order: true,
      chunkCount: true,
      lastFetchedAt: true,
    },
  });

  return (
    <PublicLayout>
      <Container>
        <div className="py-12">
          <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
            <Sparkles size={18} />
            <div>
              <strong>תצוגה מקדימה לאדמין.</strong> העמוד חבוי מהציבור עד
              שיוכרז. חיפוש סמנטי על תוכן המדריך יתווסף בהמשך — בינתיים גישת
              MCP זמינה דרך מסך הניהול.
            </div>
          </div>

          <div className="mt-8 flex items-center gap-3">
            <BookOpen size={28} className="text-primary" />
            <h1 className="text-3xl font-bold text-foreground">
              מדריך חופש המידע
            </h1>
          </div>
          <p className="mt-4 max-w-2xl text-base text-muted">
            מראה מקומית של{" "}
            <a
              href="https://foiguide.org.il/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              מדריך חופש המידע
            </a>
            . הפרקים מועלים לאינדקס סמנטי של z-g.co.il לצורך חיפוש בעתיד והנגשה
            דרך MCP לכלי AI חיצוניים.
          </p>

          <h2 className="mt-10 text-xl font-semibold text-foreground">
            פרקים נטענים{" "}
            <span className="text-sm font-normal text-muted">({docs.length})</span>
          </h2>

          {docs.length === 0 ? (
            <p className="mt-4 text-sm text-muted">
              עדיין לא נטענו פרקים. עברו ל-
              <a
                href="/admin/foi-guide"
                className="text-primary underline"
              >
                מסך הניהול
              </a>{" "}
              והפעילו &quot;סנכרן עכשיו&quot;.
            </p>
          ) : (
            <ul className="mt-4 grid gap-3 md:grid-cols-2">
              {docs.map((d) => (
                <li
                  key={d.id}
                  className="rounded-lg border border-border bg-background p-4 transition-shadow hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs text-muted">פרק {d.order}</div>
                      <div className="mt-1 font-medium text-foreground">
                        {d.title}
                      </div>
                      {d.chunkCount > 0 && (
                        <div className="mt-1 text-xs text-muted">
                          {d.chunkCount} chunks באינדקס
                        </div>
                      )}
                    </div>
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-primary"
                      aria-label="פתח את הפרק במדריך"
                    >
                      <ExternalLink size={16} />
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Container>
    </PublicLayout>
  );
}
