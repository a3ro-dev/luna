# SkipTrack: a Bayesian hierarchical model for self-tracked menstrual cycle length and regularity in large mobile health cohorts

- Authors: Luke Duttweiler, Gowtham Asokan, Zifan Wang, Shruthi Mahalingaiah, Jukka-Pekka Onnela, Russ Hauser, Michelle A. Williams, Kayley Abrams, Christine L. Curry, Brent A. Coull
- Year / venue: 2025, arXiv:2508.05845 (v1, 7 Aug 2025; submitted to the Annals of Applied Statistics)
- URL: https://arxiv.org/abs/2508.05845
- Opened: full arXiv PDF (model, simulations, AWHS application)

## Key findings
- Model: y_ij ~ LogNormal(mu_ij + log(c_ij), tau_i) with c_ij in {1..K} the number of true cycles inside an observed interval, c_ij ~ Categorical(pi), pi ~ Dirichlet(1..1); mu_ij = X_ij beta + b_i (random intercept); per-person precision tau_i ~ Gamma(mean theta_i, rate phi) with log theta_i = Z_i gamma. Gibbs + Metropolis-Hastings, scaled by WASP over data shards.
- The key design point: because precision is per person, the same long interval is a confident skip for a regular person (e.g. 55 d among 28, 30, 29, 32) and uncertain for an irregular one (24, 30, 46, 28). The Li et al. Poisson model cannot do this.
- Simulations (800 datasets per scenario): MAP skip identification about 96-98% accurate for both SkipTrack and Li. Fixing skips in preprocessing (MAP from Li) attenuates effects to about 90% of the full model and destroys coverage as n grows (e.g. 95% interval coverage 0.954 -> 0.610 at n = 5000 for one log-median effect; 0.000 for another), while full SkipTrack stays near 0.93-0.97.
- AWHS application: 664,461 cycles, 43,683 people (median 13 cycles each), after the 10-90 d window; median 28 d, mean 30 d. Histogram peaks at 56 and 84 d. About 4% of cycles had MAP c >= 2; median lengths for c = 1, 2, 3 were 28, 56, 83 d, and each group's maximum was 90 d (long cycles were not all binned as skips).

## Relevance to Luna
- Luna's cycle model is already this likelihood with c fixed at 1 (log-normal, conjugate within-person spread), so a skip mixture is a natural extension: log x = mu + log c + e.
- Evidence against the hard gate: pre-fixing skips (what `usableMask` does) produces overconfident intervals. That is consistent with the noisy-scenario under-coverage.
- Base rate for a skip prior: about 4% of AWHS cycles, which matches the simulator's base missedLog = 0.05; noisy (0.12) is a stress case.
- Regularity-aware detection argues for a person-specific gate rather than a fixed 45 d.
