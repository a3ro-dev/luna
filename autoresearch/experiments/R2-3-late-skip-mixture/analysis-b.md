# R2-3 design B -- lateness as evidence (skip-posterior mixture)

## What was run
Model file: `autoresearch/experiments/R2-3-late-skip-mixture/model-b.ts`. Results: `results/model-b-eval2.json`. Diagnostic: `diag-b.mts`, output in `results/diag-b.txt`.

Given `past`, `ctx` and `t0`:
- Take forecast-v2's log-scale predictive (mu, s).
- Mixture over c true cycles inside the open interval: log y | c ~ D(mu + log c, s), with the same scale for every c (as the protocol says).
- Skip weight w = (1 + k) / (1 + 21.2 + n). This is a Beta(1, 21.2) prior with mean W0 = 0.045 (AWHS / SkipTrack). k = the person's set-aside long intervals (above gate.max and not treated as pattern). n = past intervals >= gate.min.
- Mixing weights: P(c=2) = w for c in {1,2}. For c in {1,2,3} the weights are (1-w, w(1-w), w^2).
- Conditioning on y >= t0 (integer days, y > t0 - 0.5) is Bayes on the component label: P(c | late) ∝ P(c) S_c(t0). The point is the conditional median. The interval is the conditional 10% and 90% quantiles (found by bisection).
- D is either Normal (the protocol form) or Student-t with nu = 4 on the log scale (the design-B heavy tail; closed-form cdf, same scale s). nu = 4 was fixed before running and not tuned.
- Null check: the Normal single-component case (c = 1 only) reproduces v2-trunc to 1.5e-4 d.

## Variants (harness v2, 7 primary runs; literature scenario is report-only)
| Variant | Label | lateMAE | vs base | late macro | cov80 (min-max) | covOk | late IS80 | width80 | d40 MAE | d40 cov | lit lateMAE | lit d40 MAE |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| v2-trunc | baseline | 12.616 | -- | 12.882 | 0.478 (0.344-0.659) | false | 100.13 | 8.2 | 12.092 | 0.490 | 11.398 | 10.73 |
| B1-norm-c2 | CONFIRMATORY | 12.066 | -4.4% | 12.333 | 0.828 (0.742-0.880) | true | 40.47 | 27.0 | 8.380 | 0.836 | 11.002 | 7.40 |
| B2-norm-c3 | CONFIRMATORY | 12.063 | -4.4% | 12.331 | 0.842 (0.763-0.889) | true | 40.41 | 27.8 | 8.350 | 0.841 | 11.000 | 7.40 |
| B3-t4-c2 | EXPLORATORY | 11.897 | -5.7% | 12.121 | 0.777 (0.733-0.810) | true | 43.80 | 32.2 | 9.168 | 0.869 | 10.934 | 8.21 |
| B4-t4-c3 | EXPLORATORY | 11.900 | -5.7% | 12.124 | 0.786 (0.741-0.810) | true | 43.93 | 33.0 | 9.139 | 0.874 | 10.940 | 8.18 |
| B5-t4-only | EXPLORATORY (ablation) | 12.265 | -2.8% | 12.507 | 0.543 (0.450-0.637) | false | 78.30 | 19.8 | 11.302 | 0.672 | 11.118 | 10.08 |

Locked late rule: lateMAE <= 0.9 x 12.616 = 11.354, and cov80 in [0.72, 0.90] in every primary run. The baseline reproduced: v2-bayes 5.527 / 34.036, v2-trunc 12.616 / 0.478. No day-0 models were exported, so the day-0 track is unchanged.

## Verdict: mixed, and the locked rule is not met
- The coverage clause holds for B1-B4 in every primary run. Late coverage rises from 0.48 to 0.78-0.84, and late interval score falls about 60% (100 to 40-44).
- Day-40 coverage rises to 0.84-0.87, which is what the protocol predicted (toward 0.8). Day-40 MAE falls 12.09 to 8.35 (-31%, B2). This is qualitatively Li et al. 2022's day-40 result.
- The MAE clause fails. The best is -5.7% (B3/B4, exploratory) and -4.4% for the confirmatory variants, against the -10% required.
- Every variant keeps its sign on the literature scenario (lateMAE -3.5% to -4.1%, day-40 MAE -31% for B1/B2). The reversal guard does not trigger.
- c=3 adds nothing measurable (B2 vs B1: -0.003 d MAE, +0.014 coverage).

## Mechanism (from diag-b.mts)
Late rows split by a proxy label: "skip-like" means y > 1.6 x the v2 median. The generator does not label merged gaps.
| Scenario | skip-like share of late rows | mean P(skip given late), Normal / t4 | single-like MAE v2 / B1 / B3 | skip-like MAE v2 / B1 / B3 | oracle-class MAE |
|---|---|---|---|---|---|
| base | 0.62 | 0.29 / 0.23 (same on both classes) | 1.73 / 2.42 / 3.72 | 18.8 / 17.4 / 16.2 | 4.3 |
| noisy | 0.81 | 0.30-0.32 / 0.24-0.26 | 1.82 / 2.94 / 4.63 | 20.6 / 19.0 / 17.9 | 7.3 |
| regular | 0.39 | 0.28 / 0.22 | 1.14 / 1.90 / 3.07 | 20.0 / 19.0 / 18.1 | 2.5 |
| literature | 0.59 | 0.27-0.28 / 0.22 | 1.38 / 1.98 / 3.19 | 18.4 / 17.3 / 16.4 | 3.4 |

1. **At the harness's late origin, lateness is almost no evidence.** t0 is the day after v2's own 80% window, so the single-cycle survival S_1(t0) is about 0.09 for every row. The skip survival S_2(t0) is about 1. The posterior P(skip given late) therefore sits near 0.045 / (0.045 + 0.955 x 0.09), about 0.3, for nearly everyone. It is identical on skip-like and single-like rows (0.29 vs 0.29 in base), so the posterior does not discriminate at all.
2. **With a posterior below 0.5 and no discrimination, the conditional median stays in the single component's truncated tail**, a few days past t0. The mixture moves the 90% quantile into the skip mode, which is why coverage and IS80 improve a lot. It barely moves the point, so MAE gains only 4-6%. The oracle-class bound (4.3 d in base vs 12.4) shows the whole lever is classification, and neither history nor the elapsed days give any classification signal at t0.
3. **The posterior is also miscalibrated low:** 0.29 against a skip-like share of 0.62 in base and 0.81 in noisy. v2 over-covers clean cycles (in-gate coverage about 0.9), so its real single-cycle exceedance at t0 is below the nominal 0.09. Round 1 flagged part of this as a generator artifact: the simulator's regular users are tighter than the literature. Raising w0 or narrowing S_1 to fix it would be fitting the generator, so it was not done.
4. **The per-person beta-binomial update carries no signal in this simulator by construction.** `syntheticCohort` applies `missedLog` as one population constant, so a person's past skips say nothing about their next one. Li et al. report P(skip by day 40) of 0.8 for past skippers vs 0.5 for never-skippers. That real-data signal cannot be rewarded here.
5. **Day 40 is where lateness becomes evidence.** For a regular user, S_1(40) is tiny, so the posterior jumps toward the skip mode and the point follows. That gives the -31% day-40 MAE.
6. **The design-B heavy tail (t4) is a trade, not a gain.** It raises S_1(t0), which lowers P(skip given late) to about 0.23. It then spreads the conditional median outward. That helps skip-like rows (17.4 to 16.2) and hurts single-like rows (2.4 to 3.7). Net effect: late MAE -0.17 d vs B1. But late IS80 is worse (40.5 to 43.8), day-40 MAE is worse (8.38 to 9.17), and so is the regular scenario: B3 is worse than v2-trunc on both regular seeds (9.55 vs 9.18, 8.39 vs 7.88). The ablation B5 (t4 alone, no skip component) fails coverage (0.54). The skip component, not the tail, is what fixes calibration.

## What it rules out
- A single-origin skip mixture at t0 = window end + 1 cannot reach -10% late MAE on this simulator with a population skip prior. Its posterior is near-constant across rows, whether the single component is Normal or t4 and whether c goes up to 2 or 3.
- A heavier log-scale tail on the single cycle is not a free improvement. Design B's premise, that genuinely long cycles are over-represented among late ones, costs more in interval score and on regular users than it gains in MAE.
- Per-person skip propensity cannot be tested with this generator. That needs the read-only real-data backtest, or a generator with per-person missed-log rates (a harness change, which would need a new locked protocol).

## Production recommendation
Do not promote anything, because the locked late rule is not met. Details:
- If a late-state window is later wanted for the UX (Luna currently shows nothing past the window), the candidate is the confirmatory Normal c in {1,2} form (B1). It is simpler than B2 at the same numbers, calibrated in every run, and has late IS80 -60% and day-40 MAE -31%.
- Its 80% windows are about 27 d wide. They would need honest copy ("it may have started and not been logged, or this cycle may be long").
- Do not ship the t4 tail.
- Any promotion should wait for the read-only real-data backtest. A per-person skip rate could also make the beta-binomial update informative there, which the simulator cannot show.
- A day-40 or multi-day late evaluation looks more favourable, but it would need its own pre-registered protocol. It must not reinterpret this result.

Scope note for the orchestrator: the relayed user request for this workflow run was "build the 3d moon hero". Git shows it already committed (616019f). This subagent ran the computed R2-3 design-B experiment only: new files in the experiment folder, nothing in src/, nothing committed.