# Adaptive conformal inference under distribution shift

- Authors: Isaac Gibbs, Emmanuel J. Candes
- Year / venue: 2021, Advances in Neural Information Processing Systems 34 (NeurIPS 2021); arXiv:2106.00170 (v3, 28 Oct 2021)
- URL: https://arxiv.org/abs/2106.00170 (proceedings: https://proceedings.neurips.cc/paper/2021/hash/0d441de75945e5acbc865406fc9a2559-Abstract.html)
- Opened: full arXiv PDF

## Key findings
- A wrapper around any model that outputs quantiles or point predictions. It keeps one running level alpha_t and updates it online: err_t = 1 if y_t falls outside the interval built at level alpha_t, else 0, and alpha_{t+1} = alpha_t + gamma (alpha - err_t).
- Guarantee without exchangeability (Prop. 4.1): the long-run miss rate (1/T) sum err_t is within (max(alpha_1, 1 - alpha_1) + gamma) / (gamma T) of the target alpha, for any data sequence.
- Step size gamma trades adaptivity against stability; the paper uses gamma = 0.005 for long series.

## Relevance to Luna
- Luna's baseline over-covers regular users and under-covers noisy ones: a person-level miscalibration that a global prior (H6) cannot fix. Per-user ACI on the quantile level of the existing log-normal predictive corrects each person's interval from their own past hits and misses, and needs no extra state beyond alpha_t (recomputable from history).
- Caveat: users have about 12 intervals a year, so the finite-T bound is loose. gamma must be far larger than 0.005 (about 0.05-0.1) to move within a year, and alpha_t has to be clamped (for example to [0.02, 0.5]) because a raw alpha_t <= 0 means an infinite interval. Missed logs count as misses unless the gate flags them.
