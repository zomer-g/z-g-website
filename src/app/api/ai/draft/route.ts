import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";

/* ---- Validation ---- */

const draftSchema = z.object({
  prompt: z.string().min(1, "נדרש תיאור לטיוטה"),
  content: z.string().optional(),
});

/* ---- POST /api/ai/draft ---- */

export async function POST(req: NextRequest) {
  try {
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

    // ----- Placeholder response -----
    // TODO: Replace with actual AI API integration (Claude / OpenAI)
    const { prompt, content } = parsed.data;

    const placeholderDraft = {
      title: `טיוטה: ${prompt.slice(0, 60)}`,
      content: content
        ? `[טיוטה מבוססת AI עבור התוכן שסופק]\n\nנושא: ${prompt}\n\nתוכן המקור עובד. שילוב AI יתווסף בקרוב.`
        : `[טיוטה מבוססת AI]\n\nנושא: ${prompt}\n\nשילוב AI יתווסף בקרוב. תכונה זו תאפשר יצירת טיוטות אוטומטיות עבור מאמרים משפטיים.`,
      model: "placeholder",
      tokensUsed: 0,
    };

    return NextResponse.json(placeholderDraft);
  } catch (error) {
    console.error("POST /api/ai/draft error:", error);
    return NextResponse.json(
      { error: "שגיאה ביצירת הטיוטה" },
      { status: 500 },
    );
  }
}
