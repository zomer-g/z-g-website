# Migration check: `t0-render-a` → `t2-xhostd`

| | before | after |
|---|---|---|
| base | https://www.z-g.co.il | https://www.z-g.co.il |
| resolved | 216.24.57.7, 216.24.57.15 | 159.195.201.188 |
| edge (server header on /) | cloudflare | – |
| started | 2026-09-12T20:41:43.220Z | 2026-09-13T07:53:56.577Z |

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

### Fingerprint changes (1)

Both runs passed but a value that should survive the move changed — a record count, a file hash, a page title. Counts on TAG-IT mirror routes move when a sync ran in between.

| check | before | after |
|---|---|---|
| security-headers | d410eeef24af0889 | 150017e45459b9f0 |

## Performance

Warm rounds: before 5, after 5. Verdict needs >25% and >150 ms; assets are judged on total time, everything else on TTFB.

| target | TTFB p50 before | after | Δ | TTFB p95 before | after | total p50 before | after | first hit before | after | errors b/a | verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| page:/ | 102 | 112 | +11% | 176 | 125 | 162 | 144 | 128 | 98 | 0/0 | ≈ |
| page:/guidelines | 281 | 108 | -61% | 288 | 119 | 287 | 133 | 293 | 114 | 0/0 | 🟢 faster |
| page:/defamation-rulings | 15588 | 503 | -97% | 17233 | 521 | 15593 | 573 | 15703 | 496 | 0/0 | 🟢 faster |
| page:/sanegoria | 91 | 91 | +0% | 100 | 93 | 98 | 103 | 104 | 88 | 0/0 | ≈ |
| page:/dictionary | 94 | 92 | -3% | 99 | 93 | 105 | 102 | 103 | 113 | 0/0 | ≈ |
| page:/haplilist/<post> | 96 | 93 | -3% | 226 | 95 | 113 | 109 | 102 | 99 | 0/0 | ≈ |
| page:/articles/<article> | 103 | 98 | -4% | 193 | 104 | 156 | 117 | 297 | 94 | 0/0 | ≈ |
| page:/guidelines/<id> | 151 | 150 | -1% | 549 | 501 | 203 | 218 | 184 | 192 | 0/0 | ≈ |
| api:pages | 106 | 101 | -4% | 144 | 103 | 302 | 391 | 124 | 106 | 0/0 | ≈ |
| api:posts | 82 | 84 | +3% | 86 | 87 | 136 | 86 | 86 | 239 | 0/0 | ≈ |
| api:plilist | 87 | 84 | -3% | 89 | 85 | 141 | 157 | 86 | 88 | 0/0 | ≈ |
| api:pach-status | 83 | 86 | +3% | 106 | 88 | 84 | 86 | 87 | 87 | 0/0 | ≈ |
| api:guidelines-documents | 81 | 89 | +10% | 89 | 98 | 82 | 163 | 93 | 100 | 0/0 | ≈ |
| api:guidelines-search-bare | 7074 | 1817 | -74% | 7100 | 1957 | 7076 | 1818 | 7435 | 1958 | 0/0 | 🟢 faster |
| api:guidelines-search-phrase | 6915 | 1832 | -74% | 7041 | 1879 | 6916 | 1832 | 6524 | 1926 | 0/0 | 🟢 faster |
| api:rulings-defamation | 94 | 88 | -6% | 107 | 97 | 118 | 252 | 108 | 234 | 0/0 | ≈ |
| api:rulings-drug-sentencing | 86 | 84 | -3% | 89 | 85 | 89 | 148 | 84 | 93 | 0/0 | ≈ |
| api:comptroller-reports | 124 | 126 | +2% | 163 | 133 | 125 | 127 | 180 | 177 | 0/0 | ≈ |
| api:mmm | 124 | 127 | +2% | 131 | 129 | 127 | 189 | 176 | 120 | 0/0 | ≈ |
| api:class-actions | 96 | 97 | +2% | 153 | 102 | 103 | 350 | 102 | 100 | 0/0 | ≈ |
| api:ca-records | 482 | 103 | -79% | 582 | 112 | 483 | 103 | 1847 | 129 | 0/0 | 🟢 faster |
| api:ca-facets | 89 | 83 | -7% | 92 | 83 | 100 | 247 | 85 | 84 | 0/0 | ≈ |
| api:sanegoria-filters | 81 | 84 | +4% | 85 | 86 | 82 | 151 | 81 | 80 | 0/0 | ≈ |
| api:sanegoria-dashboard | 75 | 81 | +7% | 80 | 85 | 76 | 81 | 80 | 80 | 0/0 | ≈ |
| asset:next-static-js | 75 | 78 | +3% | 77 | 84 | 76 | 78 | 79 | 75 | 0/0 | ≈ |
| asset:og-image | 78 | 79 | +1% | 82 | 89 | 191 | 162 | 77 | 81 | 0/0 | ≈ |
| asset:largest-upload | 157 | 172 | +9% | 164 | 180 | 391 | 665 | 189 | 174 | 0/0 | 🔴 slower |

**Geometric mean of after/before (p50): ×0.74** over 27 targets (below 1 = faster after).

## Parallel bursts

| burst | TTFB p50 before | after | TTFB p95 before | after | burst wall p50 before | after | errors b/a |
|---|---|---|---|---|---|---|---|
| burst:/ (10×3) | 769 | 225 | 1147 | 444 | 997 | 393 | 0/0 |
| burst:api-posts (10×3) | 259 | 115 | 938 | 124 | 664 | 262 | 0/0 |
