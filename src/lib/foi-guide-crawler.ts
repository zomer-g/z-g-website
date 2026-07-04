// Crawls https://foiguide.org.il/ — the Hebrew Freedom of Information Guide.
//
// The site is WordPress + Elementor. Each chapter is one page, with the article
// rendered as real article HTML (h1/h2/p/ol/ul/...).
//
// FOOTNOTE FORMATS — the site redesign (2026) changed the markup:
//   • CURRENT: inline markers are `<sup><a id="fnrefN" href="#fnN">N</a></sup>`
//     and the definitions live at the bottom in
//     `<div class="footnotes"><ol><li id="fnN"><span>…</span></li>…`.
//   • LEGACY: inline markers were `[N]` anchors pointing at `#_ftnN`, and each
//     definition was a `<p><a name="_ftnN">[N]</a> ...</p>` paragraph. Kept as
//     a fallback in case parts of the site still render the old export.
//
// We deliberately use regex parsing rather than pulling in cheerio: the markup
// is stable WP output and the parse surface we need is small.

export const FOI_INDEX_URL =
  "https://foiguide.org.il/אינדקס-חוק-חופש-המידע/";

export interface ChapterRef {
  /** Position in the guide. 0 = הקדמה, 1..17 = chapters, 18..20 = appendices A/B/C. */
  order: number;
  title: string;
  url: string;
  slug: string;
}

export interface CaseLawCitation {
  /** Footnote number as it appears in the source ("1", "4א", "32א1", ...). */
  footnoteId: string;
  /** The full text of the footnote (case name, court reference, date). */
  text: string;
  /** External links inside the footnote — case law databases first. */
  links: string[];
  /** True iff at least one link points at a known case-law database. */
  isCaseLaw: boolean;
}

export interface ParsedChapter {
  title: string;
  /** Cleaned body text (footnotes section stripped) for chunking + embedding. */
  bodyText: string;
  /** Total character count of bodyText. */
  textChars: number;
  /** All footnotes in order. Case-law footnotes are flagged so the MCP can
   *  return them alongside any hit on the chapter. */
  footnotes: CaseLawCitation[];
}

// ─── HTML helpers ───

const HTML_ENTITY_MAP: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&nbsp;": " ",
  "&#8211;": "–",
  "&#8212;": "—",
  "&#8216;": "‘",
  "&#8217;": "’",
  "&#8220;": "“",
  "&#8221;": "”",
  "&#8230;": "…",
};

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    )
    .replace(/&[a-z]+;/gi, (m) => HTML_ENTITY_MAP[m] ?? m);
}

// Strip HTML tags while keeping paragraph/line structure. Block-level tags
// (h1-h6, p, li, br, div) emit newlines so plain-text chunks still split on
// paragraph boundaries. Exported so the structured-section parser can reuse
// the same normalisation.
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|ol|ul|tr|td|th)>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ");
}

export function cleanText(s: string): string {
  return decodeEntities(s)
    .replace(/ /g, " ")
    // Strip BIDI/zero-width marks: they break literal-substring search.
    .replace(/[­​-‏‪-‮⁠⁦-⁩﻿]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^[ \t]+|[ \t]+$/gm, "")
    .trim();
}

// ─── Index fetch ───

export async function fetchIndex(): Promise<ChapterRef[]> {
  const html = await fetchHtml(FOI_INDEX_URL);

  // The index page navigation lists all chapters. We extract all menu items
  // that match the chapter-URL pattern; dedup by URL preserving order.
  // Chapter URLs look like /<digit(s)>-<hebrew-slug>/ OR /הקדמה.../, נספח-/ etc.
  const seen = new Map<string, ChapterRef>();
  const linkRe = /<a[^>]*href="(https:\/\/foiguide\.org\.il\/[^"#?]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(html)) !== null) {
    const url = m[1];
    if (!url.endsWith("/")) continue;
    if (url === FOI_INDEX_URL || url === "https://foiguide.org.il/") continue;
    if (seen.has(url)) continue;

    const labelText = cleanText(htmlToText(m[2]));
    if (!labelText) continue;
    if (!looksLikeChapterLabel(labelText)) continue;

    const slug = urlToSlug(url);
    if (!slug) continue;

    seen.set(url, {
      order: assignOrder(labelText, seen.size),
      title: labelText,
      url,
      slug,
    });
  }

  return Array.from(seen.values()).sort((a, b) => a.order - b.order);
}

function looksLikeChapterLabel(label: string): boolean {
  // "1 – ...", "17 – ...", "הקדמה ...", "נספח א׳ ...", etc.
  if (/^\d+\s*[–-]/.test(label)) return true;
  if (label.startsWith("הקדמה")) return true;
  if (label.startsWith("נספח")) return true;
  return false;
}

function assignOrder(label: string, fallbackIdx: number): number {
  const leadingNum = label.match(/^(\d+)/);
  if (leadingNum) return parseInt(leadingNum[1], 10);
  if (label.startsWith("הקדמה")) return 0;
  if (label.includes("נספח א")) return 100;
  if (label.includes("נספח ב")) return 101;
  if (label.includes("נספח ג")) return 102;
  return 200 + fallbackIdx;
}

function urlToSlug(url: string): string {
  try {
    const u = new URL(url);
    const segs = u.pathname.split("/").filter(Boolean);
    if (segs.length === 0) return "";
    // Join the full path — two FOI Guide chapters share the same last
    // segment (the source site has aliasing on /11-סעיף-9ב-…/ pointing at
    // both chapter 11 and chapter 12), so the last segment alone is not
    // unique. The full decoded path is.
    return decodeURIComponent(segs.join("/"));
  } catch {
    return "";
  }
}

// ─── Chapter fetch + parse ───

export async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "z-g.co.il foi-guide-mirror/1.0 (+https://z-g.co.il/foi-guide)",
      Accept: "text/html,application/xhtml+xml",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`fetch ${url} failed: HTTP ${res.status}`);
  }
  return await res.text();
}

// Case-law databases we recognise inside footnote links. Used to flag a
// footnote as "case-law" — the MCP returns those alongside every search hit.
const CASE_LAW_HOSTS = [
  "nevo.co.il",
  "supremedecisions.court.gov.il",
  "court.gov.il",
  "תולעת-המשפט.קום",
  "tl8.me",
  "xn----8hcborozt8bdd", // punycode for תולעת-המשפט
];

function isCaseLawUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return CASE_LAW_HOSTS.some((host) => u.hostname.includes(host));
  } catch {
    return false;
  }
}

export function parseChapter(html: string, url: string): ParsedChapter {
  // 1. Title — first <h1>...</h1> inside an article container.
  const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const title = titleMatch ? cleanText(htmlToText(titleMatch[1])) : urlToSlug(url);

  // 2. Pull the article HTML. Strategy: take everything from the title's <h1>
  //    onward up to the first sidebar/sibling/footer container. The full main
  //    article + footnotes lives in elementor-widget-text-editor blocks; we
  //    grab the page text starting at the <h1>.
  const startIdx = titleMatch ? (titleMatch.index ?? 0) : 0;
  const tail = html.slice(startIdx);

  // The article ends before the footer / "Related posts" / Elementor footer
  // sections — but those are not in the WP "the_content" output. As a
  // conservative cut, drop everything after the closing of the last
  // text-editor widget: in practice the footnotes are the last text-editor
  // widget, so we keep them.
  const articleEnd = findArticleEnd(tail);
  const articleHtml = tail.slice(0, articleEnd);

  // 3. Separate body from footnotes.
  //    CURRENT format: the definitions block is `<div class="footnotes">`.
  //    LEGACY format: the definitions are the only anchors carrying
  //    `id="#_ftn…"` (with the leading '#') — matching on `id="#_ftn`
  //    (which prefixes both `#_ftn1` and `#_ftnref1`) finds the block start
  //    in either legacy sub-format.
  const footnotesStart = findFootnotesStart(articleHtml);
  const bodyHtml =
    footnotesStart > 0 ? articleHtml.slice(0, footnotesStart) : articleHtml;
  const footnotesHtml =
    footnotesStart > 0 ? articleHtml.slice(footnotesStart) : "";

  // 4. Extract footnotes BEFORE htmlToText eats the structure.
  const footnotes = extractFootnotes(footnotesHtml);

  // 5. Body text — normalise the inline footnote markers to literal `[N]`
  //    BEFORE stripping tags. The whole downstream pipeline (chunker,
  //    search-time citation pairing, structure extractor) matches `[N]`
  //    markers in plain text; the current site renders them as
  //    `<sup><a href="#fnN">N</a></sup>`, which htmlToText would otherwise
  //    collapse into a bare digit glued to the preceding word.
  const bodyText = cleanText(htmlToText(inlineMarkersToBrackets(bodyHtml)));

  return {
    title,
    bodyText,
    textChars: bodyText.length,
    footnotes,
  };
}

function findArticleEnd(tail: string): number {
  // Cut at the start of WordPress comments / nav-after-content / related
  // posts widgets — they are not part of the article body. Conservative:
  // anything after the last `</article>` or the WP footer wrappers gets cut.
  const cutPoints = [
    tail.search(/<footer[\s>]/i),
    tail.search(/<aside[\s>]/i),
    tail.search(/id="comments"/i),
    tail.search(/class="[^"]*related/i),
  ].filter((i) => i > 0);
  if (cutPoints.length === 0) return tail.length;
  return Math.min(...cutPoints);
}

// Where the footnote-definitions block starts, or -1 if none found.
function findFootnotesStart(articleHtml: string): number {
  const current = articleHtml.search(/<div[^>]*class="footnotes"/i);
  if (current > 0) return current;
  return articleHtml.search(/<a[^>]*\bid="#_ftn/i);
}

// Replace inline `<sup><a … href="#fnN">N</a></sup>` markers (current site
// format) with a literal `[N]` so plain-text consumers keep the reference.
// Legacy inline markers already render as `[N]` text and pass through as-is.
export function inlineMarkersToBrackets(html: string): string {
  return html.replace(
    /<sup[^>]*>\s*<a[^>]*href="#fn(\d+)"[^>]*>[\s\S]*?<\/a>\s*<\/sup>/gi,
    "[$1]",
  );
}

function extractFootnotes(html: string): CaseLawCitation[] {
  if (!html.trim()) return [];

  // CURRENT format: `<li id="fnN"><span>…</span></li>` items inside
  // `<div class="footnotes"><ol>`. The block can be rendered twice on the
  // page (desktop + mobile widgets), so dedup by id — first wins.
  if (/<li[^>]*\bid="fn\d+"/i.test(html)) {
    const out: CaseLawCitation[] = [];
    const seen = new Set<string>();
    const liRe = /<li[^>]*\bid="fn(\d+)"[^>]*>([\s\S]*?)<\/li>/gi;
    let m: RegExpExecArray | null;
    while ((m = liRe.exec(html)) !== null) {
      const id = m[1];
      if (seen.has(id)) continue;
      seen.add(id);

      const inner = m[2];
      const links: string[] = [];
      const hrefRe = /href="([^"]+)"/gi;
      let mm: RegExpExecArray | null;
      while ((mm = hrefRe.exec(inner)) !== null) {
        // Attribute values are HTML-escaped ("&amp;") — decode or the link 404s.
        const u = decodeEntities(mm[1]);
        if (u.startsWith("#")) continue; // back-links to the inline marker
        if (!links.includes(u)) links.push(u);
      }

      const text = cleanText(htmlToText(inner));
      if (!text) continue;

      out.push({
        footnoteId: id,
        text,
        links,
        isCaseLaw: links.some(isCaseLawUrl) || looksLikeCaseLawText(text),
      });
    }
    out.sort((a, b) => parseInt(a.footnoteId, 10) - parseInt(b.footnoteId, 10));
    return out;
  }

  // LEGACY format: split on <p> boundaries — each footnote is its own
  // paragraph, `<p><a name="_ftnN">[N]</a> …</p>` or bare `[Nא]` additions.
  const paras = html.split(/<\/p>/i).map((p) => p + "</p>");

  const out: CaseLawCitation[] = [];
  for (const p of paras) {
    const id = extractFootnoteId(p);
    if (!id) continue;

    // Collect all hrefs inside the paragraph.
    const links: string[] = [];
    const hrefRe = /href="([^"]+)"/gi;
    let mm: RegExpExecArray | null;
    while ((mm = hrefRe.exec(p)) !== null) {
      const u = decodeEntities(mm[1]);
      if (u.startsWith("#")) continue;
      if (!links.includes(u)) links.push(u);
    }

    const text = cleanText(htmlToText(p));
    if (!text) continue;

    out.push({
      footnoteId: id,
      text,
      links,
      isCaseLaw: links.some(isCaseLawUrl) || looksLikeCaseLawText(text),
    });
  }
  return out;
}

function extractFootnoteId(paragraphHtml: string): string | null {
  // The footnote definition anchor carries id="#_ftn1" or id="#_ftnref1"
  // depending on the chapter's format. Pull the numeric id from either.
  const byId = paragraphHtml.match(/\bid="#_ftn(?:ref)?(\d+)"/i);
  if (byId) return byId[1];

  // Older/standard anchored footnote: <a ... name="_ftnN">[N]</a>.
  const anchored = paragraphHtml.match(/\bname="_ftn(\d+)"[^>]*>\[(\d+)\]/i);
  if (anchored) return anchored[1];

  // Hebrew-suffix additions like [4א], [28א], [32א1] appear as bare text
  // (without an anchor). Match the first such bracketed marker at the start
  // of the visible paragraph text.
  const stripped = cleanText(htmlToText(paragraphHtml));
  const bare = stripped.match(/^\[(\d+[א-ת]?\d*[א-ת]?)\]/);
  if (bare) return bare[1];

  return null;
}

const CASE_LAW_TERMS = [
  "בג\"ץ",
  "בג''ץ",
  "בג&quot;ץ",
  "עע\"מ",
  "עע''מ",
  "ע\"א",
  "עת\"מ",
  "עת''מ",
  "ה\"פ",
  "פס\"ד",
  "פסק דין",
  "פסק-דין",
];

function looksLikeCaseLawText(text: string): boolean {
  return CASE_LAW_TERMS.some((t) => text.includes(t));
}
