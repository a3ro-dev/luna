# A generative modeling approach to calibrated predictions: a use case on menstrual cycle length prediction

- Authors: Inigo Urteaga, Kathy Li, Amanda Shea, Virginia J. Vitzthum, Chris H. Wiggins, Noemie Elhadad
- Year / venue: 2021, Proceedings of the 6th Machine Learning for Healthcare Conference, PMLR 149:535-566
- URL: https://proceedings.mlr.press/v149/urteaga21a.html (PDF https://proceedings.mlr.press/v149/urteaga21a/urteaga21a.pdf)
- Opened: full PMLR PDF

## Key findings
- Extends Li et al. by replacing Poisson with a hierarchical Generalized Poisson (per-user lambda_i and dispersion xi_i, Beta prior on xi) plus the same latent skip variable; xi < 0 gives under-dispersion.
- Data: Clue, 378,694 users; experiments on a 50,000-user subset.
- Per-user mean fit: R^2 0.803 (Poisson) vs 0.873 (Generalized Poisson).
- Day-0 central predictive widths (days): 20% mass 2.93 vs 1.85; 50% mass 7.84 vs 4.94; 80% mass 15.25 vs 9.69 (Poisson vs Generalized Poisson). Real per-user spread is much tighter than a Poisson-tied variance allows.
- Point accuracy is similar across models (MAE about 3.45-3.64 d, median AE about 2.0-2.2 d on day 0); predictive mode gave lower MAE than predictive mean for both models.
- Calibration assessed with PIT histograms, marginal calibration plots and proper scores (Brier, spherical, log, CRPS); the Generalized Poisson improves all scores (log score -3.022 -> -2.855) but its PIT is still not uniform, with MCP excursions near the cohort median of 29 d. Neural baselines were badly calibrated.

## Relevance to Luna
- Directly supports Luna's choice to model spread separately from location. The finding that honest per-user intervals can be much narrower than a pooled variance implies echoes Luna's over-coverage in the "regular" scenario.
- Evaluation: the harness reports coverage and IS80 only. The paper argues for PIT histograms (hump = too wide, U = too narrow, triangle = biased), which would show *why* base/noisy/regular miscalibrate in opposite directions. Cheap to add as a diagnostic (not a new metric to optimise).
- Mode beats mean for MAE on skewed integer targets -- Luna already reports the log-scale median; H7 covers the integer version for periods.
