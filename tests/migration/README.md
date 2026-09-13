# Migration check suite (Render → xhostd)

Sanity and performance checks run against the live site, plus a database
fingerprint. Run the same suite before the move and after it; `compare.ts`
reports every regression, every value that changed, and the performance deltas.

| file | what it does |
|---|---|
| `run.ts` | Sanity pass (≈120 GET checks) + perf pass (warm TTFB/total per target, parallel bursts). Writes `results/<label>.json`. |
| `db-snapshot.ts` | Row counts, content hashes, indexes, extensions, sequence health — in one read-only snapshot. Writes `results/<label>.json`. |
| `compare.ts` | Diffs two results of the same kind into `results/compare-<a>-vs-<b>.md`. |
| `fixtures.ts` | Everything the suite looks at: rate limits, runtime uploads, extra pages, perf targets, bursts. |

## What the sanity pass covers

- **infra** — home shell, security headers (HSTS, CSP, XFO, XCTO, Referrer-Policy), a hashed `_next/static` asset and its immutable caching, 404 page, robots, both sitemaps, OG image generation (satori + fonts), the `next/image` optimizer, http→https, apex→www.
- **auth** — NextAuth providers (Google callback URL is under the public origin), anonymous session, `/admin` → login, admin APIs answer 401 (not 500), MCP OAuth metadata issuer.
- **data** — every data route with a record count: guidelines (documents + both search paths), class actions, rulings ×4 categories, comptroller, ממ״מ, conditional arrangements (records + facets), sanegoria (filters + dashboard), CMS content, פח המשפט.
- **upload** — the 9 files that live only on the Render disk plus seed samples, fingerprinted by size + sha256.
- **page** — every URL in `sitemap.xml`, the extra pages in `fixtures.ts`, one detail page per corpus, and three samples from the docs sitemap.

GET only — nothing is written to production. The runner paces itself under
the app's per-IP rate limits so a check never reads a 429 as a break.

## Runbook

Run everything from the repo root, from the same machine and network each time.

```bash
# T0 — baseline on Render (twice, some minutes apart: the gap between the two is the noise band)
npm run test:migration -- --base https://www.z-g.co.il --label t0-render-a
npm run test:migration -- --base https://www.z-g.co.il --label t0-render-b
npm run test:migration:compare -- tests/migration/results/t0-render-a.json tests/migration/results/t0-render-b.json

# T1 — the xhostd deployment on its own hostname, before DNS moves
npm run test:migration -- --base https://z-g-website-zomerg.xhostd.app --public-origin https://www.z-g.co.il --label t1-xhostd-staging
npm run test:migration:compare -- tests/migration/results/t0-render-a.json tests/migration/results/t1-xhostd-staging.json

# Data cut-over — pause the three sync workflows, then fingerprint both sides
npm run test:migration:db -- --label db-render
SNAPSHOT_DATABASE_URL="postgresql://…xhostd…" npm run test:migration:db -- --label db-xhostd
npm run test:migration:compare -- tests/migration/results/db-render.json tests/migration/results/db-xhostd.json

# T2 — after DNS points www.z-g.co.il at xhostd
npm run test:migration -- --base https://www.z-g.co.il --label t2-xhostd
npm run test:migration:compare -- tests/migration/results/t0-render-a.json tests/migration/results/t2-xhostd.json
```

Reading the report:

- **Regressions** must be empty before Render is shut down.
- **Fingerprint changes** on TAG-IT mirror routes are expected if a sync ran between the runs; on uploads, titles, CMS counts or the security-header signature they are not.
- Perf verdicts need a change above 25% and above 150 ms. Compare against the T0 noise band before calling a target slower.
- In the DB report every table should read `✓` and no sequence may be behind its column.
