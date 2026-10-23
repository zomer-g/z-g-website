import { Code2, Plug } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { CONTENT_TYPES } from "@/lib/site-content-mcp";
import { SITE_ORIGIN } from "@/lib/site";

// Documentation for the two machine-readable views of the site's content:
// the MCP server at /api/mcp/site and the REST API under /api/v1. Both read
// the same loader (lib/site-content-mcp), so they always agree. Keep the tool
// and endpoint lists here in step with those two routes.

const MCP_URL = `${SITE_ORIGIN}/api/mcp/site`;
const API_BASE = `${SITE_ORIGIN}/api/v1`;

const MCP_TOOLS: { name: string; does: string; args: string }[] = [
  { name: "site_search", does: "חיפוש טקסט חופשי בכל התכנים ובמסמכים המצורפים אליהם", args: "query, type?, limit?" },
  { name: "site_list", does: "רשימת כל התכנים שפורסמו, אפשר לסנן לפי סוג או קטגוריה", args: "type?, category?" },
  { name: "site_get", does: "פריט אחד במלואו ב-Markdown, עם המסמכים והקישורים שבו", args: "id, type?" },
  { name: "site_documents", does: "המסמכים המצורפים (פסקי דין, מכתבים, דוחות), לכולם או לפריט אחד", args: "id?, type?" },
  { name: "document_get_text", does: "הטקסט המלא של מסמך PDF מצורף, לפי עמודים", args: "document, from_page?, max_chars?" },
];

const ENDPOINTS: { path: string; does: string }[] = [
  { path: "/content", does: "אינדקס כל התכנים שפורסמו" },
  { path: "/content?type=blog", does: "תכנים מסוג אחד" },
  { path: "/content?category=<תגית>", does: "תכנים לפי קטגוריה או תגית" },
  { path: "/content?q=<שאילתה>&limit=10", does: "חיפוש טקסט חופשי (עד 25 תוצאות)" },
  { path: "/content?id=article:<slug>", does: "פריט אחד במלואו: Markdown, מסמכים וקישורים" },
  { path: "/documents", does: "כל המסמכים המצורפים, ולכל מסמך באילו פריטים הוא מופיע" },
  { path: "/documents?item=blog:<slug>", does: "המסמכים של פריט אחד" },
  { path: "/documents?document=<id>&from_page=1&max_chars=30000", does: "הטקסט של מסמך PDF, לפי עמודים" },
];

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code dir="ltr" className="rounded bg-muted-bg px-1.5 py-0.5 font-mono text-sm text-foreground">
      {children}
    </code>
  );
}

function Block({ children, label }: { children: string; label: string }) {
  return (
    <pre
      dir="ltr"
      aria-label={label}
      tabIndex={0}
      className="mt-3 overflow-x-auto rounded-lg bg-primary-dark p-4 text-left font-mono text-sm leading-relaxed text-white"
    >
      <code>{children}</code>
    </pre>
  );
}

function H3({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h3 id={id} className="mt-10 text-xl font-bold text-primary-dark first:mt-0">
      {children}
    </h3>
  );
}

export function DeveloperDocs() {
  return (
    <section aria-labelledby="developer-docs-heading" className="bg-muted-bg py-20 lg:py-28">
      <Container narrow>
        <SectionHeading
          id="developer-docs-heading"
          title="גישה לתוכן האתר: API ו-MCP"
          subtitle="כל מה שמתפרסם באתר פתוח לקריאה גם למכונות: מאמרים, פוסטים בהפליליסט ותיקי המקרה שלהם, תחומי עיסוק, מיזמים, המילון, הופעות בתקשורת, והמסמכים המצורפים אליהם."
          align="start"
        />

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <a
            href="#mcp-docs"
            className="rounded-xl border border-border bg-white p-6 transition-shadow hover:shadow-md"
          >
            <Plug className="h-7 w-7 text-accent" aria-hidden="true" />
            <p className="mt-3 text-lg font-bold text-primary-dark">שרת MCP</p>
            <p className="mt-1 text-base text-muted">
              לחיבור ישיר ל-Claude, ל-ChatGPT, ל-Cursor ולכל לקוח MCP אחר.
            </p>
          </a>
          <a
            href="#api-docs"
            className="rounded-xl border border-border bg-white p-6 transition-shadow hover:shadow-md"
          >
            <Code2 className="h-7 w-7 text-accent" aria-hidden="true" />
            <p className="mt-3 text-lg font-bold text-primary-dark">REST API</p>
            <p className="mt-1 text-base text-muted">
              בקשות GET רגילות שמחזירות JSON, למי שבונה כלי משלו.
            </p>
          </a>
        </div>

        <p className="mt-6 text-base leading-relaxed text-muted">
          שני הממשקים פתוחים, בלי הרשמה ובלי מפתח, ומחזירים רק תוכן שפורסם. הם קוראים מאותו מקור, ולכן תמיד
          מחזירים את אותם נתונים. התכנים הם מידע כללי ואינם ייעוץ משפטי. כשמשתמשים בהם, ציינו את הקישור לפריט
          באתר.
        </p>

        <div className="mt-12 rounded-2xl bg-white p-6 shadow-sm sm:p-8">
          <H3 id="mcp-docs">שרת MCP</H3>
          <p className="mt-3 text-base leading-relaxed text-muted">
            כתובת השרת (Streamable HTTP, תשובות JSON, בלי אימות):
          </p>
          <Block label="כתובת שרת ה-MCP">{MCP_URL}</Block>

          <p className="mt-6 text-base font-semibold text-foreground">חיבור ל-Claude</p>
          <p className="mt-1 text-base leading-relaxed text-muted">
            בהגדרות, תחת Connectors, בוחרים Add custom connector ומדביקים את הכתובת. ב-Claude Code:
          </p>
          <Block label="פקודה לחיבור ב-Claude Code">{`claude mcp add --transport http z-g ${MCP_URL}`}</Block>

          <p className="mt-6 text-base font-semibold text-foreground">הכלים</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[32rem] text-right text-sm">
              <thead>
                <tr className="border-b border-border text-foreground">
                  <th scope="col" className="py-2 pl-4 font-semibold">כלי</th>
                  <th scope="col" className="py-2 pl-4 font-semibold">מה הוא עושה</th>
                  <th scope="col" className="py-2 font-semibold">פרמטרים</th>
                </tr>
              </thead>
              <tbody className="text-muted">
                {MCP_TOOLS.map((t) => (
                  <tr key={t.name} className="border-b border-border/60 align-top">
                    <td className="py-2 pl-4"><Code>{t.name}</Code></td>
                    <td className="py-2 pl-4">{t.does}</td>
                    <td className="py-2" dir="ltr">{t.args}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            סדר עבודה מומלץ: <Code>site_search</Code> כדי למצוא פריט, <Code>site_get</Code> כדי לקרוא אותו,
            ו-<Code>document_get_text</Code> כדי לקרוא פסק דין שמצורף אליו. מגבלה: 120 בקשות בדקה לכתובת IP.
          </p>

          <H3 id="api-docs">REST API</H3>
          <p className="mt-3 text-base leading-relaxed text-muted">
            כל הבקשות הן GET מול <Code>{API_BASE}</Code>. התשובות ב-JSON, CORS פתוח לכל מקור. מגבלה: 60 בקשות
            בדקה לכתובת IP, ו-20 בדקה לקריאת טקסט של מסמך. חריגה מחזירה 429.
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[32rem] text-right text-sm">
              <thead>
                <tr className="border-b border-border text-foreground">
                  <th scope="col" className="py-2 pl-4 font-semibold">בקשה</th>
                  <th scope="col" className="py-2 font-semibold">מה היא מחזירה</th>
                </tr>
              </thead>
              <tbody className="text-muted">
                {ENDPOINTS.map((e) => (
                  <tr key={e.path} className="border-b border-border/60 align-top">
                    <td className="py-2 pl-4"><Code>GET {e.path}</Code></td>
                    <td className="py-2">{e.does}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-6 text-base font-semibold text-foreground">סוגי תוכן</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            הערכים של <Code>type</Code>. מזהה של פריט בנוי מהסוג וה-slug שלו, למשל <Code>blog:israel-railways-vs-better-rail</Code>.
          </p>
          <ul className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-sm text-muted sm:grid-cols-2">
            {Object.entries(CONTENT_TYPES).map(([key, label]) => (
              <li key={key}>
                <Code>{key}</Code> {label}
              </li>
            ))}
          </ul>

          <p className="mt-6 text-base font-semibold text-foreground">דוגמאות</p>
          <Block label="דוגמה: חיפוש">{`curl "${API_BASE}/content?q=חופש%20מידע&limit=5"`}</Block>
          <Block label="דוגמה: פריט מלא">{`curl "${API_BASE}/content?id=article:court-file-inspection-rights"`}</Block>
          <Block label="דוגמה: טקסט של מסמך">{`curl "${API_BASE}/documents?document=<id>&from_page=1"`}</Block>

          <p className="mt-6 text-base font-semibold text-foreground">מבנה התשובות</p>
          <ul className="mt-2 list-disc space-y-2 pr-5 text-sm leading-relaxed text-muted">
            <li>
              רשימה וחיפוש מחזירים פריטים עם <Code>id</Code>, <Code>type</Code>, <Code>title</Code>,{" "}
              <Code>url</Code>, <Code>excerpt</Code>, <Code>category</Code>, <Code>tags</Code> ו-<Code>date</Code>.
              בחיפוש נוספים <Code>snippet</Code> ו-<Code>matchedDocuments</Code>.
            </li>
            <li>
              פריט מלא מוסיף את <Code>markdown</Code>, <Code>documents</Code> (לכל מסמך מזהה, כותרת, ציטוט
              ההליך והפרק שבו הוא מופיע) ו-<Code>links</Code>.
            </li>
            <li>
              טקסט של מסמך מחזיר <Code>text</Code>, <Code>fromPage</Code>, <Code>toPage</Code> ו-
              <Code>totalPages</Code>. אם <Code>truncated</Code> הוא true, קוראים שוב עם{" "}
              <Code>from_page=toPage+1</Code>. מסמך סרוק בלי שכבת טקסט מסומן <Code>scanned: true</Code>.
            </li>
            <li>
              שגיאות מחזירות <Code>{"{ \"error\": \"...\" }"}</Code> עם קוד 400 (פרמטר שגוי), 404 (לא נמצא) או 429.
            </li>
          </ul>
        </div>
      </Container>
    </section>
  );
}
