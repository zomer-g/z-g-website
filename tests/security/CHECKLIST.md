# Security regression checklist — Z-G

Hermetic unit tests that import the real route handlers with mocked `auth()`
and `prisma`. No DB, no network — safe to run against any environment.

Run: `node --import tsx --experimental-test-module-mocks --test tests/security/security.test.ts`

Each test asserts the **secure** contract, so it is RED before the fix and
GREEN after.

| # | Finding | Severity | Test asserts |
|---|---------|----------|--------------|
| 1 | Reflected XSS in MCP OAuth callback `error` param | HIGH | `GET /oauth/callback?error=<script>` body has the payload HTML-escaped, not raw |
| 2a | pach **comments** PATCH gated on auth, not ADMIN | HIGH | GUEST PATCH → 403 and `pachComment.update` never called |
| 2b | pach **messages** PATCH gated on auth, not ADMIN | HIGH | GUEST PATCH → 403 and `pachSystemMessage.update` never called |
| 2c | pach **reports** PATCH gated on auth, not ADMIN | HIGH | GUEST PATCH → 403 and `pachReport.update` never called |
| 2d | ADMIN must still be able to moderate (regression) | — | ADMIN PATCH → 200 and update called |
| 3a | pach **comments** GET leaks hidden rows to anon | MEDIUM | anon `?is_hidden=true` → query forced `isHidden:false` |
| 3b | pach **reports** GET leaks hidden rows to anon | MEDIUM | anon `?is_hidden=true` → query forced `isHidden:false` |
| 3c | ADMIN may read hidden rows (regression) | — | ADMIN `?is_hidden=true` → query keeps `isHidden:true` |
| 4 | public pach **comments** POST has no rate limit | MEDIUM | 25 anon POSTs from one IP → at least one 429 |
| 6a | `/api/sanegoria` (13 heavy queries/miss) unthrottled | MEDIUM | 45 anon GETs from one IP → at least one 429 |
| 6b | `/api/guidelines/search` (embedding+scan) unthrottled | MEDIUM | 45 anon GETs from one IP → at least one 429 |
| 7 | TipTap link `href` allows `javascript:`/`data:` schemes | LOW | `safeHref()` collapses dangerous schemes to `#`, keeps real links |
| 8 | MCP OAuth signs `state` with a hardcoded dev fallback | LOW | `getSigningSecret()` throws in production when no secret is set |
| T5a | MCP OAuth accepts any `redirect_uri` (token phishing) | HIGH | `isAllowedRedirectUri()` passes https + loopback http only; rejects remote http, custom schemes, fragments, userinfo |
| T5b | dynamic registration accepts an unconstrained `redirect_uri` | HIGH | `POST /oauth/register` with `http://evil.com/cb` → 400, no client row created |
| T5c | standard MCP clients must still register (regression) | — | `POST /oauth/register` with https + `localhost` → 201, client created |
| T5d | a client-controlled `state` could pose as a consent approval | HIGH | `verifyConsent(signState(...))` and `verifyState(signConsent(...))` both return null (HMAC domain separation) |
| T5e | `/oauth/consent` deny must not mint a code | HIGH | `decision=deny` → 303 with `error=access_denied`, no `mcpOauthAuthCode.create` |
| T5f | `/oauth/consent` approve mints exactly one code (regression) | — | invited user `decision=approve` → 303 with `code=`, `mcpOauthAuthCode.create` called |
| T6a | public POST buffers an unbounded body (OOM) | MEDIUM | comments POST with a >64KB body → 413 before any DB write |
| T6b | stored text fields have no length cap | MEDIUM | comments POST with content over the 2000-char cap → 400 |
| T6c | `submissionSchema` fields have no `.max()` | MEDIUM | over-long `message`/`name` fail `safeParse` |
| T6d | pach GET default page size was 500 | LOW | comments GET with no `limit` → `take: 50` |
| T7 | embedding calls have no fleet-wide cost ceiling | MEDIUM | `tryConsumeBudget()` allows exactly `limit` per rolling window, then denies |

Findings deliberately **not** changed: the admin-only JSON blob in `/api/settings`
and `content/[slug]` PUT are flexible-by-design single-column stores behind an
ADMIN gate — constraining them with a strict schema risks breaking the editor
for negligible security gain, so they are left as-is.
