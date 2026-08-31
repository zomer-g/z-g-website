import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PACH_STATUS_ANSWER,
  PACH_STATUS_TEXT,
  resolvePachStatus,
} from "@/lib/pach-status";
import {
  PACH_CACHE_CONTROL,
  PACH_CORS_HEADERS,
  PACH_DISCLAIMER,
  PACH_FEED_URL,
  PACH_PAGE_URL,
  commentToJson,
  pachCorsPreflight,
  reportToJson,
} from "@/lib/pach-public";

/**
 * GET /api/pach-hamishpat/status — "is נט המשפט up right now", for machines.
 *
 * The board already answers this question for a human with a browser. This
 * answers it for everything else: a firm's intranet dashboard, a Slack bot, a
 * `curl` in a shell script deciding whether to retry a filing. It is a single
 * endpoint with no parameters to get wrong, because the whole value is that
 * someone can wire it up in one line and forget about it.
 *
 * The answer is computed by the same `resolvePachStatus` the page renders
 * from, over the same non-hidden rows, so the API and the page cannot drift.
 * Moderated (hidden) reports are excluded here with no way to ask for them —
 * unlike `/reports`, this endpoint has no admin mode at all.
 *
 * `?format=text` returns the bare token (`green` / `orange` / `red`) with no
 * punctuation or newline noise, for the shell case:
 *
 *     [ "$(curl -s .../status?format=text)" = "red" ] && echo "נט המשפט מושבת"
 */

export const dynamic = "force-dynamic";

// A monitor polling every 10s is a legitimate caller and must not be throttled
// into uselessness; this ceiling only stops someone hammering the database in
// a tight loop. Reads are three indexed SELECTs and the response is cacheable,
// so the real cost of a well-behaved poller is near zero.
const RATE_LIMIT = { limit: 120, windowMs: 60_000 };

// Enough history for the recent-activity counters without ever paging: the
// board itself only ever renders a few hundred rows.
const WINDOW_ROWS = 500;

export async function OPTIONS() {
  return pachCorsPreflight();
}

export async function GET(req: NextRequest) {
  const { rateLimit, getClientIp } = await import("@/lib/rate-limit");
  const limited = rateLimit(`pach-status:${getClientIp(req)}`, RATE_LIMIT);
  if (limited) {
    // The limiter builds a plain JSON 429; it still has to be readable
    // cross-origin or a browser caller sees an opaque network error instead of
    // "you are polling too fast".
    for (const [k, v] of Object.entries(PACH_CORS_HEADERS)) {
      limited.headers.set(k, v);
    }
    return limited;
  }

  const wantsText = req.nextUrl.searchParams.get("format") === "text";
  const now = new Date();
  const nowMs = now.getTime();

  try {
    const [reportRows, commentRows] = await Promise.all([
      prisma.pachReport.findMany({
        where: { isHidden: false },
        orderBy: { createdDate: "desc" },
        take: WINDOW_ROWS,
      }),
      prisma.pachComment.findMany({
        where: { isHidden: false },
        orderBy: { createdDate: "desc" },
        take: WINDOW_ROWS,
      }),
    ]);

    const reports = reportRows.map(reportToJson);
    const comments = commentRows.map(commentToJson);
    const { status, report: activeReport } = resolvePachStatus(reports, nowMs);

    if (wantsText) {
      return new NextResponse(status, {
        headers: {
          ...PACH_CORS_HEADERS,
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": PACH_CACHE_CONTROL,
        },
      });
    }

    const since = (ms: number) => (iso: string) =>
      new Date(iso).getTime() >= nowMs - ms;
    const HOUR = 60 * 60_000;
    const DAY = 24 * HOUR;

    const outageReports = reports.filter(
      (r) => r.status === "red" || r.status === "orange",
    );

    // Windows that have not started yet. A caller planning around a filing
    // deadline cares about announced downtime as much as current downtime, and
    // the deciding-report field can only ever describe right now.
    const upcoming = reports
      .filter(
        (r) =>
          r.is_scheduled &&
          r.scheduled_from !== null &&
          new Date(r.scheduled_from).getTime() > nowMs,
      )
      .sort(
        (a, b) =>
          new Date(a.scheduled_from!).getTime() -
          new Date(b.scheduled_from!).getTime(),
      );

    const body = {
      status,
      status_text: PACH_STATUS_TEXT[status],
      answer: PACH_STATUS_ANSWER[status],
      // The one field a naive integration will branch on. Spelled out so
      // nobody has to hardcode a list of the colours that mean "fine".
      is_operational: status === "green",
      checked_at: now.toISOString(),

      // Why the board says what it says. Null means nothing is in effect and
      // green is the default, not that a human declared it green.
      active_report: activeReport,

      reports: {
        outages_last_hour: outageReports.filter((r) =>
          since(HOUR)(r.created_date),
        ).length,
        outages_last_24h: outageReports.filter((r) => since(DAY)(r.created_date))
          .length,
        last_report_at: reports[0]?.created_date ?? null,
      },
      comments: {
        last_24h: comments.filter((c) => since(DAY)(c.created_date)).length,
        last_comment_at: comments[0]?.created_date ?? null,
      },

      scheduled_maintenance: upcoming,

      source: {
        name: "פח המשפט",
        page: PACH_PAGE_URL,
        feed: PACH_FEED_URL,
        disclaimer: PACH_DISCLAIMER,
      },
    };

    return NextResponse.json(body, {
      headers: { ...PACH_CORS_HEADERS, "Cache-Control": PACH_CACHE_CONTROL },
    });
  } catch (e) {
    console.error("GET /api/pach-hamishpat/status", e);
    // A status endpoint that goes silent during an incident is worse than one
    // that admits it cannot tell. Say "unknown" explicitly rather than letting
    // a caller read a failure as "up".
    if (wantsText) {
      return new NextResponse("unknown", {
        status: 503,
        headers: {
          ...PACH_CORS_HEADERS,
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }
    return NextResponse.json(
      {
        status: "unknown",
        error: "שגיאה בטעינת הסטטוס",
        checked_at: now.toISOString(),
      },
      {
        status: 503,
        headers: { ...PACH_CORS_HEADERS, "Cache-Control": "no-store" },
      },
    );
  }
}
