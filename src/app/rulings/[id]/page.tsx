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

async function getRuling(id: number): Promise<DetailRuling | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;
  let res: Response;
  try {
    res = await fetch(`${UPSTREAM}/${id}`, {
      headers: { "X-API-Key": apiKey, Accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const doc = (await res.json()) as Record<string, unknown>;
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
