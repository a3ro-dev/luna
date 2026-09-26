# H6-prior-sensitivity -- analysis

Saved by the orchestrator from the experiment agent's structured return (the agent could not write .md files).

**Verdict:** mixed · **meets locked improvement rule:** no

**Hypothesis as run:** H6 prior sensitivity: changing NU0, the cycle within-person SD prior or HISTORY_WINDOW one at a time will not produce a single global setting that improves calibration in all three scenarios (base, noisy, regular). Stated reason: the within-person variance prior drives the scenario-to-scenario miscalibration. Run artifacts are in D:\poookie-cutie\autoresearch\experiments\H6-prior-sensitivity\: model.ts (makeModel knobs plus 4 CONFIRMATORY models: H6-nu1, H6-sd0.75, H6-sd1.25, H6-win6), sweep.mts (full one-at-a-time grid scored by the locked evaluate(), reported per scenario; asserts that the default knobs reproduce v2-bayes exactly on every run), diag.mts (EXPLORATORY coverage split by prior profile and by whether the target is gated), and results/{eval.json, eval.txt, sweep.json, sweep.txt, diag.txt}. The baseline reproduced: v2-bayes macroMAE 5.527, IS80 34.036, calib 0.052. NOTE: analysis.md was NOT written. The subagent harness blocked the Write call ("Subagents should return findings as text"), so its full content is in the mechanism, verdict and recommendation fields here, and the orchestrator needs to save it as analysis.md. Labels: CONFIRMATORY means the H6-nu{1,2,8,16,32}, H6-sd{0.5,0.75,1.25,1.5,2} and H6-win{3,6,9,24} sweep. EXPLORATORY means the X-b<B>-i<I> per-profile within-SD scales (B for the base profile, I for condition profiles) and the gated-target diagnostic. Per scenario (cov80 base/noisy/regular; baseline 0.832/0.748/0.881): nu1 0.802/0.725/0.844; sd0.75 0.779/0.693/0.829; sd1.25 0.864/0.783/0.913; win6 0.835/0.746/0.884. No protocol setting lowers calibration error, macroMAE or IS80 in all three scenarios. The only row that lowers IS80 in all three is the exploratory X-b0.85-i1.15, by just 0.6% overall. EXPLORATORY diagnostic, baseline, pooled over seeds: gated targets (merged missed-log gaps or double logs) are 5.9%, 13.1% and 2.8% of rows in base, noisy and regular, but make up 45%, 60% and 35% of IS80, with coverage of about 0. Base-profile coverage on in-gate targets is 0.897 (base), 0.892 (noisy) and 0.909 (regular); for the irregular profile it is 0.824, 0.787 and 0.842.

| variant | macro MAE | IS80 | calib | coverage ok | within 3 d | cold | established | period |
|:--|--:|--:|--:|:-:|--:|--:|--:|--:|
| v2-bayes | 5.527 | 34.04 | 0.052 | yes | 0.592 | 5.700 | 5.476 | 0.917 |
| H6-nu1 | 5.523 | 34.15 | 0.037 | yes | 0.592 | 5.703 | 5.462 | 0.918 |
| H6-nu2 | 5.523 | 34.05 | 0.043 | yes | 0.592 | 5.700 | 5.467 | 0.917 |
| H6-nu8 | 5.533 | 34.12 | 0.059 | yes | 0.592 | 5.701 | 5.489 | 0.916 |
| H6-nu16 | 5.541 | 34.24 | 0.061 | no | 0.591 | 5.702 | 5.505 | 0.916 |
| H6-nu32 | 5.548 | 34.37 | 0.063 | no | 0.590 | 5.702 | 5.519 | 0.916 |
| H6-sd0.5 | 5.614 | 35.64 | 0.117 | no | 0.588 | 5.883 | 5.487 | 0.917 |
| H6-sd0.75 | 5.553 | 34.35 | 0.048 | no | 0.591 | 5.755 | 5.482 | 0.917 |
| H6-sd1.25 | 5.526 | 34.32 | 0.065 | no | 0.591 | 5.699 | 5.472 | 0.917 |
| H6-sd1.5 | 5.540 | 34.99 | 0.076 | no | 0.589 | 5.726 | 5.469 | 0.917 |
| H6-sd2 | 5.589 | 36.96 | 0.102 | no | 0.584 | 5.808 | 5.472 | 0.917 |
| H6-win3 | 5.572 | 34.48 | 0.058 | yes | 0.584 | 5.700 | 5.601 | 0.924 |
| H6-win6 | 5.535 | 34.14 | 0.054 | yes | 0.591 | 5.700 | 5.505 | 0.918 |
| H6-win9 | 5.527 | 34.04 | 0.052 | yes | 0.593 | 5.700 | 5.477 | 0.917 |
| H6-win24 | 5.527 | 34.03 | 0.052 | yes | 0.592 | 5.700 | 5.476 | 0.917 |
| X-b0.75-i1 (EXPLORATORY) | 5.541 | 33.96 | 0.039 | no | 0.591 | 5.729 | 5.479 | 0.917 |
| X-b0.75-i1.25 (EXPLORATORY) | 5.538 | 33.84 | 0.033 | yes | 0.590 | 5.720 | 5.476 | 0.917 |
| X-b0.85-i1.15 (EXPLORATORY) | 5.531 | 33.85 | 0.040 | yes | 0.591 | 5.706 | 5.476 | 0.917 |
| X-b1-i1.25 (EXPLORATORY) | 5.523 | 33.92 | 0.051 | yes | 0.592 | 5.691 | 5.474 | 0.917 |

**Best variant:** none (closest: H6-nu1 -- calibErr 0.037 vs 0.052 and coverageOk, but macroMAE only -0.004 d and IS80 +0.3%; noisy min-run coverage 0.723 sits at the constraint edge)

## Mechanism

The prediction holds. No global NU0, within-SD scale or window improves any metric in all three scenarios, and nothing meets the locked rule: the best macroMAE drop is 0.004 d and no protocol setting lowers IS80. Narrowing (sd<1, NU0<4) calibrates base and regular but pushes noisy under 0.73, and widening does the opposite. The stated rationale is refuted. On real single-cycle (in-gate) targets, base-profile users are over-covered by about the same amount in every scenario (0.89-0.91), because the 4 d within-SD prior is wider than this generator's regular users (median SD 2.2 d) and NU0=4 is slow to give way. The noisy scenario only looks under-covered because 13% of its targets are gated missed-log or double-log gaps. Coverage on those is about 0 and they carry 35-60% of IS80, so any variance knob just trades in-gate over-coverage against a fixed block of misses. The knobs set width and barely move the point forecast, which is why MAE cannot improve either. HISTORY_WINDOW is untestable upward on this generator: at most 14 intervals and ±0.15 d/cycle drift make windows ≥9 identical to the baseline, and shorter windows only lose information (win3 macroMAE +0.046). What this rules out: global retuning of these three parameters, and H3's premise that noisy under-coverage means the predictive tails are too thin. Noisy base-profile in-gate coverage is already 0.89, and only irregular-profile noisy users (0.787) could gain from heavier tails. Per-person adaptive variance would fix the regular-user over-coverage but not the noisy misses, which are log-completeness events in the target. Suggestion for the outer loop (the harness is locked): also report cov80 and IS80 on in-gate targets, so later hypotheses are not judged mainly on missed-log noise.

## Production recommendation

none -- keep NU0 = 4, the cycle/period within-SD priors and HISTORY_WINDOW = 12 in src/lib/prediction/forecast.ts unchanged (predictMetric and usableMask untouched).
