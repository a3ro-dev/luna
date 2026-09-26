# H5 median ensemble
Change: point forecast = weighted blend of the v2 posterior median and the rolling median of the last 6 usable intervals, weight rising with n; interval recentred on the blend.
Why: forecast combinations reduce error when component errors are imperfectly correlated; the rolling median is robust to single bad logs.
Prediction: macro MAE falls for nPast 3+; cold start unchanged.
