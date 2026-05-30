// Extracts a STRUCTURED model from a FOI Guide chapter, on top of the
// chunk/embedding pipeline. The structure mirrors how the guide is organised:
//
//   law section (e.g. "9(ב)(4)")
//     └─ decided examples ("דוגמאות שהוכרעו בבתי-המשפט")
//          ├─ description  (the situation + how the court ruled)
//          ├─ outcome      (court rejected / accepted reliance on the exemption)
//          └─ rulings[]    (case name + date + link, from the footnote it cites)
//
// The MCP exposes this so a client can pull a clean table of decided cases for
// a specific statute clause — deterministic, no semantic guessing — which is
// what stops the model from attaching a ruling from clause 9(ב)(3) to a claim
// about 9(ב)(4).

import { cleanText, htmlToText, type CaseLawCitation } from "./foi-guide-crawler";

export type ExampleOutcome =
  | "rejected" // court rejected reliance on the exemption (disclosure ordered)
  | "accepted" // court accepted reliance on the exemption (non-disclosure)
  | "mixed"
  | "unspecified";

export interface DecidedExample {
  description: string;
  outcome: ExampleOutcome;
  // Footnote-derived rulings cited by this example. Usually one, sometimes
  // two (the guide occasionally chains "ראו גם …").
  rulings: CaseLawCitation[];
  order: number;
}

export interface LawSection {
  // The statute clause this section is about, e.g. "9(ב)(4)" / "14(א)(8)".
  sectionRef: string;
  // The full heading text in the guide, e.g. "11.5 סעיף 9(ב)(4) – דיונים…".
  heading: string;
  // Deep link to the subsection in the guide, if an anchor id was found.
  anchorUrl: string;
  examples: DecidedExample[];
}

interface Heading {
  pos: number;
  level: number;
  text: string;
  id: string | null;
}

// Matches a statute clause inside a heading: "סעיף 9(ב)(4)", "סעיף 14(א)(8)",
// "סעיף 9(א)". Requires at least one parenthesised group so plain "סעיף 8"
// chapter titles don't over-match section boundaries we don't want.
const LAW_SECTION_RE = /סעיף\s*(\d+[א-ת]?(?:\([^)]{1,8}\))+)/;
const EXAMPLES_HEADING_RE = /דוגמאות שהוכרעו/;

// Decision-bucket markers that appear as their own paragraph above each list.
const REJECTED_MARKER = /דחה את ההסתמכות|דחה את הסתמכות|לא קיבל את ההסתמכות/;
const ACCEPTED_MARKER = /קיבל את ההסתמכות|קיבל את הסתמכות/;

function collectHeadings(html: string): Heading[] {
  const re = /<h([2-6])([^>]*)>([\s\S]*?)<\/h\1>/gi;
  const out: Heading[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const attrs = m[2];
    const idMatch = attrs.match(/\bid="([^"]+)"/i);
    // Some headings carry the anchor on a nested <a name="…">.
    const aNameMatch = m[3].match(/<a[^>]*\bname="([^"]+)"/i);
    out.push({
      pos: m.index,
      level: parseInt(m[1], 10),
      text: cleanText(htmlToText(m[3])),
      id: idMatch?.[1] ?? aNameMatch?.[1] ?? null,
    });
  }
  return out;
}

function nearestLawSectionRef(
  headings: Heading[],
  beforePos: number,
): { ref: string; heading: Heading } | null {
  for (let i = headings.length - 1; i >= 0; i--) {
    const h = headings[i];
    if (h.pos >= beforePos) continue;
    const mm = h.text.match(LAW_SECTION_RE);
    if (mm) return { ref: mm[1], heading: h };
  }
  return null;
}

// Pull the footnote ids referenced inside a single list/paragraph item — both
// the inline marker forms: href="#_ftnN" / name-anchor and bare "[Nא]".
function footnoteIdsInItem(itemHtml: string, itemText: string): string[] {
  const ids = new Set<string>();
  const hrefRe = /href="#_ftn(?:ref)?(\d+)"/gi;
  let m: RegExpExecArray | null;
  while ((m = hrefRe.exec(itemHtml)) !== null) ids.add(m[1]);
  const bareRe = /\[(\d+[א-ת]?\d*[א-ת]?)\]/g;
  while ((m = bareRe.exec(itemText)) !== null) ids.add(m[1]);
  return [...ids];
}

function classifyOutcome(currentBucket: ExampleOutcome, text: string): ExampleOutcome {
  // Per-item override when the sentence itself states the result clearly.
  const says = (re: RegExp) => re.test(text);
  if (says(/בית-?המשפט דחה|דחה את הטענה|הורה לחשוף|הורה על גילוי/) &&
      !says(/קיבל/)) {
    return currentBucket === "accepted" ? "mixed" : "rejected";
  }
  if (says(/בית-?המשפט קיבל|קיבל את הטענה|לא יימסר|חוסה תחת/) &&
      !says(/דחה/)) {
    return currentBucket === "rejected" ? "mixed" : "accepted";
  }
  return currentBucket;
}

export function extractLawSections(
  html: string,
  chapterUrl: string,
  footnotes: CaseLawCitation[],
): LawSection[] {
  const footnoteById = new Map(footnotes.map((f) => [f.footnoteId, f]));
  const headings = collectHeadings(html);
  const exampleHeads = headings.filter((h) => EXAMPLES_HEADING_RE.test(h.text));

  const sections: LawSection[] = [];
  for (const eh of exampleHeads) {
    const law = nearestLawSectionRef(headings, eh.pos);
    if (!law) continue;

    // Slice the examples block: from this heading to the next heading.
    const next = headings.find((h) => h.pos > eh.pos);
    const block = html.slice(
      eh.pos,
      next ? next.pos : Math.min(html.length, eh.pos + 12000),
    );

    const examples: DecidedExample[] = [];
    let bucket: ExampleOutcome = "unspecified";
    let order = 0;

    // Walk the block in document order over both list items and paragraphs.
    // We interleave by position so decision-bucket markers (plain <p>) flip
    // the bucket before the <li> items that follow them.
    const nodes: { pos: number; html: string; tag: "li" | "p" }[] = [];
    for (const m of block.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)) {
      nodes.push({ pos: m.index!, html: m[1], tag: "li" });
    }
    for (const m of block.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
      nodes.push({ pos: m.index!, html: m[1], tag: "p" });
    }
    nodes.sort((a, b) => a.pos - b.pos);

    for (const node of nodes) {
      const text = cleanText(htmlToText(node.html));
      if (!text) continue;

      // Bucket markers — short paragraphs that introduce a list.
      if (REJECTED_MARKER.test(text) && text.length < 120) {
        bucket = "rejected";
        continue;
      }
      if (ACCEPTED_MARKER.test(text) && text.length < 120) {
        bucket = "accepted";
        continue;
      }
      // Skip the standard intro note and any very short fragment.
      if (text.startsWith("הערה: הדוגמאות ממחישות")) continue;
      if (text.length < 40) continue;

      const ids = footnoteIdsInItem(node.html, text);
      const rulings = ids
        .map((id) => footnoteById.get(id))
        .filter((r): r is CaseLawCitation => !!r);
      // A real decided-case example cites at least one ruling.
      if (rulings.length === 0) continue;

      examples.push({
        description: text,
        outcome: classifyOutcome(bucket, text),
        rulings,
        order: order++,
      });
    }

    if (examples.length === 0) continue;

    const anchorId = law.heading.id ?? eh.id;
    const anchorUrl = anchorId
      ? `${chapterUrl}#${anchorId}`
      : chapterUrl;

    sections.push({
      sectionRef: normaliseSectionRef(law.ref),
      heading: law.heading.text,
      anchorUrl,
      examples,
    });
  }

  // A chapter can repeat the same clause heading across sub-parts; merge.
  return mergeByRef(sections);
}

// Normalise spacing/format of the clause ref so "9(ב)(4)" and "9 (ב) (4)"
// collapse to one key.
function normaliseSectionRef(ref: string): string {
  return ref.replace(/\s+/g, "");
}

function mergeByRef(sections: LawSection[]): LawSection[] {
  const byRef = new Map<string, LawSection>();
  for (const s of sections) {
    const existing = byRef.get(s.sectionRef);
    if (!existing) {
      byRef.set(s.sectionRef, s);
    } else {
      const offset = existing.examples.length;
      existing.examples.push(
        ...s.examples.map((e) => ({ ...e, order: e.order + offset })),
      );
    }
  }
  return [...byRef.values()];
}
