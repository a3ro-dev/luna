# Findings

## Current understanding (after round 1, 2026-09-26)

forecast-v2's point forecast is close to the floor this simulator allows. Seven pre-registered changes to how it estimates a person's typical cycle (robust location, recency weighting, median blending, Student-t tails, missed-log splitting, prior retuning, integer period rounding) all missed the locked improvement rule. The largest cycle gain was 0.036 d of macro MAE (missed-log splitting, exploratory), against a 0.05 d bar.

The reason is not the estimator. Across scenarios, 6% (base), 13% (noisy) and 3% (regular) of forecast *targets* are themselves logging artifacts: a merged gap from a missed period, or a short gap from a double log. Every model covers about 0% of those, and they carry 45--60% of the interval score. On clean, in-gate targets, v2 already over-covers (0.89--0.91 for the base profile). The apparent "noisy under-coverage / regular over-coverage" pattern is one fixed block of artifact misses sitting on top of intervals that are slightly too wide for clean data.

## Patterns and insights
- Location alternatives are nearly redundant with v2: rolling-median errors correlate 0.97--0.99 with v2's (H5), Huber moves the point by >= 0.5 d on only 3--13% of forecasts (H1), and simulator drift is too small to pay for recency weighting (H2).
- Width knobs trade one scenario against another: narrowing calibrates base/regular but pushes noisy below 0.73 coverage; widening does the reverse (H6). Student-t tails widen everything equally because noisy under-coverage is flat across history length, i.e. not a small-n tail problem (H3).
- Cleaning the past cannot fix a contaminated target (H4). The lever is to model skips explicitly, as SkipTrack does (log-normal plus a log(c) skip offset), and to evaluate the late regime where the literature finds the largest gains (Li et al. 2022: day-40 RMSE 21.9 -> 11.8).
- Period length: rounding the point to whole days lowers period MAE 0.917 -> 0.878, but production already displays Math.round, so users already get this (H7).

## Lessons and constraints
- Do not tune against a single seed or scenario; the harness averages seven runs.
- Synthetic wins are necessary, not sufficient: the generator is ours. Its regular users (median within-person SD 2.2 d) are tighter than the literature (AWHS 3.8--5.4 d by age; Bull 2019 ovulatory-only 2.6 d), so "v2 over-covers regular users" is partly a generator artifact. Do not narrow production intervals on synthetic evidence alone.
- Its drift (+-0.15 d/cycle) is 5--10x the literature age slope (~0.015 d/cycle); anything that wins only through drift is suspect.
- Headline metrics mixing artifact and clean targets hide what a change does. Report in-gate and artifact targets separately (harness v2).
- Subagents cannot write .md report files in this environment; they return analyses and the orchestrator saves them.

## Open questions
- Does a skip-mixture predictive (R2-3) give useful, calibrated windows once a period is late, where Luna currently shows none?
- Does a personal artifact gate (AWHS rule, R2-1) catch in-gate doubles like 2 x 22 = 44 d without flagging real long cycles?
- Can per-user adaptive conformal levels (R2-2) fix calibration per person where global knobs cannot?
- Real-data question, deferred: does an age-conditioned within-person SD (R2-4) narrow the coverage gap between age bands? Needs the read-only real-data backtest.
