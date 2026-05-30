// Read-side helpers for the structured statute-clause model. Backs the MCP
// tools foi_list_sections + foi_examples_by_section, which return a clean,
// deterministic table of decided cases per clause — no semantic guessing.

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export interface StructuredRuling {
  footnoteId: string;
  text: string;
  links: string[];
}

export interface StructuredExample {
  description: string;
  outcome: string; // rejected | accepted | mixed | unspecified
  rulings: StructuredRuling[];
}

export interface StructuredSection {
  sectionRef: string;
  heading: string;
  anchorUrl: string;
  chapterUrl: string;
  exampleCount: number;
}

export interface StructuredSectionDetail extends StructuredSection {
  examples: StructuredExample[];
}

function normaliseRulings(raw: Prisma.JsonValue): StructuredRuling[] {
  if (!Array.isArray(raw)) return [];
  const out: StructuredRuling[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const text = typeof o.text === "string" ? o.text : "";
    if (!text) continue;
    out.push({
      footnoteId: typeof o.footnoteId === "string" ? o.footnoteId : "",
      text,
      links: Array.isArray(o.links)
        ? o.links.filter((l): l is string => typeof l === "string")
        : [],
    });
  }
  return out;
}

// Normalise a user-supplied clause ref so "9(ב)(4)", "9 (ב)(4)", "9ב4",
// "9(ב) (4)" all resolve to the stored "9(ב)(4)".
export function normaliseClauseQuery(input: string): string {
  return input.replace(/\s+/g, "").trim();
}

// List every statute clause that has at least one decided example.
export async function listLawSections(): Promise<StructuredSection[]> {
  const sections = await prisma.foiLawSection.findMany({
    orderBy: [{ sectionRef: "asc" }],
    select: {
      sectionRef: true,
      heading: true,
      anchorUrl: true,
      chapterUrl: true,
      _count: { select: { examples: true } },
    },
  });
  return sections.map((s) => ({
    sectionRef: s.sectionRef,
    heading: s.heading,
    anchorUrl: s.anchorUrl,
    chapterUrl: s.chapterUrl,
    exampleCount: s._count.examples,
  }));
}

// Fetch the decided-case table for a specific clause. Matches exact clause
// first; falls back to a "starts-with" match so "9(ב)" returns all 9(ב)(N)
// sub-clauses.
export async function getExamplesByClause(
  clause: string,
): Promise<StructuredSectionDetail[]> {
  const ref = normaliseClauseQuery(clause);
  if (!ref) return [];

  let sections = await prisma.foiLawSection.findMany({
    where: { sectionRef: ref },
    orderBy: [{ docId: "asc" }, { order: "asc" }],
    include: { examples: { orderBy: { order: "asc" } } },
  });

  // Fallback: prefix match (e.g. "9(ב)" → 9(ב)(1)…9(ב)(11)).
  if (sections.length === 0) {
    sections = await prisma.foiLawSection.findMany({
      where: { sectionRef: { startsWith: ref } },
      orderBy: [{ sectionRef: "asc" }, { order: "asc" }],
      include: { examples: { orderBy: { order: "asc" } } },
    });
  }

  return sections.map((s) => ({
    sectionRef: s.sectionRef,
    heading: s.heading,
    anchorUrl: s.anchorUrl,
    chapterUrl: s.chapterUrl,
    exampleCount: s.examples.length,
    examples: s.examples.map((e) => ({
      description: e.description,
      outcome: e.outcome,
      rulings: normaliseRulings(e.rulingsJson),
    })),
  }));
}
