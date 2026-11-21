import type { Metadata } from "next";
import {
  StaticPolicyShell,
  PolicyHeading,
  PolicyList,
  Ltr,
} from "@/components/extension-pages/static-policy-shell";
import { ContactEmail } from "./contact";

// The policy text is fixed here (not in the Page table) because it is the
// text submitted with the Chrome Web Store listing. Change it only together
// with the English page at ./en/page.tsx.

export const metadata: Metadata = {
  title: "מדיניות פרטיות: תוסף הדפדפן Magna Clipper",
  description:
    "מדיניות הפרטיות של תוסף הדפדפן Magna Clipper: מה התוסף שולח, לאן, מה נשמר בדפדפן ומה לא נאסף.",
  alternates: {
    canonical: "/magna-clipper/privacy",
    languages: {
      he: "/magna-clipper/privacy",
      en: "/magna-clipper/privacy/en",
    },
  },
  robots: { index: true, follow: true },
};

const MAGNA = "https://www.magna.isa.gov.il";

export default function MagnaClipperPrivacyPage() {
  return (
    <StaticPolicyShell
      lang="he"
      title="מדיניות פרטיות: תוסף הדפדפן Magna Clipper"
      updated="עודכן: 21.11.2026"
      otherLanguage={{ href: "/magna-clipper/privacy/en", label: "English", lang: "en" }}
    >
      <p>
        {`Magna Clipper הוא תוסף דפדפן שמוסיף לאתר מגנא של רשות ניירות ערך (`}
        <a href={MAGNA} dir="ltr" lang="en">
          www.magna.isa.gov.il
        </a>
        {`) כפתור "שליחה לארכיון". לחיצה עליו שולחת את הדיווח או את תוצאות החיפוש שעל המסך לכלי הארכיון שהמשתמש קיבל אליו גישה. התוסף פועל רק באתר מגנא.`}
      </p>

      <PolicyHeading>מה התוסף שולח, ומתי</PolicyHeading>
      <p>רק כשהמשתמש לוחץ על הכפתור, ורק את מה שמוצג לו באותו דף של מגנא:</p>
      <PolicyList>
        <li>
          בדף דיווח: תוכן הדף (<Ltr>HTML</Ltr>) ומספר האסמכתא שלו.
        </li>
        <li>
          בתוצאות חיפוש: שורות התוצאות שמגנא הציגה (אסמכתא, תאריך, טופס, שם המדווח, נושא
          וקישורים לקבצים).
        </li>
        <li>
          בדף של ישות מדווחת: פרטי הישות ורשימת הדיווחים האחרונים שלה, כפי שמגנא הציגה אותם.
        </li>
      </PolicyList>
      <p>
        כל אלה דיווחים ציבוריים שמגנא מפרסמת. התוסף לא שולח שום דבר בלי לחיצה, לא אוסף מידע
        מאתרים אחרים, ולא שולח בקשות למגנא בעצמו.
      </p>

      <PolicyHeading>לאן זה נשלח</PolicyHeading>
      <p>
        רק לכלי הארכיון שכתובתו מוגדרת בתוסף (<Ltr>https://ben-naftali-zomerg.xhostd.app</Ltr>),
        עם טוקן הגישה של המשתמש. המידע לא נמכר, לא מועבר לצד שלישי, ולא משמש לפרסום או לדירוג
        אשראי. בכלי, כל שליחה נרשמת ביומן הפעילות (מי, מתי, מה).
      </p>

      <PolicyHeading>מה נשמר בדפדפן</PolicyHeading>
      <p>
        {`שני ערכים בלבד, באחסון המקומי של התוסף (`}
        <Ltr>chrome.storage.local</Ltr>
        {`) במחשב של המשתמש: כתובת הכלי, וטוקן גישה שמנהל הכלי הנפיק למשתמש. הטוקן נשלח רק לכלי הזה, ומאפשר רק לשלוח אליו דיווחים ממגנא; הוא לא מאפשר לקרוא שום מידע מהכלי. למחיקה: "מחיקת הטוקן" בדף ההגדרות של התוסף, או הסרת התוסף.`}
      </p>

      <PolicyHeading>מה התוסף לא אוסף</PolicyHeading>
      <PolicyList>
        <li>היסטוריית גלישה, כתובות של דפים שלא לחצתם בהם, או דפים באתרים אחרים;</li>
        <li>פרטים אישיים, סיסמאות, עוגיות או פרטי תשלום;</li>
        <li>נתוני שימוש, אנליטיקה או מעקב מכל סוג;</li>
        <li>
          אסימוני <Ltr>reCAPTCHA</Ltr> או כל חלק אחר מהבקשות שהאתר של מגנא שולח.
        </li>
      </PolicyList>

      <PolicyHeading>הרשאות</PolicyHeading>
      <PolicyList>
        <li>
          <Ltr>storage</Ltr>: שמירת כתובת הכלי והטוקן.
        </li>
        <li>
          {"גישה ל-"}
          <a href={MAGNA} dir="ltr" lang="en">
            www.magna.isa.gov.il
          </a>
          : הצגת הכפתור וקריאת הדיווח שעל המסך.
        </li>
        <li>גישה לכתובת הכלי: שליחת מה שהמשתמש לחץ לשלוח.</li>
      </PolicyList>

      <PolicyHeading>פניות</PolicyHeading>
      <p>
        לשאלות בנושא התוסף או הפרטיות: <ContactEmail />
      </p>
    </StaticPolicyShell>
  );
}
