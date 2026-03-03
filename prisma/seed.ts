import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Seed initial pages
  const pages = [
    { slug: "home", title: "דף הבית" },
    { slug: "about", title: "אודות" },
    { slug: "privacy", title: "מדיניות פרטיות" },
    { slug: "accessibility", title: "הצהרת נגישות" },
  ];

  for (const page of pages) {
    await prisma.page.upsert({
      where: { slug: page.slug },
      update: {},
      create: {
        slug: page.slug,
        title: page.title,
        content: { blocks: [] },
      },
    });
  }

  // Seed initial services
  const services = [
    {
      title: "דיני חברות",
      slug: "corporate-law",
      description: "ייעוץ וליווי משפטי מקיף לחברות בכל שלבי הפעילות העסקית",
      icon: "Scale",
      order: 1,
    },
    {
      title: 'נדל"ן',
      slug: "real-estate",
      description: "ליווי עסקאות נדל\"ן, ייצוג בפני רשויות התכנון והבנייה",
      icon: "Building2",
      order: 2,
    },
    {
      title: "ליטיגציה",
      slug: "litigation",
      description: "ייצוג בהליכים משפטיים בבתי המשפט בכל הערכאות",
      icon: "Gavel",
      order: 3,
    },
    {
      title: "דיני עבודה",
      slug: "labor-law",
      description: "ייעוץ בדיני עבודה, ליווי מעסיקים ועובדים",
      icon: "Briefcase",
      order: 4,
    },
    {
      title: "קניין רוחני",
      slug: "intellectual-property",
      description: "הגנה על זכויות קניין רוחני, סימני מסחר ופטנטים",
      icon: "Shield",
      order: 5,
    },
    {
      title: "דיני מסים",
      slug: "tax-law",
      description: "ייעוץ וליווי בנושאי מיסוי, תכנון מס ודיני מסים",
      icon: "FileText",
      order: 6,
    },
  ];

  for (const service of services) {
    await prisma.service.upsert({
      where: { slug: service.slug },
      update: {},
      create: {
        ...service,
        content: { blocks: [] },
      },
    });
  }

  // Seed site settings
  await prisma.siteSettings.upsert({
    where: { id: "main" },
    update: {},
    create: {
      id: "main",
      data: {
        phone: "03-1234567",
        email: "office@z-g.co.il",
        address: "הברזל 30, תל אביב",
        linkedin: "",
        facebook: "",
      },
    },
  });

  console.log("Seed completed successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
