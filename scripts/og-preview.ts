/**
 * Dev helper: render an OG banner straight to a PNG so the design can be
 * eyeballed without booting Next.
 *
 *   npx tsx scripts/og-preview.ts out.png
 */
import { writeFile } from "node:fs/promises";
import { renderOgBanner } from "../src/lib/og/index";

async function main() {
  const out = process.argv[2] ?? "og-preview.png";
  const res = await renderOgBanner({
    kicker: "מאגר ציבורי",
    title: 'מאגר הנחיות יועמ"ש, פרקליט המדינה ומשטרה',
    subtitle: "חיפוש חופשי באלפי הנחיות ונהלים של רשויות האכיפה, עם קישור למסמך המקורי.",
    tags: ["חופש מידע", "גישה לציבור"],
  });
  await writeFile(out, Buffer.from(await res.arrayBuffer()));
  console.log("wrote", out);
}

main();
