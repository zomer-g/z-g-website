import type { Metadata } from "next";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "תנאי שימוש — כלים משפטיים",
  description:
    "תנאי השימוש של התוסף כלים משפטיים ל-Google Docs™.",
  openGraph: {
    title: "תנאי שימוש — כלים משפטיים",
    description: "תנאי השימוש של התוסף כלים משפטיים ל-Google Docs™.",
  },
};

export default function LegalToolsTermsPage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="bg-primary py-16 sm:py-20 text-center">
        <Container>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            תנאי שימוש — כלים משפטיים
          </h1>
          <p className="mt-4 text-lg text-white/80">עדכון אחרון: אפריל 2026</p>
        </Container>
      </section>

      {/* Content */}
      <section className="py-16">
        <Container narrow>
          <article className="space-y-10">
            {/* Hebrew */}
            <div>
              <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-border">
                קבלת התנאים
              </h2>
              <p className="text-muted leading-relaxed">
                השימוש בתוסף &quot;כלים משפטיים&quot; מהווה הסכמה לתנאים אלה.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-border">
                תיאור השירות
              </h2>
              <p className="text-muted leading-relaxed">
                כלים משפטיים הוא תוסף חינמי ל-Google Docs™ המסייע בניהול ישויות
                משפטיות, נספחים והערות שוליים. התוסף פועל כולו בתוך סביבת Google
                Apps Script™.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-border">
                פרטיות
              </h2>
              <p className="text-muted leading-relaxed">
                אני, מפתח התוסף, אינני אוסף, שולח או מאחסן מידע כלשהו של
                משתמשי התוסף. כל הנתונים נשמרים במסמך עצמו כ-Document
                Properties. ראו{" "}
                <a
                  href="/legal-tools/privacy"
                  className="text-accent hover:underline"
                >
                  מדיניות הפרטיות
                </a>
                .
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-border">
                קוד מקור
              </h2>
              <p className="text-muted leading-relaxed">
                קוד המקור של התוסף פתוח וזמין לעיון ב-
                <a
                  href="https://github.com/zomer-g/legal-tools-addon"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  GitHub
                </a>
                .
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-border">
                אחריות
              </h2>
              <p className="text-muted leading-relaxed">
                התוסף מסופק &quot;כפי שהוא&quot; (AS IS) ללא אחריות מכל סוג.
                המפתח אינו אחראי לכל נזק שעלול להיגרם משימוש בתוסף.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-border">
                שינויים
              </h2>
              <p className="text-muted leading-relaxed">
                תנאים אלה עשויים להתעדכן מעת לעת. המשך השימוש בתוסף מהווה
                הסכמה לתנאים המעודכנים.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-border">
                יצירת קשר
              </h2>
              <p className="text-muted leading-relaxed">
                <a
                  href="mailto:zomerg@gmail.com"
                  className="text-accent hover:underline"
                >
                  zomerg@gmail.com
                </a>
              </p>
            </div>

            <p className="text-sm text-muted/60">
              Google Docs™ ו-Google Apps Script™ הם סימנים מסחריים של Google
              LLC.
            </p>

            {/* English */}
            <hr className="border-border" />

            <div dir="ltr" className="text-left">
              <h2 className="text-2xl font-bold mb-6">
                Terms of Service — Legal Tools
              </h2>
              <p className="text-muted mb-6">Last updated: April 2026</p>

              <h3 className="text-xl font-semibold mb-2">Acceptance</h3>
              <p className="text-muted leading-relaxed mb-6">
                By using the Legal Tools add-on, you agree to these terms.
              </p>

              <h3 className="text-xl font-semibold mb-2">Description</h3>
              <p className="text-muted leading-relaxed mb-6">
                Legal Tools is a free Google Docs™ add-on for managing legal
                entities, appendices, and footnotes. It runs entirely within
                Google Apps Script™.
              </p>

              <h3 className="text-xl font-semibold mb-2">Privacy</h3>
              <p className="text-muted leading-relaxed mb-6">
                I, the developer, do not collect, send, or store any user data.
                All data is saved within the document as Document Properties.
                See the{" "}
                <a
                  href="/legal-tools/privacy"
                  className="text-accent hover:underline"
                >
                  Privacy Policy
                </a>
                .
              </p>

              <h3 className="text-xl font-semibold mb-2">Source Code</h3>
              <p className="text-muted leading-relaxed mb-6">
                The source code is open and available on{" "}
                <a
                  href="https://github.com/zomer-g/legal-tools-addon"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  GitHub
                </a>
                .
              </p>

              <h3 className="text-xl font-semibold mb-2">Disclaimer</h3>
              <p className="text-muted leading-relaxed mb-6">
                The add-on is provided &quot;AS IS&quot; without warranty of any
                kind. The developer is not liable for any damages arising from
                use of the add-on.
              </p>

              <h3 className="text-xl font-semibold mb-2">Changes</h3>
              <p className="text-muted leading-relaxed mb-6">
                These terms may be updated from time to time. Continued use
                constitutes acceptance of the updated terms.
              </p>

              <h3 className="text-xl font-semibold mb-2">Contact</h3>
              <p className="text-muted leading-relaxed mb-6">
                <a
                  href="mailto:zomerg@gmail.com"
                  className="text-accent hover:underline"
                >
                  zomerg@gmail.com
                </a>
              </p>

              <p className="text-sm text-muted/60">
                Google Docs™ and Google Apps Script™ are trademarks of Google
                LLC.
              </p>
            </div>
          </article>
        </Container>
      </section>
    </PublicLayout>
  );
}
