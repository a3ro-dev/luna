# Research log

## 2026-09-26 -- bootstrap
- Built a locked evaluation harness over three simulator scenarios (base, noisy, regular; 7 seeded runs) so a change cannot win by fitting one generator setting.
- Baseline v2-bayes: macro MAE 5.527 d, IS80 34.04, coverage 0.746--0.886 (calibration error 0.052). It under-covers on noisy histories and over-covers on regular ones: one global variance prior is too wide for regular users and too narrow for messy ones.
- Coverage constraint set relative to the baseline after seeing it (the original absolute [0.75, 0.88] rule fails the baseline itself); recorded here for transparency.
- Seven hypotheses written as protocols before any candidate ran.

## 2026-09-26 -- round 1 results and reflection (direction: BROADEN)
- Ran H1--H7 (40+ variants, 7 simulator runs each). None meets the locked rule; baseline reproduced exactly in every experiment.
- Key diagnostic (H3, H6): artifact targets (missed/double logs) are 3--13% of targets but 45--60% of IS80 with ~0 coverage; clean targets are over-covered. Location changes are redundant with v2 (error correlation 0.97--0.99).
- Literature scout (8 sources) independently points at explicit skip modelling (SkipTrack, Li 2022) and personal artifact gates (AWHS).
- Decision: promote nothing to production from round 1. Build harness v2 (locked before round 2) that adds in-gate metrics, a late-regime conditional evaluation, a literature-anchored scenario and PIT histograms. Round 2 tests R2-1 (personal gate), R2-2 (adaptive conformal), R2-3 (late-regime skip mixture), R2-5 (literature scenario re-score). R2-4 (age prior) is deferred to a real-data run.

## 2026-09-26 -- round 2 results (harness v2)
- R2-1 personal gate: refuted (macro MAE -0.002 d, IS80 +0.1%). Changes the fitted set on <4% of forecasts; for irregular profiles it removes real long cycles.
- R2-2 per-user ACI: refuted (in-gate calibration -0.006 vs -0.02 bar). About 7 past intervals per person is too little history to adapt a level.
- R2-6 narrower width for clean histories: met clause (c) on the harness, REJECTED by the adversarial verifier: noisy coverage breaks the 0.72 floor on 10/40 unseen seeds and the gain depends on the generator's tight regular users (reverses with a literature-realistic 3.8 d SD).
- R2-3 late-regime skip mixture (two independent designs): failed the locked MAE rule (-5.6/-5.7% vs -10%) but fixes late calibration (cov80 0.48 -> 0.78-0.84, every run in range), late IS80 -59%, day-40 MAE -30%; literature scenario keeps the sign. 55% of late rows are merged gaps.
- Decision: promote nothing from round 2. Pre-register R3 as a confirmatory test of the interval-quality claim on unseen seeds before any product use.
