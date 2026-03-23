import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/* ── TipTap node helpers ── */

function text(t: string) {
  return { type: "text", text: t };
}
function heading(level: number, t: string) {
  return { type: "heading", attrs: { level }, content: [text(t)] };
}
function paragraph(t: string) {
  return { type: "paragraph", content: [text(t)] };
}
function bulletList(items: string[]) {
  return {
    type: "bulletList",
    content: items.map((item) => ({
      type: "listItem",
      content: [paragraph(item)],
    })),
  };
}

/* ── Accessibility content ── */

function buildAccessibilityDoc() {
  const nodes: unknown[] = [];

  nodes.push(heading(2, "מחויבות לנגישות"));
  nodes.push(
    paragraph(
      'עו"ד זומר מאמין כי לכל אדם זכות לגישה שוות למידע ולשירותים. מחויבות להבטיח שאתר האינטרנט יהיה נגיש לכלל המשתמשים, לרבות אנשים עם מוגבלויות פיזיות, חושיות, קוגניטיביות או טכנולוגיות.',
    ),
  );
  nodes.push(
    paragraph(
      'מחויבות זו נובעת מאמונה בשוויון ובכבוד האדם, ומעוגנת בחוק שוויון זכויות לאנשים עם מוגבלות, התשנ"ח-1998, ובתקנות הנגישות לשירותי אינטרנט.',
    ),
  );

  nodes.push(heading(2, "עמידה בתקן WCAG 2.1"));
  nodes.push(
    paragraph(
      "אתר זה תוכנן ופותח בהתאם להנחיות הנגישות לתוכן אינטרנט (Web Content Accessibility Guidelines - WCAG) בגרסה 2.1, ברמת התאימות הגבוהה ביותר - AAA.",
    ),
  );
  nodes.push(
    paragraph(
      "תקן זה מגדיר קריטריונים מחמירים לנגישות בארבעה עקרונות מרכזיים: נתפס (Perceivable), ניתן להפעלה (Operable), מובן (Understandable) וחסין (Robust).",
    ),
  );

  nodes.push(heading(2, "אמצעי נגישות באתר"));
  nodes.push(paragraph("להלן אמצעי הנגישות העיקריים שיושמו באתר:"));

  const features = [
    "קישור דילוג לתוכן ראשי — בכל עמוד קיים קישור 'דלג לתוכן הראשי' המאפשר למשתמשי מקלדת וקוראי מסך לעבור ישירות לתוכן העמוד.",
    "ניווט מלא במקלדת — כל האלמנטים האינטראקטיביים באתר נגישים באמצעות מקלדת בלבד, כולל תפריט נייד הנסגר באמצעות מקש Escape.",
    "תגיות ARIA — האתר משתמש בתגיות ARIA מתאימות להבטחת חוויית גלישה מלאה עם טכנולוגיות מסייעות.",
    "ניגודיות צבעים גבוהה — יחסי הניגודיות עומדים בדרישות תקן WCAG 2.1 ברמת AAA.",
    "מחוונים חזותיים למיקוד — כל אלמנט אינטראקטיבי מציג מחוון מיקוד ברור בעובי 3 פיקסלים.",
    "מבנה כותרות סמנטי — היררכיית כותרות תקינה (h1 עד h6) המאפשרת ניווט יעיל.",
    "טפסים נגישים — כל שדות הטפסים כוללים תוויות מקושרות, הודעות שגיאה ברורות וסימון שדות חובה.",
    "תמיכה בכיווניות RTL — האתר בנוי במלואו בכיווניות מימין לשמאל התואמת את השפה העברית.",
    "התאמה לגודלי מסך — האתר מעוצב באופן רספונסיבי ומותאם לכל גודלי המסך.",
    "כיבוד העדפת תנועה מופחתת — האתר מכבד את הגדרת prefers-reduced-motion ומפחית אנימציות למשתמשים שביקשו זאת.",
  ];
  nodes.push(bulletList(features));

  nodes.push(heading(2, "טכנולוגיות תומכות"));
  nodes.push(paragraph("האתר נבדק ונמצא תואם לטכנולוגיות המסייעות הבאות:"));
  nodes.push(
    bulletList([
      "NVDA (NonVisual Desktop Access)",
      "JAWS (Job Access With Speech)",
      "VoiceOver (macOS / iOS)",
      "TalkBack (Android)",
      "דפדפני Chrome, Firefox, Safari ו-Edge בגרסאותיהם העדכניות",
    ]),
  );

  nodes.push(heading(2, "דרכי פנייה בנושא נגישות"));
  nodes.push(
    paragraph(
      "אם נתקלתם בבעיית נגישות באתר או שיש לכם הצעות לשיפור, אשמח לשמוע מכם. מחויבות לטפל בכל פנייה בנושא נגישות תוך 5 ימי עסקים.",
    ),
  );
  nodes.push(paragraph("דואר אלקטרוני: guy@z-g.co.il"));
  nodes.push(paragraph("טלפון: 054-7650202"));

  nodes.push(heading(2, "תאריך עדכון"));
  nodes.push(paragraph("הצהרת נגישות זו עודכנה לאחרונה בתאריך: מרץ 2026."));
  nodes.push(
    paragraph("מבוצעות סקירות נגישות תקופתיות והצהרה זו מתעדכנת בהתאם."),
  );

  return { type: "doc", content: nodes };
}

/* ── Privacy content ── */

function buildPrivacyDoc() {
  const nodes: unknown[] = [];

  nodes.push(paragraph("עודכן לאחרונה: מרץ 2026"));

  nodes.push(heading(2, "כללי"));
  nodes.push(
    paragraph(
      'עו"ד זומר (להלן: "עורך הדין") מכבד את פרטיות המשתמשים באתר האינטרנט שלו. מדיניות פרטיות זו מתארת כיצד נאסף, נעשה שימוש ומוגן המידע האישי שלכם.',
    ),
  );
  nodes.push(
    paragraph(
      "השימוש באתר מהווה הסכמה למדיניות פרטיות זו. מומלץ לקרוא מדיניות זו בעיון לפני השימוש באתר.",
    ),
  );
  nodes.push(
    paragraph(
      "עורך הדין שומר לעצמו את הזכות לעדכן מדיניות זו מעת לעת. שינויים מהותיים יפורסמו באתר.",
    ),
  );

  nodes.push(heading(2, "איסוף מידע"));
  nodes.push(
    paragraph(
      "נאסף מידע שאתם מספקים ישירות, כגון בעת מילוי טופס יצירת קשר, שליחת פנייה או הרשמה לניוזלטר.",
    ),
  );
  nodes.push(heading(3, "מידע שנאסף ישירות"));
  nodes.push(
    bulletList([
      "שם מלא, כתובת דואר אלקטרוני ומספר טלפון בעת שליחת טופס יצירת קשר.",
      "תוכן ההודעות והפניות שנשלחות דרך האתר.",
      "כל מידע נוסף שתבחרו לשתף במסגרת התקשרות מקצועית.",
    ]),
  );
  nodes.push(heading(3, "מידע שנאסף אוטומטית"));
  nodes.push(
    bulletList([
      "כתובת IP, סוג הדפדפן ומערכת ההפעלה.",
      "עמודים שנצפו, זמני גלישה ומקור ההפניה לאתר.",
      "עוגיות (Cookies) ונתוני שימוש אנונימיים לצורך שיפור חוויית הגלישה.",
    ]),
  );

  nodes.push(heading(2, "שימוש במידע"));
  nodes.push(paragraph("המידע שנאסף משמש למטרות הבאות:"));
  nodes.push(
    bulletList([
      "מענה לפניות ובקשות שהתקבלו דרך האתר.",
      "מתן שירותים משפטיים מקצועיים ללקוחות.",
      "שיפור האתר, התכנים והשירותים המוצעים.",
      "עמידה בדרישות חוקיות ורגולטוריות.",
      "שליחת עדכונים מקצועיים ומידע רלוונטי, בכפוף להסכמתכם.",
    ]),
  );

  nodes.push(heading(2, "שיתוף מידע"));
  nodes.push(
    paragraph(
      "עורך הדין לא ימכור, ישכיר או יעביר את המידע האישי שלכם לצדדים שלישיים, אלא במקרים הבאים:",
    ),
  );
  nodes.push(
    bulletList([
      "בהסכמתכם המפורשת.",
      "לצורך מתן שירותים משפטיים, כגון הגשת מסמכים לערכאות שיפוטיות.",
      "כאשר הדבר נדרש על פי חוק, צו בית משפט או דרישה רגולטורית.",
      "לספקי שירותים חיוניים (כגון שירותי אחסון אתרים), הכפופים להתחייבויות סודיות.",
    ]),
  );

  nodes.push(heading(2, "אבטחת מידע"));
  nodes.push(
    paragraph(
      "ננקטים אמצעי אבטחה סבירים ומקובלים כדי להגן על המידע האישי שלכם מפני גישה בלתי מורשית, אובדן או שימוש לרעה.",
    ),
  );
  nodes.push(
    paragraph("האתר מאובטח באמצעות פרוטוקול SSL/TLS להצפנת תעבורת נתונים."),
  );
  nodes.push(paragraph("הגישה למידע אישי מוגבלת."));
  nodes.push(
    paragraph(
      "יחד עם זאת, אין שיטת אבטחה מושלמת ולא ניתן להבטיח אבטחה מוחלטת של המידע.",
    ),
  );

  nodes.push(heading(2, "זכויות המשתמש"));
  nodes.push(
    paragraph(
      'בהתאם לחוק הגנת הפרטיות, התשמ"א-1981, עומדות לכם הזכויות הבאות:',
    ),
  );
  nodes.push(
    bulletList([
      "הזכות לעיין במידע האישי השמור אודותיכם.",
      "הזכות לבקש תיקון או מחיקה של מידע שגוי או שאינו מעודכן.",
      "הזכות להתנגד לשימוש במידע שלכם לצורכי דיוור ישיר.",
      "הזכות לבקש העברה של המידע האישי שלכם.",
      "הזכות להגיש תלונה לרשות להגנת הפרטיות.",
    ]),
  );

  nodes.push(heading(2, "יצירת קשר"));
  nodes.push(
    paragraph(
      "לכל שאלה, בקשה או תלונה בנוגע למדיניות הפרטיות, ניתן לפנות באחת מהדרכים הבאות:",
    ),
  );
  nodes.push(paragraph("דואר אלקטרוני: guy@z-g.co.il"));
  nodes.push(paragraph("טלפון: 054-7650202"));
  nodes.push(paragraph("מחויבות לטפל בכל פנייה תוך 30 ימי עסקים."));

  return { type: "doc", content: nodes };
}

/* ── Terms content ── */

function buildTermsDoc() {
  const nodes: unknown[] = [];

  nodes.push(paragraph("עודכן לאחרונה: מרץ 2026"));

  nodes.push(heading(2, "כללי"));
  nodes.push(
    paragraph(
      'תנאי שימוש אלה חלים על השימוש באתר האינטרנט של עו"ד זומר (להלן: "האתר"). השימוש באתר מהווה הסכמה לתנאים אלה.',
    ),
  );

  nodes.push(heading(2, "שימוש באתר"));
  nodes.push(
    paragraph(
      "האתר מספק מידע כללי בנושאים משפטיים ואינו מהווה ייעוץ משפטי. המידע באתר אינו מחליף ייעוץ משפטי פרטני המותאם לנסיבותיכם.",
    ),
  );
  nodes.push(
    paragraph(
      "אין ליצור קשר משפטי בין עורך הדין לבין גולשי האתר על סמך המידע המוצג באתר בלבד.",
    ),
  );

  nodes.push(heading(2, "קניין רוחני"));
  nodes.push(
    paragraph(
      "כל התכנים באתר, לרבות טקסטים, תמונות, עיצוב ולוגו, מוגנים בזכויות יוצרים ואין להעתיקם, לשכפלם או להפיצם ללא אישור בכתב מראש.",
    ),
  );

  nodes.push(heading(2, "הגבלת אחריות"));
  nodes.push(
    paragraph(
      "עורך הדין אינו אחראי לנזק כלשהו שייגרם כתוצאה מהשימוש באתר או מהסתמכות על המידע המופיע בו.",
    ),
  );
  nodes.push(
    paragraph(
      "האתר עשוי לכלול קישורים לאתרים חיצוניים. עורך הדין אינו אחראי לתוכן של אתרים אלה.",
    ),
  );

  nodes.push(heading(2, "שינויים בתנאי השימוש"));
  nodes.push(
    paragraph(
      "עורך הדין רשאי לשנות תנאים אלה מעת לעת. שינויים ייכנסו לתוקף מרגע פרסומם באתר.",
    ),
  );

  nodes.push(heading(2, "דין חל וסמכות שיפוט"));
  nodes.push(
    paragraph(
      "תנאי שימוש אלה כפופים לדין הישראלי. סמכות השיפוט הבלעדית נתונה לבתי המשפט המוסמכים בתל אביב-יפו.",
    ),
  );

  nodes.push(heading(2, "יצירת קשר"));
  nodes.push(
    paragraph(
      "לכל שאלה בנוגע לתנאי השימוש, ניתן לפנות בדואר אלקטרוני: guy@z-g.co.il",
    ),
  );

  return { type: "doc", content: nodes };
}

/* ── Main ── */

async function main() {
  const pages = [
    { slug: "accessibility", doc: buildAccessibilityDoc() },
    { slug: "privacy", doc: buildPrivacyDoc() },
    { slug: "terms", doc: buildTermsDoc() },
  ];

  for (const { slug, doc } of pages) {
    await prisma.page.update({
      where: { slug },
      data: { content: doc },
    });
    console.log(`Updated: ${slug}`);
  }

  await prisma.$disconnect();
  console.log("Done!");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
