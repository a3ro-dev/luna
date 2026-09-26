# H6 prior sensitivity (analysis, not tuning)
Change: vary NU0, the within-person SD prior and HISTORY_WINDOW one at a time; report how metrics move per scenario. Any recommended value must improve all three scenarios, not the average only.
Why: base/noisy/regular miscalibrate in opposite directions, which suggests the within-person variance prior, not the model form, drives calibration.
Prediction: no single global setting improves calibration in all scenarios; a per-person adaptive variance (H3/H1) is needed. A negative result is informative.
