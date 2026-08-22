import type { Metadata } from "next";
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
  alternates: { canonical: "/pach-hamishpat" },
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
        </Container>
      </section>
    </PublicLayout>
  );
}
