# Real-world menstrual cycle characteristics of more than 600,000 menstrual cycles

- Authors: Jonathan R. Bull, Simon P. Rowland, Elina Berglund Scherwitzl, Raoul Scherwitzl, Kristina Gemzell Danielsson, Joyce Harper
- Year / venue: 2019, npj Digital Medicine 2:83
- DOI: https://doi.org/10.1038/s41746-019-0152-7 (full text read on PMC: https://pmc.ncbi.nlm.nih.gov/articles/PMC6710244/)
- Opened: PMC full text
- Conflict of interest: funded by Natural Cycles; two authors employed by and two founders of the company.

## Key findings
- 612,613 ovulatory cycles from 124,648 Natural Cycles users aged 18-45 (BBT + optional LH tests). Anovulatory cycles (665,603, 48% of 1.4 M) and cycles outside 10-90 d (1,886) excluded; users with < 50% of days with temperature excluded.
- Cycle length 29.3 +/- 5.2 d; bleed 4.0 +/- 1.5 d; follicular 16.9 d (95% CI 10-30); luteal 12.4 +/- 2.4 d (95% CI 7-17).
- Within-person variation (per-user SD of cycle length): 2.6 +/- 2.5 d overall; 2.9 +/- 2.7 at 18-24; 2.4 +/- 2.4 at 40-45; falls 0.5 d (20%) from 25 to 45. BMI 35-50: 3.0 +/- 3.1 vs 2.7 +/- 2.5 at BMI 18.5-25 (0.4 d, 14% more).
- Age: mean cycle length falls 0.18 d/yr (95% CI 0.17-0.18) from 25 to 45, i.e. 3.2 d over 20 years, almost entirely follicular (0.19 d/yr); luteal nearly constant.
- Length bands (ovulatory): 15-20 d 3,769 cycles; 21-24 d 47,449; 25-30 d 395,631; 31-35 d 116,998; 36-50 d 43,240.

## Relevance to Luna
- Luna's luteal prior (12.4 +/- 2.4 d) comes from this paper.
- Within-person SD here (2.6 d, i.e. log-SD about 0.09) is well below Luna's within-SD prior of 4 d (log-SD 0.137). But this cohort is ovulatory-only and BBT-confirmed, so it is a lower bound for general self-trackers. The SD across users (2.5) is as large as the mean, so the within-person variance distribution is strongly right-skewed. This is evidence about the *shape* of Luna's variance prior (H3/H6 territory).
- Drift: a population slope of 0.18 d/yr is about 0.015 d/cycle. The simulator draws drift uniformly in +/-0.15 d/cycle (mean |drift| about 0.075 d/cycle, about 5x the population age slope, 10x at the extreme). A recency-weighting win (H2) on synthetic data may not transfer. Individual drift can exceed the cross-sectional slope, but no source here measures it.
- 15-20 d ovulatory cycles exist (3,769), so Luna's lower gate of 15 d is not too aggressive.
