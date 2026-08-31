import type { Metadata } from "next";
import { Code2, Rss } from "lucide-react";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import { JsonLd } from "@/components/seo/json-ld";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/site";
import {
  computePachStatus,
  PACH_STATUS_ANSWER,
  PACH_STATUS_TEXT,
  toPachStatus,
  type PachStatus,
} from "@/lib/pach-status";
import { PachDashboard } from "./pach-dashboard";

export const dynamic = "force-dynamic";

/**
 * The title is deliberately NOT brand-first, and deliberately absolute.
 *
 * Measured: this page sits at position 7.5 for "סטטוס נט" with 48 impressions
 * and zero clicks over 90 days. Someone typing that wants one thing — is
 * נט המשפט down right now — and the old title answered with an invented brand
 * name followed by the firm name, which reads like a law-firm landing page.
 * Leading with the question the searcher asked is the whole fix. The brand
 * stays at the end, because searches for "פח המשפט" itself convert at 23.8%
 * and must not be thrown away.
 */
const TITLE = "נט המשפט לא עובד? סטטוס נט המשפט עכשיו | פח המשפט";
const DESCRIPTION =
  "בדיקת סטטוס נט המשפט בזמן אמת, לפי דיווחים של עורכי דין ברגע זה: המערכת תקינה, תקלה חלקית או השבתה. אפשר גם לדווח על תקלה — בלי הרשמה.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: {
    canonical: "/pach-hamishpat",
    // Auto-discovery: browsers and feed readers look for this <link> before
    // they look for a URL a human typed. Without it, subscribing means
    // reading the documentation section further down the page first.
    types: {
      "application/rss+xml": [
        {
          url: "/pach-hamishpat/feed.xml",
          title: "פח המשפט — דיווחי סטטוס נט המשפט ותגובות",
        },
      ],
    },
  },
  keywords: [
    "סטטוס נט",
    "סטטוס נט המשפט",
    "נט המשפט לא עובד",
    "נט המשפט מושבת",
    "נט המשפט קרס",
    "תקלה בנט המשפט",
    "פח המשפט",
    "net hamishpat status",
  ],
  openGraph: {
    type: "website",
    locale: "he_IL",
    // Was the bare domain while the site serves www — the same mismatch that
    // pointed every canonical at the wrong host. absoluteUrl() is the origin
    // of record.
    url: absoluteUrl("/pach-hamishpat"),
    siteName: "עו\"ד גיא זומר",
    title: TITLE,
    description: DESCRIPTION,
  },
};

/**
 * Read the board on the server so the first frame is true.
 *
 * Cheap — three indexed SELECTs — and the page is already force-dynamic. If
 * the database is unreachable the page still renders and the client poll takes
 * over a second later; a status page that 500s is the one failure mode worth
 * ruling out.
 */
async function loadBoard() {
  try {
    const [reports, comments, messages] = await Promise.all([
      prisma.pachReport.findMany({
        where: { isHidden: false },
        orderBy: { createdDate: "desc" },
        take: 500,
      }),
      prisma.pachComment.findMany({
        where: { isHidden: false },
        orderBy: { createdDate: "desc" },
        take: 500,
      }),
      prisma.pachSystemMessage.findMany({
        where: { isArchived: false },
        orderBy: { createdDate: "desc" },
        take: 200,
      }),
    ]);
    return {
      reports: reports.map((r) => ({
        id: r.id,
        status: toPachStatus(r.status),
        description: r.description,
        reporter_type: r.reporterType,
        created_date: r.createdDate.toISOString(),
        expires_at: r.expiresAt?.toISOString() ?? null,
        is_hidden: r.isHidden,
        is_scheduled: r.isScheduled,
        scheduled_from: r.scheduledFrom?.toISOString() ?? null,
        scheduled_until: r.scheduledUntil?.toISOString() ?? null,
      })),
      comments: comments.map((c) => ({
        id: c.id,
        content: c.content,
        author_name: c.authorName,
        is_admin: c.isAdmin,
        is_hidden: c.isHidden,
        created_date: c.createdDate.toISOString(),
      })),
      messages: messages.map((m) => ({
        id: m.id,
        title: m.title,
        content: m.content,
        image_url: m.imageUrl,
        order_index: m.orderIndex,
        is_archived: m.isArchived,
        created_date: m.createdDate.toISOString(),
      })),
    };
  } catch (e) {
    console.error("[pach] server board load failed", e);
    return { reports: [], comments: [], messages: [] };
  }
}

export default async function PachHamishpatPage() {
  const board = await loadBoard();
  const status: PachStatus = computePachStatus(board.reports);

  return (
    <PublicLayout>
      {/*
        Identifies the page as a thing with a name, and ties it to the domain it
        used to live on. pah.org.il carries whatever authority the standalone
        site earned; sameAs is how you tell Google the two are one entity rather
        than two competitors for the same query.
      */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "פח המשפט",
          alternateName: ["סטטוס נט המשפט", "Pach Hamishpat"],
          url: absoluteUrl("/pach-hamishpat"),
          sameAs: ["https://pah.org.il/", "https://www.pah.org.il/"],
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          inLanguage: "he",
          isAccessibleForFree: true,
          description: DESCRIPTION,
          offers: { "@type": "Offer", price: "0", priceCurrency: "ILS" },
        }}
      />

      {/* Hero — same shape as /legal-tools and /case-tracker so the page
          feels integrated with the rest of the projects series. */}
      <section className="bg-primary py-16 sm:py-20 text-center">
        <Container>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            פח המשפט — סטטוס נט המשפט
          </h1>
          <p className="mt-4 text-lg text-white/80 max-w-2xl mx-auto">
            {/* The live answer, in words, above the fold. The coloured banner
                below says the same thing graphically; this says it in text that
                a crawler and a screen reader can both read. */}
            {PACH_STATUS_ANSWER[status]}
          </p>
        </Container>
      </section>

      <section className="py-12 sm:py-16">
        <Container>
          <PachDashboard
            initialReports={board.reports}
            initialComments={board.comments}
            initialMessages={board.messages}
          />

          {/*
            The two endpoints, at the bottom of the board itself.
            The full documentation lives further down the page, but nobody
            scrolls past the timeline to find out that an API exists — and an
            endpoint nobody knows about is a private one. This is the smallest
            thing that makes it discoverable: the two URLs, one line each, and
            a link to the details for whoever wants them.
          */}
          <aside
            aria-labelledby="pach-devbox-heading"
            className="mt-10 max-w-3xl rounded-xl border border-border bg-muted-bg p-5"
          >
            <h2
              id="pach-devbox-heading"
              className="flex items-center gap-2 text-base font-bold text-primary-dark"
            >
              <Code2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              לקרוא את הלוח בלי לפתוח את העמוד
            </h2>

            <dl className="mt-4 space-y-3 text-sm text-muted">
              <div className="sm:flex sm:items-baseline sm:gap-3">
                <dt className="shrink-0 font-bold text-primary-dark">
                  סטטוס נוכחי (JSON)
                </dt>
                <dd className="min-w-0">
                  <a
                    href="/api/pach-hamishpat/status"
                    dir="ltr"
                    className="break-all font-mono text-xs underline underline-offset-2 hover:no-underline"
                  >
                    /api/pach-hamishpat/status
                  </a>
                </dd>
              </div>
              <div className="sm:flex sm:items-baseline sm:gap-3">
                <dt className="flex shrink-0 items-center gap-1.5 font-bold text-primary-dark">
                  <Rss className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  פיד RSS
                </dt>
                <dd className="min-w-0">
                  <a
                    href="/pach-hamishpat/feed.xml"
                    dir="ltr"
                    className="break-all font-mono text-xs underline underline-offset-2 hover:no-underline"
                  >
                    /pach-hamishpat/feed.xml
                  </a>
                </dd>
              </div>
            </dl>

            <p className="mt-4 text-xs text-muted">
              הפיד מתעדכן בכל דיווח על השבתה או תקלה, וגם בכל תגובה שנכתבת כאן.
              שתי הכתובות פתוחות, ללא הרשמה וללא מפתח —{" "}
              <a
                href="#pach-api-heading"
                className="font-bold underline underline-offset-2 hover:no-underline"
              >
                פרמטרים ותיעוד מלא בהמשך העמוד
              </a>
              .
            </p>
          </aside>

          {/*
            Everything above this line is interface. A crawler arriving here
            found a heading, a coloured graphic and some buttons — almost no
            prose to judge relevance by, which is a plausible reason the page
            ranks 7th for its own head term instead of 1st. This is the page
            explaining itself, in the words people actually type.
          */}
          <section
            aria-labelledby="pach-about-heading"
            className="mt-14 border-t border-border pt-8 max-w-3xl"
          >
            <h2
              id="pach-about-heading"
              className="text-xl font-bold text-primary-dark"
            >
              מה זה פח המשפט?
            </h2>
            <div className="prose-rtl mt-4 text-muted">
              <p>
                נט המשפט נופל, ואין לאף אחד דרך לדעת אם זו תקלה כללית או משהו
                בצד שלו. השאלה &quot;תגידי, נט המשפט עובד לך?&quot; נשאלת עשרות
                פעמים ביום בקבוצות של עורכי דין, ואף אחת מהתשובות לא נשמרת. פח
                המשפט הוא המקום שבו התשובה כן נשמרת: כל אחד מדווח מה הוא רואה,
                וכולם רואים את התמונה המצטברת.
              </p>

              <h3 className="text-base font-bold text-primary-dark">
                איך יודעים אם נט המשפט מושבת?
              </h3>
              <p>
                הסטטוס בעמוד הזה נקבע מדיווחים של משתמשים ברגע זה, לא מהודעה
                רשמית. שלושה מצבים אפשריים:{" "}
                <strong>{PACH_STATUS_TEXT.green}</strong> — אין דיווחי תקלה
                פעילים; <strong>{PACH_STATUS_TEXT.orange}</strong> — המערכת
                עולה, אבל חלק מהפעולות, כמו צפייה בהחלטות או הגשת בקשות, אינן
                עובדות; <strong>{PACH_STATUS_TEXT.red}</strong> — אין בכלל גישה
                לאתר. דיווח על תקלה מחזיק זמן מוגבל, ומתארך ככל שיותר אנשים
                מדווחים על אותו דבר, כדי שתקלה אמיתית לא תיעלם מהלוח אחרי דקה.
              </p>

              <h3 className="text-base font-bold text-primary-dark">
                מה עושים כשנט המשפט לא עובד?
              </h3>
              <p>
                קודם כול לדווח כאן, כדי שאחרים יידעו. ואם הייתה לכם הגשה שנקבע
                לה מועד — תעדו את השעה ואת מה שראיתם על המסך. השבתה מתועדת של נט
                המשפט היא נימוק ממשי בבקשה להארכת מועד, והיומן בעמוד הזה שומר את
                הדיווחים כדי שיהיה למה להפנות.
              </p>

              <h3 className="text-base font-bold text-primary-dark">
                האם זה אתר רשמי של הנהלת בתי המשפט?
              </h3>
              <p>
                לא. פח המשפט הוא כלי קהילתי עצמאי, שנבנה ומופעל בהתנדבות על ידי
                עו&quot;ד גיא זומר. הוא אינו מחובר למערכות של הנהלת בתי המשפט
                ואינו מתיימר להחליף הודעה רשמית — הוא מרכז את מה שהמשתמשים עצמם
                מדווחים. האתר פעל בעבר בכתובת pah.org.il, ועבר לכאן.
              </p>
            </div>
          </section>

          {/*
            The board, for everything that is not a person with a browser.
            Documented on the page rather than in a README because the people
            who would wire this into a firm's intranet dashboard arrive here,
            not at a repository — and an undocumented endpoint is a private one.
          */}
          <section
            aria-labelledby="pach-api-heading"
            className="mt-14 border-t border-border pt-8 max-w-3xl"
          >
            <h2 id="pach-api-heading" className="text-xl font-bold text-primary-dark">
              API ו-RSS — לחבר את הסטטוס למערכת שלכם
            </h2>
            <div className="prose-rtl mt-4 text-muted">
              <p>
                אפשר לקרוא את הלוח גם בלי לפתוח את העמוד: יש כתובת שמחזירה את
                הסטטוס הנוכחי כ-JSON, ויש פיד RSS שמתעדכן בכל דיווח חדש ובכל
                תגובה שנכתבת. שתיהן פתוחות, ללא הרשמה וללא מפתח, ומחזירות בדיוק
                את מה שמוצג כאן לכל אחד. השימוש חופשי — נשמח לקרדיט וקישור.
              </p>

              <h3 className="text-base font-bold text-primary-dark">
                סטטוס נוכחי (JSON)
              </h3>
              <pre
                dir="ltr"
                className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100"
              >
                <code>GET https://www.z-g.co.il/api/pach-hamishpat/status</code>
              </pre>
              <p>
                מחזיר את <code dir="ltr">status</code>{" "}
                (&quot;green&quot; /
                &quot;orange&quot; / &quot;red&quot;), את הניסוח בעברית, את
                הדיווח שקבע את הסטטוס ומתי הוא פג, מונים של דיווחי תקלה בשעה
                וביממה האחרונות, וחלונות תחזוקה מתוכננים שטרם התחילו. לשימוש
                בסקריפט אפשר להוסיף <code dir="ltr">?format=text</code> ולקבל
                את המילה הבודדת בלבד:
              </p>
              <pre
                dir="ltr"
                className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100"
              >
                <code>
                  {`curl -s "https://www.z-g.co.il/api/pach-hamishpat/status?format=text"\n# → red`}
                </code>
              </pre>

              <h3 className="text-base font-bold text-primary-dark">
                פיד RSS
              </h3>
              <pre
                dir="ltr"
                className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100"
              >
                <code>https://www.z-g.co.il/pach-hamishpat/feed.xml</code>
              </pre>
              <p>
                פיד אחד שמכיל את שני סוגי העדכונים: כל דיווח על השבתה, תקלה
                חלקית או חזרה לפעילות, וכל תגובה שנכתבה על הלוח — לפי סדר זמנים
                יורד. מי שרוצה רק חצי מזה יכול להוסיף{" "}
                <code dir="ltr">?type=reports</code> או{" "}
                <code dir="ltr">?type=comments</code>, ו-
                <code dir="ltr">?limit=</code> קובע כמה פריטים יוחזרו (ברירת
                המחדל 50, מקסימום 200).
              </p>

              <h3 className="text-base font-bold text-primary-dark">
                ההיסטוריה המלאה
              </h3>
              <p>
                שתי כתובות נוספות מחזירות את הרשומות הגולמיות, לכל מי שרוצה
                לנתח את הדיווחים לאורך זמן:{" "}
                <code dir="ltr">/api/pach-hamishpat/reports</code> ו-
                <code dir="ltr">/api/pach-hamishpat/comments</code>, שתיהן
                תומכות ב-<code dir="ltr">?limit=</code> ו-
                <code dir="ltr">?sort=</code>.
              </p>
              <p>
                <strong>שימו לב:</strong> הנתונים הם דיווחים של משתמשים, לא
                הודעה רשמית של הנהלת בתי המשפט. מערכת שמסתמכת עליהם צריכה
                להתייחס אליהם כאינדיקציה קהילתית, ולא כמקור סמכותי על מצב נט
                המשפט.
              </p>
            </div>
          </section>
        </Container>
      </section>
    </PublicLayout>
  );
}
