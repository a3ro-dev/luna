# R2-3 late-regime skip mixture -- design A (literal protocol)

Harness: `autoresearch/src/eval2.mts` (locked v2), late track. Model: `autoresearch/experiments/R2-3-late-skip-mixture/model-a.ts` (exports `lateModels` only). Results: `results/model-a-eval2.json`. Diagnostic: `diag-a.mts` -> `results/diag-a.txt`.

Baseline reproduced exactly: v2-bayes macroMAE 5.527, IS80 34.036; v2-trunc lateMAE 12.616, late cov80 0.478.

## Design
- The single-cycle component is v2's own predictive (`predictMetric`, log scale), so `mu` and `s` are unchanged.
- The skip components are log y ~ N(mu + log c, s^2) for c = 2 (and 3).
- Skip weight w = (0.045 * N0 + k) / (N0 + n), with N0 = 10 pseudo-intervals:
  - k = past intervals set aside as long (> gate.max and excluded by `usableMask`);
  - n = past intervals >= gate.min.
- With c = 3 the weights are geometric: [1 - w, w(1 - w), w^2].
- The mixture is conditioned on y > t0 - 0.5, which is the same integer-day convention as v2-trunc.
- Quantiles 0.1, 0.5 and 0.9 come from bisection on the conditional mixture CDF. The point is the conditional median.
- The model uses only `past`, `ctx` and `t0`.

## Variants (late track, mean of 7 primary runs)

| Variant | Label | lateMAE | x base | late cov80 | covOk (every run in [0.72, 0.90]) | late IS80 | day-40 MAE | day-40 cov80 | lit lateMAE |
|---|---|---|---|---|---|---|---|---|---|
| v2-trunc | baseline | 12.616 | 1.000 | 0.478 | false | 100.13 | 12.092 | 0.490 | 11.398 |
| A-c2 | CONFIRMATORY | 11.912 | 0.944 | 0.792 | false (noisy-11 0.718) | 41.17 | 8.446 | 0.834 | 10.967 |
| A-c23 | CONFIRMATORY | 11.904 | 0.944 | 0.808 | **true** (0.739 -- 0.852) | 41.17 | 8.420 | 0.841 | 10.963 |
| A-c23-sum | EXPLORATORY (sum-of-c variance: sigma^2/c + 1/precision) | 11.866 | 0.941 | 0.790 | false (noisy-11 0.718) | 41.27 | 8.322 | 0.823 | 10.960 |
| A-c23-n4 | EXPLORATORY (weaker skip prior, N0 = 4) | 11.893 | 0.943 | 0.731 | false (base-42 0.660) | 45.65 | 8.684 | 0.830 | 10.885 |
| A-c23-w09 | EXPLORATORY, post hoc (w0 = 0.09, generator-informed) | 11.466 | 0.909 | 0.871 | false (base-2026 0.910, regular-21 0.906) | 41.36 | 7.931 | 0.856 | 10.588 |

The rule threshold is lateMAE <= 0.9 x 12.616 = 11.354. No variant reaches it. Day-0 metrics are untouched because no `models` are exported.

On the literature scenario (report-only), A-c23 keeps its sign on every metric:

| Metric | A-c23 | v2-trunc |
|---|---|---|
| late MAE | 10.963 | 11.398 |
| late cov80 | 0.841 | 0.509 |
| late IS80 | 33.8 | 91.4 |
| day-40 MAE | 7.45 | 10.73 |

Per run, A-c23 lowers late MAE in 6 of 7 primary runs. It is worse on regular-22 (7.88 -> 8.21) and flat on regular-21 (9.18 -> 9.15).

## Verdict: mixed; the locked rule is not met
The protocol made four predictions:
1. Late MAE <= 0.9x: **failed**. The best result is 0.944x, and even the post-hoc doubled skip rate only reaches 0.909x.
2. Late cov80 in [0.72, 0.90] in every primary run: **met** by A-c23.
3. Day-40 coverage rises toward 0.8: **met**, 0.49 -> 0.84.
4. The gain keeps its sign on the literature scenario: **met**.

The late track needs clauses 1 and 2 together, so the rule is not met.

## Mechanism
`diag-a.mts` rebuilds the cohorts with a labelled copy of the generator. The histories are identical: 1496 primary late rows, matching the harness's 213.714 x 7.

Late-row composition: 628 genuine long cycles, 821 merged gaps from missed logs (55%), and 47 double-log remainders.

| Class | Model | MAE | cov80 |
|---|---|---|---|
| Genuine | v2-trunc | 2.45 | 0.87 |
| Genuine | A-c23 | 3.38 | 0.92 |
| Skip | v2-trunc | 22.09 | 0.13 |
| Skip | A-c23 | 19.88 | 0.70 |
| Skip | class oracle (knows c) | 5.45 | 0.95 |

The pooled class-oracle late MAE is about 4.45. So the headroom is real, but it all sits in telling skips apart from long cycles.

Why the point barely moves:
- t0 = floor(v2 upper) + 1, so by construction the single-cycle component keeps about 10% of its mass past t0.
- For someone with no set-aside history, the posterior skip share at t0 is about w / (w + (1 - w) * 0.10), which is roughly 0.3.
- The conditional median therefore stays in the single-cycle mode for most rows.
- The 90% quantile does reach the skip mode. That fixes coverage and interval score (IS80 -59%) but not the point.
- In the data the skip share of late rows is 0.55, not 0.3. That is because v2 over-covers clean cycles (in-gate cov80 about 0.89 -- 0.91, a round-1 finding), so the genuine tail past t0 holds about 5% of mass, not 10%.
- The personal beta-binomial update is too weak to separate people. Most users have 0 or 1 set-aside intervals, and a missed log that gets absorbed by the two-long-gaps "pattern" rule is not counted at all.

At day 40 the single-cycle survival is tiny for regular profiles, so the skip mode dominates and the point moves. That is where the gain shows: day-40 MAE falls 30%. This matches the direction of Li et al. 2022, whose largest gain was at day 40.

Second-order knobs change late MAE by at most 0.04 d: adding c = 3, sum-of-c scaling and a weaker prior (N0 = 4). The post-hoc w0 = 0.09 moves the point more, but it overshoots coverage. It is fitted to this generator's clean-tail deficit, and real data with fatter genuine tails would push the other way, so it is not a candidate.

## What it rules out
- A literal SkipTrack-style skip mixture with a population skip rate cannot meet a 10% late-MAE bar at "just past the 80% window". At that point, history and elapsed time carry too little evidence to separate a missed log from a long cycle. Reaching the bar would need a skip weight tuned to the generator, and even doubling it gets only 0.909x.
- The mixture does not reverse on the literature scenario. Coverage and IS80 gains are consistent in all 9 runs, so the interval improvement is not a drift artifact.
- The choice of skip-component scale (same vs sum-of-c) and whether c = 3 is included are immaterial.

## Caveats
- The synthetic generator is ours. Its regular users are tighter than the literature, which inflates the skip share among late rows.
- About 214 late rows per run is small, so run-level coverage is noisy (roughly +-0.03).
- The point-in-skip-mode rate in `diag-a.txt` is a crude threshold (point > 1.5 x exp(mu)). It is only indicative.

## Production recommendation
Promote nothing under the locked rule, because the late-MAE clause failed.

The interval evidence is strong and consistent, though. A-c23's late window is calibrated in every primary run and on the literature scenario, where v2-trunc covers about 48%. Its interval score is less than half of v2-trunc's. Its day-40 point is 30% more accurate.

Luna currently shows no window in the `late` / `long-gap` states. If this is pursued, pre-register a new protocol rather than reinterpreting this one. Two options:
- a late-track rule on interval quality (calibration plus IS80);
- a day-40 / long-gap rule.

Any product use should show the bimodal predictive as a window, for example "any day now, or if a period went unlogged, around X -- Y". It should not show a single late date, and it must be validated on the read-only real-data backtest first.
