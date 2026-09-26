# R3 late window, confirmatory (pre-registered 2026-09-26, before any R3 run)

Question: does the round-2 skip-mixture late window give calibrated, much better intervals than v2's truncated tail on data it has never seen?

Candidates (frozen code, no changes): B1-norm-c2 from R2-3-late-skip-mixture/model-b.ts (product candidate), A-c23 from model-a.ts (comparator).
Data: unseen seeds 101-140 for each scenario (base, noisy, regular, literature); 160 runs. The round-1/2 harness seeds are excluded.
Pass criteria for a candidate (all must hold):
1. Late cov80 within [0.72, 0.90] in >= 90% of runs in every scenario.
2. Late IS80 <= 0.70 x v2-trunc late IS80 in >= 95% of all runs.
3. Mean day-40 cov80 >= 0.72 in every scenario.
4. Late MAE no worse than v2-trunc on average in every scenario.
If B1 passes, it may become the product's "if it hasn't started yet" window once a period is past the usual range, labelled as an estimate that allows for a missed log.
