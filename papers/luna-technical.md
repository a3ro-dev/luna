# Luna: personal cycle forecasts with explicit predictive uncertainty

**Version:** 0.10.0  
**Date:** 24 September 2026  
**Status:** implemented and synthetically validated; not clinically validated

## Abstract

Luna is an open-source menstrual cycle tracker with a conversational interface. Version 0.10.0 replaces the production path from a condition-specific adaptive smoother with `forecast-v2.0.0`, a small posterior-predictive model. The model combines a conservative population starting point with each person's usable history and reports an 80% prediction interval for the next observation, not a confidence interval for an estimated mean. The dashboard and chat consume one forecast service and expose model version, data cutoff, usable history, excluded observations, assumptions, and abstention reasons.

A privacy-bounded database profile found 10 users, 25 cycle records, 20 completed start-to-start intervals, and no recorded ovulation observations. Only four users supplied any retrospective forecast targets, below the predeclared minimum of five users for releasing aggregate accuracy metrics. No claim of real-world accuracy improvement is therefore supportable. Leakage-free synthetic rolling-origin experiments show that the implementation behaves as intended under the generator's assumptions, but those experiments are engineering evidence rather than clinical evidence.

## 1. Success criteria

The work used six predeclared outcomes:

1. **Correctness:** date-only calculations are timezone invariant; period length is inclusive; cycle length is start-to-start; no future information enters a forecast.
2. **Uncertainty:** ranges describe the next observation, widen for variable or sparse histories, and are never presented as confidence percentages.
3. **Integrity:** create, edit, delete, import, and profile changes validate and deterministically recompute dependent state.
4. **Chat grounding:** chat and dashboard use the same authenticated forecast service; failed writes cannot produce success confirmations.
5. **Experience:** recorded facts, estimates, uncertainty, and withheld estimates are visibly distinct.
6. **Maintainability:** model code is pure, versioned, tested, reproducible, and separable from database persistence.

## 2. Current architecture

The application uses Next.js 16.2.4, React 19, Neon PostgreSQL, Drizzle ORM, Auth.js v5, AI SDK v6, and OpenUI. The installed dependency versions are authoritative; the older project guide that named Next.js 15.0.0 was stale.

The current prediction path is:

```text
authenticated user
  -> date-only cycle rows + profile
  -> validation and chronological derivation
  -> forecast-v2.0.0
  -> structured forecast + plain-language description
  -> dashboard and deterministic chat tool
```

The pure model and provenance types are in [forecast.ts, L1-492](../src/lib/prediction/forecast.ts#L1-L492). Database loading, write validation, analytics refresh, and the shared forecast service are in [cycle-tools.ts, L345-509](../src/lib/cycle-tools.ts#L345-L509). The former adaptive smoother remains in [engine.ts, L1-780](../src/lib/prediction/engine.ts#L1-L780) only as the `forecast-v1` benchmark and compatibility reference.

## 3. Observation definitions

- A cycle interval belongs to the earlier cycle and equals the number of calendar days from one period start to the next.
- Bleeding duration is inclusive: `end - start + 1`.
- An absent end date may mean ongoing bleeding or an incomplete historical log; it is not silently converted into a duration.
- The latest start can be ongoing. It is not a known future target.
- Ovulation is an observed fact only when a user logged it. A calendar estimate is labelled as an estimate and is withheld for profiles where calendar timing is unsuitable.
- Date arithmetic uses ISO date components and UTC date math. The user's timezone is used only to establish the current local date.

Records with invalid calendar dates, future dates, reversed ranges, bleeding longer than 14 days, duplicate starts, or overlapping bleeding ranges are rejected before writes. Imports validate the complete prospective set before inserting any row, preventing partial acceptance of an invalid file.

## 4. Forecast-v2 model

For a metric such as cycle length, Luna treats a person's typical value as unknown:

\[
m \sim N(\mu_0, \tau_0^2), \qquad x_i \mid m \sim N(m, \sigma^2)
\]

The within-person variance is shrunk toward a population value using four pseudo-observations. Given usable personal observations, the posterior point estimate is inverse-variance weighted. The predictive variance is:

\[
\operatorname{Var}(x_{n+1}\mid x_{1:n}) = \widehat{\sigma}^2 + \operatorname{Var}(m\mid x_{1:n})
\]

This distinction matters: population variability, within-person variability, uncertainty about a person's mean, and uncertainty about their next cycle are not interchangeable. Cycle length is modeled on a log scale to prevent impossible negative tails. Bleeding duration uses a linear scale with physical bounds.

The central 80% prediction interval is intentionally labelled a likely window. It is not a guarantee and it is not a probability that the point date is correct. At zero observations the model returns a broad population-based range. At one or two observations the variance floor prevents fabricated precision. Only the most recent 12 usable observations influence a forecast.

### 4.1 Uncertain logs and long cycles

Intervals below 15 days are set aside as possible duplicate or spotting logs. A single interval above the profile's gate is set aside as a possible missed log. Two or more long intervals among the six most recent are treated as a recurring personal pattern and included. Excluded records remain visible to the user and are counted in provenance. Exclusion cannot create a narrow range by itself because excluded rows do not count as evidence and the predictive variance floor remains.

This is uncertainty classification, not diagnosis. A long interval may be genuine, an unlogged period, or another recording problem. Luna does not claim to know which.

### 4.2 Conditions and stages

Version 1 encoded several condition-specific means without adequate quantitative support, including a PCOD subtype distinction, a thyroid mean, and an endometriosis distribution inferred from an odds ratio. Version 2 removes those unsupported mean shifts.

Where evidence is directional rather than distributional, a condition widens variability or withholds a calendar ovulation estimate instead of inventing a mean. PCOS and PCOD share handling because no defensible quantitative distinction was verified. A single hormonal-contraception setting cannot represent pills, hormonal IUDs, implants, injections, and other regimens, so its range remains broad and ovulation is withheld. Late perimenopause has a wide, conservative shift informed by longitudinal TREMIN data; it must not be read as an individual diagnosis or staging rule.

### 4.3 Ongoing cycles

If the expected point date passes, Luna does not slide the point forecast forward and does not label the period missed. It preserves the original model forecast, reports how far the current cycle has progressed, and conditions the displayed remaining window on the fact that no new start has been recorded yet. This is explicit survival-style conditioning, not evidence that a period did or did not occur.

### 4.4 Ovulation

Luna had zero suitable ovulation observations in the inspected database. Calendar ovulation is therefore a qualified estimate derived from the predicted next start and a population luteal distribution, not an evaluated outcome. It is withheld for PCOS/PCOD, irregular cycles, thyroid conditions, hormonal contraception, and late perimenopause. Model-derived phase dates are never fed back as independent observations.

## 5. Evidence and prior provenance

The general starting point is anchored to two primary studies:

- Najmabadi et al. pooled 3,324 cycles from 581 participants in three prospective cohorts and reported cycle 30.3 (SD 6.7), menses 6.2 (SD 1.5), follicular 18.5 (SD 6.5), and luteal 11.7 days (SD 2.8), DOI `10.1111/ppe.12644`.
- Bull et al. analyzed 612,613 ovulatory cycles from 124,648 Natural Cycles users and reported cycle 29.3 (SD 5.2), bleed 4.0 (SD 1.5), follicular 16.9 (SD 5.3), and luteal 12.4 days (SD 2.4), DOI `10.1038/s41746-019-0152-7`.

Neither study directly identifies the model's between-person SD of personal means, typical within-person SD, or shrinkage strength. Those are conservative engineering assumptions, documented in [research-notes.md](./research-notes.md), and require prospective calibration. Bull et al. selected app users with ovulatory cycles, limiting transferability. Najmabadi et al. studied eumenorrheic participants, limiting condition transferability.

Ferrell et al. followed 120 white, college-educated US TREMIN participants and reported increasing mean cycle length in the four years before the final menstrual period, DOI `10.1016/j.fertnstert.2006.01.045`. The small, nonrepresentative cohort supports a directional late-transition adjustment, not precise individualized staging.

## 6. Evaluation design

The harness in [backtest.ts, L1-270](../src/lib/prediction/backtest.ts#L1-L270) performs rolling-origin evaluation. At every origin it rebuilds model state from the historical prefix and predicts only the next eligible target. It never reads future ends, future ovulation, persisted full-history parameters, or later profile state. Individual users are never randomly split across origins.

Benchmarks include the legacy engine, population prior, last observation, expanding median, rolling mean, rolling median, and simple exponential smoothing. Metrics include MAE, median absolute error, RMSE, bias, error quantiles, proportions within 2/3/7 days, cycle-level and user-macro results, interval coverage and width, interval score, abstention, and user-cluster bootstrap differences.

The command-line runner in [backtest.mts, L1-89](../scripts/backtest.mts#L1-L89) supports `--source synthetic` and `--source database`. Database reports suppress all performance values when fewer than five users contribute targets. Synthetic fixtures contain no live personal data.

## 7. Results

### 7.1 Live database

The read-only profile found 10 users and 25 cycle rows across five users. There were 20 completed start-to-start intervals, seven missing end dates, five latest open records, two historical missing ends, and zero ovulation observations. No duplicate starts, overlaps, future starts, reversed dates, impossible durations, or stored-derived-value drift were detected. Nineteen intervals were 21--35 days; fewer than five were 46--90 days. Only four users contributed retrospective forecast targets, so all accuracy metrics and model comparisons were suppressed.

Seventeen of 25 rows were entered more than 30 days after the recorded start and one user had a bulk-created history. Because the schema does not preserve profile history or prediction issuance, retrospective rolling-origin evaluation approximates what the model could have known from cycle dates, not what the application actually knew at the time.

### 7.2 Synthetic stress tests

On seed 42 with 400 simulated users and 2,938 cycle forecasts, the legacy engine had MAE 5.83 days and forecast-v2 had MAE 4.89. User-macro MAE was 5.76 versus 4.86; 80% interval coverage was 0.42 versus 0.84; mean interval width was 6.9 versus 13.6 days. The user-cluster bootstrap difference in macro MAE was -1.13 days with a 95% interval of [-1.57, -0.75]. Period-duration MAE was 1.05 versus 0.94 days and 80% coverage was 0.48 versus 0.80.

Independent seeds 43, 44, and 45 preserved the direction of cycle macro-MAE differences (-1.26, -1.27, and -0.63 days) and v2 coverage remained 0.84--0.85. These results show recovery of behavior embedded in the simulator and catch overconfident intervals. They do not demonstrate real-world effectiveness because the generator shares assumptions with the candidate model.

## 8. Chat and product integration

Dashboard and chat now call the same authenticated service. The dashboard distinguishes logged events from likely start windows and explicitly says when ovulation is not estimated. It shows the history count, model status, and concise caveats rather than a confidence percentage.

Cycle tools validate user ownership in every read and write. Edits clear an ovulation observation if it falls outside the edited cycle. Deletes, imports, and condition/stage changes recompute derived analytics. Chat session updates are scoped by both session and user. AI SDK streaming passes the request abort signal and persists complete `UIMessage` parts, including tool results, via response-stream completion. Database facts and deterministic tools remain authoritative over conversational memory.

## 9. Operational workflow and rollback

1. Run `pnpm test` and `pnpm exec tsc --noEmit`.
2. Run `pnpm exec tsx scripts/db-profile.mts` with a read-only database URL.
3. Run synthetic backtests with fixed seeds, then the database backtest. Never export row-level health data.
4. Record the model version, data cutoff, exclusions, and complete metrics. Tune only on a declared development set when sufficient users exist.
5. Promote by changing the explicitly versioned forecast path after review. Do not auto-promote.
6. Roll back by routing the shared forecast service to the retained `forecast-v1` implementation. No schema migration is required for v0.10.0.

Prospective prediction issuance records were considered but deferred. The current sample is too small to justify new retention-sensitive infrastructure, and deletion/consent policy needs design first.

## 10. Limitations and next experiment

Luna is not a medical device and has no clinical validation. The live sample is tiny, unbalanced, mostly retrospective, and contains no ovulation outcomes. Current priors mix measurements from different populations and do not identify every variance component the model needs. Condition history and prediction issuance are absent. The hormonal-contraception profile is too coarse. The UI could not be exercised past authentication without user credentials, although public login rendering and production compilation were checked.

The most valuable next experiment is prospective, consented forecast logging with immutable issuance time, data cutoff, model version, point forecast, interval, and later target linkage. After enough users and targets accumulate, compare forecast-v2 with simple expanding median and rolling mean using chronological, user-clustered evaluation and predeclared calibration criteria.
