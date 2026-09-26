# Sources and evidence limits

**Release:** 0.11.1 · **Reviewed:** 24 September 2026

This index separates published observations from Luna's design choices. A population mean or SD does not, by itself, estimate a particular person's next cycle.

## Implementation sources

| Area | Source | What it establishes |
|:--|:--|:--|
| Forecast and priors | [forecast.ts](../src/lib/prediction/forecast.ts) | Working-scale model, fixed prior values, exclusion rules, outputs, and ovulation estimate. |
| Previous engine | [engine.ts](../src/lib/prediction/engine.ts) | Retained comparator; it is not the current dashboard or chat forecast path. |
| Shared service and writes | [cycle-tools.ts](../src/lib/cycle-tools.ts) | Cycle validation, analytics refresh, and authenticated forecast loading. |
| Pattern check | [cycle-check.ts](../src/lib/prediction/cycle-check.ts), [cycle-check.test.ts](../src/lib/prediction/__tests__/cycle-check.test.ts) | FIGO System 1 reference-range comparison shown on the dashboard and returned by chat stats tools. |
| Late window | [forecast.ts](../src/lib/prediction/forecast.ts) (`lateSkipMixture`), [late-window.test.ts](../src/lib/prediction/__tests__/late-window.test.ts), [autoresearch findings](../autoresearch/findings.md) | Skip-mixture window once a period is late; parity-tested against the frozen experiment code. |
| Evaluation | [backtest.ts](../src/lib/prediction/backtest.ts), [backtest.mts](../scripts/backtest.mts) | Rolling-origin implementation, simulator, baselines, and metric reporting. |
| Regression tests | [forecast.test.ts](../src/lib/prediction/__tests__/forecast.test.ts), [backtest.test.ts](../src/lib/prediction/__tests__/backtest.test.ts), [engine.test.ts](../src/lib/prediction/__tests__/engine.test.ts) | Date, forecast, leakage, calibration, and retained-engine checks. |
| Database profile | [db-profile.mts](../scripts/db-profile.mts) | Bounded, read-only aggregate queries and small-cell suppression. |
| Dashboard and chat | [DashboardClient.tsx](<../src/app/(app)/dashboard/DashboardClient.tsx>), [QuickLog.tsx](<../src/app/(app)/dashboard/QuickLog.tsx>), [cycles routes](../src/app/api/cycles/route.ts), [chat route](../src/app/api/chat/route.ts) | Presentation, direct period logging, and deterministic tool integration. |
| Plan-specific layouts | [server-plan.ts](../src/lib/theme/server-plan.ts), [DashboardClient.tsx](<../src/app/(app)/dashboard/DashboardClient.tsx>), [chat-client.tsx](<../src/app/(app)/chat/chat-client.tsx>), [settings-client.tsx](<../src/app/(app)/settings/settings-client.tsx>), [globals.css](../src/app/globals.css) | Saved-plan lookup, three dashboard/chat/settings layouts, and plan color tokens. |
| Landing hero | [CycleHero.tsx](../src/components/moon/CycleHero.tsx), [CycleScene.tsx](../src/components/moon/CycleScene.tsx), [moonMaterial.ts](../src/components/moon/moonMaterial.ts) | Decorative pinned 3D story: procedural moon, 28-day example ring, four product chapters. Shows no user data and makes no forecast claim. |
| Subscription and reset | [home-client.tsx](../src/app/home-client.tsx), [subscribe route](../src/app/api/subscribe/route.ts), [forgot-password route](../src/app/api/auth/forgot-password/route.ts) | Request forms and email scheduling. |

## Primary studies

### Reference ranges for the pattern check

**Munro et al. (2018).** [“The two FIGO systems for normal and abnormal uterine bleeding symptoms and classification of causes of abnormal uterine bleeding in the reproductive years: 2018 revisions.”](https://obgyn.onlinelibrary.wiley.com/doi/10.1002/ijgo.12666) *International Journal of Gynecology & Obstetrics* 143:393--408. DOI: [10.1002/ijgo.12666](https://doi.org/10.1002/ijgo.12666).

FIGO System 1 sets frequency at 24--38 days (5th to 95th percentiles of population studies of ages 18--45), duration at 8 days or less, and regularity as a shortest-to-longest spread of 7 days or less at ages 26--41 and 9 days or less at 18--25 and 42--45, assessed over the previous six months. Flow volume is patient-reported. Luna uses these limits as fixed thresholds; they describe populations and are not a diagnostic test.

### General cycle and phase lengths

**Najmabadi et al. (2020).** [“Menstrual bleeding, cycle length, and follicular and luteal phase lengths in women without known subfertility: A pooled analysis of three cohorts.”](https://pubmed.ncbi.nlm.nih.gov/32104920/) *Paediatric and Perinatal Epidemiology* 34:318--327. DOI: [10.1111/ppe.12644](https://doi.org/10.1111/ppe.12644).

The study followed 581 participants aged 18--40 without known subfertility and analyzed 3,324 cycles. Reported means (SD) were 30.3 (6.7) days for cycle length, 6.2 (1.5) for menses, 18.5 (6.5) for the follicular phase, and 11.7 (2.8) for the luteal phase. Ovulation timing was inferred from cervical-mucus peak day. The sample was mostly young, non-Hispanic White, and nulliparous. These marginal SDs cannot be assigned directly to Luna's within-person or between-person variance terms.

**Bull et al. (2019).** [“Real-world menstrual cycle characteristics of more than 600,000 menstrual cycles.”](https://pmc.ncbi.nlm.nih.gov/articles/PMC6710244/) *npj Digital Medicine* 2:83. DOI: [10.1038/s41746-019-0152-7](https://doi.org/10.1038/s41746-019-0152-7).

The analysis included 612,613 ovulatory cycles from approximately 124,600 Natural Cycles users. Mean (SD) cycle length was 29.3 (5.2) days; bleeding 4.0 (1.5); follicular phase 16.9 (5.3); and luteal phase 12.4 (2.4). App users and ovulatory cycles are selected populations. The source also reports per-user variation, but its cohort distribution does not identify a universal personal variance for Luna. The study was funded by Natural Cycles, and several authors worked for or founded the company.

### Variation by age and PCOS

**Li et al. (2023).** [“Menstrual cycle length variation by demographic characteristics from the Apple Women's Health Study.”](https://pubmed.ncbi.nlm.nih.gov/37248288/) *npj Digital Medicine* 6:100. DOI: [10.1038/s41746-023-00848-1](https://doi.org/10.1038/s41746-023-00848-1).

The final analysis used 165,668 cycles from 12,608 participants. The paper describes a larger intermediate pool of 742,747 cycles from 49,238 participants before later exclusions; those are **not** the final analysis denominators. Within-person cycle variability differed by age and other characteristics. Phone-based self-report and selection criteria limit transfer to all Luna users. The study supports a nonzero variability allowance, not Luna's exact four-day within-person setting.

**Mortimer et al. (2026; online 2025).** [“Variability of menstrual cycles by age, polycystic ovary syndrome, and early-life cycle irregularity in the Apple Women's Health Study.”](https://pubmed.ncbi.nlm.nih.gov/41297783/) *American Journal of Obstetrics and Gynecology* 234:1042--1069. DOI: [10.1016/j.ajog.2025.11.031](https://doi.org/10.1016/j.ajog.2025.11.031).

The analysis used 160,206 cycles from 15,586 participants, including 18,875 cycles from 1,842 participants reporting PCOS. At younger ages, the PCOS and early-life-irregular groups had longer and more irregular cycles than the early-life-regular group; differences decreased with age. The study does not supply one stable PCOS mean and SD suitable for every age or person. It does not establish a separate quantitative “PCOD” subtype for this app.

### Menopause transition

**Ferrell et al. (2006).** [“The length of perimenopausal menstrual cycles increases later and to a greater degree than previously reported.”](https://pubmed.ncbi.nlm.nih.gov/16889776/) *Fertility and Sterility* 86(3):619--624. DOI: [10.1016/j.fertnstert.2006.01.045](https://doi.org/10.1016/j.fertnstert.2006.01.045).

This was a **secondary analysis** of prospectively collected Tremin records from 120 white, college-educated US women. Mean cycle lengths in the four years before the final menstrual period were 30.48, 35.02, 45.15, and 80.22 days. The groups are aligned retrospectively to a date a current user cannot know. The paper supports a late-transition direction, not Luna's exact 60-day prior or a way to stage an individual.

The older index paired this DOI with the title of Ferrell et al.'s *2005 Menopause* article. That was a citation error; the title, journal, pages, design, and numerical result above all correspond to the 2006 paper.

## What these studies do not establish

- They do not decompose each cohort's overall spread into Luna's chosen prior variance components.
- They do not calibrate an 80% forecast interval for Luna users or validate a calendar ovulation estimate.
- They do not justify assigning one numerical cycle distribution to all hormonal contraceptive methods, thyroid conditions, or endometriosis.
- An odds ratio for short cycles is not a cycle-length mean and SD.
- The synthetic backtest measures implementation behavior under its generator; it is not an external clinical study.

The assumptions retained in the code and the evaluation limits are described in [the technical paper](./luna-technical.md) and [the research record](./research-notes.md).
