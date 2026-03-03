import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const SETTINGS_ID = "main";

/* ---- GET /api/settings ---- */

export async function GET() {
  try {
    const settings = await prisma.siteSettings.findUnique({
      where: { id: SETTINGS_ID },
    });

    if (!settings) {
      return NextResponse.json({ id: SETTINGS_ID, data: {} });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json(
      { error: "שגיאה בטעינת ההגדרות" },
      { status: 500 },
    );
  }
}

/* ---- PUT /api/settings ---- */

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "נדרשת הזדהות לביצוע פעולה זו" },
        { status: 401 },
      );
    }

    const body = await req.json();

    if (!body.data || typeof body.data !== "object") {
      return NextResponse.json(
        { error: "נתונים לא תקינים" },
        { status: 400 },
      );
    }

    const settings = await prisma.siteSettings.upsert({
      where: { id: SETTINGS_ID },
      update: { data: body.data },
      create: { id: SETTINGS_ID, data: body.data },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("PUT /api/settings error:", error);
    return NextResponse.json(
      { error: "שגיאה בשמירת ההגדרות" },
      { status: 500 },
    );
  }
}
