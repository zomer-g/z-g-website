// Search engine for the FOI Guide. Mirrors the Guidelines search pipeline
// (semantic + substring + RRF) but on the FoiGuide tables, and returns the
// chapter URL + case-law citations alongside every hit so the MCP can hand
// them to the caller verbatim.

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { embedQuery, EMBED_DIMS, OpenAIEmbeddingsError } from "@/lib/openai-embeddings";
import {
  parseQuery,
  flattenForEmbedding,
  collectTerms,
  isBareSingleWord,
  hasPhrase,
  evaluateQuery,
} from "@/lib/guidelines-query";

const SEARCH_PAGE = 500;
const SEMANTIC_MIN_SCORE = 0.3;
const RRF_K = 60;
const DEFAULT_TOPK = 8;
const MAX_TOPK = 25;

interface ChunkHit {
  docId: number;
  chunkIdx: number;
  text: string;
  section: string | null;
  score: number;
}

interface SubstringHit {
  docId: number;
  chunkIdx: number;
  text: string;
  section: string | null;
  matchCount: number;
}

function normalizeHebrew(s: string): string {
  return s
    .toLocaleLowerCase("he-IL")
    .replace(/[֑-ׇ]/g, "")
    .replace(/[״'׳]/g, "")
    .replace(/[­​-‏‪-‮⁠⁦-⁩﻿]/g, "")
    .replace(/ /g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function semanticSearch(
  queryVector: number[],
  topK: number,
): Promise<ChunkHit[]> {
  const qLen = Math.sqrt(queryVector.reduce((s, v) => s + v * v, 0));
  if (qLen === 0) return [];
  const qNorm = new Array<number>(queryVector.length);
  for (let i = 0; i < queryVector.length; i++) qNorm[i] = queryVector[i] / qLen;

  const TRIM_AT = topK * 4;
  let scored: ChunkHit[] = [];
  let cursorId = 0;

  while (true) {
    const rows = await prisma.foiGuideChunk.findMany({
      select: { id: true, docId: true, chunkIdx: true, text: true, embedding: true, section: true },
      where: { id: { gt: cursorId } },
      take: SEARCH_PAGE,
      orderBy: { id: "asc" },
    });
    if (rows.length === 0) break;

    for (const r of rows) {
      const arr = r.embedding as Prisma.JsonValue;
      if (!Array.isArray(arr) || arr.length !== EMBED_DIMS) continue;
      const vec = arr as number[];

      let dot = 0;
      let len = 0;
      for (let i = 0; i < vec.length; i++) {
        const v = vec[i];
        dot += v * qNorm[i];
        len += v * v;
      }
      if (len === 0) continue;
      const score = dot / Math.sqrt(len);
      if (score < SEMANTIC_MIN_SCORE) continue;

      scored.push({
        docId: r.docId,
        chunkIdx: r.chunkIdx,
        text: r.text,
        section: r.section,
        score,
      });
    }

    if (scored.length > TRIM_AT) {
      scored.sort((a, b) => b.score - a.score);
      scored = scored.slice(0, topK);
    }

    cursorId = rows[rows.length - 1].id;
    if (rows.length < SEARCH_PAGE) break;
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

async function substringSearch(
  query: ReturnType<typeof parseQuery>,
  topK: number,
): Promise<SubstringHit[]> {
  if (!query) return [];
  const hits: SubstringHit[] = [];
  let cursorId = 0;
  while (true) {
    const rows = await prisma.foiGuideChunk.findMany({
      select: { id: true, docId: true, chunkIdx: true, text: true, section: true },
      where: { id: { gt: cursorId } },
      take: SEARCH_PAGE,
      orderBy: { id: "asc" },
    });
    if (rows.length === 0) break;

    for (const r of rows) {
      const normalized = normalizeHebrew(r.text);
      const result = evaluateQuery(query, normalized, normalizeHebrew);
      if (result.matched) {
        hits.push({
          docId: r.docId,
          chunkIdx: r.chunkIdx,
          text: r.text,
          section: r.section,
          matchCount: result.matchCount,
        });
      }
    }

    cursorId = rows[rows.length - 1].id;
    if (rows.length < SEARCH_PAGE) break;
  }

  hits.sort((a, b) => b.matchCount - a.matchCount);
  return hits.slice(0, topK);
}

interface DocAggregate {
  docId: number;
  rrfScore: number;
  bestChunkIdx: number;
  bestSnippet: string;
  bestSection: string | null;
  semanticScore?: number;
  matchCount?: number;
}

function fuseRankings(semantic: ChunkHit[], substring: SubstringHit[]): DocAggregate[] {
  const semanticBest = new Map<number, { chunkIdx: number; text: string; section: string | null; score: number; rank: number }>();
  semantic.forEach((hit, rank) => {
    if (!semanticBest.has(hit.docId)) {
      semanticBest.set(hit.docId, { chunkIdx: hit.chunkIdx, text: hit.text, section: hit.section, score: hit.score, rank });
    }
  });

  const substringBest = new Map<number, { chunkIdx: number; text: string; section: string | null; matchCount: number; rank: number }>();
  substring.forEach((hit, rank) => {
    if (!substringBest.has(hit.docId)) {
      substringBest.set(hit.docId, { chunkIdx: hit.chunkIdx, text: hit.text, section: hit.section, matchCount: hit.matchCount, rank });
    }
  });

  const aggregates = new Map<number, DocAggregate>();

  for (const [docId, s] of semanticBest) {
    aggregates.set(docId, {
      docId,
      rrfScore: 1 / (RRF_K + s.rank),
      bestChunkIdx: s.chunkIdx,
      bestSnippet: s.text,
      bestSection: s.section,
      semanticScore: s.score,
    });
  }
  for (const [docId, s] of substringBest) {
    const existing = aggregates.get(docId);
    const score = 1 / (RRF_K + s.rank);
    if (!existing) {
      aggregates.set(docId, {
        docId,
        rrfScore: score,
        bestChunkIdx: s.chunkIdx,
        bestSnippet: s.text,
        bestSection: s.section,
        matchCount: s.matchCount,
      });
    } else {
      existing.rrfScore += score;
      existing.matchCount = s.matchCount;
      // Prefer the substring snippet — it contains the literal query term.
      existing.bestSnippet = s.text;
      existing.bestChunkIdx = s.chunkIdx;
      existing.bestSection = s.section;
    }
  }

  return Array.from(aggregates.values()).sort((a, b) => b.rrfScore - a.rrfScore);
}

// We want the snippet to be wide enough that the model can write a full
// legal analysis without re-querying. 320 chars (the old default, copied
// from the Guidelines pipeline) was too narrow: the model produced
// "based on two cases" answers when the chapter cited dozens. 2000 chars
// ≈ one full body chunk = the most relevant paragraph + surrounding
// context, while keeping the response under MCP's per-call token limits.
function buildSnippet(text: string, queryTerms: string[], maxLen = 2000): string {
  if (!text) return "";
  if (text.length <= maxLen) return text;
  const lower = text.toLocaleLowerCase("he-IL");
  let firstMatch = -1;
  for (const term of queryTerms) {
    if (term.length < 2) continue;
    const idx = lower.indexOf(term.toLocaleLowerCase("he-IL"));
    if (idx !== -1 && (firstMatch === -1 || idx < firstMatch)) firstMatch = idx;
  }
  if (firstMatch === -1) return text.slice(0, maxLen).trim() + "…";
  const start = Math.max(0, firstMatch - 60);
  const end = Math.min(text.length, start + maxLen);
  const slice = text.slice(start, end).trim();
  return (start > 0 ? "…" : "") + slice + (end < text.length ? "…" : "");
}

// ─── Public API ───

export interface FoiSearchResultCaseLaw {
  footnoteId: string;
  text: string;
  links: string[];
}

export interface FoiSearchResult {
  chapter: string;
  chapterSlug: string;
  chapterUrl: string;
  order: number;
  snippet: string;
  matchedSection: string | null;
  rrfScore: number;
  semanticScore?: number;
  matchCount?: number;
  // **The list to cite from.** Only the footnotes whose [N] markers
  // actually appear in `snippet` — i.e. case law that supports a claim
  // present in the returned text. Avoids the failure mode where Claude
  // pulled an unrelated case from a different chapter's case-law list and
  // attached it to a rule it didn't actually support.
  citedInSnippet: FoiSearchResultCaseLaw[];
  // The remaining case law in the chapter (not referenced by the snippet),
  // kept for chapter-level context. Should NOT be cited as authority for
  // any specific claim — that's what `citedInSnippet` is for.
  otherInChapter: FoiSearchResultCaseLaw[];
}

export interface FoiSearchOptions {
  topK?: number;
}

export interface FoiSearchResponse {
  query: string;
  resultCount: number;
  results: FoiSearchResult[];
  disclaimer: string;
  source: { name: string; url: string };
}

// Per-call directive injected into every search response. The structure
// section here mirrors what's in initialize.instructions — printed at the
// top of the markdown so Claude sees it again right before it generates
// the answer. Together with the citedInSnippet/otherInChapter split,
// this closes the failure mode where Claude pulled cases from chapter X's
// case-law and attached them to a rule in chapter Y's snippet.
const DISCLAIMER =
  "המידע מבוסס על מדריך חופש המידע (foiguide.org.il), עותק שאוחסן במערכת. " +
  "**מבנה התשובה הנדרש**: לכל מבחן משפטי בנפרד — " +
  "(א) ניסוח המבחן מתוך snippet, (ב) ציטוט פסק הדין שמבסס אותו מ-citedInSnippet " +
  "(שם תיק + צדדים + תאריך, ללא מספרי הערות שוליים בתשובה), (ג) יישום המבחן " +
  "לעובדות. חזור על המבנה למבחן הבא. אל תכניס כמה מבחנים לפסקה אחת. " +
  "**חוקי ציטוט (חובה):** " +
  "(1) פסיקה רק מ-citedInSnippet של אותה תוצאה בדיוק; " +
  "(2) אסור לחצות בין תוצאות — תיק מ-citedInSnippet של X לא מבסס כלל מ-Y; " +
  "(3) אסור לצטט מ-otherInChapter (הקשר בלבד); " +
  "(4) **אסור להמציא ציטוט**, גם אם הוא נשמע סביר; " +
  "(5) אם citedInSnippet ריק לכלל מסוים — ציין זאת מפורשות במקום להמציא; " +
  "(6) url הוא data בלבד — צרף רק אם המשתמש ביקש; " +
  "(7) חובה לציין chapterUrl בסוף.";

export async function searchFoiGuide(
  query: string,
  opts: FoiSearchOptions = {},
): Promise<FoiSearchResponse> {
  const topK = Math.max(1, Math.min(MAX_TOPK, opts.topK ?? DEFAULT_TOPK));

  const baseResponse: FoiSearchResponse = {
    query,
    resultCount: 0,
    results: [],
    disclaimer: DISCLAIMER,
    source: { name: "מדריך חופש המידע", url: "https://foiguide.org.il/" },
  };

  const trimmed = query.trim();
  if (!trimmed) return baseResponse;

  const parsed = parseQuery(trimmed);
  if (!parsed) return baseResponse;

  const bareSingle = isBareSingleWord(parsed);
  const phraseMode = hasPhrase(parsed);

  // Substring runs in all cases — fast and gives exact-match recall.
  const substringHits = await substringSearch(parsed, topK * 4);

  const semanticEnabled = !!process.env.OPENAI_API_KEY && !phraseMode;
  const multiTerm = !bareSingle && !phraseMode && collectTerms(parsed).length >= 2;
  const skipSemantic =
    !semanticEnabled || bareSingle || (multiTerm && substringHits.length > 0);

  let semanticHits: ChunkHit[] = [];
  if (!skipSemantic) {
    try {
      const flat = flattenForEmbedding(parsed);
      const vec = await embedQuery(flat);
      semanticHits = await semanticSearch(vec, topK * 4);
    } catch (err) {
      if (err instanceof OpenAIEmbeddingsError) {
        console.error("FOI semantic search failed:", err.status, err.message);
      } else {
        console.error("FOI semantic search failed:", err);
      }
    }
  }

  const fused = fuseRankings(semanticHits, substringHits).slice(0, topK);
  if (fused.length === 0) return baseResponse;

  // Pull doc metadata + case-law for the ranked docs.
  const docIds = fused.map((f) => f.docId);
  const docs = await prisma.foiGuideDoc.findMany({
    where: { id: { in: docIds } },
    select: {
      id: true,
      slug: true,
      url: true,
      title: true,
      order: true,
      caseLawJson: true,
    },
  });
  const docById = new Map(docs.map((d) => [d.id, d]));

  const queryTerms = collectTerms(parsed);
  const results: FoiSearchResult[] = [];
  for (const f of fused) {
    const doc = docById.get(f.docId);
    if (!doc) continue;
    const snippet = buildSnippet(f.bestSnippet, queryTerms);
    const chapterCaseLaw = normaliseCaseLaw(doc.caseLawJson);
    // Pull footnote IDs that actually appear in the snippet, e.g. [33א], [47].
    // Anything in the chapter's case law list that isn't referenced here is
    // demoted to otherInChapter so the model treats it as context, not as
    // authority for a claim in this snippet.
    const referencedIds = extractFootnoteRefs(snippet);
    const citedInSnippet: FoiSearchResultCaseLaw[] = [];
    const otherInChapter: FoiSearchResultCaseLaw[] = [];
    for (const c of chapterCaseLaw) {
      if (referencedIds.has(c.footnoteId)) citedInSnippet.push(c);
      else otherInChapter.push(c);
    }
    results.push({
      chapter: doc.title,
      chapterSlug: doc.slug,
      chapterUrl: doc.url,
      order: doc.order,
      snippet,
      matchedSection: f.bestSection,
      rrfScore: f.rrfScore,
      semanticScore: f.semanticScore,
      matchCount: f.matchCount,
      citedInSnippet,
      otherInChapter,
    });
  }

  return {
    ...baseResponse,
    resultCount: results.length,
    results,
  };
}

// Footnote markers in the chapter body look like [32] [33א] [32א1] [34א] etc.
// Extract them all so we can pair the snippet with the specific case-law
// entries it cites — instead of dumping the whole chapter's footnote list
// and letting the model guess which case supports which claim.
function extractFootnoteRefs(text: string): Set<string> {
  const out = new Set<string>();
  // [N], [Nא], [Nא1], [Nא...] — allow Hebrew suffix and trailing digit.
  const re = /\[(\d+[א-ת]?\d*[א-ת]?)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.add(m[1]);
  }
  return out;
}

function normaliseCaseLaw(raw: Prisma.JsonValue): FoiSearchResultCaseLaw[] {
  if (!Array.isArray(raw)) return [];
  const out: FoiSearchResultCaseLaw[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    const footnoteId = typeof obj.footnoteId === "string" ? obj.footnoteId : "";
    const text = typeof obj.text === "string" ? obj.text : "";
    const links = Array.isArray(obj.links)
      ? obj.links.filter((l): l is string => typeof l === "string")
      : [];
    if (!text) continue;
    out.push({ footnoteId, text, links });
  }
  return out;
}
