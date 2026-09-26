# R2-2 per-user adaptive conformal level (day-0 track, harness v2)
Change: replay each user's own past forecasts from their history; update the interval level online with alpha_{t+1} = alpha_t + gamma (0.2 - err_t), gamma = 0.05 fixed in advance, alpha clamped to [0.02, 0.5]; take the 80% interval quantiles from the unchanged v2 predictive at level 1 - alpha_t. Point forecast unchanged.
Why: calibration differs per person (regular users over-covered, messy users under-covered); global knobs trade one against the other (round 1, H6). ACI guarantees long-run coverage per sequence (Gibbs & Candes 2021).
Prediction: in-gate calibration error falls by >= 0.02 with IS80 no worse than +1% (rule c); macro MAE unchanged by construction.
