import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const WIKISOURCE_API = "https://he.wikisource.org/w/api.php";

/* ── Helper: strip HTML tags to plain text ── */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#160;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* ── GET /api/import/law?action=search|sections|content ── */

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "נדרשת הזדהות" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  try {
    /* ── Search laws ── */
    if (action === "search") {
      const q = searchParams.get("q")?.trim();
      if (!q) return NextResponse.json({ results: [] });

      const url = `${WIKISOURCE_API}?action=opensearch&search=${encodeURIComponent(q)}&limit=15&namespace=0&format=json`;
      const res = await fetch(url);
      const data = await res.json();

      // opensearch returns [query, titles[], descriptions[], urls[]]
      const titles: string[] = data[1] || [];
      const urls: string[] = data[3] || [];

      const results = titles.map((title: string, i: number) => ({
        title,
        url: urls[i] || `https://he.wikisource.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
      }));

      return NextResponse.json({ results });
    }

    /* ── Get law sections ── */
    if (action === "sections") {
      const page = searchParams.get("page");
      if (!page) return NextResponse.json({ error: "חסר פרמטר page" }, { status: 400 });

      const url = `${WIKISOURCE_API}?action=parse&page=${encodeURIComponent(page)}&prop=sections&format=json`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.error) {
        return NextResponse.json({ error: data.error.info || "החוק לא נמצא" }, { status: 404 });
      }

      const sections = (data.parse?.sections || []).map(
        (s: { index: string; number: string; line: string; anchor: string; toclevel: number }) => ({
          index: s.index,
          number: s.number,
          line: s.line.replace(/<[^>]*>/g, ""), // strip span tags from line
          anchor: s.anchor,
          level: s.toclevel,
        }),
      );

      return NextResponse.json({
        title: data.parse?.title || page,
        sections,
      });
    }

    /* ── Get section content ── */
    if (action === "content") {
      const page = searchParams.get("page");
      const section = searchParams.get("section");
      if (!page || !section) {
        return NextResponse.json({ error: "חסרים פרמטרים page ו-section" }, { status: 400 });
      }

      const url = `${WIKISOURCE_API}?action=parse&page=${encodeURIComponent(page)}&prop=text&section=${section}&format=json`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.error) {
        return NextResponse.json({ error: data.error.info || "הסעיף לא נמצא" }, { status: 404 });
      }

      const html = data.parse?.text?.["*"] || "";
      const text = stripHtml(html);

      return NextResponse.json({ text });
    }

    return NextResponse.json({ error: "action לא תקין (search/sections/content)" }, { status: 400 });
  } catch (err) {
    console.error("Law import error:", err);
    return NextResponse.json({ error: "שגיאה בייבוא מספר החוקים" }, { status: 500 });
  }
}
