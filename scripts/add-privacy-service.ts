import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function text(t: string) {
  return { type: "text", text: t };
}
function bold(t: string) {
  return { type: "text", text: t, marks: [{ type: "bold" }] };
}
function heading(level: number, t: string) {
  return { type: "heading", attrs: { level }, content: [text(t)] };
}
function paragraph(...nodes: unknown[]) {
  return { type: "paragraph", content: nodes };
}
function infoBlock(
  title: string,
  variant: string,
  icon: string,
  items: string[],
) {
  return {
    type: "infoBlock",
    attrs: { icon, title, variant },
    content: items.map((item) => paragraph(text(item))),
  };
}

async function main() {
  const content = {
    type: "doc",
    content: [
      // ── Main intro text ──
      heading(2, "פגיעה בפרטיות והטרדה — הגנה משפטית בעידן הדיגיטלי"),

      paragraph(
        text(
          "בעולם שבו כמעט כל פעולה מתועדת, משותפת או מופצת ברשת, הפגיעה בפרטיות הפכה מעבירה שולית לאחד התחומים הפליליים הרגישים והמורכבים ביותר. ",
        ),
        text(
          "בין אם מדובר בהפצת תמונות אינטימיות, מעקב דיגיטלי, פריצה למכשירים אישיים, גניבת זהות או הטרדה מקוונת — הנזק ללקוח הוא אישי, עמוק, ולעיתים בלתי הפיך.",
        ),
      ),

      paragraph(
        text(
          "הליווי המשפטי בתחום הזה דורש לא רק הבנה של הדין הפלילי, אלא גם מומחיות טכנולוגית של ממש. ",
        ),
        text(
          "היכולת לנתח ראיות דיגיטליות, להבין כיצד מערכות מידע פועלות, ולזהות דפוסי התנהגות במרחב הדיגיטלי — היא חלק בלתי נפרד מהגנה אפקטיבית בתיקים מסוג זה.",
        ),
      ),

      paragraph(
        text(
          "חוק הגנת הפרטיות, התשמ\"א-1981, יחד עם חוק למניעת הטרדה מאיימת וחוק העונשין, מספקים מסגרת משפטית רחבה להגנה על הפרטיות — אך יישומם בפועל דורש ניסיון וידע ספציפי. ",
        ),
        text(
          "הרקע שלי כממונה הגנת פרטיות מוסמך מטעם אוניברסיטת תל אביב, בשילוב עם הניסיון הטכנולוגי בניתוח דאטה, מאפשר לי לספק ליווי שמשלב את שני העולמות.",
        ),
      ),

      paragraph(
        text("הייצוג בתחום זה מקיף מספר מישורים:"),
      ),

      paragraph(
        bold("ייצוג נפגעים"),
        text(
          " — סיוע לנפגעי פגיעה בפרטיות והטרדה בהגשת תלונה, בקבלת צווי הגנה, ובליווי לאורך ההליך הפלילי. כולל סיוע בהסרת תכנים מהרשת ומניעת פגיעה נוספת.",
        ),
      ),

      paragraph(
        bold("הגנה על חשודים ונאשמים"),
        text(
          " — ייצוג בחקירות ובהליכים פליליים הקשורים לעבירות פרטיות, תוך ניתוח טכני מעמיק של הראיות הדיגיטליות ובחינת חוקיות איסוף הראיות.",
        ),
      ),

      paragraph(
        bold("ייעוץ מונע"),
        text(
          " — ייעוץ לעסקים ולפרטיים בנושאי הגנת פרטיות, ציות לחוק הגנת הפרטיות ותקנותיו, ומניעת חשיפה לתביעות ולהליכים פליליים.",
        ),
      ),

      // ── מה כדאי לדעת (green/success) ──
      infoBlock(
        "מה כדאי לדעת",
        "success",
        "CheckCircle",
        [
          "פגיעה בפרטיות היא עבירה פלילית שעלולה להוביל לעונש מאסר בפועל — גם כשמדובר בהפצה ברשתות חברתיות או באפליקציות מסרים.",
          "ניתן לפנות לבית המשפט בבקשה לצו הגנה או צו למניעת הטרדה מאיימת, גם לפני הגשת תלונה במשטרה.",
          "ראיות דיגיטליות (צילומי מסך, לוגים, מטאדאטה) הן קריטיות — חשוב לתעד ולשמר אותן מוקדם ככל האפשר, לפני שימחקו.",
          "חוק למניעת הטרדה מאיימת מקנה הגנה גם מפני הטרדה מקוונת, כולל שליחת הודעות חוזרות, מעקב ברשת ופרסום מידע אישי.",
          "כממונה הגנת פרטיות מוסמך, אני מסייע גם בהיבטים הרגולטוריים — ציות לחוק הגנת הפרטיות, הכנת נהלים ודיווחים לרשות להגנת הפרטיות.",
        ],
      ),

      // ── ממה להיזהר (red/error) ──
      infoBlock(
        "ממה להיזהר",
        "error",
        "AlertTriangle",
        [
          "לעולם אל תנסו להשיג ראיות בעצמכם באמצעים דיגיטליים (פריצה למכשיר, גישה לחשבון של אדם אחר) — פעולה כזו עלולה להפוך אתכם מנפגעים לחשודים.",
          "הימנעו מפרסום פרטים על התיק ברשתות חברתיות — זה עלול לפגוע בהליך המשפטי ולחשוף אתכם לתביעות נגדיות.",
          "אל תזלזלו באיומים או בהטרדות מקוונות גם אם הן נראות 'רק וירטואליות' — החוק מתייחס אליהן בחומרה.",
          "אם אתם חשודים — אל תמסרו גרסה ללא ייעוץ משפטי מוקדם. ההקשר הטכנולוגי של העבירה דורש הכנה מיוחדת לפני חקירה.",
        ],
      ),
    ],
  };

  // Get the highest order number
  const lastService = await prisma.service.findFirst({
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const nextOrder = (lastService?.order ?? 0) + 1;

  await prisma.service.upsert({
    where: { slug: "privacy-harassment" },
    update: {
      title: "פגיעה בפרטיות והטרדה",
      description:
        "הגנה משפטית בעבירות פרטיות, הטרדה מקוונת, הפצת תמונות וגניבת זהות — עם מומחיות טכנולוגית ייחודית",
      icon: "ShieldAlert",
      content: content,
      isActive: true,
    },
    create: {
      slug: "privacy-harassment",
      title: "פגיעה בפרטיות והטרדה",
      description:
        "הגנה משפטית בעבירות פרטיות, הטרדה מקוונת, הפצת תמונות וגניבת זהות — עם מומחיות טכנולוגית ייחודית",
      icon: "ShieldAlert",
      content: content,
      order: nextOrder,
      isActive: true,
    },
  });

  console.log("Service created: privacy-harassment (פגיעה בפרטיות והטרדה)");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
