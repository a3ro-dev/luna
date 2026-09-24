# Luna research and engineering record

**Run date:** 24 September 2026  
**Release:** 0.10.1  
**Model candidate:** `forecast-v2.0.0`  
**Status:** implementation complete; real-world accuracy undetermined

The landing page Premium buttons previously set modal state without rendering a modal, so clicking them had no visible effect. The request form is now rendered, and failed admin notification sends return an error. The password reset route now schedules the Resend call with Next.js `after()` and prefers the configured public app URL for reset links. A reset request for an address without a matching account intentionally skips email delivery while showing the same public success response.

## 1. Executive finding

The strongest evidence supported correctness, uncertainty, integrity, and product-trust changes. It did not support a claim that Luna is more accurate for real users.

The live database contains 25 cycle records from five users and only four users with retrospective forecast targets. The predeclared privacy/reliability rule requires at least five contributing users before any performance number is released. All live accuracy metrics were therefore suppressed. Synthetic results favored forecast-v2, but the generator shares assumptions with the model and cannot establish clinical or real-world benefit.

## 2. Repository baseline

The checkout uses Next.js 16.2.4, not 15.0.0. The installed Next.js guides were read before route work. AI SDK 6.0.174 documentation was read before streaming changes. Context7 was required by project instructions but unavailable because the MCP connection was not configured; installed package documentation was used instead.

Before changes:

- 68 automated tests passed.
- TypeScript failed at the import refresh call and a discriminated-union narrowing site.
- `pnpm lint` called the removed `next lint` command and could not run on Next.js 16.
- The first production build reached page-data collection but an empty `.env.production.local` database value overrode the valid development value.
- The dashboard and chat did not share one current forecast result.
- Existing research papers described the legacy engine as current and claimed that no automated tests existed.

Existing user changes were preserved. The preexisting untracked forecast/evaluation work was audited, corrected, integrated, tested, and documented rather than discarded.

## 3. Read-only database profile

The profiler in [db-profile.mts, L1-156](../scripts/db-profile.mts#L1-L156) selected only IDs, cycle dates, derived numerical fields, condition/stage flags, and timestamps required for the audit. It did not select emails, password hashes, images, free-text notes, or chat content. Queries were bounded and no record was written, repaired, or recomputed.

### 3.1 Counts and denominators

| Quantity | Result |
|---|---:|
| All users | 10 |
| Users with product consent | 5 |
| Onboarded users | 10 |
| Users with any cycle row | 5 |
| Cycle rows | 25 |
| Start-to-start intervals | 20 |
| Missing end dates | 7 |
| Latest open rows | 5 |
| Historical missing ends | 2 |
| Recorded ovulation dates | 0 |
| Users with at least 3 plausible intervals | fewer than 5 |

### 3.2 Integrity findings

No duplicate starts, overlapping bleeding records, future starts, reversed start/end ordering, impossible period durations, or stored-versus-recomputed derived-value drift were detected. There was one persisted anomaly flag and three persisted prediction-parameter rows; no stale parameter value was detected by the bounded check.

Nineteen of 20 intervals were 21--35 days. Fewer than five were 46--90 days. The cycle-length quantiles were 26, 27, 27.5, 28.3, and 35.1 days. Period-length quantiles were 4, 4, 4, 4, and 5.1 days. Quantiles are descriptive only and do not make this sample representative.

Seventeen of 25 records were created more than 30 days after the recorded start. One user had a bulk-created history. Available timestamps describe when rows were stored, not necessarily when an event was first known or edited. The schema has no row provenance, profile history, or immutable forecast issuance.

### 3.3 Interpretation rules

- A missing end on the latest row is treated as potentially ongoing.
- A missing end on an older row is treated as incomplete history.
- A long start-to-start interval is not automatically a missed log.
- A single implausibly long or short interval is classified as uncertain for forecasting, not repaired or deleted.
- There were no ovulation outcomes suitable for an accuracy analysis.
- Small condition/stage cells are suppressed below five users.

The existing consent text permits use of the application but does not clearly authorize pooled health-data model training. No population parameter was fitted from live user data.

## 4. Mathematical audit

### 4.1 Confirmed definitions

Cycle length is the exclusive day difference from one start to the next and belongs to the earlier cycle. Bleeding duration is inclusive. Follicular and luteal quantities require suitable ovulation observations; model-derived dates are not independent observations. ISO date calculations use UTC calendar components to avoid DST and host-timezone drift.

### 4.2 Legacy engine problems

The retained v1 engine is deterministic and has useful regression coverage, but its user-facing uncertainty and several priors are not scientifically defensible:

1. Its jackknife estimates sensitivity of a smoothed estimator, not the predictive distribution of the next cycle.
2. Leave-one-out resampling is poorly matched to ordered, dependent time series and a discontinuous skip gate.
3. Sparse-history ranges can be too narrow because they omit enough next-observation variability.
4. Fixed PCOD, thyroid, endometriosis, irregular-cycle, and hormonal-contraception distributions were not supported by suitable primary numerical data.
5. A single maximum threshold conflated genuine long cycles with missed logs.
6. Persisted full-history parameters could leak future information into a naive retrospective evaluation.
7. Profile changes did not reliably recompute dependent personal state.

### 4.3 Current model assumptions

Forecast-v2 is implemented in [forecast.ts, L1-492](../src/lib/prediction/forecast.ts#L1-L492). It uses a normal-normal posterior predictive model, a log scale for cycle lengths, variance shrinkage with four pseudo-observations, an 80% central prediction interval, and a 12-observation recency window.

The general cycle median of 29 days, between-person SD of 4 days, within-person SD of 4 days, bleeding mean of 5.5 days, bleeding SD components, and the pseudo-observation strength are engineering assumptions informed by but not directly estimated from the cited studies. They are retained because they are transparent, conservative in cold start, and testable. They are not established biological constants.

Condition logic follows an evidence hierarchy:

- Retain a numerical shift only when a suitable measured distribution exists and transfer is plausible.
- Where evidence is directional, widen uncertainty or withhold an unsuitable output.
- Unknown conditions fall back to the base model and are surfaced in assumptions rather than silently changing arithmetic.
- PCOS and PCOD do not receive distinct means.
- Hormonal contraception does not receive a universal cycle mean.
- Late perimenopause uses a very wide directional adjustment, not a precise stage classifier.

## 5. Evaluation protocol

The rolling-origin harness in [backtest.ts, L1-270](../src/lib/prediction/backtest.ts#L1-L270) reconstructs state at every origin from the preceding prefix. Future ends, future ovulation reports, persisted `prediction_params`, and later condition values are excluded. A test mutates future history and verifies that earlier predictions do not change.

Benchmarks are:

1. Legacy forecast-v1.
2. Population-prior only.
3. Last observed value.
4. Expanding personal median.
5. Rolling personal mean.
6. Rolling personal median.
7. Simple exponential smoothing.
8. Forecast-v2.

Metrics include MAE, median absolute error, RMSE, signed bias, 90th-percentile absolute error, proportions within 2/3/7 days, user-macro MAE, interval coverage and width, interval score, abstention, sample size, and exclusions. Pairwise uncertainty uses a user-cluster bootstrap so repeated cycles are not treated as independent people.

The intended real-data design is chronological development, validation, and untouched test periods with user-disjoint evaluation for any pooled fitting. The current database is too small for that design. No tuning was performed on live data.

## 6. Results

### 6.1 Live data

Only four users contributed forecast targets. The database command reports the counts and suppression reason but no MAE, coverage, subgroup result, or pairwise difference. This is the result, not a failed attempt to find favorable numbers.

Retrospective evaluation would still be approximate at a larger sample because most rows were logged after the event and historical profile values are missing.

### 6.2 Synthetic cycle-length results

Seed 42 used 400 simulated users and produced 2,938 forecasts:

| Metric | Forecast-v1 | Forecast-v2 |
|---|---:|---:|
| MAE | 5.83 d | 4.89 d |
| Median absolute error | 2.57 d | 2.14 d |
| RMSE | 10.37 d | 9.05 d |
| Signed bias | -0.20 d | -0.91 d |
| 90th percentile absolute error | 18.00 d | 12.17 d |
| Within 2 days | 0.42 | 0.47 |
| Within 3 days | 0.56 | 0.60 |
| Within 7 days | 0.79 | 0.84 |
| User-macro MAE | 5.76 d | 4.86 d |
| 80% interval coverage | 0.42 | 0.84 |
| Mean interval width | 6.9 d | 13.6 d |
| Interval score | 44.7 | 30.4 |

The v2-minus-v1 user-macro MAE difference was -1.13 days with a 95% user-cluster bootstrap interval of [-1.57, -0.75] among 365 evaluable users.

Seeds 43, 44, and 45 produced v2-minus-v1 macro-MAE differences of -1.26, -1.27, and -0.63 days. V2 80% coverage was 0.84--0.85. Cold-start MAE on seed 42 was 6.22 days for v1 and 4.96 for v2.

### 6.3 Synthetic bleeding-duration results

On seed 42, v1 versus v2 MAE was 1.05 versus 0.94 days, user-macro MAE was 1.08 versus 0.94, 80% coverage was 0.48 versus 0.80, interval width was 1.7 versus 3.1 days, and interval score was 6.5 versus 4.2. Independent seeds preserved the direction with small macro-MAE differences from -0.05 to -0.07 days.

### 6.4 Interpretation

The candidate improves recovery and interval calibration under the synthetic generator. This is expected because the generator and model share distributional ideas. The experiment validates code paths, leakage protection, sparse-history behavior, contamination handling, and uncertainty scoring. It does not validate transfer to people.

## 7. Implemented product and integrity changes

- One shared forecast service now feeds dashboard and chat.
- Forecast output includes model version, target, point and interval, usable history, exclusions, data cutoff, assumptions, caveats, and abstention reason.
- Dashboard labels recorded versus estimated dates and no longer paints estimated bleeding as observed.
- Ovulation is withheld for unsuitable profiles and described as an estimate elsewhere.
- Ongoing-cycle behavior is explicit and never declares a missed period.
- Real-calendar validation catches dates such as 31 February.
- Create/edit/import/delete/profile paths recompute dependent state.
- Import validates all prospective rows before the first insertion.
- Cycle edits remove an ovulation observation outside the edited cycle boundary.
- Chat session updates require both session ID and user ID.
- AI SDK streams persist complete `UIMessage` parts and propagate request aborts.
- The obsolete Next.js `config.bodyParser` export was removed.
- `pnpm lint` now invokes ESLint directly instead of removed `next lint`.

## 8. Retained and rejected hypotheses

### Retained

- A simple posterior-predictive model is preferable to a more complex state-space model at this sample size.
- A variance floor is necessary for honest cold-start uncertainty.
- Repeated long intervals should become a personal pattern rather than permanent anomalies.
- Condition evidence is more useful for widening/withholding than for unsupported precision.
- Prospective issuance records are the cleanest route to genuine future evaluation.

### Rejected or deferred

- Neural networks, fine-tuning, a vector database, or a separate ML service: no sample size or failure mode justifies them.
- A fixed “milder PCOD” distribution: unsupported.
- Mean/SD inferred from an odds ratio: invalid.
- One distribution for all hormonal contraception: unsupported.
- Automatic production model promotion: unsafe and unnecessary.
- Persisting prospective forecasts in this release: deferred until consent, retention, deletion, and expected sample size justify a migration.
- Elaborate shadow-deployment infrastructure: disproportionate for the current product.

## 9. Verification record

- Baseline: 68 tests passed.
- Current suite: 80 tests passed.
- TypeScript: passed after integration.
- Targeted ESLint on touched code: passed with zero errors and zero warnings after removing two unused legacy-test variables.
- Full ESLint: now runs, but exits nonzero with 24 errors and 28 warnings in untouched code, largely generated AI Elements and older client components. The scoped touched-code run is clean.
- Production build: Vercel compiled Next.js, passed TypeScript, generated all 18 static pages, and completed the production build.
- Browser: public login route rendered; authenticated journeys were not exercised because no user credentials were used.
- Database profiler and database backtest: rerun after Vercel environment pull, with values bounded and secrets suppressed.
- Production deployment: Vercel deployment `dpl_2ww26rANPK6iE6DggRtKYwqWe89Y` reached `READY`, was aliased to `https://luna-tracker.a3ro.dev`, and returned HTTP 200 through the deployment-protection-aware smoke check.

## 10. Operational update procedure

1. Use a read-only database URL for profiling/evaluation.
2. Run tests and typecheck before any model comparison.
3. Freeze model version, evaluation code, seeds, cutoff, exclusions, and predeclared acceptance criteria.
4. Keep personal recomputation separate from population fitting.
5. Never fit pooled parameters without an adequate consent basis.
6. Promote manually only after untouched evaluation; retain the previous model for rollback.
7. Do not run historical repairs or production migrations silently.

No migration or backfill is required for v0.10.0. Existing prediction-parameter rows remain for legacy compatibility but are not trusted as historical forecast state.

## 11. Next experiment

Design a minimal prospective forecast record with user ID, model version, target type, issuance timestamp, data cutoff, point, interval, abstention reason, and later target linkage. Specify retention and cascading deletion before migration. With sufficient consented users and targets, compare forecast-v2 against expanding median and rolling mean on an untouched chronological set, report user-macro metrics and calibration, and stratify only where privacy-safe denominators exist.
