# Drug-sentencing search benchmark

Measures whether **drug type × quantity** searches on `/drug-sentencing` return
the right judgments, and whether the per-drug TOTALS table on a card agrees with
the per-offence DETAIL table below it.

```bash
npx tsx tests/benchmarks/fetch-drug-corpus.ts      # refresh the local corpus cache (~45s)
npx tsx tests/benchmarks/drug-search-benchmark.ts  # full run → tests/benchmarks/DRUG-SEARCH-REPORT.md
```

| env | default | what it does |
|---|---|---|
| `BENCH_PHASE` | `all` | `api` = live search only, `audit` = offline data audit only |
| `BENCH_BASE_URL` | `https://www.z-g.co.il` | target origin |
| `BENCH_INTERVAL_MS` | `2600` | pacing (the route rate-limits at 30 req/min per IP) |
| `BENCH_RETRY_DELAY_MS` | `20000` | wait before retrying a 5xx |
| `DRUG_CORPUS_FILE` | scratchpad path | corpus cache location (~6 MB, keep out of git) |

## How it decides something is broken

Every scenario is scored against **two independent expectations**, both computed
offline from the mirrored corpus (`tagit_docs`, scope 1, page base filter):

* **IMPL** — what `src/app/api/rulings/route.ts` should return under its own
  documented semantics: drug presence from `meta.drug_types`, per-drug grams
  from `meta.drug_totals`.
  **API ≠ IMPL ⇒ a bug in our plumbing** (bulk truncation, a dropped clause,
  pagination, caching).
* **INTENT** — what the user actually asked for, recomputed from the raw
  `sql.פירוט_עבירות_סמים` rows with drug aliases merged and units converted to
  grams by this benchmark.
  **IMPL ≠ INTENT ⇒ a bug in the data/aggregation**, not in our code.

That split is the point: it says *which side* to fix. `drug-search-model.ts`
holds both models; the alias and unit tables there are the benchmark's own
opinion of what "cannabis" and "grams" mean, and are worth reviewing when TAG-IT
changes its normalisation.

## Phases

1. **שלב א׳** — 27 live scenarios (drug only, drug × quantity, OR/AND, quantity
   without a drug, interaction with the boolean/date filters, full-text). Also
   re-checks every returned card against the filter it was supposed to satisfy.
2. **שלב ב׳** — invariants: pagination has no overlap, thresholds are monotone,
   `OR ⊇ each ⊇ AND` with exact inclusion–exclusion, adding a drug never widens
   a quantity-only result. Reports any production instance restart that happened
   during the run (needs `RENDER_API_KEY`).
3. **שלב ג׳** — reconciles `meta.drug_totals` against the raw offence rows for
   every document and classifies each mismatch (double count, unconverted unit,
   unmerged alias, rows the summary invented or dropped), plus a root-cause
   cross-tab of the inflation multiplier against `מספר_רכיבים` and the number of
   defendants.
4. **שלב ד׳** — coverage: per drug, how many judgments no quantity filter can
   ever reach because the drug is measured in tablets/stamps/units.
