# Luna's cycle forecast: model and evaluation

**Release:** 0.11.1 · **Model:** `forecast-v2.0.0` · **Reviewed:** 24 September 2026

**Status:** Implemented; predictive accuracy in real users is unknown.

## Abstract

Luna predicts the next period start from dated cycle logs. Its current model combines a population starting point with a person's usable history and returns a central 80% predictive interval. The interval describes a possible *next observation* under the model; it is not a confidence interval for the person's typical cycle length. Chat and dashboard call the same forecast service.

The available database snapshot has 25 cycle rows from five users. Only four users have retrospective forecast targets, and none has a logged ovulation date. We therefore report no live accuracy estimate. A deterministic simulator exercises the model and backtest code; its results cannot establish clinical performance.

## Observations and output

A cycle length is the number of calendar days between consecutive period starts. Bleeding duration counts both the start and end date. A missing end date is not turned into a duration. The model uses ISO calendar dates; the caller supplies the current date in the user's timezone. The forecast excludes starts after that date and deduplicates equal starts. [Forecast implementation](../src/lib/prediction/forecast.ts)

The service returns the model version, data cutoff, number of usable and set-aside intervals, next-start point date and window, status, caveats, and an optional calendar ovulation estimate. With no logged start, it does not invent a personal next-start date. The dashboard distinguishes logged events from estimates. The selected plan changes the dashboard, chat, and settings composition only; it does not change this service or its inputs. [Shared service](../src/lib/cycle-tools.ts) · [Dashboard](<../src/app/(app)/dashboard/DashboardClient.tsx>) · [Plan lookup](../src/lib/theme/server-plan.ts)

Cycle writes reject impossible or future dates, reversed ranges, duplicate starts, overlapping bleeding ranges, and bleeding longer than 15 days. Chat tools, the dashboard quick-log route, and import share one validated writer; import checks the prospective set before inserting. These are input rules, not claims about what bleeding durations are medically possible. [Cycle writes](../src/lib/cycle-tools.ts) · [Quick-log routes](../src/app/api/cycles/route.ts) · [Import route](../src/app/api/data/import/route.ts)

## Predictive calculation

For cycle length, the working observation is $y_i=\log(d_i)$, where $d_i$ is a start-to-start interval in days. Bleeding duration is modeled directly in days. Let $m$ be a person's typical value on the relevant working scale:

$$
m\sim\mathcal N(\mu_0,\tau_0^2),\qquad y_i\mid m,\sigma^2\sim\mathcal N(m,\sigma^2).
$$

The code estimates within-person variance by shrinking the sample sum of squares toward the starting variance $s_0^2$ with four pseudo-observations:

$$
\widehat\sigma^2=\frac{4s_0^2+\sum_i(y_i-\bar y)^2}{4+\max(n-1,0)}.
$$

It then uses the normal posterior for $m$ *conditional on that plug-in variance*. If $n=0$, the data term is zero:

$$
V_m=\left(\tau_0^{-2}+n\widehat\sigma^{-2}\right)^{-1},\qquad
\widehat m=V_m\left(\mu_0\tau_0^{-2}+n\bar y\widehat\sigma^{-2}\right).
$$

The next-observation approximation has variance $\widehat\sigma^2+V_m$. Its 10th and 90th percentiles form the displayed 80% interval. Cycle-length quantiles are exponentiated back to days. This is an empirical-Bayes, plug-in predictive approximation: it does **not** integrate over uncertainty in $\sigma^2$, and the nominal 80% level has not been calibrated on real users. The code uses at most the most recent 12 usable observations. [Model calculation](../src/lib/prediction/forecast.ts)

The cycle prior has median 29 days, between-person spread 4 days, and within-person spread 4 days before conversion to the log scale. The bleeding prior has mean 5.5 days and spread components of 1.1 and 1 day. These spreads and the shrinkage strength are engineering assumptions, not parameters directly estimated from the cited cohorts. The linear bleeding model has no explicit truncation of its predictive tails; validation bounds apply to *recorded* bleeding durations. [Prior definitions](../src/lib/prediction/forecast.ts)

## Uncertain logs and profile adjustments

Intervals under 15 days are set aside as possible duplicate or spotting logs. An interval over the profile's upper gate is also set aside unless at least two of the last six intervals exceed that gate; then long intervals are treated as a recurring pattern. The base upper gate is 45 days and is raised for some profiles. This rule classifies uncertainty in logging and forecasting. It does not identify the biological cause of a gap. [Usable-interval rule](../src/lib/prediction/forecast.ts)

PCOS, PCOD, irregular cycles, thyroid conditions, hormonal contraception, and perimenopause change spread or gate settings. PCOS and PCOD share settings. Late perimenopause also raises the starting cycle median to 60 days. These settings are cautious design choices, not fitted condition-specific distributions. A single hormonal-contraception flag cannot distinguish different regimens. [Profile adjustments](../src/lib/prediction/forecast.ts)

The original next-start forecast stays fixed if no new start is logged. While the current date lies *inside* its window, the UI can also show a conditional remaining window, given no recorded start yet. After the window, the implementation reports a late or long-gap status without extending that conditional calculation. A missing log and a genuinely long cycle remain indistinguishable. [Ongoing-cycle logic](../src/lib/prediction/forecast.ts)

Calendar ovulation is estimated by subtracting a luteal-phase starting value from the predicted next start and combining the two spreads approximately. It is withheld for PCOS/PCOD, irregular cycles, thyroid conditions, hormonal contraception, and late perimenopause. No logged ovulation outcomes were available to evaluate it. A model-derived date is never treated as an observed ovulation. [Ovulation logic](../src/lib/prediction/forecast.ts)

## Evidence behind the starting point

[Najmabadi et al. (2020)](https://pubmed.ncbi.nlm.nih.gov/32104920/) reported a mean cycle length of 30.3 days (SD 6.7) in 3,324 cycles from 581 participants without known subfertility. [Bull et al. (2019)](https://pmc.ncbi.nlm.nih.gov/articles/PMC6710244/) reported 29.3 days (SD 5.2) and a mean luteal phase of 12.4 days (SD 2.4) in 612,613 ovulatory cycles from Natural Cycles users. Neither total cycle SD identifies the between-person and within-person components required by Luna's prior.

[Li et al. (2023)](https://pubmed.ncbi.nlm.nih.gov/37248288/) studied 165,668 cycles from 12,608 Apple Women's Health Study participants in its final analysis and found that within-person variability differed by age and other characteristics. [Mortimer et al. (2026)](https://pubmed.ncbi.nlm.nih.gov/41297783/) found longer and more irregular cycles at younger ages among participants reporting PCOS; the group differences diminished with age. These studies support caution about a single fixed distribution, not Luna's exact numerical spread settings.

[Ferrell et al. (2006)](https://pubmed.ncbi.nlm.nih.gov/16889776/) reanalyzed prospectively collected Tremin records from 120 women by years before the final menstrual period. This retrospective alignment cannot tell the app how many years remain for an individual user. It informs the direction of a broad late-transition adjustment, not its exact value. Full study details and transfer limits are in [the evidence index](./references.md).

## Evaluation and results

The [backtest](../src/lib/prediction/backtest.ts) evaluates each eligible target from only the preceding cycle prefix. It does not use future bleeding ends, ovulation reports, or persisted full-history prediction parameters. **Historical profile values are unavailable:** the harness applies each user's *current* condition and stage settings at every origin. This prevents a faithful historical evaluation when those settings changed. Users are clustered, rather than treated as independent cycles, for the paired bootstrap.

Benchmarks include the retained adaptive smoother, a population-only forecast, last observation, personal mean and median variants, and simple exponential smoothing. The retained smoother's nominal 95% interval is rescaled under a normal approximation for the 80% comparison; that rescaling is a benchmark convention, not a validated interval. Point-only baselines have no coverage score. [Backtest models](../src/lib/prediction/backtest.ts)

The 24 September 2026 database snapshot had 10 users overall, 25 cycle rows across five users, 20 start-to-start intervals, and no logged ovulation dates. Only four users contributed retrospective targets. The runner suppresses all live accuracy figures below five contributing users. Most rows were entered long after their recorded starts, and neither forecast issuance nor profile history is stored. Consequently, even a larger retrospective dataset would not reconstruct exactly what Luna knew at the time. [Profile procedure](../scripts/db-profile.mts)

The synthetic run below is reproducible with `node --no-warnings scripts/backtest.mts synthetic 42`. It used 400 simulated users and 2,938 cycle targets. Values are descriptive of this generator and this seed.

| Cycle target metric | Retained smoother | Forecast-v2 |
|:--|--:|--:|
| Mean absolute error | 5.83 days | 4.89 days |
| User-macro mean absolute error | 5.76 days | 4.86 days |
| Nominal 80% interval coverage | 42% | 84% |
| Mean 80% interval width | 6.9 days | 13.6 days |

Among 365 simulated users with at least one prior interval, the v2-minus-v1 user-macro error difference was -1.13 days, with a 95% user-cluster bootstrap interval of [-1.57, -0.75]. That interval describes variation in the simulator, not uncertainty about an effect in real users. Seeds 43--45 preserved the direction of the comparison. The simulator shares assumptions with forecast-v2, so favorable synthetic results are expected and cannot establish real-world superiority. [Runner](../scripts/backtest.mts) · [Detailed audit](./research-notes.md)

## Pattern check against reference ranges

Separately from the forecast, Luna compares the last six months of logs with FIGO AUB System 1 limits for typical bleeding: frequency of 24--38 days, duration of 8 days or less, and a shortest-to-longest cycle spread of at most 7 days at ages 26--41 or 9 days at ages 18--25 and 42--45. Cycle length is marked outside the range when more than half of recent intervals fall outside 24--38 days; regularity needs at least three recent intervals. A start more than 90 days ago is reported as a long gap. The check does not run on hormonal contraception, and ages outside 18--45 are flagged as outside the reference population. It uses logged dates only; it does not use the forecast, does not diagnose, and says nothing about flow volume. [Pattern check](../src/lib/prediction/cycle-check.ts) · [Tests](../src/lib/prediction/__tests__/cycle-check.test.ts)

## Limits and next measurement

Luna is not clinically validated. Its priors mix selected cohorts, its variance calculation is approximate, self-entered logs can be late or incomplete, and the current profile fields are coarse. The inspected live data cannot establish point accuracy, interval calibration, subgroup performance, or ovulation accuracy.

The next useful measurement is an immutable, consented record of each issued forecast, its data cutoff and model version, followed by the observed outcome. Retention and deletion rules must be specified before collecting it. A future evaluation can compare forecast-v2 with a personal median and rolling mean on chronological, user-clustered data. Until then, the synthetic experiment is an implementation check, not a performance claim.
