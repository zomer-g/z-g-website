/**
 * TAG-IT local mirror — sync + query.
 *
 * WHY: querying tag-it.biz per request was measured at 136–151s per page
 * (all scopes, 2026-07-03), with intermittent 502s when its box thrashes.
 * The mirror keeps a periodically-synced copy of each scope's documents in
 * OUR Postgres (tagit_docs, ~0.5GB total) so /api/rulings serves listings in
 * tens of milliseconds, independent of TAG-IT's health.
 *
 * Split in two halves:
 *  • SYNC   — pulls scope pages from TAG-IT (newest-uploaded first) and
 *             upserts them. Incremental = first few pages every ~15 min;
 *             full = the whole scope nightly (also prunes deleted docs).
 *  • QUERY  — compiles the same FilterExpression grammar the route already
 *             speaks into parameterized SQL over the jsonb `data` column,
 *             with TAG-IT-matching semantics (see compileLeaf), plus sort +
 *             pagination. text_query (full-text) is NOT served here — the
 *             mirror holds no document text; the route passes those through.
 *
 * Filter semantics parity (mirrors smart-dms public_rulings.py):
 *  • array-typed leaf:  contains → EXACT element match; in → any-of exact.
 *  • scalar leaf:       contains → case-insensitive substring;
 *                       starts_with → prefix; eq/ne → string-coerced equality;
 *                       gt/ge/lt/le → numeric when the value is a number,
 *                       lexicographic (ISO dates) when it's a string.
 *  • scalar path crossing an array of objects (e.g. sql.הגנות_שנטענו.שם_ההגנה)
 *    → "any element matches" — handled by lax-mode jsonpath auto-unwrapping.
 *  • missing field value → every non-null comparator is false.
 * Whether a leaf is array- or scalar-typed is probed from the mirrored data
 * itself (cached per scope+field), the same way TAG-IT derives it from its
 * schema catalog.
 */

import { prisma } from "@/lib/prisma";
import {
  fetchUpstreamRulingsPage,
  fetchUpstreamRulingsSchema,
  type UpstreamRulingItem,
} from "@/lib/rulings-upstream";
import type { FilterExpression, LeafFilter } from "@/types/ruling-filter";

/* ═══════════════════════ shared helpers ═══════════════════════ */

// Scopes to mirror. Route falls back to upstream for anything unmirrored, so
// this list only controls what the scheduler syncs. Overridable without a
// deploy via TAGIT_MIRROR_SCOPES="4,6,1,13".
export function mirrorScopes(): number[] {
  const raw = process.env.TAGIT_MIRROR_SCOPES;
  if (raw) {
    const ids = raw
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isInteger(n) && n > 0);
    if (ids.length) return ids;
  }
  return [4, 6, 1];
}

// Sync page size (TAG-IT max is 100). The read-time meta.drug_totals
// aggregation made 100-doc pages slow enough to 504 the full walk; lower this
// via TAGIT_MIRROR_PAGE_SIZE (env, no deploy) to shrink per-request load when
// TAG-IT is timing out. Coverage still fits HARD_PAGE_CAP at sizes ≥ ~45.
const PAGE_SIZE = Math.min(
  100,
  Math.max(10, parseInt(process.env.TAGIT_MIRROR_PAGE_SIZE ?? "100", 10) || 100),
);

function parseDocDate(item: UpstreamRulingItem): Date | null {
  const meta = (item as Record<string, unknown>).meta as
    | Record<string, unknown>
    | undefined;
  const raw = meta?.document_date;
  if (typeof raw !== "string" || !raw.trim()) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/* ═══════════════════════ SYNC ═══════════════════════ */

export interface SyncRunResult {
  scopeId: number;
  mode: "incremental" | "full";
  pagesFetched: number;
  docsUpserted: number;
  docsPruned: number;
  upstreamTotal: number | null;
  ok: boolean;
  error?: string;
}

async function upsertBatch(scopeId: number, items: UpstreamRulingItem[]) {
  if (items.length === 0) return;
  const values: string[] = [];
  const params: unknown[] = [];
  for (const item of items) {
    const docId = Number(item.id);
    if (!Number.isInteger(docId)) continue;
    const base = params.length;
    params.push(scopeId, docId, JSON.stringify(item), parseDocDate(item));
    values.push(
      `($${base + 1}, $${base + 2}, $${base + 3}::jsonb, $${base + 4}::timestamptz, now())`,
    );
  }
  if (values.length === 0) return;
  await prisma.$executeRawUnsafe(
    `INSERT INTO tagit_docs (scope_id, doc_id, data, document_date, synced_at)
     VALUES ${values.join(", ")}
     ON CONFLICT (scope_id, doc_id) DO UPDATE
       SET data = EXCLUDED.data,
           document_date = EXCLUDED.document_date,
           synced_at = now()`,
    ...params,
  );
}

// Fetch one upstream page with patient outer retries — the whole point of
// the mirror is that TAG-IT is often slow or briefly down; a sync run should
// survive a blip, and a failed run must never prune (see syncScope).
async function fetchPagePatiently(
  scopeId: number,
  page: number,
): Promise<{ items: UpstreamRulingItem[]; total: number } | null> {
  const ATTEMPTS = 3;
  for (let i = 1; i <= ATTEMPTS; i++) {
    try {
      const res = await fetchUpstreamRulingsPage({
        scopeId,
        page,
        size: PAGE_SIZE,
        // Newest-UPLOADED first (not document_date): backfilled historical
        // rulings get today's upload_date, so the first pages always contain
        // whatever TAG-IT ingested since the last run.
        sortKey: "-meta.upload_date",
        // Patient budget: a cold TAG-IT schema build takes >2 min under
        // load; a background sync should wait it out, not retry into it.
        timeoutMs: 180_000,
      });
      if (res) return res;
      return null; // API key missing — caller reports it once
    } catch (err) {
      if (i === ATTEMPTS) throw err;
      await new Promise((r) => setTimeout(r, 5_000 * i));
    }
  }
  return null;
}

async function updateSyncState(
  scopeId: number,
  patch: {
    upstreamTotal?: number | null;
    lastIncrementalAt?: Date;
    lastFullSyncAt?: Date;
    lastError?: string | null;
    fieldSchema?: unknown;
  },
) {
  const mirroredCount = await prisma.tagitDoc.count({ where: { scopeId } });
  const schemaPatch =
    patch.fieldSchema !== undefined
      ? { fieldSchema: patch.fieldSchema as object }
      : {};
  await prisma.tagitSyncState.upsert({
    where: { scopeId },
    create: {
      scopeId,
      mirroredCount,
      upstreamTotal: patch.upstreamTotal ?? null,
      lastIncrementalAt: patch.lastIncrementalAt,
      lastFullSyncAt: patch.lastFullSyncAt,
      lastError: patch.lastError ?? null,
      ...schemaPatch,
    },
    update: {
      mirroredCount,
      ...(patch.upstreamTotal !== undefined
        ? { upstreamTotal: patch.upstreamTotal }
        : {}),
      ...(patch.lastIncrementalAt
        ? { lastIncrementalAt: patch.lastIncrementalAt }
        : {}),
      ...(patch.lastFullSyncAt ? { lastFullSyncAt: patch.lastFullSyncAt } : {}),
      lastError: patch.lastError ?? null,
      ...schemaPatch,
    },
  });
}

/**
 * Sync one scope. mode="incremental" pulls just the first `incrementalPages`
 * pages (newest uploads); mode="full" walks the entire scope and afterwards
 * prunes rows the walk didn't touch (docs deleted/hidden upstream). Pruning
 * only happens when EVERY page fetched cleanly — a partial walk must not
 * delete live documents.
 */
export async function syncScope(
  scopeId: number,
  mode: "incremental" | "full",
  incrementalPages = 3,
): Promise<SyncRunResult> {
  const startedAt = new Date();
  const result: SyncRunResult = {
    scopeId,
    mode,
    pagesFetched: 0,
    docsUpserted: 0,
    docsPruned: 0,
    upstreamTotal: null,
    ok: false,
  };
  try {
    let page = 1;
    let total = Infinity;
    // Walk-start for the prune cutoff. A full walk that resumes an earlier
    // interrupted walk keeps THAT walk's start time, so docs upserted by the
    // earlier attempt aren't pruned as "unseen".
    let walkStart = startedAt;
    // Safety cap: largest scope today is ~50k docs = 500 pages.
    const HARD_PAGE_CAP = 1200;
    const maxPages = mode === "incremental" ? incrementalPages : HARD_PAGE_CAP;

    if (mode === "full") {
      // Resume an interrupted full walk — TAG-IT 502s intermittently, and a
      // several-hundred-page walk rarely survives in one run. New uploads
      // only push unseen docs to LATER pages (upload-date order), so
      // continuing from the last clean page stays a superset; the rare
      // deletion-shift miss is corrected by the next complete walk.
      const st = await prisma.tagitSyncState
        .findUnique({ where: { scopeId } })
        .catch(() => null);
      const RESUME_MAX_AGE_MS = 48 * 3600_000;
      if (
        st &&
        st.lastFullPage > 0 &&
        st.fullSyncStartedAt &&
        Date.now() - st.fullSyncStartedAt.getTime() < RESUME_MAX_AGE_MS
      ) {
        page = st.lastFullPage + 1;
        walkStart = st.fullSyncStartedAt;
        console.log(
          `rulings-mirror: scope ${scopeId} resuming full walk from page ${page}`,
        );
      } else {
        await prisma.tagitSyncState
          .upsert({
            where: { scopeId },
            create: { scopeId, lastFullPage: 0, fullSyncStartedAt: startedAt },
            update: { lastFullPage: 0, fullSyncStartedAt: startedAt },
          })
          .catch(() => {});
      }
    }

    // A full walk that hits a chronically-slow page must not stall forever:
    // resume would return to the same page every run. We SKIP such a page
    // (never delete anything), flag a gap so we neither prune nor claim a clean
    // full sync, and continue — the next clean-start walk retries it. We bail
    // only when many pages fail in a row (TAG-IT is down, not one slow page).
    let hadGap = false;
    let consecutiveFails = 0;
    const MAX_CONSECUTIVE_FAILS = 5;

    while (page <= maxPages && (page - 1) * PAGE_SIZE < total) {
      let res: { items: UpstreamRulingItem[]; total: number } | null;
      try {
        res = await fetchPagePatiently(scopeId, page);
      } catch (err) {
        if (mode !== "full") throw err; // short incremental — just retry next run
        consecutiveFails += 1;
        if (consecutiveFails >= MAX_CONSECUTIVE_FAILS) throw err;
        hadGap = true;
        const gmsg = err instanceof Error ? err.message : String(err);
        console.warn(
          `rulings-mirror: scope ${scopeId} skipping page ${page} after retries (${gmsg})`,
        );
        // Advance the resume cursor past the bad page so a mid-run interruption
        // still makes forward progress on the next resume.
        await prisma.tagitSyncState
          .updateMany({ where: { scopeId }, data: { lastFullPage: page } })
          .catch(() => {});
        page += 1;
        await new Promise((r) => setTimeout(r, 1_000));
        continue;
      }
      if (!res) {
        throw new Error(
          "RULINGS_API_KEY / CLASS_ACTION_API_KEY not configured",
        );
      }
      consecutiveFails = 0;
      total = res.total || 0;
      result.upstreamTotal = total;
      await upsertBatch(scopeId, res.items);
      result.pagesFetched += 1;
      result.docsUpserted += res.items.length;
      if (mode === "full") {
        await prisma.tagitSyncState
          .updateMany({ where: { scopeId }, data: { lastFullPage: page } })
          .catch(() => {});
      }
      if (res.items.length < PAGE_SIZE) break; // last page
      page += 1;
      // Be gentle with TAG-IT's small box.
      await new Promise((r) => setTimeout(r, 300));
    }

    // Capture the scope's field catalog — the query compiler needs declared
    // types (string[] vs scalar) for exact filter semantics. Best-effort:
    // keep the previously stored schema when the fetch fails.
    const schemaFields = await fetchUpstreamRulingsSchema(scopeId).catch(
      () => null,
    );

    if (mode === "full" && !hadGap) {
      // The walk completed → anything untouched since walkStart no longer
      // exists upstream (deleted / marked duplicate / scope hidden). Guarded:
      // if the candidate count is implausibly large (a resume edge case or a
      // shrunken upstream total), skip pruning and let the next clean walk
      // handle it — never mass-delete on a suspect signal.
      const pruneCandidates = await prisma.tagitDoc.count({
        where: { scopeId, syncedAt: { lt: walkStart } },
      });
      const mirroredNow = await prisma.tagitDoc.count({ where: { scopeId } });
      const pruneCap = Math.max(50, Math.floor(mirroredNow * 0.05));
      if (pruneCandidates > 0 && pruneCandidates <= pruneCap) {
        const pruned = await prisma.tagitDoc.deleteMany({
          where: { scopeId, syncedAt: { lt: walkStart } },
        });
        result.docsPruned = pruned.count;
      } else if (pruneCandidates > pruneCap) {
        console.warn(
          `rulings-mirror: scope ${scopeId} skipping prune of ${pruneCandidates} docs (> cap ${pruneCap})`,
        );
      }
      await prisma.tagitSyncState
        .updateMany({
          where: { scopeId },
          data: { lastFullPage: 0, fullSyncStartedAt: null },
        })
        .catch(() => {});
      await updateSyncState(scopeId, {
        upstreamTotal: result.upstreamTotal,
        lastFullSyncAt: new Date(),
        lastError: null,
        ...(schemaFields ? { fieldSchema: schemaFields } : {}),
      });
    } else if (mode === "full") {
      // Incomplete walk — some pages were skipped after exhausting retries. Do
      // NOT prune (skipped pages' docs are still live) and do NOT claim a clean
      // full sync. Reset the resume cursor so the next run restarts from page 1
      // and retries the gaps.
      await prisma.tagitSyncState
        .updateMany({
          where: { scopeId },
          data: { lastFullPage: 0, fullSyncStartedAt: null },
        })
        .catch(() => {});
      await updateSyncState(scopeId, {
        upstreamTotal: result.upstreamTotal,
        lastError:
          "full walk completed with skipped pages (TAG-IT timeouts) — retried next run",
        ...(schemaFields ? { fieldSchema: schemaFields } : {}),
      });
    } else {
      await updateSyncState(scopeId, {
        upstreamTotal: result.upstreamTotal,
        lastIncrementalAt: new Date(),
        lastError: null,
        ...(schemaFields ? { fieldSchema: schemaFields } : {}),
      });
    }
    result.ok = true;
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.error = msg;
    console.error(
      `rulings-mirror: sync scope=${scopeId} mode=${mode} failed after ${result.pagesFetched} pages: ${msg}`,
    );
    // Keep whatever we upserted (it's still fresher than nothing).
    await updateSyncState(scopeId, {
      ...(result.upstreamTotal !== null
        ? { upstreamTotal: result.upstreamTotal }
        : {}),
      lastError: msg,
    }).catch(() => {});
    return result;
  }
}

// Cross-call overlap guard (single Render instance → module singleton).
let syncInFlight: Promise<SyncRunResult[]> | null = null;

export function isSyncRunning(): boolean {
  return syncInFlight !== null;
}

/**
 * Run a sync across all mirrored scopes; concurrent calls join the run.
 * mode="auto" picks per scope: FULL (with resume) until the scope has ever
 * completed a full walk, then incremental — so the regular 15-min tick keeps
 * chipping away at interrupted bootstraps until every scope is ready.
 */
export function syncAllScopes(
  mode: "incremental" | "full" | "auto",
): Promise<SyncRunResult[]> {
  if (syncInFlight) return syncInFlight;
  syncInFlight = (async () => {
    const results: SyncRunResult[] = [];
    for (const scopeId of mirrorScopes()) {
      let scopeMode: "incremental" | "full" =
        mode === "auto" ? "incremental" : mode;
      if (mode === "auto") {
        const st = await prisma.tagitSyncState
          .findUnique({ where: { scopeId } })
          .catch(() => null);
        if (!st?.lastFullSyncAt) scopeMode = "full";
      }
      results.push(await syncScope(scopeId, scopeMode));
    }
    return results;
  })().finally(() => {
    syncInFlight = null;
  });
  return syncInFlight;
}

/* ═══════════════════════ QUERY ═══════════════════════ */

export interface MirrorState {
  scopeId: number;
  mirroredCount: number;
  upstreamTotal: number | null;
  lastIncrementalAt: Date | null;
  lastFullSyncAt: Date | null;
  lastError: string | null;
}

const readyCache = new Map<number, { ready: boolean; ts: number }>();
const READY_TTL_MS = 60_000;

/** Is the mirror usable for this scope? (has rows + a completed full sync) */
export async function mirrorReady(scopeId: number): Promise<boolean> {
  const c = readyCache.get(scopeId);
  if (c && Date.now() - c.ts < READY_TTL_MS) return c.ready;
  let ready = false;
  try {
    const st = await prisma.tagitSyncState.findUnique({ where: { scopeId } });
    ready = !!st && st.mirroredCount > 0 && st.lastFullSyncAt !== null;
  } catch {
    ready = false;
  }
  readyCache.set(scopeId, { ready, ts: Date.now() });
  return ready;
}

/* ── jsonpath building blocks ── */

// Escape a string for embedding inside a double-quoted jsonpath string
// literal. Values are embedded (not passed as jsonpath vars) so the planner
// can extract `path == const` clauses for the GIN jsonb_path_ops index.
function jpStr(s: string): string {
  let out = '"';
  for (const ch of s) {
    const code = ch.charCodeAt(0);
    if (ch === "\\") out += "\\\\";
    else if (ch === '"') out += '\\"';
    // Control chars would break the literal; they cannot appear in real
    // field values worth matching anyway.
    else if (code < 32) out += " ";
    else out += ch;
  }
  return out + '"';
}

function jpPath(segments: string[]): string {
  return "$" + segments.map((s) => "." + jpStr(s)).join("");
}

function jpNumber(n: number): string {
  return Number.isFinite(n) ? String(n) : "0";
}

// A scalar value as a jsonpath comparison target. TAG-IT string-coerces on
// eq, so a string that looks like a number also matches the number form
// (and vice versa) — mirror that with an OR.
function jpEqTerms(value: string | number | boolean): string[] {
  if (typeof value === "boolean") return [String(value)];
  if (typeof value === "number") {
    return [jpNumber(value), jpStr(String(value))];
  }
  const asNum = Number(value);
  if (value.trim() !== "" && Number.isFinite(asNum)) {
    return [jpStr(value), jpNumber(asNum)];
  }
  return [jpStr(value)];
}

/* ── field-kind probing (array leaf vs scalar) ── */

type FieldKind = "array" | "scalar";

/* Field kinds come from TAG-IT's own field catalog (captured into
   tagit_sync_state.field_schema at sync time): a declared "…[]" type means
   `contains`/`in` are EXACT element matches; anything else is a scalar,
   where `contains` is a substring test — applied per element when the
   stored value is an array (a scalar path that crossed an array of
   objects, e.g. sql."טענות_סעיפי_חוק_שנדונו.שם_חוק_רשמי"). This mirrors
   exactly how TAG-IT itself switches on its schema type. */

const typesCache = new Map<
  number,
  { types: Map<string, string>; ts: number }
>();
const TYPES_TTL_MS = 10 * 60_000;

async function getFieldTypes(scopeId: number): Promise<Map<string, string>> {
  const c = typesCache.get(scopeId);
  if (c && Date.now() - c.ts < TYPES_TTL_MS) return c.types;
  const types = new Map<string, string>();
  try {
    const st = await prisma.tagitSyncState.findUnique({ where: { scopeId } });
    const fields = (st?.fieldSchema ?? []) as Array<{
      key?: string;
      type?: string;
    }>;
    if (Array.isArray(fields)) {
      for (const f of fields) {
        if (f && typeof f.key === "string" && typeof f.type === "string") {
          types.set(f.key, f.type);
        }
      }
    }
  } catch {
    // leave empty — kindOf falls back to a data probe
  }
  typesCache.set(scopeId, { types, ts: Date.now() });
  return types;
}

const kindCache = new Map<string, { kind: FieldKind; ts: number }>();
const KIND_TTL_MS = 30 * 60_000;

async function fieldKind(scopeId: number, field: string): Promise<FieldKind> {
  const types = await getFieldTypes(scopeId);
  const t = types.get(field);
  if (t) return t.endsWith("[]") ? "array" : "scalar";
  // Schema missing (pre-first-sync, or an unadvertised field) — probe the
  // data: an array VALUE at the path is only "array-kind" when we have no
  // better information. Cached; approximation only used in fallback windows.
  const segments = segmentsOf(field);
  const key = `${scopeId}|${field}`;
  const c = kindCache.get(key);
  if (c && Date.now() - c.ts < KIND_TTL_MS) return c.kind;
  let kind: FieldKind = "scalar";
  try {
    const rows = await prisma.$queryRawUnsafe<{ t: string | null }[]>(
      `SELECT jsonb_typeof(data #> $2::text[]) AS t
         FROM tagit_docs
        WHERE scope_id = $1 AND data #> $2::text[] IS NOT NULL
        LIMIT 1`,
      scopeId,
      segments,
    );
    if (rows.length > 0 && rows[0].t === "array") kind = "array";
  } catch {
    kind = "scalar";
  }
  kindCache.set(key, { kind, ts: Date.now() });
  return kind;
}

function collectLeafFields(expr: FilterExpression, out: Set<string>) {
  const e = expr as unknown as Record<string, unknown>;
  if (e.op === "and" || e.op === "or") {
    for (const c of (e.clauses as FilterExpression[]) || []) {
      collectLeafFields(c, out);
    }
    return;
  }
  if (e.op === "not") {
    collectLeafFields(e.clause as FilterExpression, out);
    return;
  }
  if (typeof e.field === "string") out.add(e.field);
}

/* ── filter compilation ── */

class ParamSink {
  params: unknown[] = [];
  constructor(initial: unknown[] = []) {
    this.params = initial;
  }
  add(v: unknown): string {
    this.params.push(v);
    return `$${this.params.length}`;
  }
}

class MirrorCompileError extends Error {}

// TAG-IT's response groups fields under ai/sql/meta with the REMAINDER of
// the schema key as ONE flat key — dots included. E.g. the schema key
// "sql.טענות_סעיפי_חוק_שנדונו.שם_חוק_רשמי" is stored as
// data.sql["טענות_סעיפי_חוק_שנדונו.שם_חוק_רשמי"], NOT as nested objects.
// So a field always maps to at most two path segments: [group, flatKey].
function segmentsOf(field: string): string[] {
  const dot = field.indexOf(".");
  if (dot < 0) return [field];
  return [field.slice(0, dot), field.slice(dot + 1)];
}

function compileLeaf(
  leaf: LeafFilter,
  kinds: Map<string, FieldKind>,
  sink: ParamSink,
): string {
  const field = leaf.field;
  const op = leaf.op;
  const value = leaf.value;
  const segments = segmentsOf(field);
  if (segments.length === 0) throw new MirrorCompileError("empty field");

  // Promoted shortcuts — real columns, index-backed.
  if (field === "meta.id" && op === "eq") {
    return `doc_id = ${sink.add(Number(value))}::int`;
  }
  if (
    field === "meta.document_date" &&
    (op === "ge" || op === "le" || op === "gt" || op === "lt") &&
    typeof value === "string"
  ) {
    const cmp = { ge: ">=", le: "<=", gt: ">", lt: "<" }[op];
    return `document_date ${cmp} ${sink.add(value)}::timestamptz`;
  }

  const kind = kinds.get(field) ?? "scalar";
  const path = jpPath(segments);
  const arrPath = jpPath(segments) + "[*]";
  const jpParam = (jp: string) => `data @? ${sink.add(jp)}::jsonpath`;

  const scalarValue =
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
      ? value
      : null;

  switch (op) {
    case "is_null":
    case "not_null": {
      const existsPred = `${path} ? (@ != null && (@.type() != "string" || @ != ""))`;
      const exists = jpParam(existsPred);
      return op === "not_null" ? exists : `NOT (${exists})`;
    }

    case "eq":
    case "ne": {
      if (scalarValue === null) throw new MirrorCompileError("eq needs scalar");
      const terms = jpEqTerms(scalarValue);
      const base = kind === "array" ? arrPath : path;
      const cmp = op === "eq" ? "==" : "!=";
      const joiner = op === "eq" ? " || " : " && ";
      const pred = terms.map((t) => `@ ${cmp} ${t}`).join(joiner);
      return jpParam(`${base} ? (${pred})`);
    }

    case "contains": {
      if (scalarValue === null)
        throw new MirrorCompileError("contains needs scalar");
      if (kind === "array") {
        // TAG-IT: array contains = EXACT element equality.
        const pred = jpEqTerms(scalarValue)
          .map((t) => `@ == ${t}`)
          .join(" || ");
        return jpParam(`${arrPath} ? (${pred})`);
      }
      // Scalar (incl. crossed-array): case-insensitive substring. flag "q"
      // makes the pattern literal, "i" case-insensitive; like_regex is a
      // search (unanchored), i.e. substring semantics.
      const pat = jpStr(String(scalarValue));
      return jpParam(
        `${path} ? (@.type() == "string" && @ like_regex ${pat} flag "iq")`,
      );
    }

    case "starts_with": {
      if (scalarValue === null)
        throw new MirrorCompileError("starts_with needs scalar");
      return jpParam(
        `${path} ? (@.type() == "string" && @ starts with ${jpStr(String(scalarValue))})`,
      );
    }

    case "in": {
      const list = Array.isArray(value) ? value : [];
      if (list.length === 0) return "FALSE";
      const base = kind === "array" ? arrPath : path;
      const pred = list
        .flatMap((v) =>
          jpEqTerms(v as string | number | boolean).map((t) => `@ == ${t}`),
        )
        .join(" || ");
      return jpParam(`${base} ? (${pred})`);
    }

    case "gt":
    case "ge":
    case "lt":
    case "le": {
      const cmp = { gt: ">", ge: ">=", lt: "<", le: "<=" }[op];
      if (typeof value === "number") {
        const n = jpNumber(value);
        return jpParam(
          `${path} ? ((@.type() == "number" && @ ${cmp} ${n}) || (@.type() == "string" && @.double() ${cmp} ${n}))`,
        );
      }
      if (typeof value === "string") {
        // ISO date (or plain string) — lexicographic, like TAG-IT.
        return jpParam(
          `${path} ? (@.type() == "string" && @ ${cmp} ${jpStr(value)})`,
        );
      }
      throw new MirrorCompileError(`range op ${op} needs string|number`);
    }

    default:
      throw new MirrorCompileError(`unsupported op ${String(op)}`);
  }
}

function compileExpr(
  expr: FilterExpression,
  kinds: Map<string, FieldKind>,
  sink: ParamSink,
): string {
  const e = expr as unknown as Record<string, unknown>;
  if (e.op === "and" || e.op === "or") {
    const clauses = (e.clauses as FilterExpression[]) || [];
    if (clauses.length === 0) return "TRUE";
    const parts = clauses.map((c) => compileExpr(c, kinds, sink));
    return "(" + parts.join(e.op === "and" ? " AND " : " OR ") + ")";
  }
  if (e.op === "not") {
    return `NOT (${compileExpr(e.clause as FilterExpression, kinds, sink)})`;
  }
  return compileLeaf(expr as LeafFilter, kinds, sink);
}

/* ── sort compilation ── */

function compileOrder(
  sortKey: string | null,
  desc: boolean,
  sink: ParamSink,
): string {
  const dir = desc ? "DESC" : "ASC";
  if (!sortKey || sortKey === "meta.document_date") {
    return `document_date ${dir} NULLS LAST, doc_id DESC`;
  }
  const segments = segmentsOf(sortKey);
  const jp = sink.add(jpPath(segments));
  // Numeric-aware: JSON numbers sort numerically, everything else (ISO date
  // strings etc.) lexicographically. Two keys so mixed corpora stay sane.
  const first = `jsonb_path_query_first(data, ${jp}::jsonpath)`;
  return (
    `(CASE WHEN jsonb_typeof(${first}) = 'number' THEN (${first})::text::numeric END) ${dir} NULLS LAST, ` +
    `(${first} #>> '{}') ${dir} NULLS LAST, doc_id DESC`
  );
}

/* ── public query API ── */

export interface MirrorQueryOptions {
  scopeId: number;
  filter?: FilterExpression | null;
  sortKey?: string | null; // e.g. "meta.document_date", "ai.תאריך_המסמך"
  sortDesc?: boolean;
}

export interface MirrorPageResult {
  items: UpstreamRulingItem[];
  total: number;
}

async function buildWhere(
  opts: MirrorQueryOptions,
  sink: ParamSink,
): Promise<string> {
  let where = `scope_id = ${sink.add(opts.scopeId)}::int`;
  if (opts.filter) {
    const fields = new Set<string>();
    collectLeafFields(opts.filter, fields);
    const kinds = new Map<string, FieldKind>();
    await Promise.all(
      [...fields].map(async (f) => {
        kinds.set(f, await fieldKind(opts.scopeId, f));
      }),
    );
    where += " AND " + compileExpr(opts.filter, kinds, sink);
  }
  return where;
}

function rowToItem(row: { doc_id: number; data: unknown }): UpstreamRulingItem {
  const data =
    typeof row.data === "string"
      ? (JSON.parse(row.data) as Record<string, unknown>)
      : ((row.data ?? {}) as Record<string, unknown>);
  return { ...(data as UpstreamRulingItem), id: row.doc_id };
}

/**
 * One page from the mirror — same contract as fetchUpstreamRulingsPage.
 * Throws MirrorCompileError (or DB errors) — the route catches and falls
 * back to the upstream path.
 */
export async function queryMirrorPage(
  opts: MirrorQueryOptions & { page: number; size: number },
): Promise<MirrorPageResult> {
  const sink = new ParamSink();
  const where = await buildWhere(opts, sink);
  const order = compileOrder(opts.sortKey ?? null, opts.sortDesc ?? true, sink);
  const limit = sink.add(opts.size);
  const offset = sink.add((opts.page - 1) * opts.size);
  const pageSql = `
    SELECT doc_id, data FROM tagit_docs
    WHERE ${where}
    ORDER BY ${order}
    LIMIT ${limit}::int OFFSET ${offset}::int`;
  // Count reuses only the WHERE params (they were added first, so the
  // count statement's placeholders line up as long as we snapshot before
  // LIMIT/OFFSET were added — easier: run count with its own sink).
  const countSink = new ParamSink();
  const countWhere = await buildWhere(opts, countSink);
  const [rows, countRows] = await Promise.all([
    prisma.$queryRawUnsafe<{ doc_id: number; data: unknown }[]>(
      pageSql,
      ...sink.params,
    ),
    prisma.$queryRawUnsafe<{ n: number }[]>(
      `SELECT count(*)::int AS n FROM tagit_docs WHERE ${countWhere}`,
      ...countSink.params,
    ),
  ]);
  return {
    items: rows.map(rowToItem),
    total: countRows[0]?.n ?? 0,
  };
}

/**
 * Bulk snapshot for the in-memory law/section filter path — replaces the
 * 10–30s fetchAllUpstreamRulings crawl. Cap matches the old MAX_PAGES×100.
 */
export async function queryMirrorBulk(
  opts: MirrorQueryOptions & { limit?: number },
): Promise<UpstreamRulingItem[]> {
  const sink = new ParamSink();
  const where = await buildWhere(opts, sink);
  const order = compileOrder(opts.sortKey ?? null, opts.sortDesc ?? true, sink);
  const limit = sink.add(Math.min(opts.limit ?? 3000, 10_000));
  const rows = await prisma.$queryRawUnsafe<{ doc_id: number; data: unknown }[]>(
    `SELECT doc_id, data FROM tagit_docs
      WHERE ${where}
      ORDER BY ${order}
      LIMIT ${limit}::int`,
    ...sink.params,
  );
  return rows.map(rowToItem);
}

/**
 * Single-document lookup by TAG-IT id (ids are globally unique across
 * scopes). Serves the /rulings/[id] detail page without touching TAG-IT.
 */
export async function findMirrorDoc(
  docId: number,
): Promise<{ scopeId: number; item: UpstreamRulingItem } | null> {
  if (!Number.isInteger(docId)) return null;
  const row = await prisma.tagitDoc.findFirst({ where: { docId } });
  if (!row) return null;
  return {
    scopeId: row.scopeId,
    item: rowToItem({ doc_id: row.docId, data: row.data }),
  };
}

/** Sync-state rows for the admin/status endpoint. */
export async function mirrorStates(): Promise<MirrorState[]> {
  const rows = await prisma.tagitSyncState.findMany({
    orderBy: { scopeId: "asc" },
  });
  return rows.map((r) => ({
    scopeId: r.scopeId,
    mirroredCount: r.mirroredCount,
    upstreamTotal: r.upstreamTotal,
    lastIncrementalAt: r.lastIncrementalAt,
    lastFullSyncAt: r.lastFullSyncAt,
    lastError: r.lastError,
  }));
}
