import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";

// ----------------------------------------------------------------------------
// Mutable mock state. The mocked modules read from these globals so each test
// can set the "session" and inspect/replay DB calls without re-mocking.
// ----------------------------------------------------------------------------
type Session = { user?: { id?: string; email?: string; role?: string } } | null;

const state: {
  session: Session;
  dbCalls: { model: string; method: string; args: any[] }[];
  impl: Record<string, Record<string, (...a: any[]) => any>>;
} = { session: null, dbCalls: [], impl: {} };

beforeEach(() => {
  state.session = null;
  state.dbCalls = [];
  state.impl = {};
});

// Mock @/lib/auth → auth() returns whatever the current test set.
mock.module("@/lib/auth", {
  namedExports: { auth: async () => state.session },
});

// Mock @/lib/prisma → a Proxy that records every model.method(...) call and
// returns canned data from state.impl when provided.
const prisma = new Proxy(
  {},
  {
    get(_t, model: string) {
      return new Proxy(
        {},
        {
          get(_t2, method: string) {
            return async (...args: any[]) => {
              state.dbCalls.push({ model, method, args });
              const fn = state.impl?.[model]?.[method];
              return fn ? fn(...args) : undefined;
            };
          },
        },
      );
    },
  },
);
mock.module("@/lib/prisma", { namedExports: { prisma } });

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------
const GUEST: Session = { user: { id: "g1", email: "guest@example.com", role: "GUEST" } };
const ADMIN: Session = { user: { id: "a1", email: "admin@example.com", role: "ADMIN" } };

function jsonReq(url: string, init: RequestInit = {}) {
  return new NextRequest(url, {
    ...init,
    headers: { "content-type": "application/json", ...(init.headers || {}) },
  });
}
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const lastCall = (model: string, method: string) =>
  state.dbCalls.find((c) => c.model === model && c.method === method);
const called = (model: string, method: string) => !!lastCall(model, method);

// Generous canned rows so handlers' serialize() never crashes regardless of
// which fields it touches (unknown keys → null; any *date* key → a Date).
function cannedRow(extra: Record<string, any> = {}) {
  return new Proxy(
    { id: 1, ...extra },
    {
      get(t: any, k: string) {
        if (k in t) return t[k];
        if (typeof k === "string" && /date|expires|scheduled|_at|until|from/i.test(k)) return new Date();
        return null;
      },
      has() {
        return true;
      },
    },
  );
}
const cannedComment = () => cannedRow({ content: "x", authorName: "a", isAdmin: false, isHidden: false });
const cannedMessage = () => cannedRow({ title: "t", content: "x", isArchived: false, orderIndex: 0 });
const cannedReport = () => cannedRow({ description: "d", status: "open", isHidden: false, isScheduled: false });

// ============================================================================
// #1 — Reflected XSS in MCP OAuth callback `error` param
// ============================================================================
test("#1 callback escapes attacker-controlled error param (no raw <script>)", async () => {
  const { GET } = await import("@/app/api/mcp/foi-guide/oauth/callback/route");
  const payload = "<script>alert(1)</script>";
  const res = await GET(
    jsonReq(`https://z-g.co.il/api/mcp/foi-guide/oauth/callback?error=${encodeURIComponent(payload)}`),
  );
  const body = await res.text();
  assert.ok(!body.includes(payload), "raw <script> payload reflected into HTML (XSS)");
  assert.ok(body.includes("&lt;script&gt;"), "error value should be HTML-escaped");
});

// ============================================================================
// #2 — pach PATCH must require ADMIN role, not just authentication
// ============================================================================
test("#2a comments PATCH: GUEST is rejected (403) and no update runs", async () => {
  state.session = GUEST;
  state.impl = { pachComment: { update: () => cannedComment() } };
  const { PATCH } = await import("@/app/api/pach-hamishpat/comments/[id]/route");
  const res = await PATCH(
    jsonReq("https://z-g.co.il/api/pach-hamishpat/comments/1", {
      method: "PATCH",
      body: JSON.stringify({ is_admin: true, is_hidden: true }),
    }),
    ctx("1"),
  );
  assert.equal(res.status, 403, "GUEST must not be allowed to moderate comments");
  assert.equal(called("pachComment", "update"), false, "no DB write should happen for GUEST");
});

test("#2b messages PATCH: GUEST is rejected (403) and no update runs", async () => {
  state.session = GUEST;
  state.impl = { pachSystemMessage: { update: () => cannedMessage() } };
  const { PATCH } = await import("@/app/api/pach-hamishpat/messages/[id]/route");
  const res = await PATCH(
    jsonReq("https://z-g.co.il/api/pach-hamishpat/messages/1", {
      method: "PATCH",
      body: JSON.stringify({ is_archived: true }),
    }),
    ctx("1"),
  );
  assert.equal(res.status, 403);
  assert.equal(called("pachSystemMessage", "update"), false);
});

test("#2c reports PATCH: GUEST is rejected (403) and no update runs", async () => {
  state.session = GUEST;
  state.impl = { pachReport: { update: () => cannedReport() } };
  const { PATCH } = await import("@/app/api/pach-hamishpat/reports/[id]/route");
  const res = await PATCH(
    jsonReq("https://z-g.co.il/api/pach-hamishpat/reports/1", {
      method: "PATCH",
      body: JSON.stringify({ is_hidden: true }),
    }),
    ctx("1"),
  );
  assert.equal(res.status, 403);
  assert.equal(called("pachReport", "update"), false);
});

test("#2d regression: ADMIN can still moderate comments (200 + update runs)", async () => {
  state.session = ADMIN;
  state.impl = { pachComment: { update: () => cannedComment() } };
  const { PATCH } = await import("@/app/api/pach-hamishpat/comments/[id]/route");
  const res = await PATCH(
    jsonReq("https://z-g.co.il/api/pach-hamishpat/comments/1", {
      method: "PATCH",
      body: JSON.stringify({ is_hidden: true }),
    }),
    ctx("1"),
  );
  assert.equal(res.status, 200, "ADMIN moderation must keep working");
  assert.equal(called("pachComment", "update"), true);
});

test("#2e messages POST: GUEST is rejected (403) and no create runs", async () => {
  state.session = GUEST;
  state.impl = { pachSystemMessage: { create: () => cannedMessage() } };
  const { POST } = await import("@/app/api/pach-hamishpat/messages/route");
  const res = await POST(
    jsonReq("https://z-g.co.il/api/pach-hamishpat/messages", {
      method: "POST",
      body: JSON.stringify({ title: "הודעת מערכת מזויפת", content: "spoofed" }),
    }),
  );
  assert.equal(res.status, 403, "GUEST must not be able to publish system messages");
  assert.equal(called("pachSystemMessage", "create"), false, "no DB write should happen for GUEST");
});

test("#2f regression: ADMIN can still create system messages (200 + create runs)", async () => {
  state.session = ADMIN;
  state.impl = { pachSystemMessage: { create: () => cannedMessage() } };
  const { POST } = await import("@/app/api/pach-hamishpat/messages/route");
  const res = await POST(
    jsonReq("https://z-g.co.il/api/pach-hamishpat/messages", {
      method: "POST",
      body: JSON.stringify({ title: "t", content: "x", order_index: 0 }),
    }),
  );
  assert.equal(res.status, 200, "ADMIN message creation must keep working");
  assert.equal(called("pachSystemMessage", "create"), true);
});

// ============================================================================
// #3 — pach GET must not let anonymous callers read hidden (moderated) rows
// ============================================================================
test("#3a comments GET: anonymous ?is_hidden=true is forced to isHidden:false", async () => {
  state.session = null;
  state.impl = { pachComment: { findMany: () => [] } };
  const { GET } = await import("@/app/api/pach-hamishpat/comments/route");
  await GET(jsonReq("https://z-g.co.il/api/pach-hamishpat/comments?is_hidden=true"));
  const call = lastCall("pachComment", "findMany");
  assert.ok(call, "findMany should be called");
  assert.equal(call!.args[0]?.where?.isHidden, false, "anon must not query hidden rows");
});

test("#3b reports GET: anonymous ?is_hidden=true is forced to isHidden:false", async () => {
  state.session = null;
  state.impl = { pachReport: { findMany: () => [] } };
  const { GET } = await import("@/app/api/pach-hamishpat/reports/route");
  await GET(jsonReq("https://z-g.co.il/api/pach-hamishpat/reports?is_hidden=true"));
  const call = lastCall("pachReport", "findMany");
  assert.ok(call, "findMany should be called");
  assert.equal(call!.args[0]?.where?.isHidden, false, "anon must not query hidden rows");
});

test("#3c regression: ADMIN ?is_hidden=true still queries hidden rows", async () => {
  state.session = ADMIN;
  state.impl = { pachComment: { findMany: () => [] } };
  const { GET } = await import("@/app/api/pach-hamishpat/comments/route");
  await GET(jsonReq("https://z-g.co.il/api/pach-hamishpat/comments?is_hidden=true"));
  const call = lastCall("pachComment", "findMany");
  assert.equal(call!.args[0]?.where?.isHidden, true, "admin must still see hidden rows");
});

// ============================================================================
// #4 — public pach comments POST must be rate-limited
// ============================================================================
test("#4 comments POST: anonymous flood from one IP eventually hits 429", async () => {
  state.session = null;
  state.impl = { pachComment: { create: () => cannedComment() } };
  const { POST } = await import("@/app/api/pach-hamishpat/comments/route");
  const ip = "203.0.113.99"; // fixed test IP
  let got429 = false;
  for (let i = 0; i < 25; i++) {
    const res = await POST(
      jsonReq("https://z-g.co.il/api/pach-hamishpat/comments", {
        method: "POST",
        headers: { "x-forwarded-for": ip },
        body: JSON.stringify({ content: `spam ${i}`, author_name: "bot" }),
      }),
    );
    if (res.status === 429) got429 = true;
  }
  assert.ok(got429, "unauthenticated comment flood must be rate limited (429)");
});

// ============================================================================
// #6 — expensive public endpoints must be rate-limited
// ============================================================================
test("#6a sanegoria GET: flood from one IP eventually hits 429", async () => {
  state.session = null;
  const { GET } = await import("@/app/api/sanegoria/route");
  const ip = "203.0.113.61";
  let got429 = false;
  for (let i = 0; i < 45; i++) {
    const res = await GET(
      jsonReq("https://z-g.co.il/api/sanegoria", { headers: { "x-forwarded-for": ip } }),
    );
    if (res.status === 429) got429 = true;
  }
  assert.ok(got429, "expensive sanegoria aggregate endpoint must be rate limited");
});

test("#6b guidelines/search GET: flood from one IP eventually hits 429", async () => {
  state.session = null;
  const { GET } = await import("@/app/api/guidelines/search/route");
  const ip = "203.0.113.62";
  let got429 = false;
  // Empty q would normally 400 immediately — rate limiting must fire FIRST,
  // before any expensive embedding/corpus work, so the flood still trips 429.
  for (let i = 0; i < 45; i++) {
    const res = await GET(
      jsonReq("https://z-g.co.il/api/guidelines/search?q=", { headers: { "x-forwarded-for": ip } }),
    );
    if (res.status === 429) got429 = true;
  }
  assert.ok(got429, "expensive guidelines search endpoint must be rate limited");
});

// The public document/rulings endpoints fan out to TAG-IT and the DB. The
// requests before the limit trips are irrelevant to what's under test, so stub
// fetch to fail instantly rather than let the flood hit real upstreams. With
// prisma mocked too, those calls may throw or error out — fine. All that
// matters is that once the per-IP limit trips, the handler returns 429 *before*
// doing any work.
async function floodsTo429(
  GET: (req: NextRequest) => Promise<Response>,
  url: string,
  ip: string,
  attempts = 45,
) {
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new Error("upstream disabled in test");
  }) as typeof fetch;
  try {
    for (let i = 0; i < attempts; i++) {
      try {
        const res = await GET(jsonReq(url, { headers: { "x-forwarded-for": ip } }));
        if (res.status === 429) return true;
      } catch {
        // upstream/DB failure in the un-limited prefix — keep flooding
      }
    }
    return false;
  } finally {
    globalThis.fetch = realFetch;
  }
}

test("#6c rulings GET: flood from one IP eventually hits 429", async () => {
  const { GET } = await import("@/app/api/rulings/route");
  assert.ok(
    await floodsTo429(GET as any, "https://z-g.co.il/api/rulings?category=defamation", "203.0.113.63"),
    "rulings endpoint fans out to TAG-IT and must be rate limited",
  );
});

test("#6d mmm/documents GET: flood from one IP eventually hits 429", async () => {
  const { GET } = await import("@/app/api/mmm/documents/route");
  assert.ok(
    await floodsTo429(GET as any, "https://z-g.co.il/api/mmm/documents", "203.0.113.64"),
    "mmm documents endpoint must be rate limited",
  );
});

test("#6e comptroller-reports/documents GET: flood from one IP eventually hits 429", async () => {
  const { GET } = await import("@/app/api/comptroller-reports/documents/route");
  assert.ok(
    await floodsTo429(GET as any, "https://z-g.co.il/api/comptroller-reports/documents", "203.0.113.65"),
    "comptroller documents endpoint must be rate limited",
  );
});

test("#6f class-actions/documents GET: flood from one IP eventually hits 429", async () => {
  const { GET } = await import("@/app/api/class-actions/documents/route");
  assert.ok(
    await floodsTo429(GET as any, "https://z-g.co.il/api/class-actions/documents", "203.0.113.66"),
    "class-actions documents endpoint must be rate limited",
  );
});

test("#6g guidelines/documents GET: flood from one IP eventually hits 429", async () => {
  const { GET } = await import("@/app/api/guidelines/documents/route");
  assert.ok(
    await floodsTo429(GET as any, "https://z-g.co.il/api/guidelines/documents", "203.0.113.67"),
    "guidelines documents endpoint must be rate limited",
  );
});

test("#6h regression: a different IP is not affected by another IP's flood", async () => {
  const { GET } = await import("@/app/api/mmm/documents/route");
  assert.ok(await floodsTo429(GET as any, "https://z-g.co.il/api/mmm/documents", "203.0.113.68"));
  // A fresh IP must still get through the limiter (not a 429) on its first call.
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new Error("upstream disabled in test");
  }) as typeof fetch;
  let status: number | null = null;
  try {
    const res = await GET(
      jsonReq("https://z-g.co.il/api/mmm/documents", {
        headers: { "x-forwarded-for": "203.0.113.69" },
      }) as any,
    );
    status = res.status;
  } catch {
    status = null; // upstream failure — the point is it wasn't rejected as 429
  } finally {
    globalThis.fetch = realFetch;
  }
  assert.notEqual(status, 429, "rate limit must be per-IP, not global");
});

// ============================================================================
// #7 — TipTap link hrefs must reject dangerous URL schemes (XSS hardening)
// ============================================================================
test("#7 safeHref neutralizes javascript:/data:/vbscript: schemes", async () => {
  const mod: any = await import("@/lib/utils");
  assert.equal(typeof mod.safeHref, "function", "safeHref helper must exist");
  const blocked = [
    "javascript:alert(1)",
    "  JavaScript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "\tjavascript:alert(1)",
  ];
  for (const h of blocked) {
    assert.equal(mod.safeHref(h), "#", `must block: ${JSON.stringify(h)}`);
  }
  // Legitimate links pass through unchanged.
  assert.equal(mod.safeHref("https://example.com/x"), "https://example.com/x");
  assert.equal(mod.safeHref("/relative/path"), "/relative/path");
  assert.equal(mod.safeHref("mailto:a@b.com"), "mailto:a@b.com");
});

// ============================================================================
// #T5 — MCP OAuth: redirect_uri allow-list + interactive consent
// ============================================================================
test("#T5a isAllowedRedirectUri: only https + loopback http pass", async () => {
  const mod: any = await import("@/lib/mcp-oauth");
  const ok = [
    "https://claude.ai/api/mcp/auth/callback",
    "https://example.com/cb",
    "http://localhost:6274/oauth/callback",
    "http://127.0.0.1:8080/cb",
    "http://[::1]/cb",
  ];
  const bad = [
    "http://evil.com/cb", // remote http — the phishing case
    "ftp://x/cb",
    "javascript:alert(1)",
    "data:text/html,x",
    "https://good.example/cb#frag", // fragment illegal in redirect_uri
    "https://evil@good.example/cb", // userinfo display-spoof
    "not a url",
  ];
  for (const u of ok) assert.equal(mod.isAllowedRedirectUri(u), true, `should allow: ${u}`);
  for (const u of bad) assert.equal(mod.isAllowedRedirectUri(u), false, `should reject: ${u}`);
});

test("#T5b register: rejects a non-loopback http redirect_uri (400, no client created)", async () => {
  state.impl = { mcpOauthClient: { create: () => ({ clientId: "x", clientName: null, redirectUris: [] }) } };
  const { POST } = await import("@/app/api/mcp/foi-guide/oauth/register/route");
  const res = await POST(
    jsonReq("https://z-g.co.il/api/mcp/foi-guide/oauth/register", {
      method: "POST",
      body: JSON.stringify({ client_name: "phish", redirect_uris: ["http://evil.com/cb"] }),
    }),
  );
  assert.equal(res.status, 400, "unconstrained redirect_uri must be rejected at registration");
  assert.equal(called("mcpOauthClient", "create"), false, "no client row for a bad redirect_uri");
});

test("#T5c register: accepts https + loopback (client created)", async () => {
  state.impl = {
    mcpOauthClient: {
      create: (a: any) => ({
        clientId: "mcp_test",
        clientName: a.data.clientName,
        redirectUris: a.data.redirectUris,
      }),
    },
  };
  const { POST } = await import("@/app/api/mcp/foi-guide/oauth/register/route");
  const res = await POST(
    jsonReq("https://z-g.co.il/api/mcp/foi-guide/oauth/register", {
      method: "POST",
      body: JSON.stringify({
        client_name: "Claude",
        redirect_uris: ["https://claude.ai/api/mcp/auth/callback", "http://localhost:6274/cb"],
      }),
    }),
  );
  assert.equal(res.status, 201, "standard MCP clients must still register");
  assert.equal(called("mcpOauthClient", "create"), true);
});

test("#T5d consent domain separation: a signed state cannot pose as a consent ticket", async () => {
  const mod: any = await import("@/lib/mcp-oauth");
  const stateTok = mod.signState({
    clientId: "c",
    redirectUri: "https://claude.ai/cb",
    codeChallenge: "x",
    codeChallengeMethod: "S256",
    nonce: "n",
    exp: Math.floor(Date.now() / 1000) + 600,
  });
  // The client fully controls `state`; it must NOT verify as a consent ticket,
  // or the consent screen could be skipped by replaying it into /consent.
  assert.equal(mod.verifyConsent(stateTok), null, "state token must not validate as consent");
  // And a real consent ticket must not validate as state.
  const consentTok = mod.signConsent({
    clientId: "c",
    redirectUri: "https://claude.ai/cb",
    codeChallenge: "x",
    codeChallengeMethod: "S256",
    email: "u@example.com",
    clientName: "Claude",
    nonce: "n",
    exp: Math.floor(Date.now() / 1000) + 600,
  });
  assert.equal(mod.verifyState(consentTok), null, "consent ticket must not validate as state");
});

function formReq(url: string, fields: Record<string, string>) {
  return new NextRequest(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields).toString(),
  });
}

test("#T5e consent: 'deny' redirects with access_denied and mints no auth code", async () => {
  const mod: any = await import("@/lib/mcp-oauth");
  state.impl = { mcpOauthAuthCode: { create: () => ({}) } };
  const ticket = mod.signConsent({
    clientId: "c",
    redirectUri: "https://claude.ai/cb",
    codeChallenge: "x",
    codeChallengeMethod: "S256",
    email: "u@example.com",
    clientName: "Claude",
    nonce: "n",
    exp: Math.floor(Date.now() / 1000) + 600,
    state: "abc",
  });
  const { POST } = await import("@/app/api/mcp/foi-guide/oauth/consent/route");
  const res = await POST(
    formReq("https://z-g.co.il/api/mcp/foi-guide/oauth/consent", { ticket, decision: "deny" }),
  );
  assert.equal(res.status, 303);
  const loc = res.headers.get("location") ?? "";
  assert.ok(loc.includes("error=access_denied"), "denial must report access_denied to the client");
  assert.ok(!loc.includes("code="), "no auth code on denial");
  assert.equal(called("mcpOauthAuthCode", "create"), false, "denial must not create an auth code");
});

test("#T5f consent: 'approve' by an invited user mints exactly one auth code", async () => {
  const mod: any = await import("@/lib/mcp-oauth");
  state.impl = {
    mcpInvite: { findUnique: () => ({ email: "u@example.com" }) },
    mcpOauthAuthCode: { create: (a: any) => ({ ...a.data }) },
  };
  const ticket = mod.signConsent({
    clientId: "c",
    redirectUri: "https://claude.ai/cb",
    codeChallenge: "x",
    codeChallengeMethod: "S256",
    email: "u@example.com",
    clientName: "Claude",
    nonce: "n",
    exp: Math.floor(Date.now() / 1000) + 600,
  });
  const { POST } = await import("@/app/api/mcp/foi-guide/oauth/consent/route");
  const res = await POST(
    formReq("https://z-g.co.il/api/mcp/foi-guide/oauth/consent", { ticket, decision: "approve" }),
  );
  assert.equal(res.status, 303);
  const loc = res.headers.get("location") ?? "";
  assert.ok(/[?&]code=/.test(loc), "approval must return an auth code to the client");
  assert.equal(called("mcpOauthAuthCode", "create"), true, "approval creates the auth code");
});

// ============================================================================
// #T6 — public POSTs: body-size ceiling + field length caps + smaller default limit
// ============================================================================
test("#T6a comments POST: an oversized body is rejected (413) before any DB write", async () => {
  state.session = null;
  state.impl = { pachComment: { create: () => cannedComment() } };
  const { POST } = await import("@/app/api/pach-hamishpat/comments/route");
  const huge = "x".repeat(70 * 1024); // > 64KB cap
  const res = await POST(
    jsonReq("https://z-g.co.il/api/pach-hamishpat/comments", {
      method: "POST",
      headers: { "x-forwarded-for": "203.0.113.10" },
      body: JSON.stringify({ content: huge }),
    }),
  );
  assert.equal(res.status, 413, "body over the size cap must be rejected");
  assert.equal(called("pachComment", "create"), false, "no DB write for an oversized body");
});

test("#T6b comments POST: content over the field cap is rejected (400)", async () => {
  state.session = null;
  state.impl = { pachComment: { create: () => cannedComment() } };
  const { POST } = await import("@/app/api/pach-hamishpat/comments/route");
  const long = "a".repeat(3000); // under 64KB body, over the 2000-char field cap
  const res = await POST(
    jsonReq("https://z-g.co.il/api/pach-hamishpat/comments", {
      method: "POST",
      headers: { "x-forwarded-for": "203.0.113.11" },
      body: JSON.stringify({ content: long }),
    }),
  );
  assert.equal(res.status, 400, "over-long comment content must be rejected");
  assert.equal(called("pachComment", "create"), false);
});

test("#T6c submissionSchema enforces .max() on stored fields", async () => {
  const { submissionSchema } = await import("@/lib/validations");
  const base = { name: "Test", email: "a@b.com", message: "hello world!" };
  assert.equal(submissionSchema.safeParse(base).success, true, "a normal submission is valid");
  assert.equal(
    submissionSchema.safeParse({ ...base, message: "z".repeat(6000) }).success,
    false,
    "an over-long message must fail validation",
  );
  assert.equal(
    submissionSchema.safeParse({ ...base, name: "n".repeat(200) }).success,
    false,
    "an over-long name must fail validation",
  );
});

test("#T6d comments GET: default page size is 50 (was 500)", async () => {
  state.session = null;
  state.impl = { pachComment: { findMany: () => [] } };
  const { GET } = await import("@/app/api/pach-hamishpat/comments/route");
  await GET(jsonReq("https://z-g.co.il/api/pach-hamishpat/comments"));
  const call = lastCall("pachComment", "findMany");
  assert.equal(call!.args[0]?.take, 50, "unbounded default limit must drop to 50");
});

// ============================================================================
// #T7 — a shared, rolling-window cost budget caps embedding calls fleet-wide
// ============================================================================
test("#T7 tryConsumeBudget: allows up to the limit, then denies within the window", async () => {
  const { tryConsumeBudget } = await import("@/lib/rate-limit");
  const key = `test-budget-${Math.floor(Date.now())}`;
  let allowed = 0;
  for (let i = 0; i < 8; i++) {
    if (tryConsumeBudget(key, { limit: 5, windowMs: 60_000 })) allowed++;
  }
  assert.equal(allowed, 5, "exactly `limit` units may be consumed inside the window");
  assert.equal(
    tryConsumeBudget(key, { limit: 5, windowMs: 60_000 }),
    false,
    "further calls are denied until the window rolls",
  );
  // A very short window rolls immediately, freeing the budget again.
  const key2 = `test-budget2-${Math.floor(Date.now())}`;
  assert.equal(tryConsumeBudget(key2, { limit: 1, windowMs: 0 }), true);
  assert.equal(tryConsumeBudget(key2, { limit: 1, windowMs: 0 }), true, "zero window never blocks");
});

// ============================================================================
// #8 — MCP OAuth must not silently fall back to a hardcoded signing secret
// ============================================================================
test("#8 getSigningSecret refuses the dev fallback in production", async () => {
  const mod: any = await import("@/lib/mcp-oauth");
  assert.equal(typeof mod.getSigningSecret, "function", "getSigningSecret must exist");
  const saved = {
    env: process.env.NODE_ENV,
    n: process.env.NEXTAUTH_SECRET,
    a: process.env.AUTH_SECRET,
  };
  try {
    (process.env as any).NODE_ENV = "production";
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.AUTH_SECRET;
    assert.throws(
      () => mod.getSigningSecret(),
      "production with no secret must throw, not use a known constant",
    );
    process.env.NEXTAUTH_SECRET = "a-real-secret";
    assert.equal(mod.getSigningSecret(), "a-real-secret");
  } finally {
    (process.env as any).NODE_ENV = saved.env;
    if (saved.n === undefined) delete process.env.NEXTAUTH_SECRET;
    else process.env.NEXTAUTH_SECRET = saved.n;
    if (saved.a === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = saved.a;
  }
});
