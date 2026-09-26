# H5-median-ensemble -- analysis

Saved by the orchestrator from the experiment agent's structured return (the agent could not write .md files).

**Verdict:** refuted · **meets locked improvement rule:** no

**Hypothesis as run:** H5 median ensemble: set the cycle point forecast to a blend of the v2 log-scale posterior location and log(rolling median of the last 6 usable intervals), with the weight rising with n and the 80/95% intervals recentred on the blend (same predictive s). Predicted outcome: macro MAE falls for nPast 3+ and cold start is unchanged.

| variant | macro MAE | IS80 | calib | coverage ok | within 3 d | cold | established | period |
|:--|--:|--:|--:|:-:|--:|--:|--:|--:|
| v2-bayes (baseline) | 5.527 | 34.04 | 0.052 | yes | 0.592 | 5.700 | 5.476 | 0.917 |
| H5-n12 (CONFIRMATORY, w=n/(n+12)) | 5.541 | 34.10 | 0.051 | yes | 0.592 | 5.714 | 5.479 | 0.917 |
| H5-cap50 (CONFIRMATORY, w=0.5*min(n,6)/6) | 5.548 | 34.14 | 0.050 | yes | 0.592 | 5.716 | 5.487 | 0.917 |
| H5-gate3 (CONFIRMATORY, w=0 for n<3 then ramps to 0.5 at n=6) | 5.538 | 34.09 | 0.051 | yes | 0.592 | 5.700 | 5.487 | 0.917 |
| H5-cap75 (CONFIRMATORY dose check, w=0.75*min(n,6)/6) | 5.571 | 34.25 | 0.050 | yes | 0.591 | 5.726 | 5.517 | 0.917 |
| H5x-med12-cap50 (EXPLORATORY, median of the same 12-interval window) | 5.545 | 34.11 | 0.050 | yes | 0.592 | 5.716 | 5.475 | 0.917 |
| H5x-mean6-cap50 (EXPLORATORY, mean of the last 6, recency only) | 5.581 | 34.20 | 0.051 | yes | 0.589 | 5.716 | 5.615 | 0.917 |

**Best variant:** H5-gate3 is the least bad variant (+0.011 d macroMAE, +0.2% IS80) but is still worse than v2-bayes, so no variant wins.

## Mechanism

v2 errors and rolling-usable-median errors are almost perfectly correlated (0.970-0.988 in every scenario x nPast bucket; see diag.ts), and the median alone is worse than v2 in every bucket, so the best weight on it is zero or below. Any positive weight adds variance, and the harm grows with the weight (gate3 < n12 < cap50 < cap75) across 27 of 28 run-cells. Harm is worst in the noisy scenario, because the gate already strips gross outliers (double-log gaps under 15 d, isolated missed-log gaps over 45 d) and the leftover noise is smooth lognormal, where the median is less efficient than the 12-interval log-mean. At n=1-5 the blend also partly undoes v2's useful prior shrinkage. In the EXPLORATORY split, a median over the same 12-interval window is neutral for established users (est 5.475 vs 5.476), while a recency-only mean of the last 6 hurts them (5.615): drift is too small to pay for the lost observations. What this rules out: location averaging, and single outliers slipping past the gate, as causes of the noisy-scenario error. Effort should go to spread and tails (H3) or missed-log handling (H4). The harness blocked writing analysis.md (subagents may not write report files), so this output is the analysis. Files: model.ts, diag.ts (EXPLORATORY) and results/eval.json in D:\poookie-cutie\autoresearch\experiments\H5-median-ensemble\. The baseline reproduced 5.527 / 34.036 exactly, nothing under src/ was edited, and the database backtest was not run.

## Production recommendation

none
