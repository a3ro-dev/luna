# R2-1 personal missed-log gate (day-0 track, harness v2)
Change: once a person has >= 3 intervals inside the population gate, replace the fixed upper gate with the AWHS artifact rule: personal median + median absolute consecutive difference + 15 d (never above the population gate, never below 1.5 x median). Keep the lower gate and the "two long gaps = pattern" rule. Optionally also flag an interval within +-20% of 2x the personal median.
Why: a fixed 45 d cut misses in-gate doubles such as 2 x 22 = 44 d for short-cycle users (Li et al. 2023; SkipTrack 2025).
Prediction: noisy-scenario macro MAE and in-gate calibration improve; regular unchanged; must meet a day-0 rule (a), (b) or (c) and keep its sign on the literature scenario.
