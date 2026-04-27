// Calls gpt-4o-mini with a strict-only-flag-real-errors prompt and parses
// its JSON output into structured issues. Used by both the CLI script and
// the admin API.

import type { ContentItem } from "./collect";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
export const PROOFREAD_MODEL = "gpt-4o-mini";

export interface ProofreadIssue {
  source: string;
  original: string;
  suggestion: string;
  reason: string;
}

export class ProofreadError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

const SYSTEM_PROMPT = `אתה מגיה מוסמך לעברית. תפקידך לאתר טעויות ודאיות בלבד:
- שגיאות כתיב (אותיות שגויות, אות חסרה/מיותרת)
- שגיאות הסכמה דקדוקית בולטות (זכר/נקבה, מספר)
- שימוש שגוי במילים (שגיאה ולא בחירת סגנון)
- ניסוח מעוות שאינו ניתן להבנה

לא לסמן: בחירות סגנון, שימוש בכתיב מלא/חסר, ביטויים פורמליים, מונחים מקצועיים, או טעויות לא ודאיות. במקרה של ספק — דלג.

קלט: רשימת מחרוזות ממוספרות. פלט: JSON תקין בלבד בתבנית:
{"issues": [{"index": 1, "original": "...", "suggestion": "...", "reason": "..."}]}

אם אין טעויות במחרוזת מסוימת — אל תכלול אותה. אם אין טעויות בכלל — החזר {"issues": []}.`;

export async function proofreadBatch(
  items: ContentItem[],
): Promise<ProofreadIssue[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new ProofreadError("OPENAI_API_KEY is not set", 503);
  }
  if (items.length === 0) return [];

  const numbered = items.map((it, i) => `${i + 1}. ${it.text}`).join("\n");

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: PROOFREAD_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: numbered },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ProofreadError(
      `OpenAI ${res.status}: ${text.slice(0, 200)}`,
      res.status,
    );
  }

  const json = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  const content = json.choices[0]?.message?.content ?? "{}";

  let parsed: {
    issues?: { index: number; original: string; suggestion: string; reason: string }[];
  };
  try {
    parsed = JSON.parse(content);
  } catch {
    return [];
  }

  return (parsed.issues ?? [])
    .filter(
      (iss) =>
        Number.isInteger(iss.index) &&
        iss.index >= 1 &&
        iss.index <= items.length,
    )
    .map((iss) => ({
      source: items[iss.index - 1].source,
      original: iss.original,
      suggestion: iss.suggestion,
      reason: iss.reason,
    }));
}

export const PROOFREAD_BATCH_SIZE = 30;
