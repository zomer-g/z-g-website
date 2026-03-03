import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Calendar, User, ArrowLeft } from "lucide-react";
import PublicLayout from "@/components/layout/public-layout";
import { Container } from "@/components/ui/container";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

/* ─── Articles Data (static — will be replaced by DB later) ─── */

interface ArticleData {
  readonly slug: string;
  readonly title: string;
  readonly date: string;
  readonly author: string;
  readonly category: string;
  readonly categoryLabel: string;
  readonly excerpt: string;
  readonly content: readonly string[];
  readonly subheadings: readonly {
    readonly title: string;
    readonly paragraphs: readonly string[];
  }[];
}

const ARTICLES_DATA: Record<string, ArticleData> = {
  "corporate-governance-guide": {
    slug: "corporate-governance-guide",
    title: "מדריך מקיף לממשל תאגידי בישראל",
    date: "2025-12-15",
    author: "עו״ד יוסי זומר",
    category: "corporate-law",
    categoryLabel: "דיני חברות",
    excerpt:
      "ממשל תאגידי הוא מערכת הכללים והנהלים שלפיהם מנוהלת חברה. במאמר זה נסקור את עקרונות הממשל התאגידי בישראל.",
    content: [
      "ממשל תאגידי (Corporate Governance) הוא מונח המתאר את מערכת הכללים, הנהלים והתהליכים שלפיהם מנוהלת חברה ומפוקחת. ממשל תאגידי נאות הוא אבן יסוד בפעילותה של כל חברה, בין אם מדובר בחברה פרטית קטנה ובין אם מדובר בחברה ציבורית גדולה.",
      "בישראל, עקרונות הממשל התאגידי מעוגנים בחוק החברות, התשנ״ט-1999, וכן בתקנות, הנחיות רשות ניירות ערך ופסיקת בתי המשפט. המסגרת המשפטית הישראלית מתבססת על שילוב של עקרונות מהמשפט האנגלי והמשפט האמריקאי, תוך התאמה לצרכים ולתנאים המקומיים.",
    ],
    subheadings: [
      {
        title: "חובות הדירקטורים ונושאי המשרה",
        paragraphs: [
          "חוק החברות מטיל על דירקטורים ונושאי משרה בחברה שתי חובות עיקריות: חובת הזהירות וחובת האמונים. חובת הזהירות מחייבת את נושא המשרה לפעול ברמת מיומנות שנושא משרה סביר היה פועל בנסיבות דומות. חובת האמונים מחייבת לפעול בתום לב ולטובת החברה.",
          "הפרת חובות אלו עלולה להוביל לתביעות אישיות כנגד הדירקטורים ונושאי המשרה. לכן, חשוב שכל דירקטור יהיה מודע לחובותיו ויפעל בהתאם להנחיות המשפטיות העדכניות.",
        ],
      },
      {
        title: "הרכב הדירקטוריון",
        paragraphs: [
          "הרכב הדירקטוריון הוא מרכיב מרכזי בממשל תאגידי תקין. דירקטוריון אפקטיבי כולל שילוב של דירקטורים בעלי מומחיות בתחומים שונים, דירקטורים חיצוניים ובלתי תלויים, ודירקטורים המייצגים את בעלי המניות.",
          "חוק החברות קובע כי בחברה ציבורית חייבים לכהן לפחות שני דירקטורים חיצוניים. מטרתם להבטיח פיקוח עצמאי על ניהול החברה ולהגן על האינטרסים של בעלי מניות המיעוט.",
        ],
      },
      {
        title: "שקיפות ודיווח",
        paragraphs: [
          "שקיפות היא עיקרון יסוד בממשל תאגידי. חברות ציבוריות בישראל מחויבות בדיווחים תקופתיים ומיידיים לרשות ניירות ערך ולבורסה. דיווחים אלו כוללים דוחות כספיים, דוחות על ממשל תאגידי, ודיווחים מיידיים על אירועים מהותיים.",
          "גם חברות פרטיות נדרשות לרמת שקיפות מסוימת כלפי בעלי המניות שלהן, בהתאם להוראות חוק החברות ולהסכמים בין בעלי המניות.",
        ],
      },
    ],
  },
  "real-estate-tax-reform": {
    slug: "real-estate-tax-reform",
    title: "רפורמת מיסוי מקרקעין — מה חשוב לדעת",
    date: "2025-11-28",
    author: "עו״ד דנה כהן",
    category: "real-estate",
    categoryLabel: 'נדל"ן',
    excerpt:
      "סקירה מקיפה של השינויים האחרונים בחוק מיסוי מקרקעין וההשלכות שלהם על רוכשי דירות, משקיעים ויזמי נדל״ן.",
    content: [
      "שוק הנדל״ן הישראלי עובר בשנים האחרונות שינויים משמעותיים, הן מבחינת מחירי הנדל״ן והן מבחינת הרגולציה והמיסוי. בין השינויים הבולטים ניתן למנות את העלאת מס הרכישה על דירות להשקעה, שינויים בפטורים ממס שבח, ורפורמות בתחום ההתחדשות העירונית.",
      "במאמר זה נסקור את עיקרי השינויים במיסוי מקרקעין, נבחן את ההשלכות המעשיות על סוגי עסקאות שונים, ונציע כלים מעשיים לתכנון מס נכון.",
    ],
    subheadings: [
      {
        title: "מס רכישה — השינויים העיקריים",
        paragraphs: [
          "מס הרכישה הוא מס המוטל על רוכש מקרקעין בישראל. בשנים האחרונות חלו שינויים משמעותיים במדרגות המס ובשיעוריו, בדגש על הבחנה בין רוכשי דירה יחידה לבין רוכשי דירות להשקעה.",
          "רוכשי דירה יחידה ממשיכים ליהנות ממדרגות מס מופחתות, בעוד שרוכשי דירות נוספות להשקעה נדרשים לשלם מס רכישה בשיעורים גבוהים יותר. שינוי זה נועד לצמצם את הביקוש הספקולטיבי ולייצב את מחירי הדיור.",
        ],
      },
      {
        title: "מס שבח — פטורים והקלות",
        paragraphs: [
          "מס שבח הוא מס המוטל על הרווח ממכירת מקרקעין. החוק מעניק מספר פטורים והקלות ממס שבח, בתנאים מסוימים. ההקלות העיקריות כוללות פטור למוכר דירת מגורים יחידה, פטור חלקי (לינארי) למוכרי דירות ישנות, והקלות בהעברת נכסים בין קרובים.",
          "חשוב להכיר את הפטורים וההקלות הקיימים ולתכנן את עסקת המכירה בהתאם, כדי למזער את חבות המס באופן חוקי.",
        ],
      },
      {
        title: "התחדשות עירונית — היבטי מיסוי",
        paragraphs: [
          "פרויקטים של התחדשות עירונית, לרבות תמ״א 38 ופינוי-בינוי, נהנים מהקלות מס משמעותיות שנועדו לעודד את ביצוע הפרויקטים. הקלות אלו כוללות פטורים ממס שבח, הקלות במס רכישה, ופטורים מהיטל השבחה.",
          "עם זאת, ההקלות מותנות בעמידה בתנאים מסוימים, ויש להיות ערים לפרטים הטכניים כדי לוודא שהעסקה תזכה בהטבות המיסוייות המלאות.",
        ],
      },
    ],
  },
  "class-action-trends": {
    slug: "class-action-trends",
    title: "מגמות בתובענות ייצוגיות — סקירה שנתית",
    date: "2025-10-10",
    author: "עו״ד מיכאל לוי",
    category: "litigation",
    categoryLabel: "ליטיגציה",
    excerpt:
      "סקירה של המגמות העיקריות בתחום התובענות הייצוגיות בישראל בשנה האחרונה.",
    content: [
      "התובענות הייצוגיות הפכו בשני העשורים האחרונים לאחד הכלים המשפטיים המרכזיים להגנה על זכויות הציבור בישראל. חוק תובענות ייצוגיות, התשס״ו-2006, מאפשר לאדם בודד או לארגון לנהל תביעה בשם קבוצה גדולה של אנשים שנפגעו באופן דומה.",
      "בשנה האחרונה חלו התפתחויות משמעותיות בתחום, הן מבחינת הפסיקה והן מבחינת מגמות ההגשה. במאמר זה נסקור את המגמות העיקריות ונבחן את ההשלכות על גופים עסקיים וצרכנים.",
    ],
    subheadings: [
      {
        title: "עלייה בתביעות צרכניות",
        paragraphs: [
          "המגמה הבולטת ביותר בשנה האחרונה היא העלייה המשמעותית במספר התובענות הייצוגיות בתחום הצרכנות. תביעות אלו עוסקות בנושאים כמו פרסום מטעה, גבייה ביתר, הפרת תנאי שירות, והטעיית הצרכן.",
          "בתי המשפט נוטים בשנים האחרונות להרחיב את ההגנה הצרכנית ולאשר תובענות ייצוגיות במקרים של פגיעה בזכויות צרכנים, גם כאשר הנזק לכל צרכן בנפרד הוא קטן יחסית.",
        ],
      },
      {
        title: "פסיקות מרכזיות",
        paragraphs: [
          "בשנה האחרונה ניתנו מספר פסקי דין מרכזיים שעיצבו את הפסיקה בתחום התובענות הייצוגיות. פסקי דין אלו עסקו, בין היתר, בשאלות של סמכות שיפוט, חישוב פיצויים, ואישור הסדרי פשרה.",
          "בית המשפט העליון המשיך לעצב את הדוקטרינה בתחום, תוך איזון בין ההגנה על זכויות הציבור לבין מניעת ניצול לרעה של מכשיר התובענה הייצוגית.",
        ],
      },
      {
        title: "המלצות לגופים עסקיים",
        paragraphs: [
          "לנוכח העלייה במספר התובענות הייצוגיות, מומלץ לגופים עסקיים לנקוט אמצעי מנע. אלו כוללים בחינה מחדש של תנאי השירות, שיפור תהליכי הגילוי לצרכן, והקפדה על עמידה בדרישות הרגולטוריות.",
          "כמו כן, חשוב לגופים עסקיים לגבש מדיניות לטיפול בתלונות לקוחות ולהקים מנגנונים פנימיים ליישוב סכסוכים, כדי למנוע הסלמה לתובענות ייצוגיות.",
        ],
      },
    ],
  },
  "remote-work-legal-aspects": {
    slug: "remote-work-legal-aspects",
    title: "היבטים משפטיים של עבודה מרחוק",
    date: "2025-09-05",
    author: "עו״ד רונית אברהם",
    category: "labor-law",
    categoryLabel: "דיני עבודה",
    excerpt:
      "המעבר לעבודה מרחוק מעלה שאלות משפטיות רבות בתחום דיני העבודה.",
    content: [
      "המעבר המואץ לעבודה מרחוק בשנים האחרונות יצר מציאות חדשה בעולם העבודה. מודל העבודה ההיברידי — שילוב של עבודה מהמשרד ומהבית — הפך לנורמה בארגונים רבים בישראל ובעולם.",
      "מציאות חדשה זו מעלה שאלות משפטיות מגוונות הנוגעות ליחסי עובד-מעסיק, שעות עבודה ומנוחה, בטיחות בעבודה, פרטיות, ועוד. במאמר זה נסקור את ההיבטים המשפטיים המרכזיים שמעסיקים ועובדים צריכים להכיר.",
    ],
    subheadings: [
      {
        title: "שעות עבודה ומנוחה",
        paragraphs: [
          "אחד האתגרים המרכזיים בעבודה מרחוק הוא הפיקוח על שעות העבודה. חוק שעות עבודה ומנוחה חל גם על עובדים מרחוק, אך היישום בפועל הוא מורכב יותר. מעסיקים נדרשים למצוא כלים לתיעוד שעות העבודה תוך שמירה על פרטיות העובד.",
          "בית הדין לעבודה פסק כי עובד מרחוק זכאי לגמול שעות נוספות כמו כל עובד אחר, ומעסיק שלא מנהל רישום שעות עבודה נושא בנטל ההוכחה בתביעות בנושא.",
        ],
      },
      {
        title: "בטיחות בעבודה",
        paragraphs: [
          "חובת המעסיק לספק סביבת עבודה בטוחה חלה גם כאשר העובד עובד מהבית. אמנם, היקף האחריות שונה מעבודה במשרד, אך המעסיק עדיין נדרש לוודא שלעובד תנאי עבודה ארגונומיים מתאימים.",
          "מומלץ למעסיקים לגבש מדיניות ברורה בנושא ציוד עבודה ביתי, כולל שולחן כתיבה, כיסא ארגונומי ומסך מחשב, ולהציע לעובדים הדרכה בנושא ארגונומיה.",
        ],
      },
      {
        title: "פרטיות ומעקב",
        paragraphs: [
          "השימוש בכלי מעקב ופיקוח על עובדים מרחוק מעלה שאלות משפטיות בתחום הפרטיות. חוק הגנת הפרטיות מגביל את יכולת המעסיק לעקוב אחר העובד, ויש לאזן בין הצורך הלגיטימי של המעסיק בפיקוח לבין זכות הפרטיות של העובד.",
          "מומלץ למעסיקים לקבוע מדיניות ברורה בנושא שימוש בכלי מעקב, ליידע את העובדים מראש על כלי המעקב המשמשים, ולהימנע ממעקב חודרני שאינו פרופורציונלי.",
        ],
      },
    ],
  },
  "ai-intellectual-property": {
    slug: "ai-intellectual-property",
    title: "בינה מלאכותית וקניין רוחני — אתגרים חדשים",
    date: "2025-08-20",
    author: "עו״ד אילן שפירא",
    category: "intellectual-property",
    categoryLabel: "קניין רוחני",
    excerpt:
      "ההתפתחויות המהירות בתחום הבינה המלאכותית מעלות שאלות חדשות בתחום הקניין הרוחני.",
    content: [
      "הבינה המלאכותית (AI) היא אחד התחומים הטכנולוגיים המתפתחים ביותר בעשור האחרון. מערכות AI מסוגלות כיום ליצור יצירות אומנות, לחבר טקסטים, להלחין מוזיקה ואף להמציא המצאות — פעולות שעד לא מזמן היו בתחום הבלעדי של בני אדם.",
      "התפתחויות אלו מעלות שאלות משפטיות מורכבות בתחום הקניין הרוחני. מי הוא הבעלים של יצירה שנוצרה על ידי מערכת AI? האם ניתן לרשום פטנט על המצאה שפותחה באמצעות AI? כיצד מגנים על זכויות יוצרים בעידן של יצירות ממוחשבות?",
    ],
    subheadings: [
      {
        title: "בעלות על יצירות שנוצרו על ידי AI",
        paragraphs: [
          "השאלה המרכזית בתחום היא מי הבעלים של יצירה שנוצרה על ידי מערכת AI. על פי הדין הקיים ברוב המדינות, זכויות יוצרים מוענקות ליוצר אנושי. כאשר מערכת AI יוצרת יצירה ללא מעורבות אנושית משמעותית, לא ברור מי הוא בעל הזכויות.",
          "גישות שונות הוצעו לפתרון הסוגיה: ייחוס הזכויות למפתח מערכת ה-AI, ייחוס הזכויות למשתמש שהפעיל את המערכת, או קביעה שיצירות של AI הן נחלת הכלל.",
        ],
      },
      {
        title: "פטנטים על המצאות של AI",
        paragraphs: [
          "סוגיית הפטנטים על המצאות שפותחו על ידי מערכות AI נמצאת במוקד דיון משפטי בינלאומי. בקשות פטנט שבהן נרשמה מערכת AI כ״ממציא״ נדחו ברוב המדינות, לרבות ישראל, בטענה שממציא חייב להיות אדם.",
          "עם זאת, הדיון מתפתח, ויש הטוענים כי יש צורך לעדכן את דיני הפטנטים כדי להתמודד עם המציאות החדשה. בינתיים, המלצתנו היא לציין את האדם שפיתח ותפעל את מערכת ה-AI כממציא.",
        ],
      },
      {
        title: "שימוש ביצירות קיימות לאימון מערכות AI",
        paragraphs: [
          "שאלה נוספת שעולה היא האם שימוש ביצירות מוגנות בזכויות יוצרים לצורך אימון מערכות AI מהווה הפרת זכויות יוצרים. סוגיה זו נמצאת כעת בליבה של מספר תביעות משפטיות בעולם.",
          "בישראל, טרם ניתנה פסיקה מחייבת בנושא, אך ניתן להניח כי בתי המשפט יאזנו בין הצורך לעודד חדשנות טכנולוגית לבין הגנה על זכויות היוצרים. בינתיים, מומלץ לחברות המפתחות מערכות AI לנקוט אמצעי זהירות ולתעד את השימוש ביצירות קיימות.",
        ],
      },
    ],
  },
  "international-tax-planning": {
    slug: "international-tax-planning",
    title: "תכנון מס בינלאומי — עקרונות ואסטרטגיות",
    date: "2025-07-12",
    author: "עו״ד נעמי גולד",
    category: "tax-law",
    categoryLabel: "דיני מסים",
    excerpt:
      "מדריך מקצועי לתכנון מס בינלאומי עבור חברות ישראליות הפועלות בחו״ל ולחברות זרות הפועלות בישראל.",
    content: [
      "בעידן הגלובליזציה, חברות ישראליות רבות פועלות בשווקים בינלאומיים, וחברות זרות רבות מנהלות פעילות בישראל. פעילות חוצת גבולות יוצרת אתגרים ייחודיים בתחום המיסוי, שכן על החברה לעמוד בדרישות המס של מספר מדינות במקביל.",
      "תכנון מס בינלאומי נכון הוא כלי חיוני לכל חברה הפועלת במספר מדינות. תכנון כזה מאפשר למנוע כפל מס, לנצל הטבות הקבועות באמנות מס בינלאומיות, ולבנות מבנה תאגידי יעיל מבחינה מיסויית.",
    ],
    subheadings: [
      {
        title: "אמנות מס בינלאומיות",
        paragraphs: [
          "ישראל חתומה על אמנות למניעת כפל מס עם למעלה מ-50 מדינות. אמנות אלו קובעות כללים לחלוקת זכויות המיסוי בין מדינת המקור למדינת התושבות, ומספקות כלים למניעת כפל מס.",
          "הכרת האמנות הרלוונטיות והשימוש הנכון בהן הם מרכיב חיוני בתכנון מס בינלאומי. אמנות המס קובעות, בין היתר, שיעורי מס מופחתים על דיבידנדים, ריביות ותמלוגים בין חברות במדינות שונות.",
        ],
      },
      {
        title: "מחירי העברה (Transfer Pricing)",
        paragraphs: [
          "מחירי העברה מתייחסים למחירים שבהם נסחרים מוצרים, שירותים ונכסים בלתי מוחשיים בין חברות קשורות במדינות שונות. רשויות המס בכל העולם, לרבות בישראל, דורשות שמחירי ההעברה ישקפו מחירי שוק (עיקרון ה-Arm's Length).",
          "אי-עמידה בכללי מחירי ההעברה עלולה להוביל לקנסות כבדים ולהתאמות מס משמעותיות. לכן, חשוב לתעד את מדיניות מחירי ההעברה ולוודא שהיא עומדת בדרישות הרגולטוריות.",
        ],
      },
      {
        title: "מוסד קבע (Permanent Establishment)",
        paragraphs: [
          "מושג מוסד הקבע הוא מושג יסוד בדיני המס הבינלאומיים. קיומו של מוסד קבע במדינה מסוימת יוצר חבות מס באותה מדינה. הגדרת מוסד קבע כוללת, בדרך כלל, מקום עסקים קבוע שבאמצעותו מנוהלת פעילות החברה.",
          "בעידן הדיגיטלי, שאלת קיומו של מוסד קבע הפכה מורכבת יותר, שכן חברות רבות פועלות במדינות שונות ללא נוכחות פיזית מסורתית. ארגון ה-OECD ומדינות רבות פועלים לעדכן את הכללים בנושא.",
        ],
      },
    ],
  },
};

/* ─── Related Articles Helper ─── */

function getRelatedArticles(currentSlug: string): ArticleData[] {
  return Object.values(ARTICLES_DATA)
    .filter((a) => a.slug !== currentSlug)
    .slice(0, 3);
}

/* ─── CSS Gradient for Article Header ─── */

const HEADER_GRADIENTS: Record<string, string> = {
  "corporate-law": "from-primary via-primary-light to-primary-dark",
  "real-estate": "from-primary-dark via-primary to-accent/40",
  litigation: "from-accent/60 via-primary-light to-primary",
  "labor-law": "from-primary-light via-accent/30 to-primary-dark",
  "intellectual-property": "from-primary via-accent/20 to-primary-light",
  "tax-law": "from-primary-dark via-primary-light to-accent/50",
};

/* ─── Static Params ─── */

export function generateStaticParams() {
  return Object.keys(ARTICLES_DATA).map((slug) => ({ slug }));
}

/* ─── Dynamic Metadata ─── */

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = ARTICLES_DATA[slug];

  if (!article) {
    return { title: "מאמר לא נמצא | זומר - משרד עורכי דין" };
  }

  return {
    title: `${article.title} | מאמרים | זומר - משרד עורכי דין`,
    description: article.excerpt,
  };
}

/* ─── Page Component ─── */

export default async function ArticleDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const article = ARTICLES_DATA[slug];

  if (!article) {
    notFound();
  }

  const relatedArticles = getRelatedArticles(slug);
  const headerGradient =
    HEADER_GRADIENTS[article.category] ?? HEADER_GRADIENTS["corporate-law"];

  return (
    <PublicLayout>
      {/* Breadcrumbs */}
      <nav
        aria-label="מיקום נוכחי"
        className="border-b border-border bg-muted-bg"
      >
        <Container className="py-3">
          <ol
            className="flex flex-wrap items-center gap-2 text-sm"
            role="list"
          >
            <li>
              <Link
                href="/"
                className="text-muted transition-colors duration-200 hover:text-primary"
              >
                ראשי
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronLeft className="h-4 w-4 text-muted" />
            </li>
            <li>
              <Link
                href="/articles"
                className="text-muted transition-colors duration-200 hover:text-primary"
              >
                מאמרים
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronLeft className="h-4 w-4 text-muted" />
            </li>
            <li>
              <span className="font-semibold text-primary-dark" aria-current="page">
                {article.title}
              </span>
            </li>
          </ol>
        </Container>
      </nav>

      {/* Article Header */}
      <header
        className={`bg-gradient-to-br ${headerGradient} py-16 sm:py-24`}
        aria-labelledby="article-heading"
      >
        <Container>
          <div className="max-w-3xl">
            <Badge
              variant="accent"
              className="mb-4 text-sm"
            >
              {article.categoryLabel}
            </Badge>

            <h1
              id="article-heading"
              className="text-3xl font-bold leading-snug tracking-tight text-white sm:text-4xl lg:text-5xl"
            >
              {article.title}
            </h1>

            <div className="mt-6 flex flex-wrap items-center gap-6 text-white/80">
              <span className="inline-flex items-center gap-2">
                <User className="h-4 w-4" aria-hidden="true" />
                <span>{article.author}</span>
              </span>
              <span className="inline-flex items-center gap-2">
                <Calendar className="h-4 w-4" aria-hidden="true" />
                <time dateTime={article.date}>
                  {formatDate(article.date)}
                </time>
              </span>
            </div>
          </div>
        </Container>
      </header>

      {/* Article Body + Sidebar */}
      <section className="bg-background py-16 sm:py-24">
        <Container>
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
            {/* Article Body */}
            <article className="lg:col-span-2">
              <div className="prose-rtl">
                {article.content.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}

                {article.subheadings.map((section, sIndex) => (
                  <div key={sIndex}>
                    <h2>{section.title}</h2>
                    {section.paragraphs.map((paragraph, pIndex) => (
                      <p key={pIndex}>{paragraph}</p>
                    ))}
                  </div>
                ))}

                <hr className="my-10 border-border" />

                <p className="text-sm text-muted">
                  <strong className="text-primary-dark">הערה:</strong> מאמר זה
                  מהווה מידע כללי בלבד ואינו מהווה ייעוץ משפטי. לקבלת ייעוץ
                  משפטי מותאם לנסיבות הספציפיות שלכם, אנא{" "}
                  <Link
                    href="/contact"
                    className="font-semibold text-primary underline underline-offset-2 hover:text-accent"
                  >
                    צרו קשר עם המשרד
                  </Link>
                  .
                </p>
              </div>
            </article>

            {/* Sidebar */}
            <aside aria-label="מאמרים נוספים" className="space-y-8">
              {/* Author Card */}
              <Card>
                <CardContent className="p-6">
                  <div
                    className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10"
                    aria-hidden="true"
                  >
                    <User className="h-7 w-7 text-primary" />
                  </div>
                  <h2 className="text-lg font-bold text-primary-dark">
                    {article.author}
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    עורך דין במשרד זומר, מתמחה ב{article.categoryLabel}.
                  </p>
                </CardContent>
              </Card>

              {/* Related Articles */}
              <div>
                <h2 className="mb-4 text-lg font-bold text-primary-dark">
                  מאמרים נוספים
                </h2>
                <ul role="list" className="space-y-4">
                  {relatedArticles.map((related) => (
                    <li key={related.slug}>
                      <Link
                        href={`/articles/${related.slug}`}
                        className="group block rounded-lg border border-border bg-card p-4 transition-all duration-200 hover:border-accent/30 hover:shadow-sm focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2"
                      >
                        <Badge variant="accent" className="mb-2 text-xs">
                          {related.categoryLabel}
                        </Badge>
                        <CardTitle className="text-base group-hover:text-accent transition-colors duration-200">
                          {related.title}
                        </CardTitle>
                        <span className="mt-2 inline-flex items-center gap-1 text-xs text-muted">
                          <Calendar
                            className="h-3 w-3"
                            aria-hidden="true"
                          />
                          <time dateTime={related.date}>
                            {formatDate(related.date)}
                          </time>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA */}
              <Card className="border-accent/30 bg-primary text-white">
                <CardContent className="p-6 text-center">
                  <h2 className="text-xl font-bold text-white">
                    זקוקים לייעוץ משפטי?
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-white/80">
                    צוות המשרד ישמח לסייע לכם בכל שאלה משפטית.
                  </p>
                  <Link
                    href="/contact"
                    className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-accent px-6 py-3 text-base font-bold text-primary-dark transition-colors duration-200 hover:bg-accent-light focus-visible:outline-3 focus-visible:outline-white focus-visible:outline-offset-2"
                  >
                    צרו קשר
                  </Link>
                </CardContent>
              </Card>
            </aside>
          </div>
        </Container>
      </section>

      {/* More Articles Section */}
      <section
        className="bg-muted-bg py-16"
        aria-labelledby="more-articles-heading"
      >
        <Container>
          <h2
            id="more-articles-heading"
            className="mb-8 text-center text-2xl font-bold text-primary-dark sm:text-3xl"
          >
            עוד מאמרים שעשויים לעניין אותך
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {relatedArticles.map((related) => (
              <Link
                key={related.slug}
                href={`/articles/${related.slug}`}
                className="group block focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-xl"
                aria-label={`${related.title} — קרא עוד`}
              >
                <Card className="flex h-full flex-col hover:shadow-md hover:shadow-primary/10 transition-shadow duration-200">
                  <CardHeader>
                    <Badge variant="accent" className="w-fit">
                      {related.categoryLabel}
                    </Badge>
                    <CardTitle className="mt-2 group-hover:text-accent transition-colors duration-200">
                      {related.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <p className="text-sm leading-relaxed text-muted line-clamp-3">
                      {related.excerpt}
                    </p>
                  </CardContent>
                  <CardFooter>
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:text-accent transition-colors duration-200">
                      קרא עוד
                      <ArrowLeft
                        className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1"
                        aria-hidden="true"
                      />
                    </span>
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        </Container>
      </section>
    </PublicLayout>
  );
}
