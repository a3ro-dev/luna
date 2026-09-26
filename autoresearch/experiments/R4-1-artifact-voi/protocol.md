# R4-1 -- value of catching logging artifacts at input time

Pre-registered 2026-09-26, before any run.

## Question
Rounds 1-3 found that logging artifacts in the forecast *targets* (a missed period that merges two cycles, or a spurious second start a few days after a real one) carry 45-60% of the interval score while being 3-13% of targets. No estimator can fix a contaminated target. A product nudge can: ask "did you have a period in between that you didn't log?" when a new start follows a long gap, and "is this the same period?" when a start follows another within 15 days (chat already asks the second; the dashboard does not).

How much forecast quality would such nudges buy, as a function of how often users act on them?

## Design
- Forecast model: production v2-bayes day-0 forecast (unchanged).
- Simulator: `syntheticCohort` with the eval2 primary scenarios (base, noisy, regular) and the report-only literature scenario, on UNSEEN seeds 201-210 per scenario (none used in rounds 1-3).
- Treatment: a catch rate c in {0, 0.25, 0.5, 0.75, 1} applied separately to missed logs (missedLog * (1 - c)) and double logs (doubleLog * (1 - c)), and jointly.
- Metrics per scenario (mean over seeds): macro MAE (nPast >= 1), IS80, cov80, share of artifact (gated) targets.

## Decision rule (locked)
- If catching HALF of missed logs (c = 0.5, missed only) lowers base-scenario IS80 by >= 8% relative to c = 0, the missed-log backfill prompt is worth building next.
- If catching half of double logs lowers base IS80 by >= 3%, extend the chat "same period?" check to the dashboard quick log.
- Either effect must keep its sign in the noisy, regular and literature scenarios.
- This is a product value-of-information estimate, not a model change: nothing in forecast.ts changes because of it.

## Caveat
The simulator's artifact rates are our own assumptions (base 5% missed, 2% double). The size of the gain scales with them; the real-data rate is unknown.
