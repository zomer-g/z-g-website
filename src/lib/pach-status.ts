/**
 * The one definition of "is נט המשפט up right now".
 *
 * This used to live only inside the client dashboard, which meant the server
 * had no way to know the status and rendered the page with an empty report
 * list — and an empty list computes to "green". So every first paint, and
 * every copy of the HTML Google indexed, said המערכת תקינה regardless of what
 * was actually happening. A status page that is wrong until JavaScript
 * finishes loading is worse than no status page.
 *
 * Both sides now import from here, so there is nothing to keep in sync.
 */

export type PachStatus = "green" | "orange" | "red";

export const PACH_STATUS_TEXT: Record<PachStatus, string> = {
  green: "המערכת תקינה",
  orange: "תקלה חלקית במערכת",
  red: "המערכת קרסה",
};

/** What a searcher typing "נט המשפט לא עובד" needs to read, in one line. */
export const PACH_STATUS_ANSWER: Record<PachStatus, string> = {
  green: "נכון לעכשיו נט המשפט פועל כרגיל — לא התקבלו דיווחי תקלה פעילים.",
  orange:
    "נכון לעכשיו מדווחת תקלה חלקית בנט המשפט — חלק מהפעולות אינן זמינות.",
  red: "נכון לעכשיו מדווחת השבתה של נט המשפט — לא ניתן לגשת למערכת.",
};

/** The subset of a report that the decision actually depends on. */
export interface PachStatusInput {
  status: string;
  expires_at: string | null;
  is_scheduled: boolean;
  scheduled_from: string | null;
  scheduled_until: string | null;
}

/**
 * The database column is a plain String with a "green" default, so anything
 * that is not a recognised outage level is treated as "no outage" rather than
 * rendering a banner with no text.
 */
export function toPachStatus(s: string): PachStatus {
  return s === "red" || s === "orange" ? s : "green";
}

/**
 * Walks the visible report list newest-first and picks the first one that is
 * actually in effect right now. Ported unchanged from the standalone
 * pah.org.il Home.jsx — a scheduled window only counts inside its window, an
 * unscheduled outage only counts until it expires, and the newest green wins
 * immediately because a human said "it's back".
 */
export function computePachStatus(reports: PachStatusInput[], nowMs = Date.now()): PachStatus {
  for (const r of reports) {
    if (r.is_scheduled) {
      const from = r.scheduled_from ? new Date(r.scheduled_from).getTime() : null;
      const until = r.scheduled_until ? new Date(r.scheduled_until).getTime() : null;
      if (from != null && until != null && nowMs >= from && nowMs <= until) {
        return toPachStatus(r.status);
      }
      continue;
    }
    if (r.status === "green") return "green";
    if (r.status === "red" || r.status === "orange") {
      if (!r.expires_at || new Date(r.expires_at).getTime() > nowMs) {
        return toPachStatus(r.status);
      }
    }
  }
  return "green";
}
