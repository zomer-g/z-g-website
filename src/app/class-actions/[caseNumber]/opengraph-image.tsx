import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";
import { fetchAllUpstreamClassActions } from "@/lib/class-actions-upstream";

export const alt = "תובענה ייצוגית";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

const FALLBACK = {
  kicker: "מאגר תובענות",
  title: "תובענות ייצוגיות שהוגשו",
  subtitle: "התובענות הייצוגיות האחרונות שהוגשו בבתי המשפט, עם קישור לכתבי הטענות.",
};

export default async function Image({ params }: { params: Promise<{ caseNumber: string }> }) {
  const { caseNumber } = await params;
  const decoded = decodeURIComponent(caseNumber || "").trim();
  if (!decoded) return renderOgBanner(FALLBACK);

  // Upstream is the flakiest dependency on the site; never let it break a
  // link preview — fall back to the section banner instead.
  const items = await fetchAllUpstreamClassActions({ filters: { case_number: decoded } }).catch(
    () => null,
  );
  const doc = items?.find((d) => (d.case_number ?? "").trim() === decoded) ?? items?.[0];
  if (!doc) return renderOgBanner({ ...FALLBACK, kicker: "תובענה ייצוגית", title: decoded });

  return renderOgBanner({
    kicker: "תובענה ייצוגית",
    title: doc.case_name || decoded,
    subtitle: doc.legal_question || doc.class_definition || undefined,
    tags: [decoded, doc.court_name ?? ""].filter(Boolean),
  });
}
