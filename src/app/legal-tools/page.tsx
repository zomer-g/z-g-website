import type { Metadata } from "next";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import Link from "next/link";

export const metadata: Metadata = {
  title: "כלים משפטיים | תוסף ל-Google Docs™",
  description:
    "תוסף חינמי ל-Google Docs™ לעורכי דין — ניהול ישויות משפטיות, נספחים והערות שוליים.",
  openGraph: {
    title: "כלים משפטיים | תוסף ל-Google Docs™",
    description:
      "תוסף חינמי ל-Google Docs™ לעורכי דין — ניהול ישויות משפטיות, נספחים והערות שוליים.",
  },
};

export default function LegalToolsPage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="bg-primary py-16 sm:py-20 text-center">
        <Container>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            כלים משפטיים
          </h1>
          <p className="mt-4 text-lg text-white/80 max-w-2xl mx-auto">
            תוסף חינמי ל-Google Docs™ לעורכי דין ואנשי מקצוע משפטיים
          </p>
        </Container>
      </section>

      {/* Content */}
      <section className="py-16">
        <Container narrow>
          <article className="space-y-12">
            {/* Features */}
            <div>
              <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-border">
                יכולות התוסף
              </h2>
              <ul className="space-y-3 text-muted leading-relaxed">
                <li>
                  <strong>ניהול ישויות משפטיות</strong> — הגדרת צדדים, חוקים
                  ומוסדות עם כינויים ואזכור ראשון אוטומטי
                </li>
                <li>
                  <strong>ניהול נספחים</strong> — מספור אוטומטי לפי סדר הופעה
                  במסמך
                </li>
                <li>
                  <strong>הערות שוליים</strong> — בפורמט ציטוט משפטי ישראלי
                </li>
              </ul>
            </div>

            {/* Privacy */}
            <div>
              <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-border">
                פרטיות ואבטחה
              </h2>
              <p className="text-muted leading-relaxed">
                אני, מפתח התוסף, אינני אוסף, שולח או מאחסן שום מידע של משתמשי
                התוסף. כל הקוד רץ בסביבת Google Apps Script™ של המשתמש. קוד
                המקור פתוח לעיון.
              </p>
            </div>

            {/* Developer */}
            <div>
              <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-border">
                אודות המפתח
              </h2>
              <p className="text-muted leading-relaxed">
                Guy Zomer — עורך דין ומפתח תוכנה.
              </p>
              <p className="text-muted leading-relaxed mt-2">
                יצירת קשר:{" "}
                <a
                  href="mailto:zomerg@gmail.com"
                  className="text-accent hover:underline"
                >
                  zomerg@gmail.com
                </a>
              </p>
            </div>

            {/* Links */}
            <div>
              <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-border">
                קישורים
              </h2>
              <ul className="space-y-2 text-muted">
                <li>
                  <Link
                    href="/legal-tools/privacy"
                    className="text-accent hover:underline"
                  >
                    מדיניות פרטיות
                  </Link>
                </li>
                <li>
                  <Link
                    href="/legal-tools/terms"
                    className="text-accent hover:underline"
                  >
                    תנאי שימוש
                  </Link>
                </li>
                <li>
                  <Link
                    href="/legal-tools/support"
                    className="text-accent hover:underline"
                  >
                    תמיכה
                  </Link>
                </li>
                <li>
                  <a
                    href="https://github.com/zomer-g/legal-tools-addon"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline"
                  >
                    קוד מקור (GitHub)
                  </a>
                </li>
              </ul>
            </div>

            {/* Trademark */}
            <p className="text-sm text-muted/60">
              Google Docs™ ו-Google Apps Script™ הם סימנים מסחריים של Google
              LLC.
            </p>
          </article>
        </Container>
      </section>
    </PublicLayout>
  );
}
