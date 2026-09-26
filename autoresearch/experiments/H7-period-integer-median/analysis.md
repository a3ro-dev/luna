# H7-period-integer-median -- analysis

Saved by the orchestrator from the experiment agent's structured return (the agent could not write .md files).

**Verdict:** mixed · **meets locked improvement rule:** no

**Hypothesis as run:** H7: for bleeding-length forecasts, predict the posterior median rounded to whole days and use a discrete (integer) 80% interval. Prediction: period macro MAE falls below 0.917 with coverage kept. analysis.md was not written because the environment blocks subagents from writing report files; the analysis is in these fields. Code is in autoresearch/experiments/H7-period-integer-median/model.ts (variants) and period.mts (period-target metrics the harness does not aggregate). Results are in results/eval.json, eval.txt and period.txt. Baseline v2-bayes reproduces exactly: 5.527 macroMAE, 34.036 IS80, 0.052 calib.

| variant | macro MAE | IS80 | calib | coverage ok | within 3 d | cold | established | period |
|:--|--:|--:|--:|:-:|--:|--:|--:|--:|
| v2-bayes (baseline) | 5.527 | 34.04 | 0.052 | yes | 0.592 | 5.700 | 5.476 | 0.917 |
| H7-round [CONFIRMATORY ablation: period point = ceil(mu-0.5), interval unchanged; period cov80 0.784, pIS80 4.060, bootstrap dMAE -0.039 with CI<0 in 7/7 runs] | 5.527 | 34.04 | 0.052 | yes | 0.592 | 5.700 | 5.476 | 0.878 |
| H7-discrete [CONFIRMATORY protocol: point dq(.5), 80% interval [dq(.1),dq(.9)]; period cov80 0.905 (0.893-0.920, 6/7 runs >=0.90), pIS80 4.060->3.889 (-4.2%), days in interval 2.85->3.84] | 5.527 | 34.04 | 0.052 | yes | 0.592 | 5.700 | 5.476 | 0.878 |
| H7x-nearest80 [EXPLORATORY: integer interval with model mass nearest 0.8; period cov80 0.807 (0.799-0.829); integer-honest IS80 4.410->4.327 (-1.9%) but harness pIS80 worse 4.327 vs 4.060] | 5.527 | 34.04 | 0.052 | yes | 0.592 | 5.700 | 5.476 | 0.878 |
| H7x-mathround [EXPLORATORY: Math.round(mean), which production already displays] | 5.527 | 34.04 | 0.052 | yes | 0.592 | 5.700 | 5.476 | 0.883 |
| H7x-all-discrete [EXPLORATORY: same discretization on cycle target too] | 5.519 | 34.00 | 0.062 | no | 0.643 | 5.688 | 5.464 | 0.878 |

**Best variant:** H7-round

## Mechanism

Bleed length is a whole-day count with within-person spread of about 1 day, so the expected absolute error |p - Y| is piecewise linear between integers and is smallest at the discrete median. A fractional point pays a linear penalty of about 0.38 per day near the median, so rounding cuts period macro MAE from 0.917 to 0.878 (CI < 0 in all 7 runs; both cold-start and established users improve). Of that gain, 0.005 d comes from rounding ties down, and it only exists because the 5.5 d prior sits above the generator's 4.99 d mean, so it should not be ported. The protocol's discrete interval [dq(.1), dq(.9)] improves IS80 mostly by covering about 1 more whole day (3.84 vs 2.85), which pushes period coverage to 0.905 and calibration error from 0.016 to 0.105. The locked cycle metric cannot move by construction; discretizing the cycle target too gives only -0.008 d and breaks coverage (max 0.907).

## Production recommendation

none. Production already shows users Math.round(periodLength.mean) (dashboard/page.tsx L156, cycle-tools.ts L369, forecast.ts L376 bleedDays) and never displays periodLength.lower/upper, so H7x-mathround (0.883) is effectively what users see today. Optional, not a forecast change: the v2 wrapper in backtest.ts could score the rounded period point so reported period MAE matches the display. Do not adopt discrete period intervals without a calibration fix, and do not discretize cycle output.
