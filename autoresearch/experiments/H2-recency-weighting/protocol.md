# H2 recency weighting
Change: weight past log-intervals with exponential decay (half-life 4-8 cycles) in the mean and variance, using an effective sample size for the conjugate update.
Why: cycle length drifts within a person (age, life changes); the simulator includes drift up to +-0.15 d/cycle.
Prediction: established-user (nPast>=6) macro MAE falls; cold start unchanged; small overall gain.
