/**
 * Shared pieces of the Render → xhostd migration suite: result types, a fetch
 * that times TTFB and total separately, a pacer that keeps the suite under the
 * app's own per-IP rate limits, and small stats helpers.
 */
import { createHash } from "node:crypto";

// ---------------------------------------------------------------------------
// Types shared by run.ts, db-snapshot.ts and compare.ts
// ---------------------------------------------------------------------------

export interface HttpResult {
  url: string;
  status: number | null;
  /** Time until response headers arrived. */
  ttfbMs: number;
  /** Time until the whole body was read. */
  totalMs: number;
  bytes: number;
  headers: Record<string, string>;
  body: Buffer | null;
  error: string | null;
}

/** Values one check learns and a later check or perf target needs. */
export interface Discovered {
  sitemaps: string[];
  sitemapPaths: string[];
  docSamples: string[];
  staticAsset?: string;
  guidelineId?: string;
  rulingId?: string;
  caseNumber?: string;
  comptrollerId?: string;
  mmmId?: string;
  largestUpload?: { path: string; bytes: number };
}

export interface Ctx {
  base: string;
  /** The origin users see (www.z-g.co.il). Differs from base on a staging hostname. */
  publicOrigin: string;
  baseHost: string;
  pacer: RatePacer;
}

export interface Outcome {
  ok: boolean;
  detail: string;
  /**
   * A value that should be identical before and after the move (a record
   * count, a file hash, a page title). compare.ts lists every one that changed.
   */
  fingerprint?: string | number | null;
}

export type CheckGroup = "infra" | "auth" | "data" | "page" | "upload";

export interface CheckDef {
  id: string;
  group: CheckGroup;
  /** Path on the target or an absolute URL. A function returning null means a prerequisite was not discovered (a failure). */
  target: string | ((d: Discovered, ctx: Ctx) => string | null);
  /** Not applicable to this target (e.g. the apex redirect on a staging hostname): recorded as skipped. */
  when?: (ctx: Ctx) => boolean;
  expect?: number[];
  contentType?: RegExp;
  timeoutMs?: number;
  /** Extra attempts on 5xx / timeout / network error. */
  retries?: number;
  follow?: boolean;
  validate?: (r: HttpResult, d: Discovered, ctx: Ctx) => Outcome;
}

export interface SanityRecord {
  id: string;
  group: CheckGroup;
  url: string;
  ok: boolean;
  skipped: boolean;
  status: number | null;
  ms: number;
  attempts: number;
  detail: string;
  fingerprint: string | number | null;
  headers: Record<string, string>;
}

export interface Stats {
  n: number;
  min: number;
  p50: number;
  p95: number;
  max: number;
  mean: number;
}

export interface PerfTargetDef {
  id: string;
  path: string | ((d: Discovered) => string | null);
  rounds?: number;
  timeoutMs?: number;
  follow?: boolean;
}

export interface Slim {
  status: number | null;
  ttfbMs: number;
  totalMs: number;
  bytes: number;
  error: string | null;
}

export interface PerfRecord {
  id: string;
  url: string;
  skipped?: string;
  first: Slim | null;
  warm: {
    n: number;
    statuses: Record<string, number>;
    errors: number;
    ttfb: Stats | null;
    total: Stats | null;
    bytes: number;
  };
  headers: Record<string, string>;
}

export interface BurstDef {
  id: string;
  path: string;
  parallel: number;
  bursts: number;
}

export interface BurstRecord {
  id: string;
  url: string;
  parallel: number;
  bursts: number;
  statuses: Record<string, number>;
  errors: number;
  ttfb: Stats | null;
  total: Stats | null;
  wallMs: Stats | null;
}

export interface HttpRun {
  kind: "http";
  label: string;
  base: string;
  publicOrigin: string;
  resolved: string[];
  startedAt: string;
  finishedAt: string;
  client: { node: string; platform: string };
  rounds: number;
  sanity: SanityRecord[];
  perf: PerfRecord[];
  bursts: BurstRecord[];
}

export interface DbTable {
  name: string;
  rows: number;
  bytes: number;
  hashMode: "full" | "pk" | "none";
  hash: string | null;
  indexes: string[];
  maxSyncedAt: string | null;
}

export interface DbSequence {
  name: string;
  table: string;
  column: string;
  lastValue: number | null;
  maxValue: number | null;
  ok: boolean;
}

export interface DbRun {
  kind: "db";
  label: string;
  host: string;
  database: string;
  version: string;
  startedAt: string;
  finishedAt: string;
  extensions: string[];
  tables: DbTable[];
  sequences: DbSequence[];
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

// Headers worth keeping: which edge served the request, the caching layers,
// and the security headers the sanity pass asserts on.
const KEPT_HEADERS = [
  "content-type",
  "content-length",
  "cache-control",
  "location",
  "server",
  "via",
  "age",
  "cf-cache-status",
  "cf-ray",
  "x-nextjs-cache",
  "x-nextjs-prerender",
  "strict-transport-security",
  "content-security-policy",
  "x-frame-options",
  "x-content-type-options",
  "referrer-policy",
  "permissions-policy",
];

const USER_AGENT = "z-g-migration-check/1.0";

export async function timedFetch(
  url: string,
  opts: { timeoutMs?: number; keepBody?: boolean; follow?: boolean } = {},
): Promise<HttpResult> {
  const timeoutMs = opts.timeoutMs ?? 90_000;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const started = performance.now();
  let ttfbMs = 0;
  try {
    const res = await fetch(url, {
      redirect: opts.follow ? "follow" : "manual",
      signal: ctrl.signal,
      headers: { "User-Agent": USER_AGENT },
    });
    ttfbMs = performance.now() - started;
    const body = Buffer.from(await res.arrayBuffer());
    const totalMs = performance.now() - started;
    const headers: Record<string, string> = {};
    for (const k of KEPT_HEADERS) {
      const v = res.headers.get(k);
      if (v !== null) headers[k] = v;
    }
    return {
      url,
      status: res.status,
      ttfbMs: round(ttfbMs),
      totalMs: round(totalMs),
      bytes: body.length,
      headers,
      body: opts.keepBody === false ? null : body,
      error: null,
    };
  } catch (err) {
    const e = err as Error & { cause?: { code?: string; message?: string } };
    const reason =
      e.name === "AbortError"
        ? `timeout after ${timeoutMs}ms`
        : `${e.message}${e.cause ? ` (${e.cause.code ?? e.cause.message})` : ""}`;
    return {
      url,
      status: null,
      ttfbMs: round(ttfbMs),
      totalMs: round(performance.now() - started),
      bytes: 0,
      headers: {},
      body: null,
      error: reason,
    };
  } finally {
    clearTimeout(timer);
  }
}

export function slim(r: HttpResult): Slim {
  return { status: r.status, ttfbMs: r.ttfbMs, totalMs: r.totalMs, bytes: r.bytes, error: r.error };
}

// ---------------------------------------------------------------------------
// Rate pacing
// ---------------------------------------------------------------------------

export interface RateRule {
  /** Exact pathname the limiter guards. */
  path: string;
  /** Limiter key; routes sharing a key share a budget. */
  key: string;
  limit: number;
  windowMs: number;
}

/**
 * Client-side mirror of src/lib/rate-limit.ts. The server uses a fixed window
 * that opens at the first hit; keeping every sliding window of ours at
 * limit - 1 hits guarantees no fixed window of theirs ever sees more than that.
 */
export class RatePacer {
  private hits = new Map<string, number[]>();

  constructor(private readonly rules: RateRule[]) {}

  async before(pathname: string): Promise<void> {
    const rule = this.rules.find((r) => r.path === pathname);
    if (!rule) return;
    for (;;) {
      const now = Date.now();
      const recent = (this.hits.get(rule.key) ?? []).filter((t) => now - t < rule.windowMs);
      if (recent.length < rule.limit - 1) {
        recent.push(now);
        this.hits.set(rule.key, recent);
        return;
      }
      this.hits.set(rule.key, recent);
      await sleep(rule.windowMs - (now - recent[0]) + 250);
    }
  }
}

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------

export const round = (x: number): number => Math.round(x * 10) / 10;

export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export const sha256 = (b: Buffer | string): string => createHash("sha256").update(b).digest("hex");

export function summarize(xs: number[]): Stats | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const pct = (p: number) => s[Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1))];
  return {
    n: s.length,
    min: round(s[0]),
    p50: round(pct(50)),
    p95: round(pct(95)),
    max: round(s[s.length - 1]),
    mean: round(s.reduce((a, b) => a + b, 0) / s.length),
  };
}

export function countStatuses(rs: HttpResult[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rs) {
    const k = r.status === null ? "error" : String(r.status);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

/** Run fn over items with at most `size` in flight; results keep item order. */
export async function pool<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, worker));
  return out;
}

export function parseArgs(argv: string[]): Record<string, string | true> {
  const out: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith("--")) {
      out[a.slice(2)] = next;
      i++;
    } else {
      out[a.slice(2)] = true;
    }
  }
  return out;
}
