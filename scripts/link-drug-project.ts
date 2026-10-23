import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DRUG_PROJECT = {
  url: "/drug-sentencing",
  icon: "Scale",
  tags: ["גזרי דין", "עבירות סמים", "ענישה", "דאטה משפטי"],
  title: "גזרי דין בעבירות סמים",
  subtitle: "מאגר גזרי דין בעבירות סמים — סינון לפי סם, ענישה, סעיף וחומרה",
  description:
    'מאגר גזרי דין בעבירות סמים ממערכת TAG-IT, עם סינון מתקדם: סוג הסם (ריבוי-בחירה), רכיבי הענישה (מאסר בפועל/על תנאי, קנס, של"צ ועוד), חוק וסעיף העבירה, ודגלי הליך (הודה באשמה, עונש מוסכם, ביטול הרשעה). ניתן למיין לפי חומרת העונש. כל תיק מציג את הנאשמים, ההרשעות, פירוט הענישה ופירוט הסמים.',
};

function prepend(list: any[]): any[] {
  if (!Array.isArray(list)) return [DRUG_PROJECT];
  if (list.some((p) => p && p.url === DRUG_PROJECT.url)) return list; // dedup by url
  return [DRUG_PROJECT, ...list];
}

async function main() {
  // 1) Add the card to the /projects page (content + draft).
  const projects = await prisma.page.findUnique({ where: { slug: "projects" } });
  if (!projects) throw new Error("projects page not found");
  const c: any = projects.content ?? {};
  const d: any = projects.draftContent ?? projects.content ?? {};
  await prisma.page.update({
    where: { slug: "projects" },
    data: {
      content: { ...c, projects: prepend(c.projects) } as any,
      draftContent: { ...d, projects: prepend(d.projects) } as any,
    },
  });

  // 2) Publish the drug-sentencing page (isPublic: true).
  const drug = await prisma.page.findUnique({ where: { slug: "drug-sentencing" } });
  if (drug) {
    const dc: any = drug.content ?? {};
    const dd: any = drug.draftContent ?? drug.content ?? {};
    await prisma.page.update({
      where: { slug: "drug-sentencing" },
      data: {
        content: { ...dc, isPublic: true } as any,
        draftContent: { ...dd, isPublic: true } as any,
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });
  }
  console.log("✓ linked /drug-sentencing to /projects + set isPublic=true");
}

main().finally(() => prisma.$disconnect());
