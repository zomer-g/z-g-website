import Link from "next/link";
import type { Metadata } from "next";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";

// Custom 404. Leads with the unambiguous "page not found" message so visitors
// understand the URL is broken before anything else. The FOI Section 8(3)
// joke — citing the "unreasonable resource allocation" exemption real
// authorities use to refuse requests — stays as a small flourish at the
// bottom, not as the main content.

export const metadata: Metadata = {
  title: "הדף לא נמצא (404)",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <PublicLayout>
      <Container narrow>
        <div className="my-12 rounded-lg border border-border bg-background p-8 shadow-sm md:p-10">
          {/* ── Headline: 404 first, big, unambiguous ── */}
          <div className="mb-8 text-center">
            <p
              dir="ltr"
              className="font-mono text-6xl font-bold leading-none text-primary md:text-7xl"
            >
              404
            </p>
            <h1 className="mt-4 text-2xl font-bold text-foreground md:text-3xl">
              הדף לא נמצא
            </h1>
          </div>

          {/* ── Plain-language explanation ── */}
          <div className="space-y-3 text-base leading-relaxed text-foreground">
            <p>
              הקישור שהגעת אליו שבור, הוקלד בטעות, או שהדף הוסר. אין כאן כלום
              במקום הזה.
            </p>
            <p className="text-muted">
              אפשר לחזור לדף הבית או לעיין באחת הקטגוריות למטה.
            </p>
          </div>

          {/* ── Navigation back ── */}
          <div className="mt-8 border-t border-border pt-6">
            <ul className="flex flex-wrap gap-3 text-sm">
              <li>
                <Link
                  href="/"
                  className="rounded-md border border-border bg-background px-3 py-1.5 font-semibold text-primary hover:bg-primary/5"
                >
                  ← דף הבית
                </Link>
              </li>
              <li>
                <Link
                  href="/articles"
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-primary hover:bg-primary/5"
                >
                  מאמרים
                </Link>
              </li>
              <li>
                <Link
                  href="/services"
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-primary hover:bg-primary/5"
                >
                  תחומי עיסוק
                </Link>
              </li>
              <li>
                <Link
                  href="/projects"
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-primary hover:bg-primary/5"
                >
                  מיזמים
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-primary hover:bg-primary/5"
                >
                  צור קשר
                </Link>
              </li>
            </ul>
          </div>

          {/* ── Inside joke as a footnote, not as the main content ── */}
          <div className="mt-8 rounded-md border-r-4 border-primary/40 bg-primary/5 px-4 py-3">
            <p className="text-xs leading-relaxed text-muted">
              <em>
                ובלשון רשמית: איתור הדף המבוקש מצריך הקצאת משאבים בלתי-סבירה,
                ולפיכך הוא נדחה לפי{" "}
                <a
                  href="https://foiguide.org.il/9-%d7%a1%d7%a2%d7%99%d7%a3-8-%d7%9c%d7%97%d7%95%d7%a7-%d7%a1%d7%99%d7%99%d7%92%d7%99%d7%9d-%d7%b4%d7%98%d7%9b%d7%a0%d7%99%d7%99%d7%9d%d7%b4-%d7%97%d7%95%d7%a7-%d7%97%d7%95%d7%a4%d7%a9-%d7%94%d7%9e/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  סעיף 8(3) לחוק חופש המידע
                </a>
                .
              </em>
            </p>
          </div>
        </div>
      </Container>
    </PublicLayout>
  );
}
