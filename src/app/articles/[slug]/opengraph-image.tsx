import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";
import { prisma } from "@/lib/prisma";

export const alt = "מאמר";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

const CATEGORY_LABELS: Record<string, string> = {
  "זכויות-בחקירה": "זכויות בחקירה",
  "הליכים-משפטיים": "הליכים משפטיים",
  "טכנולוגיה-במשפט": "טכנולוגיה במשפט",
  "criminal-defense": "הגנה פלילית",
  "pre-investigation": "ייעוץ לפני חקירה",
  "violence-offenses": "עבירות אלימות",
  "drug-offenses": "עבירות סמים",
  "property-offenses": "עבירות רכוש",
};

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // A banner is never worth failing a page preview over: any lookup problem
  // falls back to the generic "מאמרים" banner.
  const post = await prisma.post
    .findUnique({
      where: { slug },
      select: { title: true, excerpt: true, category: true, status: true },
    })
    .catch(() => null);

  if (!post || post.status !== "PUBLISHED") {
    return renderOgBanner({ kicker: "מאמרים", title: "מאמרים משפטיים" });
  }

  return renderOgBanner({
    kicker: (post.category && CATEGORY_LABELS[post.category]) || "מאמר",
    title: post.title,
    subtitle: post.excerpt ?? undefined,
  });
}
