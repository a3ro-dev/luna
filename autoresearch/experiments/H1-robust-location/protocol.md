# H1 robust location
Change: replace the log-scale sample mean inside the conjugate update with a robust location (Huber M-estimate, or trimmed mean / median blend) and a robust scale (MAD-based) while keeping the prior update.
Why: missed-log remnants and double logs that pass the plausibility gate pull the mean and inflate variance; expanding-median already has a lower median error.
Prediction: macro MAE falls, most in the noisy scenario; coverage stays within constraints; regular scenario roughly unchanged.
