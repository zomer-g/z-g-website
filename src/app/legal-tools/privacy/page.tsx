import type { Metadata } from "next";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "מדיניות פרטיות — כלים משפטיים",
  description:
    "מדיניות הפרטיות של התוסף כלים משפטיים ל-Google Docs™. אין איסוף מידע.",
  openGraph: {
    title: "מדיניות פרטיות — כלים משפטיים",
    description:
      "מדיניות הפרטיות של התוסף כלים משפטיים ל-Google Docs™.",
  },
};

export default function LegalToolsPrivacyPage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="bg-primary py-16 sm:py-20 text-center">
        <Container>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            מדיניות פרטיות — כלים משפטיים
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
                מהו התוסף
              </h2>
              <p className="text-muted leading-relaxed">
                כלים משפטיים הוא תוסף ל-Google Docs™ המיועד לעורכי דין. התוסף
                מסייע בניהול ישויות משפטיות, נספחים והערות שוליים במסמכים
                משפטיים.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-border">
                איסוף מידע
              </h2>
              <p className="text-muted leading-relaxed font-semibold">
                אני, מפתח התוסף, אינני אוסף, שולח, מאחסן או משתף שום מידע של
                משתמשי התוסף.
              </p>
              <ul className="mt-4 space-y-2 text-muted leading-relaxed list-disc list-inside">
                <li>
                  כל הקוד רץ באופן מקומי בסביבת Google Apps Script™, בתוך חשבון
                  Google של המשתמש.
                </li>
                <li>התוסף ניגש אך ורק למסמך הפתוח הנוכחי.</li>
                <li>אין שרתים חיצוניים, אין קריאות רשת, אין צדדים שלישיים.</li>
                <li>
                  הנתונים (ישויות, נספחים, הערות שוליים) נשמרים כ-Document
                  Properties בתוך המסמך עצמו — ונשארים בבעלות המשתמש בלבד.
                </li>
              </ul>
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
                הרשאות
              </h2>
              <p className="text-muted leading-relaxed">
                התוסף מבקש שתי הרשאות בלבד:
              </p>
              <ul className="mt-2 space-y-2 text-muted leading-relaxed list-disc list-inside">
                <li>
                  <strong>גישה למסמך הנוכחי בלבד</strong> — לקריאה ועריכת תוכן
                  המסמך.
                </li>
                <li>
                  <strong>הצגת ממשק משתמש</strong> — להצגת סרגל הצד והתפריט.
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-border">
                יצירת קשר
              </h2>
              <p className="text-muted leading-relaxed">
                לשאלות בנוגע לפרטיות:{" "}
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
                Privacy Policy — Legal Tools
              </h2>
              <p className="text-muted mb-6">Last updated: April 2026</p>

              <h3 className="text-xl font-semibold mb-2">
                What is this add-on
              </h3>
              <p className="text-muted leading-relaxed mb-6">
                Legal Tools is a Google Docs™ add-on designed for attorneys. It
                helps manage legal entities, appendices, and footnotes in legal
                documents.
              </p>

              <h3 className="text-xl font-semibold mb-2">Data Collection</h3>
              <p className="text-muted leading-relaxed font-semibold mb-2">
                I, the developer of this add-on, do not collect, transmit,
                store, or share any user data whatsoever.
              </p>
              <ul className="space-y-1 text-muted leading-relaxed list-disc list-inside mb-6">
                <li>
                  All code runs locally within Google Apps Script™, inside the
                  user&apos;s own Google account.
                </li>
                <li>The add-on only accesses the currently open document.</li>
                <li>
                  There are no external servers, no network calls, no third
                  parties.
                </li>
                <li>
                  Data (entities, appendices, footnotes) is stored as Document
                  Properties within the document itself — fully owned by the
                  user.
                </li>
              </ul>

              <h3 className="text-xl font-semibold mb-2">Source Code</h3>
              <p className="text-muted leading-relaxed mb-6">
                The source code of this add-on is open and available for review
                on{" "}
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

              <h3 className="text-xl font-semibold mb-2">Permissions</h3>
              <p className="text-muted leading-relaxed mb-2">
                The add-on requests only two permissions:
              </p>
              <ul className="space-y-1 text-muted leading-relaxed list-disc list-inside mb-6">
                <li>
                  <strong>Access to the current document only</strong> — to read
                  and edit document content.
                </li>
                <li>
                  <strong>Display user interface</strong> — to show the sidebar
                  and menu.
                </li>
              </ul>

              <h3 className="text-xl font-semibold mb-2">Contact</h3>
              <p className="text-muted leading-relaxed mb-6">
                For privacy questions:{" "}
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
