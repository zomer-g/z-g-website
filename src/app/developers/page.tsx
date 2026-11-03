import type { Metadata } from "next";
import type { ReactNode } from "react";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/utils";
import { API_SCOPES } from "@/lib/api-keys";
import { CONTENT_TYPES } from "@/lib/site-content-mcp";
import { UPDATE_TYPES } from "@/lib/site-updates-format";

/**
 * /developers — documentation of the site's public API and MCP server. The
 * invite-only FOI guide MCP server is deliberately left out.
 * Linked from the footer (src/components/layout/footer.tsx). The scope and
 * content-type tables are read from the code that enforces them, so they
 * cannot drift; the endpoint descriptions mirror each route's doc comment.
 */

const SITE = "https://www.z-g.co.il";

// api-keys and site-content-mcp load the Prisma client, which needs
// DATABASE_URL; render on request rather than at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "API ו-MCP",
  description:
    "תיעוד הממשקים הפתוחים של האתר: שרת MCP לקריאת כל התכנים והמסמכים, API ב-JSON, פיד RSS, וממשק הכתיבה עם מפתחות.",
  alternates: { canonical: "/developers" },
  openGraph: {
    title: "API ו-MCP | עו\"ד זומר",
    description: "שרת MCP ו-API פתוחים לכל התכנים שפורסמו באתר.",
  },
};

/* ---- Small building blocks ---- */

function Code({ children }: { children: string }) {
  return (
    <pre
      dir="ltr"
      className="overflow-x-auto rounded-lg bg-primary p-4 text-left text-sm leading-relaxed text-white"
    >
      <code>{children}</code>
    </pre>
  );
}

function C({ children }: { children: ReactNode }) {
  return (
    <code dir="ltr" className="rounded bg-muted-bg px-1.5 py-0.5 text-sm text-foreground">
      {children}
    </code>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="space-y-4">
      <h2 id={id} className="text-2xl font-bold text-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Table({ head, rows }: { head: [string, string]; rows: [ReactNode, ReactNode][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-right">
            <th className="py-2 pl-4 font-semibold">{head[0]}</th>
            <th className="py-2 font-semibold">{head[1]}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([a, b], i) => (
            <tr key={i} className="border-b border-border align-top">
              <td className="py-2 pl-4 whitespace-nowrap">{a}</td>
              <td className="py-2 text-foreground/85">{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const P = ({ children }: { children: ReactNode }) => (
  <p className="text-base leading-relaxed text-foreground">{children}</p>
);

/* ---- Content ---- */

const MCP_TOOLS: [string, string][] = [
  ["site_list", "רשימת התכנים שפורסמו, לפי סוג או קטגוריה."],
  ["site_search", "חיפוש טקסט חופשי בכל התכנים (עד 25 תוצאות)."],
  ["site_get", "פריט אחד במלואו, כ-Markdown, עם רשימת המסמכים המצורפים אליו."],
  ["site_documents", "המסמכים המצורפים לתכנים: פסקי דין, החלטות, מכתבים ודוחות, ובאילו פריטים כל אחד מופיע."],
  ["document_get_text", "הטקסט של מסמך PDF מצורף, לפי עמודים. מסמך סרוק מסומן scanned=true."],
  ["site_updates", "מה חדש באתר, מהחדש לישן; עם since — רק מה שפורסם או נערך מאז."],
];

const WRITE_ENDPOINTS: [string, string][] = [
  ["GET/PUT /api/v1/plilist/<slug>", "טיוטה בהפליליסט: יצירה ועדכון כל עוד היא טיוטה (plilist:draft)"],
  ["GET/PUT /api/v1/plilist/<slug>/edit", "עריכת התוכן של פוסט קיים, כולל פוסט שפורסם (plilist:edit)"],
  ["GET/PUT /api/v1/articles/<slug>", "עריכת התוכן של מאמר קיים (articles:edit)"],
  ["GET/PUT /api/v1/milon/<slug>", "יצירה ועדכון של ערך במילון (milon:write)"],
  ["PUT /api/v1/media-appearances", "הוספה ועדכון של פריט ברשימת הפרסומים (media:write)"],
  ["PUT /api/v1/case-documents", "הוספה ועדכון של מסמך בתיק של פוסט (cases:write)"],
  ["PUT /api/v1/uploads/api-<name>.pdf", "העלאת PDF או תמונה בשם שמתחיל ב-api- (cases:write)"],
  ["PUT /api/v1/uploads/<name>.pdf/replace", "החלפת PDF קיים בגרסה מושחרת; הגרסה הקודמת נשמרת כקובץ לא פומבי (uploads:replace)"],
];

export default function DevelopersPage() {
  return (
    <PublicLayout>
      <section aria-labelledby="dev-hero-heading" className="bg-primary py-16 sm:py-20">
        <Container>
          <div className="text-center">
            <h1
              id="dev-hero-heading"
              className={cn("text-3xl font-bold leading-snug tracking-tight text-white", "sm:text-4xl lg:text-5xl")}
            >
              API ו-MCP
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-white/80">
              כל מה שפורסם באתר — מאמרים, פוסטים, תיקים ומסמכים — זמין גם למכונות: לסוכני AI דרך MCP,
              ולתוכנות דרך JSON ו-RSS. הקריאה פתוחה וחינמית, בלי הרשמה.
            </p>
          </div>
        </Container>
      </section>

      <section className="py-16 sm:py-20">
        <Container narrow>
          <div className="space-y-14">
            <Section id="mcp" title="שרת MCP של האתר">
              <P>
                שרת <a className="underline" href="https://modelcontextprotocol.io">MCP</a> שמאפשר ל-Claude,
                ל-ChatGPT ולכל לקוח MCP אחר לחפש ולקרוא את כל התכנים שפורסמו באתר ואת המסמכים המצורפים אליהם.
                אין צורך בהזדהות.
              </P>
              <Code>{`${SITE}/api/mcp/site`}</Code>
              <P>
                ב-Claude: הגדרות ← Connectors ← Add custom connector, והדביקו את הכתובת. התעבורה היא Streamable
                HTTP עם תשובות JSON (בלי SSE), בגרסאות הפרוטוקול 2025-06-18, 2025-03-26 ו-2024-11-05. הקצב מוגבל
                ל-120 בקשות בדקה לכל כתובת IP.
              </P>
              <Table head={["כלי", "מה הוא מחזיר"]} rows={MCP_TOOLS.map(([n, d]) => [<C key={n}>{n}</C>, d])} />
              <P>דוגמה, בלי לקוח MCP:</P>
              <Code>{`curl -s ${SITE}/api/mcp/site \\
  -H 'Content-Type: application/json' \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call",
       "params":{"name":"site_search","arguments":{"query":"חופש מידע"}}}'`}</Code>
            </Section>

            <Section id="rest" title="API לקריאה (JSON)">
              <P>
                אותם נתונים, ב-HTTP רגיל. בלי מפתח, עם CORS פתוח. כל התשובות כוללות רק תוכן שפורסם.
              </P>
              <h3 className="text-lg font-semibold text-foreground">
                <C>GET /api/v1/content</C>
              </h3>
              <Table
                head={["פרמטר", "משמעות"]}
                rows={[
                  [<C key="n">(ללא)</C>, "אינדקס של כל הפריטים"],
                  [<C key="t">type</C>, `סוג אחד: ${Object.keys(CONTENT_TYPES).join(", ")}`],
                  [<C key="c">category</C>, "סינון לפי קטגוריה או תגית"],
                  [<C key="q">q, limit</C>, "חיפוש טקסט חופשי (עד 25 תוצאות)"],
                  [<C key="i">id</C>, "פריט אחד במלואו כ-Markdown, למשל blog:<slug> או הכתובת שלו"],
                ]}
              />
              <h3 className="text-lg font-semibold text-foreground">
                <C>GET /api/v1/updates</C>
              </h3>
              <P>
                מה חדש באתר, מהחדש לישן — אותם פריטים כמו ב-RSS ובכלי site_updates. למעקב: שמרו את{" "}
                <C>checked_at</C> מכל תשובה והעבירו אותו כ-<C>since</C> בפעם הבאה; כל פריט מסומן{" "}
                <C>new</C> או <C>updated</C>.
              </P>
              <Table
                head={["פרמטר", "משמעות"]}
                rows={[
                  [<C key="s">since</C>, "תאריך ISO; רק מה שפורסם או נערך מאז"],
                  [<C key="t">type</C>, `סוגים מופרדים בפסיק: ${Object.keys(UPDATE_TYPES).join(", ")}`],
                  [<C key="l">limit</C>, "ברירת מחדל 50, עד 200"],
                ]}
              />
              <h3 className="text-lg font-semibold text-foreground">
                <C>GET /feed.xml</C>
              </h3>
              <P>
                אותו זרם כ-RSS, לקוראי פידים. אפשר לסנן: <C>/feed.xml?type=article,blog</C>.
              </P>
              <Code>{`curl -s '${SITE}/api/v1/updates?since=2026-10-01&type=blog,document'`}</Code>
            </Section>

            <Section id="files" title="קבצים ומסמכים">
              <P>
                המסמכים עצמם מוגשים בכתובת <C>/uploads/&lt;name&gt;</C>. ה-MCP וה-API מגישים רק מסמכים שמצורפים
                לתוכן שפורסם. קובץ שהוסתר על ידי מנהל האתר עונה 404 בכל הממשקים, והטקסט שלו אינו מוגש. מסמך
                שהוחלף בגרסה מושחרת מוגש מאותה כתובת בגרסה החדשה בלבד.
              </P>
            </Section>

            <Section id="write" title="ממשק כתיבה (מפתחות API)">
              <P>
                ממשק הכתיבה פתוח רק למפתחות שמנפיק מנהל האתר, לכל מפתח הרשאות מוגדרות ותוקף של עד שנה. המפתח
                נשלח בכותרת <C>Authorization: Bearer zg_…</C>. כל קריאה נרשמת. אף מפתח אינו יכול למחוק תוכן או
                לפרסם פוסט — אלה נשארים פעולות של אדם.
              </P>
              <Table
                head={["הרשאה", "מה היא מתירה"]}
                rows={Object.entries(API_SCOPES).map(([scope, label]) => [<C key={scope}>{scope}</C>, label])}
              />
              <Table
                head={["נקודת קצה", "מה היא עושה"]}
                rows={WRITE_ENDPOINTS.map(([e, d]) => [<C key={e}>{e}</C>, d])}
              />
            </Section>
          </div>
        </Container>
      </section>
    </PublicLayout>
  );
}
