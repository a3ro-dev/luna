# Strictly proper scoring rules, prediction, and estimation

- Authors: Tilmann Gneiting, Adrian E. Raftery
- Year / venue: 2007, Journal of the American Statistical Association 102(477):359-378
- DOI: https://doi.org/10.1198/016214506000001437 -- PDF opened: https://sites.stat.washington.edu/raftery/Research/PDF/Gneiting2007jasa.pdf
- Opened: full PDF (sections 6.2, 8.3)

## Key findings
- Interval score (eq. 43) for a central (1 - alpha) interval [l, u] at outcome x, negatively oriented: S = (u - l) + (2/alpha)(l - x) 1{x < l} + (2/alpha)(x - u) 1{x > u}. It is proper: it rewards narrow intervals and penalises misses in proportion to the size of the miss.
- Coverage alone is not a sufficient target. In the paper's bilinear-process example, three 95% intervals all had about 95% coverage but different widths (4.00, 5.45, 3.79) and mean scores (4.77, 8.04, 5.32).
- Section 8.3 (sea-level pressure ensembles): a Gaussian predictive with SD r times the ensemble spread reached nominal coverage at r = 1.78 (50%) and 2.11 (90%). The interval score was optimised at a smaller r = 1.56 and 1.72: the score-optimal inflation is below the coverage-matching inflation.
- The CRPS is recommended as a default score for real-valued forecasts; the log score is harsh on low-spread cases.

## Relevance to Luna
- IS80 in the harness is this score with alpha = 0.2 (miss penalty 10x the miss distance). This paper justifies using IS80, not coverage, as the calibration-plus-sharpness objective.
- The r-inflation result warns that under-covering noisy histories may be the *score-optimal* response to occasional huge misses (missed logs). Pushing coverage up to 0.80 in the noisy scenario can make IS80 worse. Candidate reports should show both.
- A single global spread-inflation factor is the scoring-rule analogue of H6. It cannot fix opposite-direction miscalibration, so any spread correction has to depend on the person (see ACI note).
