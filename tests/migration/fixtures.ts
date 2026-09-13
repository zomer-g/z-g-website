/**
 * What the migration suite looks at. Kept apart from the runner so the lists
 * can change without touching the logic in run.ts.
 */
import type { BurstDef, PerfTargetDef, RateRule } from "./lib";

/**
 * The app's own per-IP limits (rateLimit(...) calls under src/app/api). The
 * runner paces itself below these so a check never trips a 429 and reads as
 * a break.
 */
export const RATE_RULES: RateRule[] = [
  { path: "/api/guidelines/search", key: "guidelines-search", limit: 30, windowMs: 60_000 },
  { path: "/api/guidelines/documents", key: "guidelines-documents", limit: 30, windowMs: 60_000 },
  { path: "/api/rulings", key: "rulings", limit: 30, windowMs: 60_000 },
  { path: "/api/comptroller-reports/documents", key: "comptroller-documents", limit: 30, windowMs: 60_000 },
  { path: "/api/mmm/documents", key: "mmm-documents", limit: 30, windowMs: 60_000 },
  { path: "/api/class-actions/documents", key: "class-actions-documents", limit: 30, windowMs: 60_000 },
  { path: "/api/sanegoria", key: "sanegoria", limit: 30, windowMs: 60_000 },
  { path: "/api/pach-hamishpat/status", key: "pach-status", limit: 120, windowMs: 60_000 },
  { path: "/api/pach-hamishpat/reports", key: "pach-reports", limit: 10, windowMs: 60_000 },
  { path: "/api/submissions", key: "submissions", limit: 5, windowMs: 60_000 },
];

/**
 * Files written to the Render persistent disk at runtime (admin media, post
 * attachments). They exist nowhere else — not in git, not in the DB — so they
 * are the files the move must carry over by hand. Taken from a scan of every
 * text/json column for /uploads/ references on 2026-09-12.
 */
export const RUNTIME_UPLOADS = [
  "1784648632918-dec1933-2016.pdf",
  "1784648640701-דוח_הצוות_הבין_משרדי.pdf",
  "1784649022270-dec1933-2016.pdf",
  "1784649034817-דוח_הצוות_הבין_משרדי.pdf",
];

/**
 * Runtime uploads the DB still references (Media.url, and the first one also
 * pach_system_messages.image_url) that were already 404 on Render on
 * 2026-09-12: written before the persistent disk existed and wiped by a
 * deploy. Checked as 404 so the baseline is green; any other answer after the
 * move shows up as a change.
 */
export const LOST_UPLOADS = [
  "1778609221905-WhatsApp_Image_2026-05-12_at_14_15_12.jpeg",
  "1780654807116-Screenshot_2026-06-05_131909.png",
  "1784572831623-dec1933-2016.pdf",
  "1784572839766-RecommendationsReportOnDataFlowImprovement160728_c.pdf",
  "1784647191242-Doch.pdf",
];

/**
 * Pages that do not answer 200 on Render (2026-09-12). sitemap.xml lists the
 * first four anyway — /mmm, /ocal and /ocoi-extension are unpublished and
 * /foi-rulings redirects — a sitemap defect of its own. The move has to keep
 * these exactly as they are.
 */
export const KNOWN_PAGE_STATUS: Record<string, number[]> = {
  "/foi-rulings": [307],
  "/mmm": [404],
  "/ocal": [404],
  "/ocoi-extension": [404],
  "/foi-guide": [404],
};

/** Git-committed uploads (public/uploads + public/seed-uploads); the first must be an image. */
export const SEED_UPLOAD_SAMPLES = [
  "media-thumb-cmn1dg5mg0000d89o8gg0zeyk.png",
  "br-letter-01-warning-2026-08-09.pdf",
  "br-ruling-ca-360-83-strosky-whitman.pdf",
];

/** Pages checked on top of whatever sitemap.xml lists. A redirect is accepted; its target is fingerprinted. */
export const EXTRA_PAGES = [
  "/about",
  "/accessibility",
  "/case-tracker",
  "/class-actions",
  "/comptroller-reports",
  "/conditional-arrangements",
  "/contact",
  "/court-downloader",
  "/data-pipeline",
  "/defamation-rulings",
  "/dictionary",
  "/digital-services",
  "/drug-sentencing",
  "/foi-costs",
  "/foi-guide",
  "/foi-judgments",
  "/foi-rulings",
  "/govscraper",
  "/guidelines",
  "/haplilist",
  "/legal-tools",
  "/letz",
  "/media",
  "/mmm",
  "/o",
  "/ocal",
  "/ocoi-extension",
  "/over-looker",
  "/pach-hamishpat",
  "/pach-hamishpat/personal-area",
  "/privacy",
  "/projects",
  "/rulings",
  "/sanegoria",
  "/services",
  "/terms",
  "/timeline",
  "/whatsapp",
  "/workflows",
];

// The two queries the guidelines feature is always smoke-tested with: a bare
// Hebrew word (substring path) and a quoted phrase (phrase path).
export const GUIDELINES_BARE_QUERY = `/api/guidelines/search?q=${encodeURIComponent("הפגנה")}&limit=1`;
export const GUIDELINES_PHRASE_QUERY = `/api/guidelines/search?q=${encodeURIComponent('"מצלמות גוף"')}&limit=1`;

/** Timed targets. Default rounds come from --rounds; slow endpoints get fewer. */
export const PERF_TARGETS: PerfTargetDef[] = [
  { id: "page:/", path: "/" },
  { id: "page:/guidelines", path: "/guidelines" },
  { id: "page:/defamation-rulings", path: "/defamation-rulings" },
  { id: "page:/sanegoria", path: "/sanegoria" },
  { id: "page:/dictionary", path: "/dictionary" },
  { id: "page:/haplilist/<post>", path: "/haplilist/not-just-another-case-law-database" },
  { id: "page:/articles/<article>", path: "/articles/conditional-arrangement-guide" },
  { id: "page:/guidelines/<id>", path: (d) => (d.guidelineId ? `/guidelines/${d.guidelineId}` : null) },
  { id: "api:pages", path: "/api/pages" },
  { id: "api:posts", path: "/api/posts" },
  { id: "api:plilist", path: "/api/plilist" },
  { id: "api:pach-status", path: "/api/pach-hamishpat/status" },
  { id: "api:guidelines-documents", path: "/api/guidelines/documents?limit=20&skip=0" },
  { id: "api:guidelines-search-bare", path: GUIDELINES_BARE_QUERY, rounds: 3 },
  { id: "api:guidelines-search-phrase", path: GUIDELINES_PHRASE_QUERY, rounds: 3 },
  { id: "api:rulings-defamation", path: "/api/rulings?category=defamation&page=1", rounds: 3 },
  { id: "api:rulings-drug-sentencing", path: "/api/rulings?category=drug-sentencing&page=1", rounds: 3 },
  { id: "api:comptroller-reports", path: "/api/comptroller-reports/documents?limit=12&skip=0", rounds: 3 },
  { id: "api:mmm", path: "/api/mmm/documents?limit=12&skip=0", rounds: 3 },
  { id: "api:class-actions", path: "/api/class-actions/documents?limit=20&skip=0", rounds: 3 },
  { id: "api:ca-records", path: "/api/conditional-arrangements/records?limit=20&skip=0" },
  { id: "api:ca-facets", path: "/api/conditional-arrangements/facets", rounds: 2 },
  { id: "api:sanegoria-filters", path: "/api/sanegoria?filters=1", rounds: 3 },
  { id: "api:sanegoria-dashboard", path: "/api/sanegoria?page=1", rounds: 2 },
  { id: "asset:next-static-js", path: (d) => d.staticAsset ?? null },
  { id: "asset:og-image", path: "/opengraph-image", rounds: 3 },
  { id: "asset:largest-upload", path: (d) => d.largestUpload?.path ?? null, rounds: 3, follow: true },
];

/** Parallel bursts — how the instance holds up when requests overlap. */
export const BURSTS: BurstDef[] = [
  { id: "burst:/", path: "/", parallel: 10, bursts: 3 },
  { id: "burst:api-posts", path: "/api/posts", parallel: 10, bursts: 3 },
];
