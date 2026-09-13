# Migration check: `t0-render-a` → `t1b-xhostd-staging`

| | before | after |
|---|---|---|
| base | https://www.z-g.co.il | https://z-g-website-zomerg.xhostd.app |
| resolved | 216.24.57.7, 216.24.57.15 | 159.195.201.188 |
| edge (server header on /) | cloudflare | – |
| started | 2026-09-12T20:41:43.220Z | 2026-09-13T06:36:32.282Z |

## Sanity

- before: 131/131 passed (0 skipped)
- after: 129/130 passed (1 skipped)

### 🔴 Regressions — passed before, not after (1)

| check | before | after | after detail |
|---|---|---|---|
| oauth-authorization-server | 200 ok | 200 fail | issuer https://z-g-website-zomerg.xhostd.app ≠ https://www.z-g.co.il |

### New failures — checks that only exist in the after run (0)

none

### 🟢 Fixed — failed before, pass after (0)

none

### Failing in both runs (0)

none

### Fingerprint changes (1)

Both runs passed but a value that should survive the move changed — a record count, a file hash, a page title. Counts on TAG-IT mirror routes move when a sync ran in between.

| check | before | after |
|---|---|---|
| security-headers | d410eeef24af0889 | 150017e45459b9f0 |

## Performance

Warm rounds: before 5, after 5. Verdict needs >25% and >150 ms; assets are judged on total time, everything else on TTFB.

| target | TTFB p50 before | after | Δ | TTFB p95 before | after | total p50 before | after | first hit before | after | errors b/a | verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| page:/ | 102 | 130 | +28% | 176 | 172 | 162 | 193 | 128 | 155 | 0/0 | ≈ |
| page:/guidelines | 281 | 133 | -53% | 288 | 205 | 287 | 159 | 293 | 138 | 0/0 | ≈ |
| page:/defamation-rulings | 15588 | 1051 | -93% | 17233 | 1136 | 15593 | 1122 | 15703 | 1472 | 0/0 | 🟢 faster |
| page:/sanegoria | 91 | 97 | +7% | 100 | 111 | 98 | 155 | 104 | 90 | 0/0 | ≈ |
| page:/dictionary | 94 | 125 | +33% | 99 | 132 | 105 | 189 | 103 | 101 | 0/0 | ≈ |
| page:/haplilist/<post> | 96 | 105 | +9% | 226 | 187 | 113 | 186 | 102 | 104 | 0/0 | ≈ |
| page:/articles/<article> | 103 | 112 | +9% | 193 | 136 | 156 | 143 | 297 | 117 | 0/0 | ≈ |
| page:/guidelines/<id> | 151 | 159 | +5% | 549 | 172 | 203 | 189 | 184 | 210 | 0/0 | ≈ |
| api:pages | 106 | 99 | -6% | 144 | 107 | 302 | 298 | 124 | 107 | 0/0 | ≈ |
| api:posts | 82 | 86 | +5% | 86 | 92 | 136 | 95 | 86 | 305 | 0/0 | ≈ |
| api:plilist | 87 | 88 | +1% | 89 | 95 | 141 | 177 | 86 | 88 | 0/0 | ≈ |
| api:pach-status | 83 | 85 | +1% | 106 | 87 | 84 | 85 | 87 | 85 | 0/0 | ≈ |
| api:guidelines-documents | 81 | 88 | +8% | 89 | 92 | 82 | 158 | 93 | 85 | 0/0 | ≈ |
| api:guidelines-search-bare | 7074 | 1817 | -74% | 7100 | 1833 | 7076 | 1817 | 7435 | 2051 | 0/0 | 🟢 faster |
| api:guidelines-search-phrase | 6915 | 1854 | -73% | 7041 | 1858 | 6916 | 1855 | 6524 | 1944 | 0/0 | 🟢 faster |
| api:rulings-defamation | 94 | 88 | -6% | 107 | 89 | 118 | 197 | 108 | 229 | 0/0 | ≈ |
| api:rulings-drug-sentencing | 86 | 81 | -6% | 89 | 82 | 89 | 87 | 84 | 82 | 0/0 | ≈ |
| api:comptroller-reports | 124 | 125 | +1% | 163 | 127 | 125 | 126 | 180 | 228 | 0/0 | ≈ |
| api:mmm | 124 | 127 | +2% | 131 | 131 | 127 | 189 | 176 | 149 | 0/0 | ≈ |
| api:class-actions | 96 | 91 | -5% | 153 | 92 | 103 | 164 | 102 | 93 | 0/0 | ≈ |
| api:ca-records | 482 | 103 | -79% | 582 | 106 | 483 | 103 | 1847 | 189 | 0/0 | 🟢 faster |
| api:ca-facets | 89 | 85 | -4% | 92 | 85 | 100 | 174 | 85 | 85 | 0/0 | ≈ |
| api:sanegoria-filters | 81 | 83 | +3% | 85 | 87 | 82 | 87 | 81 | 93 | 0/0 | ≈ |
| api:sanegoria-dashboard | 75 | 79 | +5% | 80 | 85 | 76 | 81 | 80 | 91 | 0/0 | ≈ |
| asset:next-static-js | 75 | 77 | +2% | 77 | 97 | 76 | 79 | 79 | 84 | 0/0 | ≈ |
| asset:og-image | 78 | 80 | +2% | 82 | 87 | 191 | 156 | 77 | 80 | 0/0 | ≈ |
| asset:largest-upload | 157 | 91 | -42% | 164 | 97 | 391 | 247 | 189 | 97 | 0/0 | ≈ |

**Geometric mean of after/before (p50): ×0.76** over 27 targets (below 1 = faster after).

## Parallel bursts

| burst | TTFB p50 before | after | TTFB p95 before | after | burst wall p50 before | after | errors b/a |
|---|---|---|---|---|---|---|---|
| burst:/ (10×3) | 769 | 252 | 1147 | 466 | 997 | 413 | 0/0 |
| burst:api-posts (10×3) | 259 | 132 | 938 | 149 | 664 | 283 | 0/0 |
