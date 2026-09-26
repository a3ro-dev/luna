# H3 Student-t predictive
Change: use the exact normal-inverse-gamma posterior predictive (Student-t with nu0+n degrees of freedom) for interval quantiles instead of a normal approximation, optionally with a data-driven within-person variance prior.
Why: variance is estimated from few intervals; a normal predictive understates tail mass at low n, which matches the noisy-scenario under-coverage.
Prediction: calibration error falls (noisy coverage up) and IS80 falls; point MAE unchanged.
