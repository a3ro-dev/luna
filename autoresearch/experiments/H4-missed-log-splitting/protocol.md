# H4 missed-log splitting
Change: treat an interval close to k times the person's typical length (k=2,3) as k missed cycles (use x/k as k observations or as one down-weighted observation) instead of setting it aside or using it raw.
Why: skipped tracking is the dominant error source in self-tracking apps (Li et al., JAMIA 2022 model adherence explicitly); set-aside data is wasted and in-gate doubles (e.g. 2x22=44) bias the mean.
Prediction: noisy-scenario macro MAE falls noticeably; base small gain; regular unchanged.
