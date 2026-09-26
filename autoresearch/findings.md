# Findings

## Current understanding
- Baseline forecast-v2 beats simple point baselines on synthetic data but is miscalibrated in opposite directions for regular and noisy histories.
- expanding-median has a lower median error than v2 on the original backtest, hinting that a robust location estimate could help.

## Patterns and insights
(pending round 1)

## Lessons and constraints
- Do not tune against a single seed or scenario; the harness averages seven runs.
- Synthetic wins are necessary, not sufficient: the generator is ours.

## Open questions
- Is the noisy-scenario under-coverage driven by missed logs that pass the gate (two-cycle gaps under 45 days) or by heavy tails?
