# H4-missed-log-splitting -- analysis

Saved by the orchestrator from the experiment agent's structured return (the agent could not write .md files).

**Verdict:** mixed · **meets locked improvement rule:** no

**Hypothesis as run:** H4 missed-log splitting. An interval close to k times the person's typical length (k=2,3; |x/(k r)-1|<=0.2, where r is the median of the last 12 intervals >= gate.min if there are at least 3, else the prior mean) is treated as k missed cycles and replaced by x/k, either as k observations or as one observation, instead of being set aside or used raw. Predicted: noisy macro MAE falls noticeably, base gains slightly, regular unchanged.

| variant | macro MAE | IS80 | calib | coverage ok | within 3 d | cold | established | period |
|:--|--:|--:|--:|:-:|--:|--:|--:|--:|
| v2-bayes (baseline, reproduced 5.527/34.036) | 5.527 | 34.04 | 0.052 | yes | 0.592 | 5.700 | 5.476 | 0.917 |
| H4-copies [CONFIRMATORY] x/k entered as k observations | 5.542 | 34.45 | 0.051 | yes | 0.598 | 5.792 | 5.388 | 0.917 |
| H4-one [CONFIRMATORY] x/k entered as one observation | 5.531 | 34.23 | 0.051 | yes | 0.599 | 5.768 | 5.386 | 0.917 |
| H4-wdof [EXPLORATORY r1] weight k on mean, 1 dof on variance | 5.540 | 34.29 | 0.051 | yes | 0.598 | 5.789 | 5.387 | 0.917 |
| H4-one-t15 [EXPLORATORY r1] tolerance 0.15 | 5.528 | 34.16 | 0.052 | yes | 0.597 | 5.728 | 5.392 | 0.917 |
| H4-one-reg [EXPLORATORY r2] H4-one only for base-gate profiles (gate.max<=45) | 5.490 | 33.93 | 0.052 | yes | 0.598 | 5.676 | 5.408 | 0.917 |
| H4-wdof-reg [EXPLORATORY r2] H4-wdof only for base-gate profiles | 5.492 | 33.93 | 0.051 | yes | 0.598 | 5.677 | 5.408 | 0.917 |

**Best variant:** H4-one-reg (exploratory). It improves macro MAE by 0.036 d and IS80 by 0.3%, better in all 7 runs, but that is below the locked threshold. The best confirmatory variant is H4-one at +0.004 d, which is worse than baseline.

## Mechanism

For regular (base-gate) profiles, splitting helps in every scenario and history-length bucket, mainly where two missed logs trip longIsPattern and production starts using 57 d gaps raw. For irregular (wide-gate) profiles, genuine long, skewed cycles get halved against the 29 d prior at cold start: base cold forecasts lost 4.8 d each and their coverage fell from 0.87 to 0.59. In established histories it also removes real variance, which narrows intervals. That loss cancels the gain, so both confirmatory variants come out neutral or worse. Even when restricted to base-gate profiles the ceiling is low: a lone missed log was already set aside by the gate, and forecasts whose target is itself a merged gap carry 32-35% (base) and 47-49% (noisy) of the absolute error, which past-side cleaning cannot fix. Counting x/k as k observations also overstates the evidence and pulls coverage down to 0.723.

## Production recommendation

none
