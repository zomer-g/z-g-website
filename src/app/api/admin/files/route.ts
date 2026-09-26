import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getFileInventory } from "@/lib/file-inventory";
import { setFileVisibility } from "@/lib/private-files";

export const dynamic = "force-dynamic";

// GET   /api/admin/files → every file under /uploads with where it is used.
// PATCH /api/admin/files { filename, isPublic } → hide or expose one file.
// ADMIN only.

async function isAdmin() {
  const session = await auth();
  return session?.user?.role === "ADMIN";
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "נדרשת הזדהות" }, { status: 401 });
  }
  try {
    return NextResponse.json({ files: await getFileInventory() });
  } catch (err) {
    console.error("GET /api/admin/files error:", err);
    return NextResponse.json({ error: "שגיאה בטעינת רשימת הקבצים" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "נדרשת הזדהות" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as
    | { filename?: unknown; isPublic?: unknown }
    | null;
  const filename = typeof body?.filename === "string" ? body.filename : "";
  if (
    !filename ||
    filename.includes("/") ||
    filename.includes("\\") ||
    typeof body?.isPublic !== "boolean"
  ) {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }
  try {
    await setFileVisibility(filename, body.isPublic);
    return NextResponse.json({ filename, isPublic: body.isPublic });
  } catch (err) {
    console.error("PATCH /api/admin/files error:", err);
    return NextResponse.json({ error: "שגיאה בעדכון הקובץ" }, { status: 500 });
  }
}
