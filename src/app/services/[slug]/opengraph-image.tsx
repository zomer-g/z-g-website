import { OG_CONTENT_TYPE, OG_SIZE, renderOgBanner } from "@/lib/og";
import { prisma } from "@/lib/prisma";

export const alt = "תחומי עיסוק";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const service = await prisma.service
    .findUnique({ where: { slug }, select: { title: true, description: true, isActive: true } })
    .catch(() => null);

  if (!service || !service.isActive) {
    return renderOgBanner({
      kicker: "תחומי עיסוק",
      title: "תחומי עיסוק",
      subtitle: "דין פלילי, ליווי חשודים ונאשמים, ייעוץ לפני חקירה וייצוג נפגעי עבירה.",
    });
  }

  return renderOgBanner({
    kicker: "תחומי עיסוק",
    title: service.title,
    subtitle: service.description,
  });
}
