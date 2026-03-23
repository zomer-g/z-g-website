import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";

/* ---- Validation ---- */

const draftSchema = z.object({
  prompt: z.string().min(1, "נדרש תיאור לטיוטה"),
  existingText: z.string().optional(),
  fieldLabel: z.string().optional(),
});

/* ---- POST /api/ai/draft ---- */

export async function POST(req: NextRequest) {
  try {
    const { rateLimit, getClientIp } = await import("@/lib/rate-limit");
    const limited = rateLimit(`ai-draft:${getClientIp(req)}`, { limit: 10, windowMs: 60_000 });
    if (limited) return limited;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "נדרשת הזדהות לביצוע פעולה זו" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const parsed = draftSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "נתונים לא תקינים", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { prompt, existingText, fieldLabel } = parsed.data;

    // Check for Gemini API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "מפתח API של Gemini לא הוגדר. הוסף GEMINI_API_KEY למשתני הסביבה." },
        { status: 500 },
      );
    }

    // Fetch generic prompt from settings
    let genericPrompt = "";
    try {
      const settings = await prisma.siteSettings.findUnique({
        where: { id: "main" },
      });
      if (settings?.data && typeof settings.data === "object") {
        const data = settings.data as Record<string, unknown>;
        genericPrompt = (data.aiGenericPrompt as string) || "";
      }
    } catch {
      // Continue without generic prompt
    }

    // Build the combined prompt
    const parts: string[] = [];

    if (genericPrompt) {
      parts.push(`הנחיות כלליות: ${genericPrompt}`);
    }

    if (fieldLabel) {
      parts.push(`שדה: ${fieldLabel}`);
    }

    if (existingText) {
      parts.push(`טקסט קיים:\n${existingText}`);
      parts.push(`בקשה: ${prompt}`);
    } else {
      parts.push(`בקשה: ${prompt}`);
    }

    parts.push("אנא כתוב תשובה מקצועית בעברית. החזר רק את הטקסט עצמו, ללא כותרות נוספות או הסברים.");

    const combinedPrompt = parts.join("\n\n");

    // Call Gemini API
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const result = await model.generateContent(combinedPrompt);
    const response = result.response;
    const text = response.text();

    return NextResponse.json({
      result: text,
      model: "gemini-2.0-flash",
    });
  } catch (error) {
    console.error("POST /api/ai/draft error:", error);

    // Specific error handling
    const errorMessage =
      error instanceof Error ? error.message : "שגיאה ביצירת הטקסט";

    if (errorMessage.includes("API_KEY_INVALID") || errorMessage.includes("API key")) {
      return NextResponse.json(
        { error: "מפתח API של Gemini אינו תקף. בדוק את GEMINI_API_KEY." },
        { status: 500 },
      );
    }

    if (errorMessage.includes("RATE_LIMIT") || errorMessage.includes("quota")) {
      return NextResponse.json(
        { error: "הגעת למגבלת הבקשות. נסה שוב בעוד מספר דקות." },
        { status: 429 },
      );
    }

    return NextResponse.json(
      { error: "שגיאה ביצירת הטקסט. נסה שוב." },
      { status: 500 },
    );
  }
}
