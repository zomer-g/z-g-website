# Migration check: `t0-render-a` → `t0-render-b`

| | before | after |
|---|---|---|
| base | https://www.z-g.co.il | https://www.z-g.co.il |
| resolved | 216.24.57.7, 216.24.57.15 | 216.24.57.7, 216.24.57.15 |
| edge (server header on /) | cloudflare | cloudflare |
| started | 2026-09-12T20:41:43.220Z | 2026-09-12T20:51:24.032Z |

## Sanity

- before: 131/131 passed (0 skipped)
- after: 131/131 passed (0 skipped)

### 🔴 Regressions — passed before, not after (0)

none

### New failures — checks that only exist in the after run (0)

none

### 🟢 Fixed — failed before, pass after (0)

none

### Failing in both runs (0)

none

### Fingerprint changes (0)

Both runs passed but a value that should survive the move changed — a record count, a file hash, a page title. Counts on TAG-IT mirror routes move when a sync ran in between.

none

## Performance

Warm rounds: before 5, after 5. Verdict needs >25% and >150 ms; assets are judged on total time, everything else on TTFB.

| target | TTFB p50 before | after | Δ | TTFB p95 before | after | total p50 before | after | first hit before | after | errors b/a | verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| page:/ | 102 | 97 | -4% | 176 | 103 | 162 | 160 | 128 | 146 | 0/0 | ≈ |
| page:/guidelines | 281 | 294 | +5% | 288 | 382 | 287 | 298 | 293 | 300 | 0/0 | ≈ |
| page:/defamation-rulings | 15588 | 15937 | +2% | 17233 | 18128 | 15593 | 15944 | 15703 | 16310 | 0/0 | ≈ |
| page:/sanegoria | 91 | 102 | +12% | 100 | 179 | 98 | 109 | 104 | 190 | 0/0 | ≈ |
| page:/dictionary | 94 | 97 | +3% | 99 | 143 | 105 | 108 | 103 | 101 | 0/0 | ≈ |
| page:/haplilist/<post> | 96 | 112 | +17% | 226 | 177 | 113 | 161 | 102 | 139 | 0/0 | ≈ |
| page:/articles/<article> | 103 | 105 | +2% | 193 | 156 | 156 | 115 | 297 | 104 | 0/0 | ≈ |
| page:/guidelines/<id> | 151 | 145 | -4% | 549 | 150 | 203 | 197 | 184 | 147 | 0/0 | ≈ |
| api:pages | 106 | 104 | -1% | 144 | 105 | 302 | 138 | 124 | 201 | 0/0 | ≈ |
| api:posts | 82 | 86 | +6% | 86 | 181 | 136 | 87 | 86 | 275 | 0/0 | ≈ |
| api:plilist | 87 | 88 | +1% | 89 | 92 | 141 | 95 | 86 | 89 | 0/0 | ≈ |
| api:pach-status | 83 | 87 | +4% | 106 | 92 | 84 | 88 | 87 | 92 | 0/0 | ≈ |
| api:guidelines-documents | 81 | 87 | +7% | 89 | 93 | 82 | 88 | 93 | 90 | 0/0 | ≈ |
| api:guidelines-search-bare | 7074 | 6605 | -7% | 7100 | 7324 | 7076 | 6605 | 7435 | 6576 | 0/0 | ≈ |
| api:guidelines-search-phrase | 6915 | 6523 | -6% | 7041 | 7177 | 6916 | 6524 | 6524 | 6221 | 0/0 | ≈ |
| api:rulings-defamation | 94 | 94 | 0% | 107 | 97 | 118 | 113 | 108 | 97 | 0/0 | ≈ |
| api:rulings-drug-sentencing | 86 | 91 | +5% | 89 | 160 | 89 | 147 | 84 | 188 | 0/0 | ≈ |
| api:comptroller-reports | 124 | 126 | +1% | 163 | 133 | 125 | 127 | 180 | 212 | 0/0 | ≈ |
| api:mmm | 124 | 123 | -1% | 131 | 132 | 127 | 124 | 176 | 165 | 0/0 | ≈ |
| api:class-actions | 96 | 100 | +4% | 153 | 103 | 103 | 109 | 102 | 101 | 0/0 | ≈ |
| api:ca-records | 482 | 580 | +20% | 582 | 592 | 483 | 581 | 1847 | 919 | 0/0 | ≈ |
| api:ca-facets | 89 | 85 | -4% | 92 | 86 | 100 | 94 | 85 | 88 | 0/0 | ≈ |
| api:sanegoria-filters | 81 | 82 | +1% | 85 | 86 | 82 | 136 | 81 | 86 | 0/0 | ≈ |
| api:sanegoria-dashboard | 75 | 81 | +8% | 80 | 92 | 76 | 82 | 80 | 83 | 0/0 | ≈ |
| asset:next-static-js | 75 | 81 | +8% | 77 | 83 | 76 | 82 | 79 | 83 | 0/0 | ≈ |
| asset:og-image | 78 | 83 | +6% | 82 | 97 | 191 | 111 | 77 | 91 | 0/0 | ≈ |
| asset:largest-upload | 157 | 158 | +1% | 164 | 164 | 391 | 204 | 189 | 201 | 0/0 | 🟢 faster |

**Geometric mean of after/before (p50): ×0.98** over 27 targets (below 1 = faster after).

## Parallel bursts

| burst | TTFB p50 before | after | TTFB p95 before | after | burst wall p50 before | after | errors b/a |
|---|---|---|---|---|---|---|---|
| burst:/ (10×3) | 769 | 598 | 1147 | 1456 | 997 | 1303 | 0/0 |
| burst:api-posts (10×3) | 259 | 177 | 938 | 833 | 664 | 253 | 0/0 |
