# Literature survey -- round 1 scout

Scope: forecasting the next cycle start from self-tracked data, skipped tracking, hierarchical cycle-length models, within-person variability by age, FIGO limits, and interval calibration. Only sources opened in full or at the record level are cited. Notes per source are in this folder.

| Note | Source | One-line takeaway for Luna |
|---|---|---|
| [li-2022-adherence-jamia.md](li-2022-adherence-jamia.md) | Li et al., JAMIA 2022 (doi 10.1093/jamia/ocab182) | Latent-skip Poisson model: small gain at day 0 (RMSE 7.50 -> 7.38), large gain once late (day 40: 21.9 -> 11.8). |
| [urteaga-2021-calibrated-mlhc.md](urteaga-2021-calibrated-mlhc.md) | Urteaga et al., MLHC 2021 (PMLR 149) | Separating spread from mean makes 80% intervals much narrower (15.2 -> 9.7 d) and better calibrated; PIT and proper scores as diagnostics. |
| [duttweiler-2025-skiptrack.md](duttweiler-2025-skiptrack.md) | Duttweiler et al., arXiv 2508.05845 (2025) | Log-normal with log(c) skip offset and per-person precision (Luna's likelihood plus skips); fixing skips beforehand makes intervals overconfident; about 4% of AWHS cycles are skips. |
| [bull-2019-600k-cycles.md](bull-2019-600k-cycles.md) | Bull et al., npj Digit Med 2019 (doi 10.1038/s41746-019-0152-7) | Ovulatory within-person SD 2.6 +/- 2.5 d; age slope -0.18 d/yr; luteal 12.4 +/- 2.4. |
| [li-2023-awhs-variation.md](li-2023-awhs-variation.md) | Li et al., npj Digit Med 2023 (doi 10.1038/s41746-023-00848-1) | Within-person SD by age 3.8-5.4 d (11.2 at 50+); personal artifact gate = median + median difference + 15 d. |
| [munro-2018-figo-aub.md](munro-2018-figo-aub.md) | Munro et al., IJGO 2018 (doi 10.1002/ijgo.12666), numbers via Jain et al. 2023 (doi 10.1002/ijgo.14946) | Normal 24-38 d, regular range <= 7-9 d by age, duration <= 8 d; clinical limits, not plausibility limits. |
| [gneiting-raftery-2007-scoring.md](gneiting-raftery-2007-scoring.md) | Gneiting & Raftery, JASA 2007 (doi 10.1198/016214506000001437) | The interval score (IS80) is proper; the score-optimal spread is narrower than the coverage-matching spread. |
| [gibbs-candes-2021-aci.md](gibbs-candes-2021-aci.md) | Gibbs & Candes, NeurIPS 2021 (arXiv 2106.00170) | One-parameter online level update that guarantees long-run coverage for any data sequence. |

## What the literature says about Luna's current model
- **Log-scale conjugate normal.** This is the right family. SkipTrack, the most recent model built on AWHS data, uses exactly log-normal cycle lengths with per-person precision, and Urteaga et al. show that separating spread from the mean is what buys calibration. The Poisson models (Li 2022) are the ones the later work improves on.
- **Population prior.** Luna's median of 29 d is consistent with 28.7 (AWHS), 29.3 (Bull, ovulatory) and 30.7 (Clue, ages 21-33). The within-SD prior of 4 d sits between the ovulatory-only 2.6 d (Bull) and the all-cycles 3.8-5.3 d (AWHS by age). It is on the wide side for FIGO-regular histories: a <= 7 d range over 6 cycles implies SD about 2.8 d. This is consistent with over-coverage in the "regular" scenario.
- **Plausibility gate.** A fixed 45 d cut is a hard, preprocessing-style skip decision. SkipTrack shows that such fixed decisions give overconfident intervals, which fits the noisy-scenario under-coverage. AWHS uses a person-specific cut instead. Both favour a gate that depends on the person's own typical length and spread.
- **Where skip modelling pays.** In Li et al. it pays at late days (day 40), not at day 0. The locked harness scores only the day-0 forecast, so it cannot see the regime where the literature finds the largest gain.
- **Calibration target.** IS80 is proper (Gneiting & Raftery). Coverage is a constraint, not a target: forcing noisy-scenario coverage up to 0.80 can worsen IS80 when misses come from missed logs.
- **Simulator caveat.** The simulator's drift (uniform +/-0.15 d/cycle) is about 5-10x the population age slope (0.18 d/yr, about 0.015 d/cycle). The base missed-log rate (5%) matches the about 4% skip rate in AWHS; noisy (12%) is a stress case.

## Round-2 ideas (not covered by H1-H7)

1. **R2-1 Personal missed-log gate.**
   - Change: once at least 3 intervals are in the gate, replace the fixed upper gate (45 d) with the person's median + median absolute consecutive difference + 15 d (the AWHS artifact rule). Otherwise keep the population gate. Keep the lower gate at 15 d and the "two long gaps = pattern" rule. This is different from H4: H4 decides what to do with a flagged interval, R2-1 decides which intervals get flagged. The two can be combined.
   - Prediction: noisy-scenario macro MAE falls because short-cycle doubles (for example 2 x 22 = 44) are now caught. The regular scenario is unchanged. Coverage stays within constraints.
   - Source: Li et al. 2023 (AWHS); Duttweiler et al. 2025.

2. **R2-2 Per-user adaptive conformal interval level.**
   - Change: replay each user's past forecasts and update the interval level online with alpha_{t+1} = alpha_t + gamma (0.2 - err_t). Fix gamma = 0.05 before running, clamp alpha_t to [0.02, 0.5], and take quantiles from the unchanged v2 predictive at 1 - alpha_t. The point forecast is untouched, so MAE cannot change.
   - Prediction: calibration error falls because regular users' coverage drops toward 0.80 and noisy users' coverage rises, and the spread of cov80 across runs narrows. IS80 improves for regular users and may worsen for noisy ones; report both.
   - Source: Gibbs & Candes 2021; Gneiting & Raftery 2007.

3. **R2-3 Late-regime forecasts with a skip mixture.**
   - Harness: add an as-of evaluation for cycles still open at (upper80 + 1) and at day 40 (the Li et al. protocol). Score the conditional window's coverage and MAE. The harness addition must be locked before any candidate runs.
   - Model: past the window, use the conditional predictive of a two-component mixture: the truncated c = 1 tail plus a c = 2 component (log x = mu + log 2 + e). Weight it by a population skip rate of about 0.04-0.05, updated by the person's own set-aside count.
   - Prediction: Luna currently returns no window for "late" and "long-gap". The candidate reaches conditional cov80 of 0.72-0.90 and cuts late-regime MAE substantially, in the direction of Li et al.'s 21.9 -> 11.8 RMSE at day 40.
   - Source: Li et al. 2022; Duttweiler et al. 2025.

4. **R2-4 Age-conditioned within-person SD prior.**
   - Change: key withinSd on age from `users.dateOfBirth` using the AWHS table (5.3 / 5.1 / 4.7 / 4.3 / 3.8 / 4.0 / 5.4 d for < 20 through 45-49), with optional AWHS mean shifts (+1.6 to -0.5 d).
   - Test: the synthetic generator has no age, so a synthetic win would be circular. Evaluate on the read-only real-data backtest, stratified by age band, and use synthetic only as a non-regression check.
   - Prediction: the coverage gap between under-25 and 35-44 users narrows, with no loss in macro MAE.
   - Source: Li et al. 2023; Bull et al. 2019.

5. **R2-5 Literature-anchored robustness scenario.**
   - Change: add a fourth, report-only scenario with drift +/-0.015 d/cycle (the Bull age slope) and missedLog 0.04 (the SkipTrack AWHS skip rate). Re-score every round-1 winner on it. It does not change the locked primary metric.
   - Prediction: H2 (recency weighting) gains shrink or vanish, because its rationale rests on simulator drift about 5-10x the literature slope. H1 and H4 gains persist because they target log noise, not drift. Reject any winner whose gain reverses here.
   - Source: Bull et al. 2019; Duttweiler et al. 2025.

## Diagnostic worth adding (not a hypothesis)
- PIT histograms per scenario (Urteaga et al. 2021). A hump means the intervals are too wide, a U means too narrow, a slope means bias. This would show directly whether noisy-scenario under-coverage is a spread problem or a location problem from in-gate doubles, which is the open question in findings.md.
