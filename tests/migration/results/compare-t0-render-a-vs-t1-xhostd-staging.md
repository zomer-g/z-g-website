# Migration check: `t0-render-a` → `t1-xhostd-staging`

| | before | after |
|---|---|---|
| base | https://www.z-g.co.il | https://z-g-website-zomerg.xhostd.app |
| resolved | 216.24.57.7, 216.24.57.15 | 159.195.201.188 |
| edge (server header on /) | cloudflare | – |
| started | 2026-09-12T20:41:43.220Z | 2026-09-13T06:20:43.650Z |

## Sanity

- before: 131/131 passed (0 skipped)
- after: 125/130 passed (1 skipped)

### 🔴 Regressions — passed before, not after (5)

| check | before | after | after detail |
|---|---|---|---|
| sitemap-docs | 200 ok | err fail | prerequisite was not discovered |
| oauth-authorization-server | 200 ok | 200 fail | issuer https://z-g-website-zomerg.xhostd.app ≠ https://www.z-g.co.il |
| page-docs-sample:1 | 200 ok | err fail | prerequisite was not discovered |
| page-docs-sample:2 | 200 ok | err fail | prerequisite was not discovered |
| page-docs-sample:3 | 200 ok | err fail | prerequisite was not discovered |

### New failures — checks that only exist in the after run (0)

none

### 🟢 Fixed — failed before, pass after (0)

none

### Failing in both runs (0)

none

### Fingerprint changes (2)

Both runs passed but a value that should survive the move changed — a record count, a file hash, a page title. Counts on TAG-IT mirror routes move when a sync ran in between.

| check | before | after |
|---|---|---|
| security-headers | d410eeef24af0889 | 150017e45459b9f0 |
| robots | 803ef558bf5b528e | 6891af1bde7bc268 |

## Performance

Warm rounds: before 5, after 5. Verdict needs >25% and >150 ms; assets are judged on total time, everything else on TTFB.

| target | TTFB p50 before | after | Δ | TTFB p95 before | after | total p50 before | after | first hit before | after | errors b/a | verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| page:/ | 102 | 100 | -1% | 176 | 119 | 162 | 122 | 128 | 96 | 0/0 | ≈ |
| page:/guidelines | 281 | 112 | -60% | 288 | 259 | 287 | 176 | 293 | 102 | 0/0 | 🟢 faster |
| page:/defamation-rulings | 15588 | 511 | -97% | 17233 | 519 | 15593 | 577 | 15703 | 479 | 0/0 | 🟢 faster |
| page:/sanegoria | 91 | 101 | +11% | 100 | 154 | 98 | 187 | 104 | 94 | 0/0 | ≈ |
| page:/dictionary | 94 | 94 | +0% | 99 | 95 | 105 | 110 | 103 | 100 | 0/0 | ≈ |
| page:/haplilist/<post> | 96 | 95 | -2% | 226 | 105 | 113 | 107 | 102 | 92 | 0/0 | ≈ |
| page:/articles/<article> | 103 | 102 | 0% | 193 | 118 | 156 | 161 | 297 | 95 | 0/0 | ≈ |
| page:/guidelines/<id> | 151 | 150 | -1% | 549 | 152 | 203 | 162 | 184 | 201 | 0/0 | ≈ |
| api:pages | 106 | 93 | -12% | 144 | 96 | 302 | 575 | 124 | 100 | 0/0 | ≈ |
| api:posts | 82 | 102 | +25% | 86 | 113 | 136 | 165 | 86 | 264 | 0/0 | ≈ |
| api:plilist | 87 | 93 | +7% | 89 | 133 | 141 | 166 | 86 | 102 | 0/0 | ≈ |
| api:pach-status | 83 | 82 | -1% | 106 | 89 | 84 | 83 | 87 | 95 | 0/0 | ≈ |
| api:guidelines-documents | 81 | 85 | +5% | 89 | 131 | 82 | 157 | 93 | 87 | 0/0 | ≈ |
| api:guidelines-search-bare | 7074 | 1807 | -74% | 7100 | 1862 | 7076 | 1808 | 7435 | 1995 | 0/0 | 🟢 faster |
| api:guidelines-search-phrase | 6915 | 1843 | -73% | 7041 | 1882 | 6916 | 1844 | 6524 | 1985 | 0/0 | 🟢 faster |
| api:rulings-defamation | 94 | 94 | 0% | 107 | 97 | 118 | 501 | 108 | 419 | 0/0 | ≈ |
| api:rulings-drug-sentencing | 86 | 90 | +4% | 89 | 90 | 89 | 167 | 84 | 84 | 0/0 | ≈ |
| api:comptroller-reports | 124 | 130 | +4% | 163 | 175 | 125 | 131 | 180 | 178 | 0/0 | ≈ |
| api:mmm | 124 | 128 | +3% | 131 | 143 | 127 | 189 | 176 | 123 | 0/0 | ≈ |
| api:class-actions | 96 | 93 | -3% | 153 | 101 | 103 | 296 | 102 | 96 | 0/0 | ≈ |
| api:ca-records | 482 | 103 | -79% | 582 | 105 | 483 | 113 | 1847 | 128 | 0/0 | 🟢 faster |
| api:ca-facets | 89 | 84 | -5% | 92 | 89 | 100 | 410 | 85 | 83 | 0/0 | ≈ |
| api:sanegoria-filters | 81 | 82 | +1% | 85 | 98 | 82 | 167 | 81 | 83 | 0/0 | ≈ |
| api:sanegoria-dashboard | 75 | 80 | +6% | 80 | 88 | 76 | 82 | 80 | 80 | 0/0 | ≈ |
| asset:next-static-js | 75 | 79 | +5% | 77 | 269 | 76 | 82 | 79 | 82 | 0/0 | ≈ |
| asset:og-image | 78 | 131 | +68% | 82 | 309 | 191 | 159 | 77 | 82 | 0/0 | ≈ |
| asset:largest-upload | 157 | 127 | -19% | 164 | 237 | 391 | 822 | 189 | 232 | 0/0 | 🔴 slower |

**Geometric mean of after/before (p50): ×0.76** over 27 targets (below 1 = faster after).

## Parallel bursts

| burst | TTFB p50 before | after | TTFB p95 before | after | burst wall p50 before | after | errors b/a |
|---|---|---|---|---|---|---|---|
| burst:/ (10×3) | 769 | 251 | 1147 | 670 | 997 | 604 | 0/0 |
| burst:api-posts (10×3) | 259 | 121 | 938 | 170 | 664 | 278 | 0/0 |
