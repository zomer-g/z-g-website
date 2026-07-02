# Data-source monitoring

Early-warning smoke tests for every data-driven page. When TAG-IT (or CKAN, or
the DB) breaks — a scope goes down, an API key expires, a filter field gets
renamed, a deploy regresses — these turn red so you find out from the monitor,
not from a visitor.

## What it checks

`data-endpoints.test.ts` hits the **live production API** behind each page and
asserts it returns real data (HTTP 200 + record count > 0):

| Page | Endpoint | Upstream |
|------|----------|----------|
| /guidelines | `/api/guidelines/documents` | TAG-IT · over-guidelines |
| /class-actions | `/api/class-actions/documents` | TAG-IT · class-action |
| /defamation-rulings | `/api/rulings?category=defamation` | TAG-IT · scope 4 |
| /foi-judgments | `/api/rulings?category=foi-judgments` | TAG-IT · scope 6 |
| /foi-costs | `/api/rulings?category=foi-costs` | TAG-IT · scope 6 |
| /drug-sentencing | `/api/rulings?category=drug-sentencing` | TAG-IT · scope 1 |
| /comptroller-reports | `/api/comptroller-reports/documents` | TAG-IT · scope 13 |
| /conditional-arrangements | `/api/conditional-arrangements/records` | over.org.il / odata.org.il (CKAN) |
| /sanegoria | `/api/sanegoria?filters=1` | Prisma DB |

`tagit-connectivity.test.ts` talks **straight to tag-it.biz** per scope, to tell
"TAG-IT itself is down" apart from "our code broke". It needs an API key
(`RULINGS_API_KEY` / `CLASS_ACTION_API_KEY`) and **skips** when none is set, so
it only really runs in the deployed env / CI where the key exists.

## Run

```bash
npm run test:monitor
```

Options (env vars):

- `MONITOR_BASE_URL` — origin to test (default `https://www.z-g.co.il`).
- `MONITOR_TIMEOUT_MS` — per-request timeout (default `90000`; TAG-IT cold loads
  are slow).
- `MONITOR_SLOW_MS` — warn-but-pass threshold (default `15000`).

Exit code is non-zero if anything fails — safe to wire into cron / uptime checks.

## Scheduling (early warning)

A GitHub Actions workflow — `.github/workflows/monitor.yml` — runs this every
3 hours against production and can be triggered manually from the Actions tab
(**Run workflow**). It needs no secrets; when it fails, GitHub emails the repo
owner. Change the `cron:` line to adjust frequency.

To also run the direct TAG-IT probe in CI, add a repo secret `RULINGS_API_KEY`
(Settings → Secrets and variables → Actions) — the workflow passes it through.

The monitor retries transient failures (timeout / upstream 5xx) up to 3 times
before failing, so a cold-cache blip on the slow scopes below doesn't flap the
alert; permanent errors (e.g. a renamed filter field) fail fast.

## Known-flaky note

TAG-IT scopes **4 (defamation)** and **6 (foi)** can be very slow on a cold
cache and occasionally exceed the API route's 35 s upstream timeout, returning a
502. That's a real user-facing symptom, not a test artifact — the monitor is
right to flag it.
