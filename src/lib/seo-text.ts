/**
 * Pure helpers for document-page SEO — no database, so they can be unit
 * tested without one. The queries live in seo-docs.ts.
 */

export interface PracticeLink {
  href: string;
  label: string;
  blurb: string;
}

/**
 * A lastmod Google will accept, or none. The mirrors carry the document's own
 * date, and some of those are placeholders or typos — 1900-01-01, 2076-06-23,
 * and guidelines from the 1960s. Search Console rejected those as "Invalid
 * date" (before 1970, or in the future), flagging the whole sitemap with
 * errors. An omitted lastmod is valid; a wrong one is not.
 */
const EPOCH = Date.UTC(1970, 0, 1);
export function safeLastModified(d: Date | null | undefined): Date | undefined {
  if (!d) return undefined;
  const t = d.getTime();
  if (Number.isNaN(t) || t < EPOCH || t > Date.now() + 24 * 60 * 60 * 1000) return undefined;
  return d;
}

/* ─── Practice-area links ─── */

const FOI: PracticeLink = {
  href: "/services/foi",
  label: "עתירות חופש מידע",
  blurb: "רשות לא עונה, מסרבת או דורשת אגרה? ייצוג בבקשות ובעתירות חופש מידע.",
};
const PRIVACY: PracticeLink = {
  href: "/services/privacy-harassment",
  label: "פגיעה בפרטיות, הטרדה ולשון הרע",
  blurb: "פרסום פוגעני, הטרדה או פגיעה בפרטיות — ייעוץ וליווי משפטי.",
};
const PRE_INVESTIGATION: PracticeLink = {
  href: "/services/preinvestigationadvice",
  label: "ייעוץ לפני חקירה",
  blurb: "זומנתם לחקירה? ייעוץ משפטי לפני החקירה, כולל ההנחיות שחלות על המקרה.",
};
const CLOSURE: PracticeLink = {
  href: "/services/reason",
  label: "שינוי עילת סגירת תיק",
  blurb: "תיק נסגר מחוסר ראיות? בקשה לשינוי העילה להיעדר אשמה.",
};

/** Practice pages relevant to a ruling, by TAG-IT scope. */
export function practiceLinksForScope(scopeId: number): PracticeLink[] {
  if (scopeId === 6) return [FOI];
  if (scopeId === 4) return [PRIVACY];
  return [PRE_INVESTIGATION];
}

/** Practice pages relevant to a guideline, by its issuing body. */
export function practiceLinksForGuideline(sourceLabel: string | null | undefined): PracticeLink[] {
  const s = sourceLabel || "";
  if (/חופש המידע|חופש מידע/.test(s)) return [FOI];
  if (/פרקליט|משטרה|יועץ המשפטי|יועמ"ש|תביעות/.test(s)) return [PRE_INVESTIGATION, CLOSURE];
  return [PRE_INVESTIGATION];
}

/* ─── Descriptions ─── */

const MAX_DESC = 158;

function clip(s: string, max = MAX_DESC): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

function hebrewDate(v: string | null | undefined): string {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "long", year: "numeric" }).format(d);
}

/**
 * About half the guidelines carry no summary, only a topic ("משפט מנהלי"), and
 * their meta description was that one word. When the summary is short, lead
 * with what the document is: who issued it, its number and date, its topic.
 */
export function guidelineDescription(doc: {
  document_title?: string;
  source_label?: string;
  directive_number?: string;
  document_date?: string;
  topic?: string;
  summary?: string;
}): string {
  const summary = (doc.summary || "").replace(/\s+/g, " ").trim();
  if (summary.length >= 90) return clip(summary);

  const issuer = (doc.source_label || "").trim();
  const num = (doc.directive_number || "").trim();
  const date = hebrewDate(doc.document_date);
  const head = [
    doc.document_title?.trim(),
    issuer ? `הנחיה של ${issuer.replace(/^הנחיות\s+/, "")}` : "",
    num ? `מס' ${num}` : "",
    date ? `מיום ${date}` : "",
  ]
    .filter(Boolean)
    .join(", ");
  const topic = doc.topic?.trim() && doc.topic.trim() !== summary ? `נושא: ${doc.topic.trim()}.` : "";
  return clip(
    [head ? `${head}.` : "", topic, summary, "הנוסח המלא במאגר ההנחיות הציבורי."]
      .filter(Boolean)
      .join(" "),
  );
}

export function rulingDescription(r: { summary: string; court: string; date: string; caseName: string }): string {
  const summary = r.summary.replace(/\s+/g, " ").trim();
  if (summary.length >= 90) return clip(summary);
  const date = hebrewDate(r.date);
  return clip(
    [
      r.caseName,
      r.court ? `${r.court}` : "",
      date ? `${date}.` : "",
      summary,
      "פסק הדין המלא ותקציר במאגר.",
    ]
      .filter(Boolean)
      .join(", ")
      .replace(/,\s*\./g, "."),
  );
}
