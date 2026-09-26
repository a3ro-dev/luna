# H1-robust-location -- analysis

Saved by the orchestrator from the experiment agent's structured return (the agent could not write .md files).

**Verdict:** refuted · **meets locked improvement rule:** no

**Hypothesis as run:** H1: in the log-scale conjugate update, swap the sample mean for a robust location (Huber M-estimate, or trimmed mean / median blend) and the sample spread for a MAD-based robust scale, keeping the prior update. Predicted: lower macro MAE (most in the noisy scenario), coverage within the constraints, the regular scenario roughly unchanged.

| variant | macro MAE | IS80 | calib | coverage ok | within 3 d | cold | established | period |
|:--|--:|--:|--:|:-:|--:|--:|--:|--:|
| v2-bayes (baseline) | 5.527 | 34.04 | 0.052 | yes | 0.592 | 5.700 | 5.476 | 0.917 |
| H1-huber-mad (CONFIRMATORY) | 5.524 | 34.25 | 0.049 | yes | 0.596 | 5.700 | 5.443 | 0.917 |
| H1-huber-loc (CONFIRMATORY) | 5.517 | 34.03 | 0.052 | yes | 0.596 | 5.700 | 5.428 | 0.917 |
| H1-mad-scale (CONFIRMATORY) | 5.542 | 34.31 | 0.049 | yes | 0.591 | 5.700 | 5.527 | 0.917 |
| H1-trim-mad (CONFIRMATORY) | 5.534 | 34.27 | 0.049 | yes | 0.593 | 5.700 | 5.485 | 0.917 |
| H1x-huber-k1.0 (EXPLORATORY) | 5.518 | 34.03 | 0.052 | yes | 0.595 | 5.700 | 5.428 | 0.917 |
| H1x-huber-k0.7 (EXPLORATORY) | 5.523 | 34.03 | 0.052 | yes | 0.595 | 5.700 | 5.434 | 0.917 |
| H1x-huber-k2.0 (EXPLORATORY) | 5.518 | 34.03 | 0.052 | yes | 0.595 | 5.700 | 5.439 | 0.917 |
| H1x-median (EXPLORATORY) | 5.541 | 34.06 | 0.051 | yes | 0.593 | 5.700 | 5.454 | 0.917 |
| H1x-huber-k1.0-mad (EXPLORATORY) | 5.524 | 34.27 | 0.049 | yes | 0.596 | 5.700 | 5.440 | 0.917 |

**Best variant:** H1-huber-loc

## Mechanism

H1 is refuted: no variant meets the improvement rule. The best one, H1-huber-loc, cuts macro MAE by only 0.010 d, a fifth of the 0.05 d bar. The gate, the log transform and the prior/NU0 shrinkage already blunt contaminated history intervals, so Huber moves the point forecast by 0.5 d or more on only 3-13% of forecasts, and by just 0.2-0.3 d of error on those. Meanwhile, targets that are themselves artifacts (missed-log merges, double-log remnants, long irregular cycles) are 12-25% of forecasts but carry 56-74% of absolute error, and no location estimate can predict them. MAD scale makes things worse: the classic variance is what covers artifact targets, so MAD narrows intervals by about 0.3 d, drops coverage 0.01-0.02, raises IS80 0.6-0.8%, and weakens shrinkage toward the prior, which raises point MAE by +0.016. Also: the baseline reproduced exactly (5.527 / 34.036), and a local mean+classic copy matches v2-bayes to 0 max difference. H1-huber-loc's per-run bootstrap CI excludes 0 in only 2 of 7 runs. Files are in D:\poookie-cutie\autoresearch\experiments\H1-robust-location\: model.ts (confirmatory), exploratory.ts, diagnose.ts, and results\eval.json plus results\eval-exploratory.json. analysis.md was NOT written, because the harness blocks subagents from writing report .md files. Its content (table, labels, verdict, mechanism, what it rules out, recommendation) is in this output and needs to be saved by the parent if wanted. Nothing under src/ or in other experiment folders was touched.

## Production recommendation

none. Leave predictMetric and usableMask in src/lib/prediction/forecast.ts unchanged. Huber location (k=1.345, cutoff scaled by the prior-shrunk MAD variance) is harmless but only -0.010 d, too small to justify extra code or a model-version bump. MAD scale must not go into the predictive variance, because it under-covers noisy histories and raises IS80.
