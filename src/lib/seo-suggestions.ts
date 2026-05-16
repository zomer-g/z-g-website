import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";

/**
 * AI-powered keyword brainstorm for SEO.
 *
 * Builds a compact, factual snapshot of the site's content (services + pages + posts)
 * and asks Gemini to suggest high-intent Hebrew search queries the site *should*
 * rank for but plausibly does not yet, with concrete on-page actions.
 */

export type KeywordIdea = {
  query: string;
  intent: "informational" | "navigational" | "commercial" | "transactional";
  rationale: string;
  targetPage: string; // path under site, e.g. "/services/criminal-defense"
  estimatedDifficulty: "low" | "medium" | "high";
  suggestedActions: string[]; // 1-3 concrete on-page actions
  contentGap?: string; // optional: if a new page is needed instead
};

export type BrainstormResult = {
  ideas: KeywordIdea[];
  model: string;
  generatedAt: string;
  contentDigest: {
    services: number;
    pages: number;
    posts: number;
  };
};

type SiteSnapshot = {
  services: Array<{ slug: string; title: string; description: string }>;
  pages: Array<{ slug: string; title: string; seoDesc: string | null }>;
  posts: Array<{
    slug: string;
    title: string;
    excerpt: string | null;
    tags: string[];
    category: string | null;
  }>;
};

async function buildSiteSnapshot(): Promise<SiteSnapshot> {
  const [services, pages, posts] = await Promise.all([
    prisma.service.findMany({
      where: { isActive: true },
      select: { slug: true, title: true, description: true },
      orderBy: { order: "asc" },
    }),
    prisma.page.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, title: true, seoDesc: true },
    }),
    prisma.post.findMany({
      where: { status: "PUBLISHED" },
      select: {
        slug: true,
        title: true,
        excerpt: true,
        tags: true,
        category: true,
      },
      orderBy: { publishedAt: "desc" },
      take: 80,
    }),
  ]);

  return { services, pages, posts };
}

function snapshotToPrompt(snapshot: SiteSnapshot): string {
  const servicesText = snapshot.services
    .map((s) => `- /services/${s.slug} — ${s.title}: ${s.description}`)
    .join("\n");

  const pagesText = snapshot.pages
    .map((p) => `- /${p.slug} — ${p.title}${p.seoDesc ? `: ${p.seoDesc}` : ""}`)
    .join("\n");

  const postsText = snapshot.posts
    .map((p) => {
      const tags = p.tags.length > 0 ? ` [${p.tags.join(", ")}]` : "";
      const cat = p.category ? ` (${p.category})` : "";
      const ex = p.excerpt ? `: ${p.excerpt}` : "";
      return `- /articles/${p.slug} — ${p.title}${cat}${tags}${ex}`;
    })
    .join("\n");

  return `## תחומי עיסוק
${servicesText || "(אין)"}

## עמודי נחיתה ופרויקטים
${pagesText || "(אין)"}

## מאמרים מפורסמים
${postsText || "(אין)"}`;
}

const SYSTEM_PROMPT = `אתה יועץ SEO מומחה לעברית ולאתרי משרדי עורכי דין ופרויקטים אזרחיים בישראל.
תפקידך לקבל מיפוי תוכן של אתר ולהציע ביטויי חיפוש (queries) בעברית שכדאי שהאתר ידורג עליהם בגוגל, יחד עם פעולות ממוקדות לקידום.

קווים מנחים:
- כתוב את ביטויי החיפוש כפי שגולש ישראלי באמת היה מקליד אותם בגוגל (קצר, ענייני, לפעמים שגיאות כתיב נפוצות אך אל תכלול שגיאות אלא אם הן באמת נפוצות).
- העדף ביטויים עם כוונת חיפוש ברורה (informational / commercial / transactional) על פני ביטויים מעורפלים.
- לכל ביטוי, הצמד אותו לעמוד הקיים הרלוונטי ביותר באתר. אם אין עמוד מתאים — סמן contentGap עם תיאור העמוד שחסר.
- אל תציע "best keywords" כלליים. הצע 8-15 ביטויים *ספציפיים* עם פוטנציאל אמיתי לאתר הזה.
- כל הפלט בעברית פרט לשמות שדות ולנתיבי URL.
- estimatedDifficulty: low = ניווטי או נישתי, medium = תחרותי אבל בר-השגה, high = רשויות גדולות מדורגות שם.
- suggestedActions: 1-3 פעולות קונקרטיות (לדוגמה: "הוסף H2 'X' בעמוד Y", "שנה title ל-Z", "כתוב מאמר על W").

החזר JSON תקני בלבד, ללא markdown ובלי הסברים. סכמה:
{
  "ideas": [
    {
      "query": "string",
      "intent": "informational" | "navigational" | "commercial" | "transactional",
      "rationale": "string",
      "targetPage": "/path",
      "estimatedDifficulty": "low" | "medium" | "high",
      "suggestedActions": ["string", ...],
      "contentGap": "string (optional, only if no existing page fits)"
    }
  ]
}`;

function extractJson(raw: string): unknown {
  // Strip code fences if Gemini wrapped the response.
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  }
  // Find the first {...} block.
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1);
  }
  return JSON.parse(text);
}

function coerceIdeas(parsed: unknown): KeywordIdea[] {
  if (!parsed || typeof parsed !== "object") return [];
  const obj = parsed as Record<string, unknown>;
  const arr = Array.isArray(obj.ideas) ? obj.ideas : [];
  const out: KeywordIdea[] = [];

  const validIntents = ["informational", "navigational", "commercial", "transactional"];
  const validDifficulty = ["low", "medium", "high"];

  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const i = item as Record<string, unknown>;
    const query = typeof i.query === "string" ? i.query.trim() : "";
    if (!query) continue;

    const intent = validIntents.includes(i.intent as string)
      ? (i.intent as KeywordIdea["intent"])
      : "informational";
    const difficulty = validDifficulty.includes(i.estimatedDifficulty as string)
      ? (i.estimatedDifficulty as KeywordIdea["estimatedDifficulty"])
      : "medium";
    const targetPage =
      typeof i.targetPage === "string" && i.targetPage.startsWith("/")
        ? i.targetPage
        : "/";
    const rationale = typeof i.rationale === "string" ? i.rationale : "";
    const actions = Array.isArray(i.suggestedActions)
      ? (i.suggestedActions as unknown[])
          .filter((x): x is string => typeof x === "string")
          .slice(0, 5)
      : [];
    const contentGap =
      typeof i.contentGap === "string" && i.contentGap.trim()
        ? i.contentGap.trim()
        : undefined;

    out.push({
      query,
      intent,
      rationale,
      targetPage,
      estimatedDifficulty: difficulty,
      suggestedActions: actions,
      contentGap,
    });
  }

  return out;
}

export async function brainstormKeywords(opts?: {
  focusHint?: string;
}): Promise<BrainstormResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to your env to enable AI keyword brainstorm.",
    );
  }

  const snapshot = await buildSiteSnapshot();
  const contentBlock = snapshotToPrompt(snapshot);
  const focusBlock = opts?.focusHint
    ? `\n\n## דגש לסבב הזה\n${opts.focusHint}`
    : "";

  const userPrompt = `${SYSTEM_PROMPT}

## מיפוי תוכן האתר
${contentBlock}${focusBlock}

החזר JSON בלבד.`;

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = "gemini-2.5-flash";
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.4,
    },
  });

  const result = await model.generateContent(userPrompt);
  const text = result.response.text();
  const parsed = extractJson(text);
  const ideas = coerceIdeas(parsed);

  return {
    ideas,
    model: modelName,
    generatedAt: new Date().toISOString(),
    contentDigest: {
      services: snapshot.services.length,
      pages: snapshot.pages.length,
      posts: snapshot.posts.length,
    },
  };
}
