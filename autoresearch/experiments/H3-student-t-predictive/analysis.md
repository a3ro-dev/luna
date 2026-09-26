# H3-student-t-predictive -- analysis

Saved by the orchestrator from the experiment agent's structured return (the agent could not write .md files).

**Verdict:** refuted · **meets locked improvement rule:** no

**Hypothesis as run:** H3: using the exact normal-inverse-gamma posterior predictive (Student-t with nu0+n df) for interval quantiles, optionally with a data-driven within-person variance prior, lowers calibration error and IS80 (by lifting noisy-scenario coverage) with point MAE unchanged.

| variant | macro MAE | IS80 | calib | coverage ok | within 3 d | cold | established | period |
|:--|--:|--:|--:|:-:|--:|--:|--:|--:|
| v2-bayes (baseline, reproduced) | 5.527 | 34.04 | 0.052 | yes | 0.592 | 5.700 | 5.476 | 0.917 |
| H3-t-plugin (CONFIRMATORY) | 5.527 | 34.19 | 0.059 | no | 0.592 | 5.700 | 5.476 | 0.917 |
| H3-nig-exact (CONFIRMATORY) | 5.559 | 34.17 | 0.057 | yes | 0.589 | 5.703 | 5.545 | 0.916 |
| H3-t-eb (CONFIRMATORY, protocol optional arm) | 5.574 | 34.15 | 0.051 | no | 0.590 | 5.794 | 5.483 | 0.917 |
| H3-t-irreg-only (EXPLORATORY) | 5.527 | 33.99 | 0.052 | yes | 0.592 | 5.700 | 5.476 | 0.917 |

**Best variant:** H3-t-irreg-only (EXPLORATORY; IS80 -0.14%, far below the 2% bar). No confirmatory variant beat v2-bayes.

## Mechanism

The premise is wrong: v2 noisy coverage is flat across nPast (0.747 / 0.740 / 0.755 at nPast 1-2 / 3-5 / 6+), so it is not a low-n tail problem. The gap comes from the 13.1% of noisy targets (5.9% base, 2.8% regular) that are themselves missed or extra logs outside the gate. Every model covers about 0% of those, while on clean targets v2 already over-covers (0.860 noisy, 0.884 base, 0.905 regular), and those rows make up roughly 35-60% of IS80. So t tails widen intervals by a similar amount everywhere: t-plugin pushes regular to 0.902 (constraint fail) and raises IS80 +0.45%, NIG-exact over-shrinks low-variance users (est MAE +0.07), and the EB variance prior (fit on held-out seed 9001: regular nu0=3, sd 0.073; irregular nu0=17.75, sd 0.274) is calibrated on clean targets (0.79-0.82) but drops noisy headline coverage to 0.68 and hurts cold MAE. The protocol also asked for analysis.md, but the subagent file policy blocked that write; artifacts are in D:\poookie-cutie\autoresearch\experiments\H3-student-t-predictive\ (model.ts, diag.mts, results\eval.json, results\diag.txt), and the lever to pursue next is target contamination (H4) and per-profile width (H6), not tail shape.

## Production recommendation

none -- keep predictMetric on the Normal quantile normInv(0.5 + level/2) with the current semi-conjugate update and NU0 = 4; no change to usableMask for this hypothesis.
