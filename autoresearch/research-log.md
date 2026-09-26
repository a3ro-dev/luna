# Research log

## 2026-09-26 -- bootstrap
- Built a locked evaluation harness over three simulator scenarios (base, noisy, regular; 7 seeded runs) so a change cannot win by fitting one generator setting.
- Baseline v2-bayes: macro MAE 5.527 d, IS80 34.04, coverage 0.746--0.886 (calibration error 0.052). It under-covers on noisy histories and over-covers on regular ones: one global variance prior is too wide for regular users and too narrow for messy ones.
- Coverage constraint set relative to the baseline after seeing it (the original absolute [0.75, 0.88] rule fails the baseline itself); recorded here for transparency.
- Seven hypotheses written as protocols before any candidate ran.
