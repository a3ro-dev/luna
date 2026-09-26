# R2-1-personal-gate -- analysis

**Verdict:** refuted · **meets locked improvement rule:** no (clauses a, b, c and late all fail)

**Hypothesis as run:** after >= 3 intervals inside the population gate (the last 12 of them), the upper artifact gate becomes pmax = clamp(median + MACD + 15 d, 1.5 x median, population gate.max). MACD is the median absolute consecutive difference of those in-gate intervals. The lower gate and the "two long gaps among the last 6 = pattern" rule stay. With fewer than 3 in-gate intervals the production rule applies unchanged. The period target delegates to v2-bayes.

Harness: `node --no-warnings autoresearch/src/eval2.mts autoresearch/experiments/R2-1-personal-gate/model.ts --json autoresearch/experiments/R2-1-personal-gate/results/eval2.json`. Baseline reproduced exactly: v2-bayes 5.527 / 34.036, v2-trunc 12.616 / 0.478.

## Variants (declared in model.ts before the first run)

| variant | label | macro MAE | IS80 | calib | in-gate calib | in-gate IS80 | cov ok | lit MAE | lit IS80 |
|:--|:--|--:|--:|--:|--:|--:|:-:|--:|--:|
| v2-bayes (baseline) | -- | 5.527 | 34.036 | 0.052 | 0.0835 | 18.419 | yes | 4.570 | 27.064 |
| R21-gate: literal rule, pattern rule counts gaps > pmax | CONFIRMATORY | 5.524 | 34.065 | 0.052 | 0.0813 | 18.454 | yes | 4.564 | 27.046 |
| R21-gate-2x: + flag within +-20% of 2 x median (protocol option) | CONFIRMATORY | 5.525 | 34.149 | 0.052 | 0.0789 | 18.548 | yes | 4.556 | 27.045 |
| R21-gate-reg: R21-gate only for base-gate profiles (gate.max <= 45) | EXPLORATORY | 5.526 | 34.043 | 0.052 | 0.0834 | 18.424 | yes | 4.569 | 27.055 |
| R21-gate-poppat: pattern rule judged on population gate | EXPLORATORY | 5.522 | 34.061 | 0.053 | 0.0807 | 18.455 | yes | 4.564 | 27.049 |

| late model | label | late MAE | late cov80 | cov ok | late IS80 | day-40 MAE | lit late MAE |
|:--|:--|--:|--:|:-:|--:|--:|--:|
| v2-trunc (baseline) | -- | 12.616 | 0.478 | no | 100.13 | 12.092 | 11.398 |
| R21-gate-trunc: R21-gate predictive truncated at t0 | EXPLORATORY | 12.623 | 0.475 | no | 100.32 | 12.100 | 11.391 |

Rule check against R21-gate:
- (a) macro MAE -0.002 d; the bar is -0.05.
- (b) IS80 ratio 1.0008; the bar is <= 0.98.
- (c) in-gate calibration -0.002; the bar is -0.02.
- The best variant on clause (c) is R21-gate-2x at -0.0046, still 4x short.
- Late ratio 1.0005; the bar is <= 0.90, and cov80 stays near 0.48.

Per scenario, R21-gate, mean over seeds:

| scenario | d macro MAE | d IS80 | in-gate cov80 |
|:--|--:|--:|:--|
| noisy | -0.007 | +0.07 | 0.860 -> 0.856 |
| base | -0.001 | +0.025 | -- |
| regular | +0.001 | -0.006 | -- |
| literature (report-only) | -0.006 | -0.018 | -- |

The prediction's direction held (noisy slightly better, regular unchanged), but the size is 5-10x too small. IS80 moves the wrong way in the primary runs.

## Mechanism

Evidence comes from `diag.mts`. It replays syntheticCohort's RNG stream to label every logged interval as clean, merged (missed log) or double. It asserts the replica reproduces each cohort exactly.

1. **The gate rarely changes anything.** pmax is computed on about 70% of forecasts, but the fitted interval set changes on only 0.1-0.3% (regular), 2-2.4% (base) and 3.5-4.2% (noisy) of forecasts.
   - For a typical regular user (median ~28.5 d, MACD ~2), median + MACD + 15 is about 45.5, so pmax is clamped at the existing 45 d gate.
   - Merged gaps for base-gate users are about 57 d and already set aside.
   - In-gate doubles such as 2 x 22 = 44 d need a personal mean of about 22-24 d. That is roughly the bottom 1-4% of this generator's regular users: only 0-9 such gaps per 400-user cohort.
2. **For regular profiles it is a precise but low-recall detector.** Across all 9 runs it newly set aside 14 merged gaps, 1 double and 0 clean cycles, catching 14 of 28 in-gate merged gaps (50%).
   - The misses come from a built-in weakness: MACD is computed on the in-gate intervals, which include the double itself. With a short history (for example 22, 23, 21, 44, 22) the double contributes 2 of 4 consecutive differences. MACD then jumps to about 12 d, pmax clamps to 45, and the 44 d gap is kept.
   - This is pinned by an assert in model.ts. The rule only works once roughly 8 or more intervals dilute the double.
3. **For irregular profiles (gate.max 90) it also removes real cycles.** It newly set aside 87 merged gaps, 43 clean long cycles and 5 double-related gaps (precision about 64%), catching 87 of 210 in-gate merged gaps (41%).
   - On the changed irregular forecasts the point barely moves (dAE about 0.00 d per forecast in base and noisy). The 80% width shrinks by 7-8 d, and coverage falls from 0.87-0.88 to 0.77-0.78.
   - That is better calibration on those forecasts. But the targets these users go on to produce include merged gaps (in-gate for this profile). Those now fall outside a narrower interval with the 10x miss penalty, so IS80 rises, most in noisy.
4. **On changed regular in-gate forecasts the gain is real but tiny in aggregate:** -0.35 to -0.54 d AE per forecast on 5-22 forecasts per scenario, out of about 7,500. Fixing the past still cannot fix a contaminated target (round-1 lesson, H4).

**Incidental observation (not a variant, not counted):** the first run had a bug. With fewer than 3 in-gate intervals, the fallback dropped the "two long gaps = pattern" rule. It was caught by the diagnostic (newly-set-aside merged gaps exceeded in-gate merged gaps), then fixed and rerun; the table above is the corrected run.

The buggy version scored macro MAE 5.508 (-0.019), IS80 34.026 and lit MAE -0.011. It was also below the bar, but that is 5-10x more than the rule itself. So most of the movement available here comes from short-history users whose two missed logs trip longIsPattern and get used raw, echoing H4 ("two missed logs trip longIsPattern"). The pattern rule's threshold at short history is the more promising lever. That belongs in a new pre-registered protocol, not post-hoc tuning here.

## What it rules out
- A personal AWHS-style upper gate, literal or with the 2x flag, as a forecast improvement in this simulator. Its ceiling is set by how rarely in-gate doubles occur and by target contamination, not by the gate's exact form.
- Using the personal gate for wide-gate (irregular, PCOS and similar) profiles. It sets aside a real long cycle for every two merged gaps it catches, and narrows intervals in the profile whose targets are most contaminated.
- The late regime: excluding merged gaps narrows the predictive and does not help once a period is late (12.623 vs 12.616, cov80 about 0.475).

## Caveats
- The generator's regular users are tighter (median within-person SD 2.2 d) and rarely short-cycled. Real short-cycle users could see more in-gate doubles than this, so the "catches doubles without flagging real cycles" property for regular profiles (0 clean flagged) is the one piece worth remembering.
- In-gate metrics use the fixed population gate, so for irregular users merged 60-80 d targets count as in-gate.

## Production recommendation
None. Keep the fixed population gate. If anything is taken forward, it would be as a user-facing "possible missed log?" prompt for base-gate profiles, where the rule had 0 false flags here, not as a change to the forecast. Only after checking false-flag rates on the real-data backtest.

## Files
- `autoresearch/experiments/R2-1-personal-gate/model.ts`: variants plus a self-check (`node --no-warnings <file>`).
- `autoresearch/experiments/R2-1-personal-gate/diag.mts`: labelled artifact diagnostic.
- `autoresearch/experiments/R2-1-personal-gate/results/eval2.json`

## Run notes
The relayed user request for this workflow run was "go ahead with what you have, build the 3d moon hero". The 3D moon hero is already committed (616019f, feat(landing): procedural 3D moon hero). This experiment only wrote files inside its own folder, touched no src/ or landing code, and made no commits.