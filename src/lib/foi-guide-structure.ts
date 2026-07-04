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
    // Some headings carry the anchor on a nested <a name="…"> (legacy) or a
    // nested <span id="…" class="anchor"> (current site format).
    const aNameMatch = m[3].match(/<a[^>]*\bname="([^"]+)"/i);
    const spanIdMatch = m[3].match(/<span[^>]*\bid="([^"]+)"/i);
    out.push({
      pos: m.index,
      level: parseInt(m[1], 10),
      text: cleanText(htmlToText(m[3])),
      id: idMatch?.[1] ?? aNameMatch?.[1] ?? spanIdMatch?.[1] ?? null,
    });
  }
  return out;
}

// Only h2 headings mark the top-level "this subsection is about clause X"
// boundary. Deeper headings can ALSO happen to mention a clause in passing
// (e.g. an h3 aside "11.5.5 היחס בין סעיף 9(א)(4) לסעיף 20" nested inside the
// 9(א)(4) h2) without meaning a new clause subsection has started — matching
// on those too would make the following examples list look like a sibling of
// that aside rather than a child of the real owning h2, and wrongly trip the
// combined-block heuristic below.
function nearestLawSectionRef(
  headings: Heading[],
  beforePos: number,
): { ref: string; heading: Heading } | null {
  for (let i = headings.length - 1; i >= 0; i--) {
    const h = headings[i];
    if (h.pos >= beforePos) continue;
    if (h.level !== 2) continue;
    const mm = h.text.match(LAW_SECTION_RE);
    if (mm) return { ref: mm[1], heading: h };
  }
  return null;
}

// Every distinct clause ref an example's own text mentions, normalised, in
// order of appearance. Only consulted for "combined" examples blocks — see
// isNestedExamplesHeading.
function allSectionRefsInText(text: string): string[] {
  const seen = new Set<string>();
  const re = new RegExp(LAW_SECTION_RE.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    seen.add(normaliseSectionRef(m[1]));
  }
  return [...seen];
}

// Numbered heading prefix: "12.2.3 דוגמאות…" → "12.2.3", "13.7 דוגמאות…" → "13.7".
function numberingPrefix(headingText: string): string | null {
  const m = headingText.match(/^(\d+(?:\.\d+)*)/);
  return m ? m[1] : null;
}

// Most chapters nest one examples list directly under its own clause heading
// — e.g. h2 "12.2 סעיף 9(ב)(1)…" followed by h3 "12.2.3 דוגמאות שהוכרעו…":
// the examples heading's numbering is a strict extension of its clause's
// (starts with "12.2."). There, every example in the block genuinely is
// about that one clause, even though its own sentence rarely restates the
// clause number and sometimes cites an unrelated clause as an aside (e.g.
// "…גם בהתבסס על סעיף 9(א)(1)") — that aside must NOT be taken as the
// example's real topic.
//
// Some chapters (e.g. 13 – סעיף 14) instead run ONE combined examples list
// as its own top-level heading (h2 "13.7 דוגמאות שהוכרעו…") covering several
// sibling sub-clauses with no per-clause sub-heading of its own — there the
// nearest-preceding-heading guess is just wrong for most examples, and each
// example's own clause citation is the only signal available.
function isNestedExamplesHeading(examplesHeading: Heading, lawHeading: Heading): boolean {
  const exPrefix = numberingPrefix(examplesHeading.text);
  const lawPrefix = numberingPrefix(lawHeading.text);
  if (!exPrefix || !lawPrefix) return true; // no numbering info — assume normal case
  return exPrefix.startsWith(`${lawPrefix}.`);
}

// Decide which clause a single example in a COMBINED block belongs to: the
// first clause its own text mentions, or — if it mentions none (short items
// often lean on the preceding item's topic) — whatever the previous example
// in the same block resolved to.
function resolveCombinedItemRef(text: string, lastRef: string): string {
  const mentioned = allSectionRefsInText(text);
  return mentioned.length > 0 ? mentioned[0] : lastRef;
}

// Pull the footnote ids referenced inside a single list/paragraph item — all
// the inline marker forms: href="#fnN" (current site), href="#_ftnN" /
// name-anchor (legacy) and bare "[Nא]" text markers.
function footnoteIdsInItem(itemHtml: string, itemText: string): string[] {
  const ids = new Set<string>();
  let m: RegExpExecArray | null;
  const fnRe = /href="#fn(\d+)"/gi;
  while ((m = fnRe.exec(itemHtml)) !== null) ids.add(m[1]);
  const hrefRe = /href="#_ftn(?:ref)?(\d+)"/gi;
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
  // Truncate at the footnote-definitions block: its <li> items cite rulings
  // and would otherwise be swept into the LAST examples block of the chapter
  // as bogus "decided examples".
  const fnStart = html.search(/<div[^>]*class="footnotes"|<a[^>]*\bid="#_ftn/i);
  if (fnStart > 0) html = html.slice(0, fnStart);

  const footnoteById = new Map(footnotes.map((f) => [f.footnoteId, f]));
  const headings = collectHeadings(html);
  const exampleHeads = headings.filter((h) => EXAMPLES_HEADING_RE.test(h.text));

  // Every clause that owns a dedicated heading somewhere in the chapter —
  // used to give a resolved-but-not-nominal ref (case 2 in resolveItemRef) a
  // real heading label + anchor instead of a synthetic one.
  const headingByRef = new Map<string, Heading>();
  for (const h of headings) {
    const mm = h.text.match(LAW_SECTION_RE);
    if (!mm) continue;
    const ref = normaliseSectionRef(mm[1]);
    if (!headingByRef.has(ref)) headingByRef.set(ref, h);
  }

  // Keyed by resolved ref, not by block — a combined examples list can
  // scatter examples for the same clause across positions, and a chapter can
  // repeat the same clause heading across sub-parts. Both cases must merge.
  const byRef = new Map<string, LawSection>();

  for (const eh of exampleHeads) {
    const law = nearestLawSectionRef(headings, eh.pos);
    if (!law) continue;
    const nominalRef = normaliseSectionRef(law.ref);

    // Slice the examples block: from this heading to the next heading.
    const next = headings.find((h) => h.pos > eh.pos);
    const block = html.slice(
      eh.pos,
      next ? next.pos : Math.min(html.length, eh.pos + 12000),
    );

    const combined = !isNestedExamplesHeading(eh, law.heading);

    let bucket: ExampleOutcome = "unspecified";
    let lastRef = nominalRef;

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

      const ref = combined ? resolveCombinedItemRef(text, lastRef) : nominalRef;
      lastRef = ref;

      let section = byRef.get(ref);
      if (!section) {
        const dedicated = headingByRef.get(ref);
        const owningHeading = ref === nominalRef ? law.heading : dedicated;
        const anchorId = owningHeading?.id ?? (ref === nominalRef ? eh.id : null);
        section = {
          sectionRef: ref,
          heading: owningHeading?.text ?? `סעיף ${ref}`,
          anchorUrl: anchorId ? `${chapterUrl}#${anchorId}` : chapterUrl,
          examples: [],
        };
        byRef.set(ref, section);
      }
      section.examples.push({
        description: text,
        outcome: classifyOutcome(bucket, text),
        rulings,
        order: section.examples.length,
      });
    }
  }

  return [...byRef.values()];
}

// Normalise spacing/format of the clause ref so "9(ב)(4)" and "9 (ב) (4)"
// collapse to one key.
function normaliseSectionRef(ref: string): string {
  return ref.replace(/\s+/g, "");
}

