# R2-6-clean-width -- analysis

**Verdict:** mixed · **meets locked improvement rule:** yes, clause (c), with the CONFIRMATORY variant R26-clean3.

**Hypothesis as run:** Users on the base cycle profile whose history has no set-aside interval get a within-person SD prior of 3 d instead of 4 d. Everyone else gets v2 exactly: users with any set-aside interval, and users on any condition profile (any condition that widened the within-person SD).

In the confirmatory variant, an empty history counts as clean, because that is the literal reading of the protocol. Only `past` and `ctx` are used. Setting `cleanSd = 4` reproduces v2-bayes on every row; `diag.mts` asserts this.

**Artifacts** (in `autoresearch/experiments/R2-6-clean-width/`):
- `model.ts`
- `diag.mts`: EXPLORATORY split by branch and target type, plus PIT histograms
- `stress.mts`: EXPLORATORY within-person SD stress test; its copy of the generator is asserted to reproduce the harness cohort
- `results/eval2.json`, `results/eval2.txt`, `results/diag.txt`, `results/stress.txt`

Baseline reproduced: v2-bayes macroMAE 5.527, IS80 34.036. v2-trunc lateMAE 12.616, late cov80 0.478. This is a day-0 experiment, so there are no late models.

## Variants (locked harness v2; primary scenarios averaged over 7 runs)

| variant | label | macroMAE | IS80 | calib | in-gate calib | in-gate IS80 | coverage ok | lit MAE | lit IS80 | rule |
|:--|:--|--:|--:|--:|--:|--:|:-:|--:|--:|:-:|
| v2-bayes | baseline | 5.527 | 34.036 | 0.052 | 0.084 | 18.42 | yes | 4.570 | 27.064 | -- |
| R26-clean3 (4 -> 3 d, clean base-profile) | CONFIRMATORY | 5.538 | 33.898 | 0.034 | 0.049 | 17.92 | yes | 4.570 | 26.763 | c met |
| R26-clean3.5 (4 -> 3.5 d) | EXPLORATORY (dose) | 5.530 | 33.923 | 0.043 | 0.068 | 18.12 | yes | 4.569 | 26.873 | no (in-gate calib -0.015) |
| R26-clean3-n3 (needs >= 3 clean intervals) | EXPLORATORY | 5.528 | 33.940 | 0.037 | 0.062 | 18.14 | yes | 4.571 | 26.894 | c met (barely) |
| R26-clean3-wonly (width only, v2 point) | EXPLORATORY | 5.527 | 33.842 | 0.034 | 0.049 | 17.86 | yes | 4.570 | 26.715 | c met |

How the thresholds were applied (base values from v2-bayes):
- Clause (c) needs in-gate calibration error <= 0.0635, IS80 <= 34.376 and macroMAE <= 5.547.
- Clause (b) needs IS80 <= 33.355. No variant reaches it.
- Clause (a) needs macroMAE <= 5.477. No variant reaches it.

Literature scenario (report-only):

| variant | in-gate calib (v2 -> variant) | IS80 change | macroMAE change |
|:--|:--|--:|--:|
| R26-clean3 | 0.096 -> 0.061 | -1.1% | -0.001 |
| R26-clean3-wonly | 0.096 -> 0.062 | -1.3% | 0 |

No gain reverses sign there.

### Per scenario, R26-clean3 vs v2

| scenario | macroMAE change | IS80 change | in-gate calib (v2 -> clean3) | lowest run cov80 |
|:--|--:|--:|:--|--:|
| base | +0.008 | -0.50% | 0.084 -> 0.048 | 0.792 |
| noisy | +0.020 | +0.58% | 0.060 -> 0.036 | 0.726 |
| regular | +0.008 | -3.06% | 0.106 -> 0.062 | 0.831 |
| literature | -0.001 | -1.11% | 0.096 -> 0.061 | 0.812 |

- In every scenario IS80 stays within the 1.01x bound of clause (c).
- In noisy, IS80 gets worse and macroMAE sits right at the +0.02 edge.
- The noisy coverage margin is 0.006 above the 0.72 floor.

## Diagnostic (EXPLORATORY; `results/diag.txt`, pooled over seeds)

### Coverage and IS80 on the narrowed branch

On clean base-profile users (the narrowed branch), in-gate 80% coverage falls from about 0.91 to about 0.85--0.86:

| scenario | in-gate cov80 (v2 -> clean3) | in-gate IS80 (v2 -> clean3) |
|:--|:--|:--|
| base | 0.908 -> 0.851 | 12.35 -> 11.57 |
| noisy | 0.917 -> 0.851 | 13.64 -> 12.96 |
| regular | 0.914 -> 0.862 | 11.25 -> 10.33 |
| literature | 0.915 -> 0.862 | 11.70 -> 10.79 |

### PIT histograms (clean branch, in-gate targets)

The histogram flattens: in base, the outer bins go from 0.057/0.034 to 0.083/0.066, and the central bins from 0.15--0.16 to about 0.13. It is still slightly hump-shaped, which means that on this generator an even narrower width would be closer to calibrated.

### Artifact targets

These are still covered 0.000 whatever the width. Narrowing makes each miss about 7--9 IS points more expensive (base 237.8 -> 245.5). This is why noisy IS80 rises: 16% of clean-branch noisy targets are artifacts.

### Whether a set-aside interval flags artifact risk

In this generator it does not. The chance that the next target is an artifact is about the same whether or not the user has a set-aside interval:

| scenario | artifact rate, clean | artifact rate, set-aside |
|:--|--:|--:|
| base | 0.063 | 0.071 |
| noisy | 0.160 | 0.147 |
| regular | 0.029 | 0.026 |
| literature | 0.055 | 0.054 |

The generator draws missed and double logs independently for each cycle, so a past artifact tells you nothing about the next one. Users with a set-aside interval are just as over-covered in-gate (0.86--0.88).

The split still helps against a plain narrowing of every base-profile user (H6 X-b0.75-i1: IS80 33.96, coverage ok = no). But it helps only at the cohort level: noisy cohorts have more users with a set-aside interval, so fewer of their users get narrowed. It says nothing about any one user.

## Stress test (EXPLORATORY; `results/stress.txt`)

Setup: base-scenario settings, 3 harness seeds. The median within-person SD of the generator's regular users is set to each value below. 2.2 d is the harness value, and the copied generator is asserted to reproduce the harness cohort at that setting.

| sd median | v2 IS80 | clean3 IS80 | v2 cov80 / in-gate | clean3 cov80 / in-gate | macroMAE change |
|--:|--:|--:|:--|:--|--:|
| 2.2 (harness) | 30.82 | 30.67 | 0.832 / 0.884 | 0.798 / 0.848 | +0.007 |
| 3.0 | 32.71 | 32.98 | 0.787 / 0.838 | 0.749 / 0.797 | +0.028 |
| 3.8 (Apple Women's Health Study, low end) | 34.81 | 35.44 | 0.750 / 0.799 | 0.709 / 0.756 | +0.045 |
| 4.5 | 36.81 | 37.68 | 0.715 / 0.765 | 0.679 / 0.726 | +0.053 |

- The width-only variant has the same crossover: IS80 +0.5% at 3.0 d and +1.3% at 3.8 d.
- The >= 3 intervals variant and the 3.5 d variant also get worse there, just by less.
- At a literature-realistic spread, v2's current 4 d prior is already calibrated in-gate (0.799). Narrowing then breaks the coverage floor and worsens both IS80 and MAE.

## Mechanism

The locked rule is met for a real but narrow reason: the generator's regular users are tighter (median SD 2.2 d) than v2's 4 d prior. Clean base-profile targets are therefore over-covered (about 0.91), and a narrower prior for them buys in-gate calibration and a small IS80 gain.

The confirmatory variant also moves the point forecast, because a smaller sigma gives the user's own data more weight. That costs +0.011 d of macroMAE (+0.020 in noisy). Narrowing the width only removes that cost and does slightly better on IS80.

The "separate clean width from artifact risk" half of the hypothesis did no work here. A set-aside past does not predict an artifact target in this generator. Artifact targets are missed at any width and simply cost more when intervals are narrower, which is why noisy IS80 rises.

The gain comes from how the synthetic users were generated, not from how clean users actually vary: it disappears near 3 d of within-person SD and reverses at 3.8 d (the Apple Women's Health Study range). This is exactly the caveat recorded in `findings.md` and in the protocol.

## What this rules out, and what it leaves open

**Ruled out:** shipping a narrower clean-user prior on synthetic evidence. Also ruled out: the idea that a set-aside history is a user-level artifact-risk signal, at least as far as this simulator can test it (it cannot).

**Left open, and needs the read-only real-data backtest:**
1. Is real clean base-profile in-gate coverage well above 0.86?
2. Do real users with set-aside intervals have higher artifact-target rates? Real logging behavior is plausibly per-person, unlike the simulator.

If both hold, the width-only form (R26-clean3-wonly) is the version to test, since it leaves the point forecast untouched.

## Production recommendation

None. Keep the BASE cycle `withinSd = 4` and `predictMetric` in `src/lib/prediction/forecast.ts` unchanged. Revisit only with real-data evidence of clean-user over-coverage, and then as a width-only change.