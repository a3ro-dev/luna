# A predictive model for next cycle start date that accounts for adherence in menstrual self-tracking

- Authors: Kathy Li, Inigo Urteaga, Amanda Shea, Virginia J. Vitzthum, Chris H. Wiggins, Noemie Elhadad
- Year / venue: JAMIA 29(1):3-11, January 2022 (online 17 Sep 2021); preprint arXiv:2102.12439 (v2, 16 Mar 2021) under the title "A generative, predictive model for menstrual cycle lengths that accounts for potential self-tracking artifacts in mobile health data"
- DOI: https://doi.org/10.1093/jamia/ocab182 -- preprint https://arxiv.org/abs/2102.12439
- Opened: JAMIA abstract page; full arXiv PDF (methods, Tables 1-3)

## Key findings
- Data: Clue app, 186,108 users aged 21-33, natural cycles only, first 11 cycles each (2,047,166 cycles); cycle length 30.71 +/- 7.90 d, median 29. Users with only two cycles and cycles with no period data within 90 days removed.
- Model: true cycle length ~ Poisson(lambda_i); observed length is the sum of s+1 true cycles, so d ~ Poisson(lambda_i (s+1)); skips s ~ truncated Geometric(pi_i) up to S; lambda_i ~ Gamma(kappa, gamma), pi_i ~ Beta(alpha, beta). Hyperparameters by type-II maximum likelihood (Monte Carlo, Adam). Predictive is conditioned on the current day of the next cycle: p(d | history, d > d_current).
- Day-0 RMSE (train on 10 cycles, predict 11th, I = 186K): mean baseline 7.497, median 7.489, LSTM 7.402, skip-blind version (s = 0) 7.562, full model 7.382. Gains at day 0 are small.
- Day-40 RMSE (next cycle still not logged on day 40): mean 21.915, median 23.394, LSTM 22.681, s = 0 version 14.778, full model 11.774. Explicit skip modelling matters most once a user passes their typical length.
- Users with a median cycle-length difference of 0 have median absolute error ~1.5 d but RMSE 6.15 -- rare unexpected skips dominate squared error.
- The skip-aware predictive is multimodal (peaks near 30, 60, 90 d); on simulated users, P(one skip by day 40) was ~0.8 for a user with past skips vs ~0.5 for a never-skipper.

## Relevance to Luna
- Luna's gate (set aside one interval > 45 d, treat two long gaps in the last 6 as pattern) is a hard-threshold stand-in for this latent-skip model; the paper shows the day-0 cost of ignoring skips is small, but the "late" regime is where skip modelling pays.
- Luna's `ifNotStartedYet` conditional window already conditions on elapsed days, but only inside the window; past it Luna gives nothing, exactly where Li et al. get their largest gain (RMSE 21.9 -> 11.8 at day 40).
- Poisson ties variance to the mean; Luna's log-scale normal already separates location and spread (the criticism SkipTrack later makes of this paper does not apply to Luna).
- Hierarchical population hyperparameters play the role of Luna's population prior (mean 29, between-SD 4).
