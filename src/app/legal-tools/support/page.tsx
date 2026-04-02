import type { Metadata } from "next";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "תמיכה — כלים משפטיים",
  description: "תמיכה ויצירת קשר עבור התוסף כלים משפטיים ל-Google Docs™.",
  openGraph: {
    title: "תמיכה — כלים משפטיים",
    description: "תמיכה ויצירת קשר עבור התוסף כלים משפטיים ל-Google Docs™.",
  },
};

export default function LegalToolsSupportPage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="bg-primary py-16 sm:py-20 text-center">
        <Container>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            תמיכה — כלים משפטיים
          </h1>
        </Container>
      </section>

      {/* Content */}
      <section className="py-16">
        <Container narrow>
          <article className="space-y-10">
            {/* Hebrew */}
            <div>
              <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-border">
                יצירת קשר
              </h2>
              <p className="text-muted leading-relaxed mb-4">
                לשאלות, בעיות או הצעות לשיפור, ניתן לפנות אליי ישירות:
              </p>
              <div className="p-5 border border-border rounded-lg bg-muted/5">
                <p className="text-muted">
                  דוא&quot;ל:{" "}
                  <a
                    href="mailto:zomerg@gmail.com"
                    className="text-accent hover:underline font-semibold text-lg"
                  >
                    zomerg@gmail.com
                  </a>
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-border">
                דיווח על באג
              </h2>
              <p className="text-muted leading-relaxed">
                ניתן גם לדווח על בעיות טכניות דרך{" "}
                <a
                  href="https://github.com/zomer-g/legal-tools-addon/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  GitHub Issues
                </a>
                .
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-border">
                שאלות נפוצות
              </h2>
              <div className="space-y-4 text-muted leading-relaxed">
                <div>
                  <p className="font-semibold">איך מתחילים?</p>
                  <p>
                    לאחר התקנת התוסף, פתחו מסמך ב-Google Docs™ ולחצו על התפריט
                    &quot;כלים משפטיים&quot; ← &quot;פתח סרגל כלים&quot;.
                  </p>
                </div>
                <div>
                  <p className="font-semibold">האם התוסף אוסף מידע?</p>
                  <p>
                    לא. אני, מפתח התוסף, אינני אוסף שום מידע. כל הנתונים
                    נשמרים במסמך שלכם בלבד.
                  </p>
                </div>
                <div>
                  <p className="font-semibold">האם התוסף חינמי?</p>
                  <p>כן, לחלוטין.</p>
                </div>
              </div>
            </div>

            <p className="text-sm text-muted/60">
              Google Docs™ הוא סימן מסחרי של Google LLC.
            </p>

            {/* English */}
            <hr className="border-border" />

            <div dir="ltr" className="text-left">
              <h2 className="text-2xl font-bold mb-6">
                Support — Legal Tools
              </h2>

              <h3 className="text-xl font-semibold mb-2">Contact</h3>
              <p className="text-muted leading-relaxed mb-3">
                For questions, issues, or suggestions, contact me directly:
              </p>
              <div className="p-5 border border-border rounded-lg bg-muted/5 mb-6">
                <p className="text-muted">
                  Email:{" "}
                  <a
                    href="mailto:zomerg@gmail.com"
                    className="text-accent hover:underline font-semibold text-lg"
                  >
                    zomerg@gmail.com
                  </a>
                </p>
              </div>

              <h3 className="text-xl font-semibold mb-2">Bug Reports</h3>
              <p className="text-muted leading-relaxed mb-6">
                You can also report technical issues via{" "}
                <a
                  href="https://github.com/zomer-g/legal-tools-addon/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  GitHub Issues
                </a>
                .
              </p>

              <h3 className="text-xl font-semibold mb-2">FAQ</h3>
              <div className="space-y-4 text-muted leading-relaxed mb-6">
                <div>
                  <p className="font-semibold">How do I get started?</p>
                  <p>
                    After installing the add-on, open a Google Docs™ document
                    and click the menu &quot;כלים משפטיים&quot; (Legal Tools).
                  </p>
                </div>
                <div>
                  <p className="font-semibold">
                    Does the add-on collect data?
                  </p>
                  <p>
                    No. I, the developer, do not collect any data. All data is
                    stored within your document only.
                  </p>
                </div>
                <div>
                  <p className="font-semibold">Is the add-on free?</p>
                  <p>Yes, completely free.</p>
                </div>
              </div>

              <p className="text-sm text-muted/60">
                Google Docs™ is a trademark of Google LLC.
              </p>
            </div>
          </article>
        </Container>
      </section>
    </PublicLayout>
  );
}
