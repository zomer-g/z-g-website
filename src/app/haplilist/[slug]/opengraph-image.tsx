import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";
import { prisma } from "@/lib/prisma";

export const alt = "הפליליסט הדיגיטלי";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const post = await prisma.plilistPost
    .findUnique({ where: { slug }, select: { title: true, excerpt: true, status: true } })
    .catch(() => null);

  if (!post || post.status !== "PUBLISHED") {
    return renderOgBanner({
      kicker: "בלוג אישי",
      title: "הפליליסט הדיגיטלי",
      subtitle: "פרספקטיבה אישית על המשפט הפלילי, מערכת המשפט והחיים שסביבם.",
    });
  }

  return renderOgBanner({
    kicker: "הפליליסט הדיגיטלי",
    title: post.title,
    subtitle: post.excerpt ?? undefined,
  });
}
