# The two FIGO systems for normal and abnormal uterine bleeding symptoms and classification of causes of abnormal uterine bleeding in the reproductive years: 2018 revisions

- Authors: Malcolm G. Munro, Hilary O. D. Critchley, Ian S. Fraser, FIGO Menstrual Disorders Committee
- Year / venue: 2018, International Journal of Gynecology & Obstetrics 143(3):393-408
- DOI: https://doi.org/10.1002/ijgo.12666
- Opened: bibliographic record (University of Helsinki research portal); the Wiley full text returned 403. Numbers below are taken from the open-access restatement by the same committee authors, which was opened in full:
  Jain V, Munro MG, Critchley HOD. Contemporary evaluation of women and girls with abnormal uterine bleeding: FIGO Systems 1 and 2. Int J Gynecol Obstet 2023. DOI https://doi.org/10.1002/ijgo.14946 (PMC: https://pmc.ncbi.nlm.nih.gov/articles/PMC10952771/)

## Key findings (FIGO AUB System 1 normal limits)
- Frequency (cycle length): normal 24-38 d; < 24 frequent; > 38 infrequent.
- Regularity (shortest-to-longest cycle variation): normal up to 9 d at ages 18-25, up to 7 d at 26-41, up to 9 d at 42-45.
- Duration: normal up to 8 consecutive days.
- Window: the previous 6 months, excluding pregnancy or the puerperium.

## Relevance to Luna
- Already used by the dashboard/chat FIGO pattern check (commit 75330c7).
- For the forecaster, FIGO limits are *clinical normal* limits, not plausibility limits. Luna's gate (15-45 d) is deliberately wider, which is correct: the AWHS 95th percentile (38 d) equals the FIGO upper limit, so infrequent cycles of 39-45 d are kept. Only the smaller tail of real cycles above 45 d is set aside as possible missed logs.
- Regularity band as a variance check: a shortest-to-longest range of 7 d over 6 cycles implies a within-person SD of roughly 2.5-3 d (the expected range of 6 normal draws is about 2.5 SD). That is below Luna's 4 d prior. A FIGO-regular history should shrink the within-SD quickly, which bears on the regular-scenario over-coverage.
- The 6-month window is a clinical convention, not evidence for a forecasting window; HISTORY_WINDOW = 12 intervals is unaffected.
