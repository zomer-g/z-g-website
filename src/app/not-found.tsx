import Link from "next/link";
import type { Metadata } from "next";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";

// Custom 404 written as a formal FOI rejection letter. Section 8(3) of the
// Freedom of Information Law (התשנ"ח-1998) lets an authority refuse a request
// when locating the information would require unreasonable resource
// allocation — a perfect legal analogue for "we couldn't find this URL".
// The letter format itself is the joke: the same template real authorities
// send when they want to brush off a journalist.

export const metadata: Metadata = {
  title: "מענה לבקשת מידע — סירוב לפי סעיף 8(3)",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  // Server component — runs per request, so the date is the visitor's
  // request time (Asia/Jerusalem on Render).
  const today = new Date().toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  // The decision letter gets a number that looks plausible — visitors who
  // notice will see it changes each visit.
  const refNumber = `404-${new Date().getFullYear()}-${Math.floor(
    Math.random() * 9000 + 1000,
  )}`;

  return (
    <PublicLayout>
      <Container narrow>
        <div className="my-12 rounded-lg border border-border bg-background p-8 shadow-sm md:p-10">
          {/* Letterhead */}
          <div className="mb-8 border-b border-border pb-4 text-sm text-muted">
            <div className="flex items-baseline justify-between">
              <span>הממונה על חופש המידע באתר</span>
              <span dir="ltr" className="font-mono text-xs">
                {refNumber}
              </span>
            </div>
            <div className="mt-1 text-xs">{today}</div>
          </div>

          {/* Subject line — formal Hebrew letter convention */}
          <p className="mb-6 text-base font-semibold text-foreground">
            הנדון: מענה לבקשת מידע לפי חוק חופש המידע, התשנ״ח-1998
          </p>

          <div className="space-y-4 text-base leading-relaxed text-foreground">
            <p>שלום רב,</p>
            <p>
              בקשתך לעיין בעמוד המבוקש התקבלה ונבחנה בהתאם להוראות חוק חופש
              המידע ולנהליו.
            </p>
            <p>
              לאחר בדיקה, נמצא כי{" "}
              <strong>
                איתור המידע המבוקש מצריך הקצאת משאבים בלתי-סבירה
              </strong>{" "}
              במונחי זמן וכוח-אדם. לפיכך, ובהסתמך על{" "}
              <strong>סעיף 8(3) לחוק חופש המידע</strong> — הקובע כי רשות
              ציבורית רשאית שלא למסור מידע אם איתורו או הטיפול בו דורש הקצאת
              משאבים בלתי-סבירה — בקשתך נדחית.
            </p>
            <p className="text-muted">
              <em>
                במילים פחות פורמליות: דף 404. הכתובת לא נמצאה במערכת.
              </em>
            </p>

            <div className="my-6 rounded-md border-r-4 border-primary bg-primary/5 px-4 py-3 text-sm">
              <p className="font-semibold text-foreground">זכותך לערור:</p>
              <p className="mt-1 text-muted">
                תוך 30 יום ממועד החלטה זו. או, פשוט יותר, חזור לאחת מהכתובות
                הזמינות בהמשך.
              </p>
            </div>

            <p>בכבוד רב,</p>
            <p className="font-semibold">הממונה על חופש המידע באתר זומר</p>
          </div>

          {/* Navigation back */}
          <div className="mt-10 border-t border-border pt-6">
            <p className="mb-3 text-sm text-muted">קישורים מועילים:</p>
            <ul className="flex flex-wrap gap-3 text-sm">
              <li>
                <Link
                  href="/"
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-primary hover:bg-primary/5"
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
                <a
                  href="https://foiguide.org.il/9-%d7%a1%d7%a2%d7%99%d7%a3-8-%d7%9c%d7%97%d7%95%d7%a7-%d7%a1%d7%99%d7%99%d7%92%d7%99%d7%9d-%d7%b4%d7%98%d7%9b%d7%a0%d7%99%d7%99%d7%9d%d7%b4-%d7%97%d7%95%d7%a7-%d7%97%d7%95%d7%a4%d7%a9-%d7%94%d7%9e/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-muted hover:text-foreground"
                >
                  קרא על סעיף 8 ב-foiguide.org.il →
                </a>
              </li>
            </ul>
          </div>
        </div>
      </Container>
    </PublicLayout>
  );
}
