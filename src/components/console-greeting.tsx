"use client";

import { useEffect } from "react";

// A friendly nod for anyone who opens DevTools. Runs once per page load,
// uses %c styling so the message looks like a card rather than a wall of
// text. No surveillance, no analytics — just a hello and a way to reach
// the lawyer behind the site.

const TITLE = "שלום 👋";

const BODY =
  "נחמד שפתחת את ה-DevTools. האתר בנוי ב-Next.js + TypeScript + Prisma,\n" +
  "כולל אינדקס סמנטי על מדריך חופש המידע ושרת MCP שמאפשר ל-Claude\n" +
  "ול-ChatGPT לחפש בו ישירות.\n\n" +
  "אם משהו כאן מעניין אותך — בעבודה, ביצירת קשר או בשיתוף פעולה —\n" +
  "אני זמין כאן:";

const EMAIL = "Guy@z-g.co.il";

const STYLE_TITLE =
  "font-size: 22px; font-weight: 700; color: #1a4d8f; padding: 8px 0;";
const STYLE_BODY =
  "font-size: 13px; line-height: 1.7; color: #555; padding: 4px 0;";
const STYLE_EMAIL =
  "font-size: 14px; font-weight: 600; color: #1a4d8f; padding: 4px 0 12px 0;";

export default function ConsoleGreeting() {
  useEffect(() => {
    // Guard: only run in browsers that support styled console output, and
    // only once per page load even if React re-mounts the component in dev.
    if (typeof window === "undefined") return;
    const w = window as unknown as { __zgGreeted?: boolean };
    if (w.__zgGreeted) return;
    w.__zgGreeted = true;

    try {
      console.log("%c" + TITLE, STYLE_TITLE);
      console.log("%c" + BODY, STYLE_BODY);
      console.log("%c" + EMAIL, STYLE_EMAIL);
    } catch {
      // Old browser or sandboxed console — ignore.
    }
  }, []);

  return null;
}
