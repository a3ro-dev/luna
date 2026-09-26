# H2-recency-weighting -- analysis

Saved by the orchestrator from the experiment agent's structured return (the agent could not write .md files).

**Verdict:** refuted · **meets locked improvement rule:** no

**Hypothesis as run:** H2 recency weighting: exponentially decaying weights (half-life 4-8 cycles) on past log-intervals in the mean and within-person variance, with Kish effective sample size nEff = (sum w)^2 / sum w^2 replacing n in the conjugate update, lower established-user (nPast>=6) macro MAE, leave cold start unchanged, and give a small overall gain.

| variant | macro MAE | IS80 | calib | coverage ok | within 3 d | cold | established | period |
|:--|--:|--:|--:|:-:|--:|--:|--:|--:|
| v2-bayes (baseline) | 5.527 | 34.04 | 0.052 | yes | 0.592 | 5.700 | 5.476 | 0.917 |
| H2-hl4 (CONFIRMATORY) | 5.532 | 34.08 | 0.055 | yes | 0.591 | 5.698 | 5.493 | 0.917 |
| H2-hl6 (CONFIRMATORY) | 5.529 | 34.05 | 0.054 | yes | 0.593 | 5.699 | 5.483 | 0.917 |
| H2-hl8 (CONFIRMATORY) | 5.528 | 34.05 | 0.053 | yes | 0.593 | 5.699 | 5.480 | 0.917 |
| H2-hl6-meanonly (EXPLORATORY: weighted mean, unweighted variance) | 5.529 | 34.04 | 0.053 | yes | 0.592 | 5.699 | 5.484 | 0.917 |
| H2-hl16 (EXPLORATORY: weak decay, checks the half-life curve) | 5.527 | 34.04 | 0.053 | yes | 0.592 | 5.699 | 5.477 | 0.917 |
| H2-hl6-regonly (EXPLORATORY: decay only for profiles with no condition) | 5.529 | 34.06 | 0.053 | yes | 0.592 | 5.700 | 5.483 | 0.917 |

**Best variant:** H2-hl8. It is the best confirmatory variant and is still slightly worse than the baseline: macroMAE +0.001 d, IS80 +0.03%, established MAE +0.004 d. None of the variants beats v2-bayes.

## Mechanism

Decay weighting lowers the lag bias caused by drift but increases variance, because the effective sample is smaller. In this simulator the drift is too small to pay for that. Drift is uniform in +-0.15 d/cycle (mean |d| = 0.075), so an equal-weight mean has a lag bias of about d*(n+1)/2: 0.26 d at n=6 and 0.49 d at n=12. That is a bias^2 of about 0.07-0.24 d^2, against within-person variance of about 4.8 d^2 for regular users and 36-144 d^2 for irregular ones. Half-life 6 removes only about 20% of that lag while cutting nEff from 12 to 10.4. A recent missed or double log that passes the gate also gets more weight, which is why the noisy runs lose the most. Established-user MAE therefore gets worse steadily as the decay gets stronger (+0.004 at hl8, +0.017 at hl4). The hl16 variant matches v2 to three decimals, so there is no better half-life in between. The only per-run gain was in regular:22 (established MAE 3.362 -> 3.346), and the base and noisy runs outweigh it. This rules out smooth recency decay as a source of gains on this harness, and shows that drift of this size is not a meaningful error source for v2. It does not rule out change-point handling for abrupt real-world shifts such as stopping birth control or postpartum, which would need evidence from the real-data backtest. Files: model at D:\poookie-cutie\autoresearch\experiments\H2-recency-weighting\model.ts, results at D:\poookie-cutie\autoresearch\experiments\H2-recency-weighting\results\eval.json. The baseline reproduced exactly (5.527 / 34.036). model.ts includes a self-check that half-life = Infinity gives the same result as production predictMetric to 1e-12. The period target was left on v2 unchanged as a control: all rows show period macroMAE 0.917. analysis.md was NOT written, because the subagent file-write policy blocked it. The table, verdict, mechanism, rule-outs and recommendation are all in this output instead, so the orchestrator needs to save them to autoresearch/experiments/H2-recency-weighting/analysis.md.

## Production recommendation

none. Keep equal weights in predictMetric and HISTORY_WINDOW = 12. Leave usableMask unchanged.
