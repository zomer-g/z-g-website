import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import { RulingDetail, type DetailRuling } from "./ruling-detail";

export const dynamic = "force-dynamic";

const UPSTREAM =
  (process.env.TAGIT_API_URL || "https://tag-it.biz") +
  "/api/public/rulings/documents";

function getApiKey() {
  return process.env.RULINGS_API_KEY || process.env.CLASS_ACTION_API_KEY;
}

function pickString(...vals: unknown[]): string {
  for (const v of vals) if (typeof v === "string" && v.trim()) return v;
  return "";
}
function pickArray(...vals: unknown[]): string[] {
  for (const v of vals) if (Array.isArray(v)) return v.map((x) => String(x));
  return [];
}
function objArray(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v)
    ? v.filter((x) => x != null && typeof x === "object" && !Array.isArray(x))
    : [];
}

// TAG-IT has no single-document metadata endpoint — only /file. The list
// endpoint with a meta.id filter returns the full doc (ai+sql+meta), but it's
// scoped, and the id alone doesn't tell us the scope. So try the known rulings
// scopes (4 = defamation, 6 = FOI) until one returns the document.
const RULINGS_SCOPES = [4, 6];

// Map upstream scope → parent dashboard so the detail page can render a
// "back to <listing>" link instead of relying on window.history. Detail
// pages are routinely opened directly from share links / search engines,
// so the history-based back button no-ops half the time.
const SCOPE_TO_PARENT: Record<number, { slug: string; title: string }> = {
  4: { slug: "/defamation-rulings", title: "פסקי דין בלשון הרע" },
  6: { slug: "/foi-judgments", title: "פסיקות חופש מידע" },
};

async function fetchDoc(
  id: number,
  apiKey: string,
): Promise<{ doc: Record<string, unknown>; scope: number } | null> {
  const filter = encodeURIComponent(
    JSON.stringify({ field: "meta.id", op: "eq", value: id }),
  );
  for (const scope of RULINGS_SCOPES) {
    try {
      const res = await fetch(
        `${UPSTREAM}?scope=${scope}&size=1&filter=${filter}`,
        {
          headers: { "X-API-Key": apiKey, Accept: "application/json" },
          cache: "no-store",
        },
      );
      if (!res.ok) continue;
      const body = (await res.json()) as { items?: Record<string, unknown>[] };
      const doc = Array.isArray(body.items) ? body.items[0] : undefined;
      if (doc) return { doc, scope };
    } catch {
      // try next scope
    }
  }
  return null;
}

async function getRuling(id: number): Promise<DetailRuling | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;
  const found = await fetchDoc(id, apiKey);
  if (!found) return null;
  const { doc, scope } = found;
  const parent = SCOPE_TO_PARENT[scope] ?? null;
  const ai = ((doc.ai || doc.ai_analysis) as Record<string, unknown>) || {};
  const sql = (doc.sql as Record<string, unknown>) || {};
  const meta = (doc.meta as Record<string, unknown>) || {};
  const financial = (sql["היבטים_פיננסיים"] as Record<string, unknown>) || {};
  const compRaw = financial["סכום_פיצוי_נפסק"];
  return {
    id: Number(doc.id ?? id),
    caseName:
      pickString(ai["שם_התיק"], meta.case_name, doc.case_name, doc.filename) ||
      "ללא שם",
    court: pickString(ai["בית_משפט"], meta.court_name),
    date: pickString(ai["תאריך_המסמך"], meta.document_date),
    judges: pickArray(ai["שופטים"]),
    summary: pickString(ai["תקציר"], ai["תקציר_המסמך"]),
    title: pickString(ai["כותרת_המסמך"], meta.document_title),
    compensation:
      typeof compRaw === "number" || typeof compRaw === "string"
        ? compRaw
        : null,
    platform: pickString(sql["פלטפורמה"]),
    defenses: objArray(sql["הגנות_שנטענו"]),
    publications: objArray(sql["רשימת_פרסומים"]),
    documentUrl: `/api/rulings/documents/${Number(doc.id ?? id)}/file`,
    parentSlug: parent?.slug ?? null,
    parentTitle: parent?.title ?? null,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id) || id <= 0) {
    return { title: "פסק דין | זומר עורך דין" };
  }
  const ruling = await getRuling(id);
  if (!ruling) return { title: `פסק דין ${id} | זומר עורך דין` };
  const desc = (ruling.summary || "").replace(/\s+/g, " ").trim().slice(0, 160);
  return {
    title: `${ruling.caseName} | זומר עורך דין`,
    description: desc || "פסק דין ממאגר הפסיקה.",
  };
}

export default async function RulingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const ruling = await getRuling(id);
  if (!ruling) notFound();

  return (
    <PublicLayout>
      <Container className="py-8">
        <RulingDetail ruling={ruling} />
      </Container>
    </PublicLayout>
  );
}
