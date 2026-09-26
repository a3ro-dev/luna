# H7 period integer median
Change: for bleeding-duration forecasts, predict the posterior median rounded to whole days and use a discrete (integer) predictive interval.
Why: period lengths are integer day counts with small variance; a continuous mean is not MAE-optimal for integer targets.
Prediction: period macro MAE falls below 0.917 with coverage kept.
