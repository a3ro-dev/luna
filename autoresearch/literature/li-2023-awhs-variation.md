# Menstrual cycle length variation by demographic characteristics from the Apple Women's Health Study

- Authors: Huichu Li, Elizabeth A. Gibson, Anne Marie Z. Jukic, Donna D. Baird, Allen J. Wilcox, Christine L. Curry, Tyler Fischer-Colbrie, Jukka-Pekka Onnela, Michelle A. Williams, Russ Hauser, Brent A. Coull, Shruthi Mahalingaiah
- Year / venue: 2023, npj Digital Medicine 6:100 (29 May 2023)
- DOI: https://doi.org/10.1038/s41746-023-00848-1 (full text read on PMC: https://pmc.ncbi.nlm.nih.gov/articles/PMC10226714/)
- Opened: PMC full text

## Key findings
- 165,668 cycles, 12,608 US participants, median 11 cycles each (IQR 5-20). Cycle length 28.7 +/- 6.1 d, median 28 (IQR 26-30); 5th-95th percentile 22-38 d (FIGO normal: 24-38).
- Artifact rule (under age 50): cycles longer than *personal median + personal median cycle-length difference + 15 d* are treated as missed-log artifacts. 15 d was chosen as the best balance between catching artifacts and keeping natural variation. 29,174 cycles flagged (1.62 per person). Cycles < 10 or > 90 d dropped. No artifact filtering at 50+ because of high variability and anovulation.
- Mean length vs age 35-39 (adjusted, days): < 20 +1.63; 20-24 +1.43; 25-29 +1.12; 30-34 +0.56; 40-44 -0.49; 45-49 -0.33; 50+ +2.02.
- Within-person SD by age (days): < 20 5.33; 20-24 5.07; 25-29 4.70; 30-34 4.28; 35-39 3.79 (lowest); 40-44 3.99; 45-49 5.42; 50+ 11.19. Relative to 35-39: +46%, +37%, +25%, +13%, ref, +6%, +45%, +200%.
- Asian +1.6 d and Hispanic +0.7 d vs white, both more variable; BMI >= 40 +1.5 d and more variable.
- Model: linear mixed effects with participant random intercepts; variability from change in within-individual SD.

## Relevance to Luna
- Luna's cycle prior (median 29, within-SD 4, early-perimenopause within-SD 7) is anchored here. The age table is a ready-made age-conditional within-SD prior: log-SD about 0.13 at 35-39 vs 0.18 at < 20 and 45-49. `users.dateOfBirth` already exists in the schema.
- The artifact rule is a person-specific missed-log gate. For a 28 d user with median difference 2 it gives 45 d (the same as Luna's fixed gate). For a 22 d user it gives 39 d, so a missed log (2 x 22 = 44) would be caught; Luna's gate lets it through. For a 35 d user with difference 4 it gives 54 d, so a real 50 d cycle is kept; Luna's gate sets it aside.
- These within-SDs are computed *after* artifact removal on all cycles (not only ovulatory), so they are higher than Bull 2019 (2.6 d). The gap between the two is the plausible range for Luna's within-SD prior.
