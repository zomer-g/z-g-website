/**
 * Render → xhostd migration check: a sanity pass and a performance pass over
 * the live site. Run the SAME command before and after the move, then diff
 * the two result files with compare.ts.
 *
 *   npm run test:migration -- --base https://www.z-g.co.il --label t0-render
 *   npm run test:migration -- --base https://z-g-website-zomerg.xhostd.app \
 *       --public-origin https://www.z-g.co.il --label t1-xhostd-staging
 *   npm run test:migration:compare -- tests/migration/results/t0-render.json \
 *       tests/migration/results/t2-xhostd.json
 *
 * Options:
 *   --base URL            origin to test (required)
 *   --label NAME          result file name (required)
 *   --public-origin URL   origin the app believes it lives at (default: --base);
 *                         OAuth callback and issuer checks assert against it
 *   --rounds N            warm rounds per perf target (default 5)
 *   --skip-perf           sanity only
 *   --out DIR             results directory (default tests/migration/results)
 *
 * Read-only against production: GETs only — no form posts, no admin writes.
 * The pacer keeps every rate-limited route under its per-IP budget, so a 429
 * never shows up as a false break.
 *
 * Perf is measured from wherever this runs, so compare runs taken from the
 * same machine and network. "first" is the first timed hit after the sanity
 * pass already touched the route once — the same state in every run.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { lookup } from "node:dns/promises";
import path from "node:path";
import {
  type BurstRecord,
  type CheckDef,
  type Ctx,
  type Discovered,
  type HttpResult,
  type HttpRun,
  type Outcome,
  type PerfRecord,
  type SanityRecord,
  RatePacer,
  countStatuses,
  parseArgs,
  pool,
  round,
  sha256,
  sleep,
  slim,
  summarize,
  timedFetch,
} from "./lib";
import {
  BURSTS,
  EXTRA_PAGES,
  GUIDELINES_BARE_QUERY,
  GUIDELINES_PHRASE_QUERY,
  KNOWN_PAGE_STATUS,
  LOST_UPLOADS,
  PERF_TARGETS,
  RATE_RULES,
  RUNTIME_UPLOADS,
  SEED_UPLOAD_SAMPLES,
} from "./fixtures";

const SECURITY_HEADERS = [
  "strict-transport-security",
  "content-security-policy",
  "x-frame-options",
  "x-content-type-options",
  "referrer-policy",
];

const REDIRECTS = [301, 302, 303, 307, 308];

// TAG-IT-backed routes can be slow on a cold scope; give them room and retries.
const SLOW_UPSTREAM = { retries: 2, timeoutMs: 120_000 };

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

const text = (r: HttpResult): string => (r.body ? r.body.toString("utf8") : "");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const json = (r: HttpResult): any => JSON.parse(text(r));

function positive(label: string, n: unknown): Outcome {
  return typeof n === "number" && n > 0
    ? { ok: true, detail: `${label}=${n}`, fingerprint: n }
    : { ok: false, detail: `${label} is not a positive number (${JSON.stringify(n)})` };
}

function htmlPage(r: HttpResult): Outcome {
  const body = text(r);
  if (!/<html[^>]*\blang="he"/i.test(body)) {
    return { ok: false, detail: 'not the site shell: <html lang="he"> missing' };
  }
  if (body.includes("Application error: a server-side exception has occurred")) {
    return { ok: false, detail: "Next.js server-side exception page" };
  }
  const title = (/<title[^>]*>([^<]*)<\/title>/i.exec(body)?.[1] ?? "").trim();
  return { ok: true, detail: title.slice(0, 90) || "(no title)", fingerprint: title };
}

/** Strip the target's own origin and the public origin so redirects compare equal across hosts. */
function normalizeLocation(loc: string, ctx: Ctx): string {
  for (const origin of [ctx.base, ctx.publicOrigin]) {
    if (loc.startsWith(origin)) return loc.slice(origin.length) || "/";
  }
  return loc;
}

function redirectOrPage(r: HttpResult, ctx: Ctx): Outcome {
  if (r.status !== null && REDIRECTS.includes(r.status)) {
    const loc = normalizeLocation(r.headers["location"] ?? "", ctx);
    return { ok: loc !== "", detail: `→ ${loc}`, fingerprint: `${r.status} ${loc.split("?")[0]}` };
  }
  return htmlPage(r);
}

const locsOf = (xml: string): string[] => [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);

function pathOf(u: string): string {
  try {
    const x = new URL(u);
    return x.pathname + x.search;
  } catch {
    return u;
  }
}

function contentTypeFor(file: string): RegExp {
  if (/\.pdf$/i.test(file)) return /application\/pdf/;
  if (/\.png$/i.test(file)) return /image\/png/;
  if (/\.jpe?g$/i.test(file)) return /image\/jpeg/;
  return /./;
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

function infraChecks(): CheckDef[] {
  return [
    {
      id: "home",
      group: "infra",
      target: "/",
      contentType: /text\/html/,
      validate: (r, d) => {
        const asset = /\/_next\/static\/[^"'\s]+?\.js/.exec(text(r))?.[0];
        if (asset) d.staticAsset = asset;
        return htmlPage(r);
      },
    },
    {
      id: "security-headers",
      group: "infra",
      target: "/",
      validate: (r) => {
        const missing = SECURITY_HEADERS.filter((h) => !r.headers[h]);
        const signature = sha256(SECURITY_HEADERS.map((h) => `${h}: ${r.headers[h] ?? ""}`).join("\n")).slice(0, 16);
        return missing.length
          ? { ok: false, detail: `missing: ${missing.join(", ")}`, fingerprint: signature }
          : { ok: true, detail: "all present", fingerprint: signature };
      },
    },
    {
      id: "static-asset",
      group: "infra",
      target: (d) => d.staticAsset ?? null,
      contentType: /javascript/,
      validate: (r) => {
        const cc = r.headers["cache-control"] ?? "";
        return /immutable/.test(cc)
          ? { ok: true, detail: cc }
          : { ok: false, detail: `cache-control is not immutable: "${cc}"` };
      },
    },
    { id: "not-found", group: "infra", target: "/__migration-probe-not-found", expect: [404], contentType: /text\/html/ },
    {
      id: "robots",
      group: "infra",
      target: "/robots.txt",
      contentType: /text\/plain/,
      validate: (r, d) => {
        const body = text(r);
        const maps = [...body.matchAll(/^Sitemap:\s*(\S+)/gim)].map((m) => m[1]);
        d.sitemaps = maps.map(pathOf);
        return maps.length
          ? { ok: true, detail: `${maps.length} sitemap(s)`, fingerprint: sha256(body).slice(0, 16) }
          : { ok: false, detail: "no Sitemap: lines" };
      },
    },
    {
      id: "sitemap",
      group: "infra",
      target: "/sitemap.xml",
      contentType: /xml/,
      validate: (r, d) => {
        const locs = locsOf(text(r));
        d.sitemapPaths = locs.map(pathOf);
        return positive("urls", locs.length);
      },
    },
    {
      id: "sitemap-docs",
      group: "infra",
      target: (d) => d.sitemaps.find((p) => p !== "/sitemap.xml") ?? null,
      contentType: /xml/,
      timeoutMs: 120_000,
      validate: (r, d) => {
        const locs = locsOf(text(r));
        if (locs.length) {
          d.docSamples = [locs[0], locs[Math.floor(locs.length / 2)], locs[locs.length - 1]].map(pathOf);
        }
        return positive("urls", locs.length);
      },
    },
    { id: "og-image:/", group: "infra", target: "/opengraph-image", contentType: /image\/png/ },
    { id: "og-image:/guidelines", group: "infra", target: "/guidelines/opengraph-image", contentType: /image\/png/ },
    {
      id: "image-optimizer",
      group: "infra",
      target: `/_next/image?url=${encodeURIComponent(`/uploads/${SEED_UPLOAD_SAMPLES[0]}`)}&w=384&q=75`,
      contentType: /^image\//,
    },
    {
      id: "http-redirects-to-https",
      group: "infra",
      when: (ctx) => ctx.base.startsWith("https://"),
      target: (_d, ctx) => `${ctx.base.replace(/^https:/, "http:")}/`,
      expect: REDIRECTS,
      validate: (r) => {
        const loc = r.headers["location"] ?? "";
        return loc.startsWith("https://")
          ? { ok: true, detail: `→ ${loc}` }
          : { ok: false, detail: `location is not https: "${loc}"` };
      },
    },
    {
      id: "apex-redirects-to-www",
      group: "infra",
      when: (ctx) => ctx.baseHost === "www.z-g.co.il",
      target: "https://z-g.co.il/",
      expect: REDIRECTS,
      validate: (r) => {
        const loc = r.headers["location"] ?? "";
        return loc.startsWith("https://www.z-g.co.il")
          ? { ok: true, detail: `→ ${loc}` }
          : { ok: false, detail: `apex does not redirect to www: "${loc}"` };
      },
    },
  ];
}

function authChecks(): CheckDef[] {
  return [
    {
      id: "auth-providers",
      group: "auth",
      target: "/api/auth/providers",
      contentType: /json/,
      validate: (r, _d, ctx) => {
        const cb: unknown = json(r)?.google?.callbackUrl;
        return typeof cb === "string" && cb.startsWith(ctx.publicOrigin)
          ? { ok: true, detail: cb, fingerprint: cb }
          : { ok: false, detail: `google callbackUrl ${String(cb)} is not under ${ctx.publicOrigin}`, fingerprint: String(cb) };
      },
    },
    { id: "auth-session-anonymous", group: "auth", target: "/api/auth/session", contentType: /json/ },
    {
      id: "admin-redirects-to-login",
      group: "auth",
      target: "/admin",
      expect: REDIRECTS,
      validate: (r, _d, ctx) => {
        const loc = normalizeLocation(r.headers["location"] ?? "", ctx);
        return loc.startsWith("/admin/login")
          ? { ok: true, detail: `→ ${loc}`, fingerprint: loc.split("?")[0] }
          : { ok: false, detail: `→ "${loc}"` };
      },
    },
    { id: "admin-login-page", group: "auth", target: "/admin/login", contentType: /text\/html/, validate: htmlPage },
    { id: "guard:/api/admin/billing", group: "auth", target: "/api/admin/billing", expect: [401] },
    { id: "guard:/api/submissions", group: "auth", target: "/api/submissions", expect: [401] },
    { id: "guard:/api/rulings/schema", group: "auth", target: "/api/rulings/schema?category=defamation", expect: [401] },
    {
      id: "oauth-authorization-server",
      group: "auth",
      target: "/.well-known/oauth-authorization-server",
      contentType: /json/,
      validate: (r, _d, ctx) => {
        const issuer: unknown = json(r)?.issuer;
        return issuer === ctx.publicOrigin
          ? { ok: true, detail: `issuer ${issuer}`, fingerprint: issuer }
          : { ok: false, detail: `issuer ${String(issuer)} ≠ ${ctx.publicOrigin}`, fingerprint: String(issuer) };
      },
    },
    { id: "oauth-protected-resource", group: "auth", target: "/.well-known/oauth-protected-resource", contentType: /json/ },
  ];
}

function dataChecks(): CheckDef[] {
  const firstId = (value: unknown): string | undefined =>
    value === null || value === undefined || value === "" ? undefined : String(value);

  return [
    {
      id: "data:guidelines-documents",
      group: "data",
      target: "/api/guidelines/documents?limit=1",
      ...SLOW_UPSTREAM,
      validate: (r, d) => {
        const j = json(r);
        d.guidelineId = firstId(j.items?.[0]?.id);
        return positive("total", j.total);
      },
    },
    ...[
      ["data:guidelines-search-bare", GUIDELINES_BARE_QUERY],
      ["data:guidelines-search-phrase", GUIDELINES_PHRASE_QUERY],
    ].map(
      ([id, target]): CheckDef => ({
        id,
        group: "data",
        target,
        ...SLOW_UPSTREAM,
        validate: (r) => {
          const j = json(r);
          const methods = JSON.stringify(j.methods ?? null);
          const o = positive("total", j.total);
          return { ...o, detail: `${o.detail} methods=${methods}`, fingerprint: `${j.total}|${methods}` };
        },
      }),
    ),
    {
      id: "data:guidelines-sources",
      group: "data",
      target: "/api/guidelines/sources",
      validate: (r) => positive("sources", json(r).sources?.length),
    },
    {
      id: "data:class-actions",
      group: "data",
      target: "/api/class-actions/documents?limit=1",
      ...SLOW_UPSTREAM,
      validate: (r, d) => {
        const j = json(r);
        d.caseNumber = firstId(j.cases?.[0]?.case_number);
        return positive("total", j.total);
      },
    },
    ...["defamation", "foi-judgments", "foi-costs", "drug-sentencing"].map(
      (category): CheckDef => ({
        id: `data:rulings-${category}`,
        group: "data",
        target: `/api/rulings?category=${category}&page=1`,
        ...SLOW_UPSTREAM,
        validate: (r, d) => {
          const j = json(r);
          if (category === "defamation") d.rulingId = firstId(j.rulings?.[0]?.id);
          return positive("total", j.total);
        },
      }),
    ),
    {
      id: "data:comptroller-reports",
      group: "data",
      target: "/api/comptroller-reports/documents?limit=12&skip=0",
      ...SLOW_UPSTREAM,
      validate: (r, d) => {
        const j = json(r);
        d.comptrollerId = firstId(j.items?.[0]?.id);
        return positive("total", j.total);
      },
    },
    {
      id: "data:mmm",
      group: "data",
      target: "/api/mmm/documents?limit=12&skip=0",
      ...SLOW_UPSTREAM,
      validate: (r, d) => {
        const j = json(r);
        d.mmmId = firstId(j.items?.[0]?.id);
        return positive("total", j.total);
      },
    },
    {
      id: "data:ca-records",
      group: "data",
      target: "/api/conditional-arrangements/records?limit=1",
      validate: (r) => positive("total", json(r).total),
    },
    {
      id: "data:ca-facets",
      group: "data",
      target: "/api/conditional-arrangements/facets",
      ...SLOW_UPSTREAM,
      validate: (r) => positive("districts", json(r).districts?.length),
    },
    {
      id: "data:sanegoria-filters",
      group: "data",
      target: "/api/sanegoria?filters=1",
      validate: (r) => positive("courts", json(r).courts?.length),
    },
    {
      id: "data:sanegoria-dashboard",
      group: "data",
      target: "/api/sanegoria?page=1",
      ...SLOW_UPSTREAM,
      validate: (r) => {
        const kpis = json(r).kpis;
        return kpis && typeof kpis === "object" && Object.keys(kpis).length
          ? { ok: true, detail: `kpis: ${Object.keys(kpis).join(",")}`, fingerprint: sha256(JSON.stringify(kpis)).slice(0, 16) }
          : { ok: false, detail: "no kpis in the dashboard payload" };
      },
    },
    { id: "data:content-pages", group: "data", target: "/api/pages", validate: (r) => positive("pages", json(r).length) },
    { id: "data:content-posts", group: "data", target: "/api/posts", validate: (r) => positive("posts", json(r).posts?.length) },
    { id: "data:content-plilist", group: "data", target: "/api/plilist", validate: (r) => positive("posts", json(r).posts?.length) },
    { id: "data:content-services", group: "data", target: "/api/services", validate: (r) => positive("services", json(r).length) },
    {
      id: "data:content-settings",
      group: "data",
      target: "/api/settings",
      validate: (r) => (json(r).id === "main" ? { ok: true, detail: "id=main" } : { ok: false, detail: "no settings row" }),
    },
    { id: "data:content-milon", group: "data", target: "/api/milon", validate: (r) => positive("entries", json(r).entries?.length) },
    {
      id: "data:content-media-appearances",
      group: "data",
      target: "/api/media-appearances",
      validate: (r) => positive("appearances", json(r).length),
    },
    {
      id: "data:content-case-documents",
      group: "data",
      target: "/api/case-documents",
      validate: (r) => positive("documents", json(r).length),
    },
    {
      id: "data:pach-status",
      group: "data",
      target: "/api/pach-hamishpat/status",
      validate: (r) => {
        const s: unknown = json(r).status;
        return typeof s === "string" ? { ok: true, detail: `status=${s}` } : { ok: false, detail: "no status field" };
      },
    },
    {
      id: "data:pach-reports",
      group: "data",
      target: "/api/pach-hamishpat/reports",
      // Users file reports all day; the count is not stable enough to fingerprint.
      validate: (r) => ({ ...positive("reports", json(r).length), fingerprint: null }),
    },
    {
      id: "data:pach-feed",
      group: "data",
      target: "/pach-hamishpat/feed.xml",
      contentType: /xml/,
      validate: (r) =>
        text(r).includes("<rss") ? { ok: true, detail: "rss document" } : { ok: false, detail: "not an RSS document" },
    },
  ];
}

function uploadChecks(): CheckDef[] {
  const lost = LOST_UPLOADS.map(
    (name): CheckDef => ({
      id: `upload:lost:${name}`,
      group: "upload",
      target: `/uploads/${encodeURIComponent(name)}`,
      follow: true,
      expect: [404],
      validate: () => ({ ok: true, detail: "still missing, as on Render", fingerprint: 404 }),
    }),
  );
  const files = [
    ...RUNTIME_UPLOADS.map((name) => ({ name, kind: "runtime" })),
    ...SEED_UPLOAD_SAMPLES.map((name) => ({ name, kind: "seed" })),
  ];
  return [...lost, ...files.map(
    ({ name, kind }): CheckDef => ({
      id: `upload:${kind}:${name}`,
      group: "upload",
      target: `/uploads/${encodeURIComponent(name)}`,
      // A move to object storage may answer with a redirect; the bytes are what matter.
      follow: true,
      contentType: contentTypeFor(name),
      validate: (r, d) => {
        if (!r.body || r.bytes === 0) return { ok: false, detail: "empty body" };
        const p = `/uploads/${encodeURIComponent(name)}`;
        if (!d.largestUpload || r.bytes > d.largestUpload.bytes) d.largestUpload = { path: p, bytes: r.bytes };
        return { ok: true, detail: `${r.bytes} bytes`, fingerprint: `${r.bytes}:${sha256(r.body).slice(0, 16)}` };
      },
    }),
  )];
}

function pageChecks(d: Discovered): CheckDef[] {
  const inSitemap = new Set(d.sitemapPaths);
  const page = (id: string, target: CheckDef["target"], validate: CheckDef["validate"], expect?: number[]): CheckDef => ({
    id,
    group: "page",
    target,
    expect,
    retries: 2,
    timeoutMs: 120_000,
    validate,
  });
  // Detail pages open whatever record the list endpoint returned first, which
  // the mirror sync can change between runs — so no fingerprint for those.
  const detail = (id: string, target: (d: Discovered) => string | null) =>
    page(id, target, (r) => ({ ...htmlPage(r), fingerprint: null }));

  // A page with a known non-200 status must keep exactly that status.
  const known = (p: string): CheckDef =>
    page(
      `page:${p}`,
      p,
      (r, _d, ctx) =>
        r.status !== null && REDIRECTS.includes(r.status)
          ? redirectOrPage(r, ctx)
          : { ok: true, detail: `HTTP ${r.status}, as on Render`, fingerprint: r.status },
      KNOWN_PAGE_STATUS[p],
    );

  return [
    ...[...inSitemap].sort().map((p) => (KNOWN_PAGE_STATUS[p] ? known(p) : page(`page:${p}`, p, (r) => htmlPage(r)))),
    ...EXTRA_PAGES.filter((p) => !inSitemap.has(p)).map((p) =>
      KNOWN_PAGE_STATUS[p] ? known(p) : page(`page:${p}`, p, (r, _d, ctx) => redirectOrPage(r, ctx), [200, ...REDIRECTS]),
    ),
    detail("page-detail:guidelines", (x) => (x.guidelineId ? `/guidelines/${x.guidelineId}` : null)),
    detail("page-detail:rulings", (x) => (x.rulingId ? `/rulings/${x.rulingId}` : null)),
    detail("page-detail:class-actions", (x) => (x.caseNumber ? `/class-actions/${encodeURIComponent(x.caseNumber)}` : null)),
    detail("page-detail:comptroller-reports", (x) => (x.comptrollerId ? `/comptroller-reports/${x.comptrollerId}` : null)),
    detail("page-detail:mmm", (x) => (x.mmmId ? `/mmm/${x.mmmId}` : null)),
    ...[0, 1, 2].map((i) => detail(`page-docs-sample:${i + 1}`, (x) => x.docSamples[i] ?? null)),
  ];
}

async function runCheck(def: CheckDef, d: Discovered, ctx: Ctx): Promise<SanityRecord> {
  const base = { id: def.id, group: def.group, headers: {} as Record<string, string> };
  if (def.when && !def.when(ctx)) {
    return { ...base, url: "", ok: true, skipped: true, status: null, ms: 0, attempts: 0, detail: "not applicable to this target", fingerprint: null };
  }
  const t = typeof def.target === "function" ? def.target(d, ctx) : def.target;
  if (t === null) {
    return { ...base, url: "", ok: false, skipped: false, status: null, ms: 0, attempts: 0, detail: "prerequisite was not discovered", fingerprint: null };
  }
  const url = /^https?:\/\//.test(t) ? t : ctx.base + t;
  const expect = def.expect ?? [200];
  const maxAttempts = 1 + (def.retries ?? 1);

  let r: HttpResult | null = null;
  let attempts = 0;
  while (attempts < maxAttempts) {
    attempts++;
    const u = new URL(url);
    if (u.hostname === ctx.baseHost) await ctx.pacer.before(u.pathname);
    r = await timedFetch(url, { timeoutMs: def.timeoutMs ?? 90_000, follow: def.follow });
    const transient = r.status === null || r.status >= 500;
    if (!transient || expect.includes(r.status as number)) break;
    if (attempts < maxAttempts) await sleep(3_000);
  }
  const res = r as HttpResult;

  let ok = res.status !== null && expect.includes(res.status);
  let detail = res.error ?? `HTTP ${res.status}`;
  let fingerprint: string | number | null = null;
  if (!ok && res.status !== null) {
    detail = `expected ${expect.join("/")}, got ${res.status}: ${text(res).replace(/\s+/g, " ").slice(0, 160)}`;
  }
  if (ok && def.contentType && !def.contentType.test(res.headers["content-type"] ?? "")) {
    ok = false;
    detail = `unexpected content-type "${res.headers["content-type"] ?? ""}"`;
  }
  if (ok && def.validate) {
    try {
      const o = def.validate(res, d, ctx);
      ok = o.ok;
      detail = o.detail;
      fingerprint = o.fingerprint ?? null;
    } catch (err) {
      ok = false;
      detail = `validator threw: ${(err as Error).message}`;
    }
  }
  // The CSP is long and already covered by the security-headers signature.
  const headers = { ...res.headers };
  delete headers["content-security-policy"];
  return { ...base, headers, url, ok, skipped: false, status: res.status, ms: res.totalMs, attempts, detail, fingerprint };
}

function logCheck(s: SanityRecord): SanityRecord {
  const mark = s.skipped ? "–" : s.ok ? "✓" : "✗";
  const retry = s.attempts > 1 ? ` (${s.attempts} attempts)` : "";
  console.log(`  ${mark} ${s.id.padEnd(48)} ${String(s.status ?? "---").padEnd(4)} ${String(Math.round(s.ms)).padStart(6)}ms${retry}  ${s.detail.slice(0, 110)}`);
  return s;
}

// ---------------------------------------------------------------------------
// Performance
// ---------------------------------------------------------------------------

async function runPerf(ctx: Ctx, d: Discovered, rounds: number): Promise<PerfRecord[]> {
  const out: PerfRecord[] = [];
  for (const t of PERF_TARGETS) {
    const p = typeof t.path === "function" ? t.path(d) : t.path;
    if (!p) {
      out.push({ id: t.id, url: "", skipped: "prerequisite was not discovered", first: null, warm: { n: 0, statuses: {}, errors: 0, ttfb: null, total: null, bytes: 0 }, headers: {} });
      console.log(`  – ${t.id} skipped (prerequisite was not discovered)`);
      continue;
    }
    const url = ctx.base + p;
    const pathname = new URL(url).pathname;
    const opts = { timeoutMs: t.timeoutMs ?? 120_000, keepBody: false, follow: t.follow };
    const n = t.rounds ?? rounds;

    await ctx.pacer.before(pathname);
    const first = await timedFetch(url, opts);
    const warm: HttpResult[] = [];
    for (let i = 0; i < n; i++) {
      await sleep(300);
      await ctx.pacer.before(pathname);
      warm.push(await timedFetch(url, opts));
    }
    const good = warm.filter((w) => w.status !== null && w.status < 400);
    const last = warm.length ? warm[warm.length - 1] : first;
    const rec: PerfRecord = {
      id: t.id,
      url,
      first: slim(first),
      warm: {
        n,
        statuses: countStatuses(warm),
        errors: warm.length - good.length,
        ttfb: summarize(good.map((w) => w.ttfbMs)),
        total: summarize(good.map((w) => w.totalMs)),
        bytes: good.length ? good[0].bytes : 0,
      },
      headers: pick(last.headers, ["server", "cache-control", "cf-cache-status", "x-nextjs-cache", "age"]),
    };
    out.push(rec);
    console.log(
      `  ${t.id.padEnd(34)} first ${fmt(first.ttfbMs)}  warm TTFB p50 ${fmt(rec.warm.ttfb?.p50)} p95 ${fmt(rec.warm.ttfb?.p95)}  total p50 ${fmt(rec.warm.total?.p50)}  errors ${rec.warm.errors}/${n}`,
    );
  }
  return out;
}

async function runBursts(ctx: Ctx): Promise<BurstRecord[]> {
  const out: BurstRecord[] = [];
  for (const b of BURSTS) {
    const url = ctx.base + b.path;
    const all: HttpResult[] = [];
    const wall: number[] = [];
    for (let i = 0; i < b.bursts; i++) {
      const t0 = performance.now();
      const rs = await Promise.all(Array.from({ length: b.parallel }, () => timedFetch(url, { timeoutMs: 60_000, keepBody: false })));
      wall.push(performance.now() - t0);
      all.push(...rs);
      await sleep(1_000);
    }
    const good = all.filter((r) => r.status !== null && r.status < 400);
    const rec: BurstRecord = {
      id: b.id,
      url,
      parallel: b.parallel,
      bursts: b.bursts,
      statuses: countStatuses(all),
      errors: all.length - good.length,
      ttfb: summarize(good.map((r) => r.ttfbMs)),
      total: summarize(good.map((r) => r.totalMs)),
      wallMs: summarize(wall.map(round)),
    };
    out.push(rec);
    console.log(`  ${b.id.padEnd(34)} ${b.parallel}×${b.bursts}  TTFB p50 ${fmt(rec.ttfb?.p50)} p95 ${fmt(rec.ttfb?.p95)}  burst wall p50 ${fmt(rec.wallMs?.p50)}  errors ${rec.errors}`);
  }
  return out;
}

const fmt = (ms: number | undefined | null): string => (ms == null ? "   –  " : `${Math.round(ms)}ms`.padStart(7));

function pick(h: Record<string, string>, keys: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of keys) if (h[k] !== undefined) out[k] = h[k];
  return out;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const base = typeof args.base === "string" ? args.base.replace(/\/$/, "") : "";
  const label = typeof args.label === "string" ? args.label : "";
  if (!/^https?:\/\//.test(base) || !label) {
    console.error("usage: tsx tests/migration/run.ts --base https://host --label name [--public-origin URL] [--rounds N] [--skip-perf] [--out DIR]");
    process.exit(2);
  }
  const publicOrigin = typeof args["public-origin"] === "string" ? args["public-origin"].replace(/\/$/, "") : base;
  const rounds = Number(typeof args.rounds === "string" ? args.rounds : 5);
  const outDir = path.resolve(typeof args.out === "string" ? args.out : "tests/migration/results");
  const baseHost = new URL(base).hostname;

  const ctx: Ctx = { base, publicOrigin, baseHost, pacer: new RatePacer(RATE_RULES) };
  const d: Discovered = { sitemaps: [], sitemapPaths: [], docSamples: [] };
  const startedAt = new Date().toISOString();
  const resolved = await lookup(baseHost, { all: true })
    .then((addrs) => addrs.map((a) => a.address))
    .catch((e: Error) => [`lookup failed: ${e.message}`]);

  console.log(`\n[migration] ${label}: ${base} (public origin ${publicOrigin})`);
  console.log(`[migration] ${baseHost} → ${resolved.join(", ")}\n`);

  console.log("sanity");
  const sanity: SanityRecord[] = [];
  for (const c of [...infraChecks(), ...authChecks(), ...dataChecks()]) {
    sanity.push(logCheck(await runCheck(c, d, ctx)));
  }
  sanity.push(...(await pool([...uploadChecks(), ...pageChecks(d)], 4, async (c) => logCheck(await runCheck(c, d, ctx)))));

  let perf: PerfRecord[] = [];
  let bursts: BurstRecord[] = [];
  if (!args["skip-perf"]) {
    console.log(`\nperformance (${rounds} warm rounds unless noted)`);
    perf = await runPerf(ctx, d, rounds);
    console.log("\nbursts");
    bursts = await runBursts(ctx);
  }

  const run: HttpRun = {
    kind: "http",
    label,
    base,
    publicOrigin,
    resolved,
    startedAt,
    finishedAt: new Date().toISOString(),
    client: { node: process.version, platform: process.platform },
    rounds,
    sanity,
    perf,
    bursts,
  };

  mkdirSync(outDir, { recursive: true });
  let file = path.join(outDir, `${label}.json`);
  if (existsSync(file)) file = path.join(outDir, `${label}-${startedAt.replace(/[:.]/g, "-")}.json`);
  writeFileSync(file, JSON.stringify(run, null, 2));

  const failed = sanity.filter((s) => !s.ok && !s.skipped);
  const skipped = sanity.filter((s) => s.skipped).length;
  console.log(`\n[migration] sanity: ${sanity.length - failed.length - skipped} passed, ${failed.length} failed, ${skipped} skipped`);
  for (const f of failed) console.log(`  ✗ ${f.id}: ${f.detail}`);
  console.log(`[migration] results: ${file}`);
  if (failed.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
