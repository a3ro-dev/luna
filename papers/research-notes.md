# Forecast audit and reproducibility record

**Release:** 0.11.1 · **Model:** `forecast-v2.0.0` · **Database snapshot:** 24 September 2026

**Conclusion:** Implementation checks pass; real-user predictive accuracy is undetermined.

This record preserves the audit trail behind [the technical paper](./luna-technical.md). It distinguishes a dated database snapshot, reproducible simulation output, published evidence, and assumptions in the code. The source index contains the [verified study references](./references.md).

## Evidence ledger

| Evidence | What it can establish | What it cannot establish |
|:--|:--|:--|
| [Forecast source](../src/lib/prediction/forecast.ts) and tests | Implemented arithmetic and tested edge cases | Clinical or prospective accuracy |
| [Read-only profile](../scripts/db-profile.mts), run on 24 September 2026 | Aggregate properties of the inspected records | Population parameters or a representative user sample |
| [Rolling-origin runner](../scripts/backtest.mts), seeds 42--45 | Behavior under its synthetic generator | Transfer to real cycles |
| [Published cohorts](./references.md) | Cycle characteristics in their sampled populations | Luna-specific priors, calibration, or individual diagnosis |

### Source correction

The previous reference index assigned the 2006 Ferrell DOI and its four-year results to the title of a different 2005 Ferrell paper. The correct source is [“The length of perimenopausal menstrual cycles increases later and to a greater degree than previously reported”](https://pubmed.ncbi.nlm.nih.gov/16889776/), a secondary analysis of prospectively collected Tremin records.

The prior index also named the 2023 Apple Women's Health Study paper incorrectly and treated 742,747 cycles from 49,238 participants as the final analyzed cohort. [Li et al. (2023)](https://pubmed.ncbi.nlm.nih.gov/37248288/) analyzed 165,668 cycles from 12,608 participants after further selection. Both denominator stages now appear in [the source index](./references.md).

## Database snapshot

The [profile script](../scripts/db-profile.mts) uses a read-only transaction and selects bounded cycle dates, derived numerical values, profile flags, IDs, and timestamps. It does not query email addresses, password hashes, images, free-text health notes, or chat. The figures below describe the 24 September 2026 run; they have **not** been remeasured for this document revision.

| Quantity | Snapshot |
|:--|--:|
| Users in the database | 10 |
| Users with at least one cycle row | 5 |
| Cycle rows | 25 |
| Completed start-to-start intervals | 20 |
| Missing end dates | 7 |
| Logged ovulation dates | 0 |
| Users with retrospective forecast targets | 4 |

Five of the missing ends were on the latest record for a user; two were historical. Nineteen of the 20 intervals were between 21 and 35 days. The count in the 46--90 day band was below five and is deliberately suppressed. The bounded check found no duplicate starts, overlapping bleeding ranges, future starts, reversed ranges, or persisted derived-value drift. These are checks on a small snapshot, not estimates of error prevalence.

Seventeen rows were entered more than 30 days after their recorded start. One user had a bulk-created history. The timestamps do not prove when the user first knew or reported each event. The schema does not preserve historical condition settings or issued forecasts. Retrospective prediction from these rows cannot reproduce what the app actually knew on a past day.

The product consent text does not clearly authorize fitting a pooled health-data model. No population prior was fitted from these records. A future collection of immutable forecast issues would need explicit purpose, retention, deletion, and consent rules.

## Model audit

The [current forecast](../src/lib/prediction/forecast.ts) uses a normal model on log cycle length and on linear bleeding duration. It shrinks the sample within-person variance toward a fixed starting value with four pseudo-observations, then plugs that estimate into a normal posterior for a personal typical value. Its next-observation variance adds the estimated within-person variance to uncertainty about that typical value. This is an empirical-Bayes approximation. It does not propagate uncertainty in the estimated variance itself; nominal interval coverage must be checked prospectively.

The base 29-day cycle median, four-day between-person and within-person spreads, 5.5-day bleeding mean, bleeding spreads, and shrinkage strength are design settings. The cited studies report relevant cycle characteristics but do not jointly estimate these parameters for Luna users. The condition-specific spread settings are also design choices, not fitted clinical priors. The final implementation uses at most 12 usable observations. [Published evidence and transfer limits](./references.md)

Two rules deserve special attention:

1. A short or isolated long interval may be set aside. When at least two of the six most recent intervals exceed the profile gate, the code treats long intervals as a pattern. This is a logging and forecasting heuristic; it does not distinguish a missed entry from a genuine long cycle.
2. The forecast remains anchored to the last logged start. A conditional remaining window is calculated only while the current date lies inside the original interval. Once past that interval, the UI shows a late or long-gap status instead of extrapolating a normal tail.

Calendar ovulation uses a population luteal starting value and a rough spread calculation. It is withheld for profiles where calendar timing is especially unsuitable. No logged ovulation outcomes were available to score. The bleeding-duration predictive distribution is linear and is not explicitly truncated to the app's 1--15-day input range.

## Evaluation design and its limits

At each origin, [the backtest](../src/lib/prediction/backtest.ts) uses earlier cycle starts and bleeding ends to predict the next eligible target. It excludes future cycle records, persisted `prediction_params`, and model-derived ovulation dates. A regression test changes later history and checks that an earlier result stays fixed.

There is an important exception to a fully historical replay: the database has no profile-history table. The runner applies the user's **current** conditions and perimenopause stage at every origin. The former paper's statement that later profile state was excluded was wrong. This issue affects the live retrospective design; the synthetic cohort uses fixed profile settings by construction.

Comparators are the retained smoother (`forecast-v1`), population-only model, last observed interval, expanding median, rolling mean and median, and simple exponential smoothing. The retained smoother emits a nominal 95% interval; the backtest rescales its half-width to 80% using a normal approximation. Thus the v1 coverage comparison measures that approximation too. Point-only baselines have no interval-coverage value.

The runner calculates point error, user-macro error, coverage, interval width, interval score, and abstention. Its paired bootstrap resamples users rather than cycles. This accounts for repeated observations within a simulated user, but a bootstrap interval over simulated users is not evidence about real people.

The runner's source comment lists synthetic acceptance thresholds. This repository record does not independently establish that those thresholds were fixed before any result was seen. They should be treated as documented checks, not a prospectively registered study protocol.

### Live data decision

The runner requires at least five users with targets before showing any live performance metric. The snapshot has four. It therefore shows counts and a suppression reason, with no MAE, calibration, subgroup result, or model difference. Even after reaching five users, late entry and missing profile history would remain major sources of bias. No real-world improvement claim follows from this dataset.

### Synthetic results

Run `node --no-warnings scripts/backtest.mts synthetic 42` from the repository root. The command uses 400 simulated users and fixed missed-log, duplicate-log, and irregular-profile settings in [the runner](../scripts/backtest.mts). Seeds 43, 44, and 45 can replace `42`. The numbers below were reproduced during this revision.

| Seed 42 cycle metric, 2,938 targets | Forecast-v1 | Forecast-v2 |
|:--|--:|--:|
| Mean absolute error | 5.83 d | 4.89 d |
| User-macro mean absolute error | 5.76 d | 4.86 d |
| Nominal 80% coverage | 0.42 | 0.84 |
| Mean 80% interval width | 6.9 d | 13.6 d |
| 80% interval score, lower is better | 44.7 | 30.4 |

Among the 365 simulated users with at least one past interval, the v2-minus-v1 macro-error difference was -1.13 days; the user-cluster bootstrap 95% interval was [-1.57, -0.75]. Seeds 43--45 retained the direction of the difference, and v2 nominal 80% coverage was 0.84--0.85. For 2,292 simulated bleeding-duration targets on seed 42, v1 versus v2 MAE was 1.05 versus 0.94 days and coverage was 0.48 versus 0.80.

The generator shares distributional choices with the candidate. These results detect implementation regressions and overconfident synthetic intervals. They do not measure clinical usefulness, real-user calibration, or causal improvement. Wider intervals account for much of the coverage gain and should be judged alongside interval score and point error.

## Verification and outstanding work

During this revision, `pnpm test` passed all 80 tests, and the seed 42 synthetic output reproduced the table above. These checks do not exercise email delivery, authenticated browser flows, or forecast performance in real users.

Product fixes in release 0.10.1 are documented separately from the forecast evidence: the Premium buttons now render the subscription request form, and the password reset route schedules email after the response for a matched account. An unknown address intentionally receives the same public success response without sending mail. Neither behavior was measured in the forecast backtest. [Subscription flow](../src/app/home-client.tsx) · [Reset route](../src/app/api/auth/forgot-password/route.ts)

Release 0.11.0 adds plan-specific dashboard, chat, and settings layouts. The saved account plan selects colors, navigation, and page composition; it does not select a different forecast model, data source, or tool set. This is a presentation change and was not part of the forecast evaluation. [Plan lookup](../src/lib/theme/server-plan.ts) · [Plan tokens](../src/app/globals.css)

The next useful study needs consented, immutable forecast issuance records with issue time, model version, data cutoff, point and interval, profile state, and later outcome linkage. After enough users contribute prospective targets, compare the model with a personal median and rolling mean on a held-out chronological period. Report user-macro error and empirical interval coverage, including denominators and missing-outcome handling. Do not fit pooled priors or report condition subgroups without an adequate consent basis and privacy-safe counts.
