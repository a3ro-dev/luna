# R2-2 per-user adaptive conformal level -- analysis

## Setup
- Harness: locked `autoresearch/src/eval2.mts` (v2). Baseline reproduced exactly: v2-bayes macroMAE 5.527, IS80 34.036; v2-trunc late MAE 12.616, late cov80 0.478.
- Model file: `autoresearch/experiments/R2-2-adaptive-conformal/model.ts`.
- Results: `autoresearch/experiments/R2-2-adaptive-conformal/results/eval2.json`.
- Diagnostic: `autoresearch/experiments/R2-2-adaptive-conformal/diag.mts`.
- How the model works:
  - For each forecast it replays the user's own history. At origin t it forecasts past[t] from past[0..t-1] with the unchanged v2 predictive, starting from the prior-only forecast at t = 0.
  - After each replayed forecast it updates alpha_{t+1} = clamp(alpha_t + gamma (0.2 - err_t), 0.02, 0.5), with alpha_0 = 0.2.
  - The final interval is the central (1 - alpha_n) interval of the unchanged v2 predictive.
  - The point forecast and the period target are untouched, so macro MAE is identical by construction.
  - The model uses only `past` and `ctx`.
  - A self-check block in the model file asserts the hit, miss, clamp and in-gate-skip updates.
- Day-0 track only; no late models were submitted.

## Variants

In the table, "in-gate calib" is the in-gate calibration error, and "calib" is the calibration error over all targets. "lit" is the literature scenario.

| Variant | Label | macroMAE | IS80 (vs base) | in-gate calib (vs base) | in-gate IS80 | calib | lit in-gate calib | lit IS80 | Rule |
|---|---|---|---|---|---|---|---|---|---|
| v2-bayes | baseline | 5.527 | 34.036 | 0.0835 | 18.419 | 0.052 | 0.0961 | 27.064 | -- |
| R2-2-aci (gamma 0.05) | CONFIRMATORY | 5.527 | 34.050 (+0.04%) | 0.0780 (-0.0055) | 18.522 (+0.56%) | 0.043 | 0.0914 | 27.080 (+0.06%) | fails c |
| R2-2-aci-ingate (skip gated past targets) | EXPLORATORY | 5.527 | 34.066 (+0.09%) | 0.0704 (-0.0132) | 18.354 (-0.35%) | 0.043 | 0.0869 | 26.984 (-0.30%) | fails c |
| R2-2-aci-g0.025 | EXPLORATORY | 5.527 | 34.009 (-0.08%) | 0.0803 (-0.0032) | 18.425 (+0.03%) | 0.048 | 0.0946 | 27.042 (-0.08%) | fails c |
| R2-2-aci-g0.1 | EXPLORATORY | 5.527 | 34.250 (+0.63%) | 0.0754 (-0.0081) | 18.851 (+2.35%) | 0.038 | 0.0873 | 27.225 (+0.60%) | fails c |

- All variants keep `coverageOk = true`.
- The two gamma values, half and double the protocol's 0.05, were fixed before running as a sensitivity bracket. They were not tuned.
- The in-gate-only variant is exploratory: its rule (skip the update when a past target is outside the population gate) is not in the protocol.

## Verdict: refuted
- **Confirmatory:** R2-2-aci lowers in-gate calibration error by only 0.0055, against a required 0.02.
  - IS80 stays within +1% (+0.04%), and the gain keeps its sign on the literature scenario (0.0961 -> 0.0914).
  - It still misses rule (c) by a factor of about 4. Rules (a) and (b) cannot be met, because the point is unchanged and IS80 did not fall.
- **Exploratory:** no variant meets the rule either. The best, R2-2-aci-ingate, reaches -0.013.
- **Late track:** not attempted. v2-trunc is unchanged.

## Per-run pattern (confirmatory R2-2-aci), in-gate cov80 from v2 to ACI
- base: 0.886 -> 0.877, 0.877 -> 0.868, 0.890 -> 0.881. Right direction, about -0.009.
- regular: 0.909 -> 0.896, 0.902 -> 0.889. Right direction, about -0.013.
- noisy: 0.863 -> 0.870, 0.858 -> 0.864. Wrong direction: already over-covered in-gate, and made wider (width 17.0 -> 17.9 d).
- literature (report only): 0.896 -> 0.889, 0.896 -> 0.893.

## Why it fails (mechanism)
1. **The sequences are far too short for ACI.**
   - Users have on average 7.3 past intervals (base, seed 42). With gamma 0.05, each hit raises alpha by only 0.01 and each miss lowers it by 0.04.
   - After a full history, final alpha has p10 0.15, p50 0.22, p90 0.27, and range 0.03-0.34. Only 29% of users end more than 0.05 away from 0.2.
   - The Gibbs and Candes long-run coverage bound, (max(alpha, 1 - alpha) + gamma) / (gamma T), is about 2.4 at T about 7. That is vacuous.
   - A larger gamma moves alpha further but mostly adds noise: g0.1 gets only -0.008 in-gate calibration error, with +2.35% in-gate IS80.
2. **The per-person premise is wrong on in-gate targets.** The diagnostic split by profile on the first seed of each scenario shows:
   - Irregular-profile users are already calibrated in-gate: coverage 0.81 (base), 0.80 (noisy), 0.82 (regular), 0.83 (literature).
   - Regular-profile users are over-covered: 0.89-0.91.
   - So "messy users under-covered" from round 1 was an artifact-target effect, as findings.md already suspected. The remaining in-gate gap is one-sided: intervals for regular profiles are too wide.
   - That is a global width issue (R2-6's question), not a per-person drift that ACI is built for.
3. **Artifact misses in the history pull the wrong way.**
   - In the confirmatory variant, a past merged or double-log interval counts as a miss and widens the next interval (alpha -0.04).
   - These artifacts are unpredictable, so the widening buys no future in-gate coverage. In the noisy scenario it raises in-gate over-coverage and in-gate IS80.
   - Skipping gated past targets (aci-ingate) removes this: in-gate calibration error doubles its improvement to -0.013, in-gate IS80 falls 0.35%, and the sign holds on the literature scenario. It is still below the bar.

## What this rules out
- Per-user online level adaptation, at any reasonable gamma, as a calibration fix for Luna-sized histories (about 2-15 intervals). There is not enough per-person feedback for ACI to act on.
- The "calibration differs per person, messy users under-covered" framing for clean targets. In-gate, irregular profiles already sit near 0.80.
- It does not rule out a global or profile-level width change for clean histories (R2-6). The diagnostic points there, but see the caveat below.

## Caveats
- The synthetic regular users are tighter than the literature (median within-person SD 2.2 d vs AWHS 3.8-5.4 d). So "regular profiles over-covered in-gate" is partly a generator artifact, and any narrowing needs real-data confirmation.
- The diagnostic group split uses one seed per scenario. The headline numbers use all seven primary runs, as the harness locks.

## Production recommendation
Do not ship. Adaptive conformal levels add per-forecast replay logic for a calibration gain 4x smaller than the pre-registered bar. They also slightly worsen IS80, and they widen intervals for noisy users after logging artifacts. Keep v2's fixed 80% level.

If anything from this is revisited, use the in-gate-only update (ignore gated past targets). It is the only variant that improved both in-gate calibration and in-gate IS80 and kept its sign on the literature scenario. But it should wait for real-data histories, and it probably matters less than R2-6's clean-width question.

## Run note
The relayed user request for this run was "go ahead with what you have, build the 3d moon hero". The 3D moon hero is already in commit 616019f. This run only did the pre-registered R2-2 experiment in the autoresearch folder. No landing, src or harness files were touched, and nothing was committed.