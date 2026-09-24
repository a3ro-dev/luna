# Luna project source and evidence index

**Version:** 0.10.1  
**Date:** 24 September 2026

## Current implementation

| Source | Purpose |
|---|---|
| [forecast.ts, L1-492](../src/lib/prediction/forecast.ts#L1-L492) | Pure `forecast-v2.0.0` model, population assumptions, condition adjustments, posterior predictive distributions, ongoing-cycle handling, provenance, and user-facing descriptions. |
| [engine.ts, L1-780](../src/lib/prediction/engine.ts#L1-L780) | Retained legacy adaptive-smoothing engine used as the `forecast-v1` evaluation benchmark. It is not the current dashboard/chat forecast path. |
| [backtest.ts, L1-270](../src/lib/prediction/backtest.ts#L1-L270) | Leakage-free rolling-origin evaluation, baselines, metrics, user-macro summaries, cluster bootstrap, and synthetic cohorts. |
| [forecast.test.ts, L1-117](../src/lib/prediction/__tests__/forecast.test.ts#L1-L117) | Date, timezone, cold-start, uncertainty, contamination, long-cycle, ongoing-cycle, abstention, and validation tests. |
| [backtest.test.ts, L1-54](../src/lib/prediction/__tests__/backtest.test.ts#L1-L54) | Prefix-only leakage test and predeclared synthetic calibration/non-inferiority test. |
| [engine.test.ts, L1-566](../src/lib/prediction/__tests__/engine.test.ts#L1-L566) | Legacy engine regression suite. |
| [cycle-tools.ts, L345-509](../src/lib/cycle-tools.ts#L345-L509) | Shared authenticated forecast service, deterministic analytics refresh, cycle validation, create/edit/delete behavior, and stale-observation cleanup. |
| [db-profile.mts, L1-156](../scripts/db-profile.mts#L1-L156) | Bounded read-only aggregate database profile with small-cell suppression. |
| [backtest.mts, L1-89](../scripts/backtest.mts#L1-L89) | Reproducible synthetic/database evaluation CLI with minimum-user metric suppression. |
| [schema.ts, L1-175](../src/lib/db/schema.ts#L1-L175) | Current Drizzle schema and inclusive period-length definition. |

## Product and API integration

| Source | Purpose |
|---|---|
| [home-client.tsx](../src/app/home-client.tsx) | Landing page Premium request dialog and status feedback. |
| [subscribe route](../src/app/api/subscribe/route.ts) | Public subscription request validation and delivery status. |
| [forgot-password route](../src/app/api/auth/forgot-password/route.ts) | Password reset token, link URL, and background email scheduling. |
| [dashboard/page.tsx, L1-147](../src/app/(app)/dashboard/page.tsx#L1-L147) | Server dashboard using the shared forecast result rather than a parallel prediction calculation. |
| [DashboardClient.tsx, L1-677](../src/app/(app)/dashboard/DashboardClient.tsx#L1-L677) | Fact/estimate labels, likely start window, history basis, caveats, observed versus estimated ovulation, and non-pulsing anomaly display. |
| [chat route, L1-801](../src/app/api/chat/route.ts#L1-L801) | Authenticated AI SDK stream, user-scoped sessions, deterministic tools, abort handling, and complete `UIMessage`-parts persistence. |
| [prompt.ts, L1-333](../src/lib/chat/prompt.ts#L1-L333) | Chat grounding, medical limitations, and OpenUI instructions. |
| [openui.ts, L1-4](../src/lib/chat/openui.ts#L1-L4) | Strict `root =` structured-rendering gate. |
| [import route, L460-522](../src/app/api/data/import/route.ts#L460-L522) | Atomic prevalidation of imported cycle rows and post-import analytics refresh. |
| [profile route, L188-209](../src/app/api/user/profile/route.ts#L188-L209) | Profile update and dependent analytics refresh after condition/stage changes. |
| [changelog.ts, L1-28](../src/lib/changelog.ts#L1-L28) | v0.10.0 release record. |

## Primary scientific sources

### General cycle and phase distributions

**Najmabadi et al. (2020).** “Menstrual bleeding, cycle length, and follicular and luteal phase lengths in women without known subfertility: A pooled analysis of three cohorts.” *Paediatric and Perinatal Epidemiology*, 34(3), 318--327. DOI: [10.1111/ppe.12644](https://doi.org/10.1111/ppe.12644). PubMed PMID 32104920.

- Population: 581 women without known subfertility in three prospective cohorts; 3,324 cycles.
- Reported quantities: menses 6.2 (SD 1.5), cycle 30.3 (SD 6.7), follicular 18.5 (SD 6.5), luteal 11.7 days (SD 2.8).
- Use: broad general starting point and plausibility comparison.
- Limitation: eumenorrheic/subfertility-screened cohort; total spread is not automatically within-person spread or uncertainty about an individual mean.

**Bull et al. (2019).** “Real-world menstrual cycle characteristics of more than 600,000 menstrual cycles.” *npj Digital Medicine*, 2, 83. DOI: [10.1038/s41746-019-0152-7](https://doi.org/10.1038/s41746-019-0152-7). PMCID PMC6710244.

- Population: 612,613 ovulatory cycles from 124,648 Natural Cycles app users.
- Reported quantities: cycle 29.3 (SD 5.2), bleeding 4.0 (SD 1.5), follicular 16.9 (SD 5.3), luteal 12.4 days (SD 2.4).
- Use: luteal starting point and general cycle plausibility.
- Limitation: selected app users and ovulatory cycles; not representative of all Luna users or condition groups.

### Within-person variability

**Wang et al. / Apple Women's Health Study (2023).** “Menstrual cycle variability and length across the reproductive lifespan.” PMCID [PMC10226714](https://pmc.ncbi.nlm.nih.gov/articles/PMC10226714/).

- Population: 49,238 participants under age 50; 742,747 prospectively logged cycles after exclusions.
- Measured quantity: within-person cycle-length variability and age/race/ethnicity patterns.
- Use: supports a nonzero variance floor and increased variability near ages 45--49.
- Limitation: app/phone cohort, self-report, and age-stratified observational results do not identify a universal personal SD.

### Perimenopause transition

**Ferrell et al. (2006).** “Monitoring reproductive aging in a 5-year prospective study: aggregate and individual changes in steroid hormones and menstrual cycle lengths with age.” *Fertility and Sterility*, 86(1), 160--167. DOI: [10.1016/j.fertnstert.2006.01.045](https://doi.org/10.1016/j.fertnstert.2006.01.045). PubMed PMID 16889776.

- Population: 120 white, college-educated US participants from the TREMIN cohort.
- Measured quantity: longitudinal menstrual cycle lengths in years before the final menstrual period; means reported in the paper include about 30.48, 35.02, 45.15, and 80.22 days from four to one year before the final menstrual period.
- Use: directional, deliberately wide late-transition assumption.
- Limitation: small and nonrepresentative cohort; retrospective alignment to final menstrual period is unavailable at prediction time and does not justify precise staging.

### PCOS directionality

**Apple Women's Health Study (2025).** PubMed PMID [41297783](https://pubmed.ncbi.nlm.nih.gov/41297783/).

- Population: 160,206 cycles from 15,586 participants, including 18,875 cycles from 1,842 participants reporting PCOS.
- Measured quantity: age-stratified cycle length and irregularity associations.
- Use: supports longer and more variable cycles as a direction, with differences changing by age.
- Limitation: the abstract does not provide a single defensible mean and SD for a PCOS prior; version 2 therefore does not assign a fixed PCOS mean.

## Rejected quantitative claims

| Claim from the legacy engine | Decision | Reason |
|---|---|---|
| PCOD is a milder numerical subtype of PCOS | Rejected | No verified quantitative distribution distinguished the labels. |
| Endometriosis implies a 27-day mean and 4-day SD | Rejected | An odds ratio for short cycles is not a mean/SD distribution. |
| Thyroid conditions imply a 35-day mean and 15-day SD | Rejected | Hypothyroid and hyperthyroid effects differ; no suitable combined distribution was verified. |
| Every hormonal method has a common cycle distribution | Rejected | Regimens and bleeding mechanisms differ substantially. |
| A jackknife interval around a smoothed mean predicts the next cycle | Rejected | Uncertainty about a mean omits next-observation variability; ordered dependent histories also violate simple leave-one-out assumptions. |
| Model-derived phase dates are observations | Rejected | They are dependent outputs and cannot serve as independent ground truth. |

## Documentation notes

The source line ranges above correspond to version 0.10.0 and may drift as the files evolve. The previous research documents described the legacy engine as current, claimed that automated tests were absent, and treated unverified condition parameters as evidence-backed. Those statements are superseded by this index, [luna-technical.md](./luna-technical.md), and [research-notes.md](./research-notes.md).
