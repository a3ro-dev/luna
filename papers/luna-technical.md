# Luna: Condition-Aware Menstrual Cycle Prediction via Adaptive Exponential Smoothing with Population Priors

**Akshat Singh Kushwaha**

akshatsingh14372@outlook.com · a3ro.dev

---

## Abstract

We present Luna, a web-based menstrual cycle tracking and prediction application that employs adaptive exponential smoothing with condition-specific population priors. Unlike conventional trackers that apply a fixed 28-day default or simple rolling averages, Luna adjusts its smoothing rate, anomaly thresholds, and prior blending based on the user's self-reported health conditions (PCOS, endometriosis, thyroid disorders, hormonal contraception, perimenopause, among others). The prediction engine computes point estimates and confidence intervals through three regimes: a pure-prior cold start for zero observations, inverse-variance blending for 1–5 observations, and jackknife confidence intervals from exponential smoothing for 6+ observations. Anomaly detection uses a two-stage skip gate: a condition-aware maximum-cycle-length threshold followed by a 2.5σ outlier soft-clamp. The system has not been validated on real-world data, has no automated test suite, and has no published accuracy metrics. This paper describes the algorithm, architecture, and known limitations with full transparency about what remains unverified.

## 1. Introduction

Menstrual cycle tracking is a widespread practice, with dozens of mobile applications serving hundreds of millions of users. Despite this scale, most trackers employ simple predictive strategies—rolling averages of the last *N* cycles, fixed 28-day defaults, or undisclosed proprietary models—that fail to account for the substantial heterogeneity in cycle patterns across different health conditions [1][2]. A user with polycystic ovary syndrome (PCOS), whose cycle length may range from 21 to 111 days [3], receives the same predictive framework as a user with regular 28-day cycles.

This paper describes Luna (v0.7.0), an open-source menstrual cycle tracker that takes a different approach: condition-aware adaptive exponential smoothing. The system adjusts its core parameters—smoothing rate, anomaly thresholds, population priors, and uncertainty estimates—based on the user's self-reported health conditions. The algorithm is fully deterministic and inspectable: all parameters, priors, and decision boundaries are specified in a single source file [engine.ts, L1–442].

Luna is a functional web application built on Next.js 16.2.4 with a conversational AI interface, but it has not undergone clinical validation, has no automated test suite, and has no published accuracy benchmarks. We present the system as-is, documenting what it does, what evidence supports its design choices, and—critically—what remains unverified.

## 2. Background and Related Work

### 2.1 Commercial Cycle Trackers

**Clue** is the most methodologically sophisticated published commercial system. It uses probabilistic forecasting with population-informed priors and generalized Poisson models, explicitly modeling the distinction between missing logs and true long cycles [4]. Clue reports MAE, CRPS, Brier score, and calibration metrics. No public PCOS-specific model has been disclosed.

**Natural Cycles** is the only FDA-cleared contraceptive app, validated on >22,000 women and >224,000 cycles using basal body temperature (BBT)-driven fertility awareness with statistical inference [5]. It uses the Pearl Index for contraceptive effectiveness and expands unsafe days when uncertain. It is the most clinically rigorous tracker but does not publicly disclose a PCOS engine.

**Flo Health** uses ML-based personalization with neural-network forecasting [6]. Its algorithm is proprietary and has no peer-reviewed disclosure. Flo widens the fertile window under irregularity, but no open calibration benchmarks exist.

**drip** is an open-source symptothermal/rule-based fertility awareness app [7]. It uses deterministic rules rather than probabilistic forecasting, has no population priors, no uncertainty estimation, and no PCOS handling.

**Generic GitHub trackers** typically use arithmetic mean or rolling average of the last *N* cycles, fixed 28-day defaults, no condition awareness, no uncertainty quantification, and assume stationary cycle length.

### 2.2 Academic Methods

Fukaya et al. proposed a state-space BBT model using Bayesian filtering for menstrual cycle phase estimation [8]. Hidden semi-Markov models (HSMMs) have been explored for phase-based duration modeling [9]. These approaches offer richer probabilistic frameworks but have not been adopted in consumer applications, likely due to implementation complexity and data requirements.

Adaptive exponential smoothing—the method Luna uses—is well-established in time-series forecasting [10] but is surprisingly underexplored for menstrual cycle prediction despite being well-matched to the domain: small sample sizes, non-stationary distributions, and the need for graceful handling of outliers and missing data.

### 2.3 Condition-Specific Cycle Data

Table 1 summarizes the published evidence for cycle parameters across conditions.

| Condition | Cycle Length (mean±SD) | Source | N |
|---|---|---|---|
| General population | 30.3 ± 6.7 d | Najmabadi et al. [1] | 581 women, 3,324 cycles |
| PCOS | 51 ± 15 d | Nutrients 2026 trial [3] | Small N (trial cohort) |
| PCOS range | 21–111 d | MOS2 community cohort [3] | Community sample |
| Perimenopause (−4yr) | ~30 d | Holman 2006 [11] | Treloar/Tremin re-analysis |
| Perimenopause (−2yr) | ~45 d | Holman 2006 [11] | Treloar/Tremin re-analysis |
| Perimenopause (−1yr) | ~80 d | Holman 2006 [11] | Treloar/Tremin re-analysis |
| Endometriosis | ≤27d over-represented (OR 1.22) | Meta-analysis, 11 studies [12] | Case-control |
| Hormonal BC (monophasic) | 28 d (regimen-driven) | RCTs of 21/7, 24/4 pills [13] | RCT cohorts |
| Thyroid (hypo/hyper) | No published mean±SD | Directional data only | — |
| Irregular (idiopathic) | No published mean±SD | — | — |

*Table 1: Published evidence for condition-specific cycle parameters. Thyroid and idiopathic irregular conditions lack quantitative priors in the literature.*

## 3. Problem Statement

Conventional menstrual cycle trackers suffer from three interrelated shortcomings:

1. **Prior rigidity.** Fixed population priors (typically μ=28, σ≈2–4 days) produce misleading predictions for users whose cycle distributions differ substantially from the general population—most notably users with PCOS, perimenopause, or thyroid disorders.

2. **Anomaly misclassification.** Without condition-aware thresholds, a 60-day cycle is flagged as a "missed log" for a general-population user but may be entirely normal for a PCOS user. Misclassifying a genuine long cycle as a data gap corrupts the smoothing state.

3. **Uncertainty opacity.** Simple rolling averages provide no confidence intervals, leaving users unable to assess prediction reliability. This is especially problematic during cold start (few observations) and for high-variance conditions.

Luna addresses these by making the prediction engine condition-aware at every layer: priors, smoothing, anomaly detection, and uncertainty estimation.

## 4. Methodology and System Design

### 4.1 Population Priors

The general population prior is derived from Najmabadi et al. [1], who pooled three prospective cohorts of 581 eumenorrheic women across 3,324 cycles [engine.ts, L33–38]:

| Parameter | Mean | Variance | σ |
|---|---|---|---|
| cycleLength | 30.3 | 44.89 | 6.7 d |
| periodLength | 6.2 | 2.25 | 1.5 d |
| follicularLength | 18.5 | 42.25 | 6.5 d |
| lutealLength | 12.0 | 7.84 | 2.8 d |

Eight condition-specific priors extend this baseline: `none`, `pcos`, `pcod`, `endometriosis`, `thyroid`, `hormonal_bc`, `irregular`, `perimenopause` [engine.ts, L52–184]. Each specifies cycle length, period length, follicular length, and luteal length (mean and variance), a maximum cycle length threshold, whether anovulation is common, and a human-readable note for the AI assistant.

Key priors:

| Condition | Cycle μ | Cycle σ | maxCycleLength | Anovulatory |
|---|---|---|---|---|
| none | 30.3 | 6.7 | 45 | No |
| pcos | 51 | 15 | 120 | Yes |
| pcod | 45 | 13 | 120 | Yes |
| endometriosis | 27 | 4 | 45 | No |
| thyroid | 35 | 15 | 90 | Yes |
| hormonal_bc | 28 | 1 | 35 | Yes |
| irregular | 30 | 15 | 90 | Yes |
| perimenopause | 45 | 20 | 120 | Yes |

*PCOD is treated as a milder phenotype of PCOS following South Asian clinical tradition, with interpolated parameters (slightly shorter mean, slightly lower variance). No separate quantitative data distinguishes PCOD from PCOS in peer-reviewed literature [engine.ts, L81–95, note L91–94].*

*Hormonal BC sets follicularLength and lutealLength to null, as ovulation is suppressed and these phases do not exist [engine.ts, L137–138].*

### 4.2 Prior Resolution

When a user has multiple conditions, `resolveEffectivePrior()` [engine.ts, L191–214] selects a single effective prior:

1. If `hormonal_bc` is present → use the hormonal BC prior (cycle mechanics are fundamentally altered).
2. Otherwise → pick the condition with the highest `cycleLength.variance` (the "most disruptive" condition wins).
3. Empty conditions or `"none"` → fall back to the general population prior.

**Limitation:** This is a heuristic. A user with both endometriosis and thyroid disorders receives the thyroid prior (σ=15d vs σ=4d), which may overestimate variance for their actual presentation. No evidence supports the "highest variance wins" rule; it is a conservative choice [inference].

### 4.3 Adaptive Exponential Smoothing

The core smoother `exponentialSmooth()` [engine.ts, L299–341] iterates observations from oldest to newest:

**Initialization:**

$$\hat{x}_0 = x_0, \quad \sigma^2_0 = 0$$

**For each subsequent observation** $x_i$:

1. **Skip gate** (§4.4): apply anomaly detection to obtain gated value $\tilde{x}_i$.
2. **Compute adaptive α** from the last 5 residuals' mean absolute deviation (MAD):

$$\alpha = \alpha_{\min} + (\alpha_{\max} - \alpha_{\min}) \cdot \frac{\text{MAD}}{\text{MAD} + \kappa}$$

where $\alpha_{\min} = 0.1$, $\alpha_{\max} = 0.5$, $\kappa = 5.0$ [engine.ts, L222–224]. For empty residuals, α defaults to 0.3 [engine.ts, L231].

3. **Update variance** and **smoothed value**:

$$\sigma^2_i = (1 - \alpha)(\sigma^2_{i-1} + \alpha \cdot d_i^2)$$

$$\hat{x}_i = \hat{x}_{i-1} + \alpha \cdot d_i$$

where $d_i = \tilde{x}_i - \hat{x}_{i-1}$.

4. **Residual tracking:** Only non-anomaly observations contribute residuals to the MAD computation. Anomaly-gated observations produce $d_i \approx 0$, which would artificially deflate MAD and lock α low, making the smoother unresponsive to genuine regime changes [engine.ts, L331–338].

**Design rationale:** Adaptive α allows the smoother to respond quickly when recent observations are highly variable (large MAD → α approaches 0.5) and to stabilize when observations are consistent (small MAD → α approaches 0.1). The MAD window of 5 observations balances responsiveness and smoothness.

### 4.4 Skip Gate and Anomaly Detection

The skip gate `skipGate()` [engine.ts, L273–296] applies a two-stage test:

**Stage 1 — Maximum cycle length threshold:**

$$\text{if } x_i > T_{\text{max}}(\text{conditions}): \quad \tilde{x}_i = \hat{x}_{i-1}, \quad \text{isAnomaly} = \text{true}$$

where $T_{\text{max}}$ is the condition-specific `maxCycleLength` (e.g., 120 for PCOS, 45 for general population) [engine.ts, L279–282].

**Stage 2 — Outlier soft-clamp:**

$$\text{if } |d_i| > 2.5 \cdot \sigma: \quad \tilde{x}_i = \hat{x}_{i-1} + \text{sign}(d_i) \cdot 2.5 \cdot \sigma, \quad \text{isAnomaly} = \text{true}$$

where σ is floored at 2.0 days ($\sigma^2 \geq 4.0$) to prevent tight convergence from flagging normal variation [engine.ts, L288].

**Design rationale:** The soft-clamp preserves the direction of the outlier while limiting its influence, rather than discarding it entirely. The σ floor prevents the pathological case where a long series of identical observations drives variance to zero, causing the next normal fluctuation to be flagged as anomalous.

**Limitation:** The 2.5σ threshold is a domain-specific heuristic, not derived from any theoretical framework. No sensitivity analysis has been performed [unverified].

### 4.5 Prior Blending

`blendWithPrior()` [engine.ts, L236–270] handles the cold-start and warm-start regimes:

- **n ≥ 6 observations:** return user data unchanged (prior fades out completely).
- **n < 6 observations:** inverse-variance blending with the condition-specific prior:

$$w_{\text{prior}} = \frac{1}{\sigma^2_{\text{prior}}}, \quad w_{\text{user}} = \begin{cases} \frac{1}{\max(\sigma^2_{\text{user}}, 0.01)} & \text{if } n > 0 \\ 0 & \text{if } n = 0 \end{cases}$$

$$\mu_{\text{blended}} = \frac{w_{\text{prior}} \cdot \mu_{\text{prior}} + w_{\text{user}} \cdot \mu_{\text{user}}}{w_{\text{prior}} + w_{\text{user}}}$$

$$\sigma^2_{\text{blended}} = \frac{1}{w_{\text{prior}} + w_{\text{user}}}$$

The condition-specific prior is used if available; otherwise the general population prior serves as fallback [engine.ts, L246–261].

**Limitation:** The cutoff at n=6 is a heuristic. The inverse-variance blending is theoretically sound for Gaussian distributions, but menstrual cycle lengths are not Gaussian—especially for conditions like PCOS where distributions are right-skewed with heavy tails [unverified].

### 4.6 Prediction Output

`predictNextCycle()` [engine.ts, L384–442] produces a point estimate and 95% confidence interval through three regimes:

| Regime | Condition | Point Estimate | 95% CI |
|---|---|---|---|
| Cold start | n = 0 | Condition-prior mean | μ ± 1.96σ (prior) |
| Warm start | 1 ≤ n ≤ 5 | Blended mean (§4.5) | μ_blended ± 1.96σ_blended |
| Mature | n ≥ 6 | Smoothed value (§4.3) | Jackknife CI (§4.7) |

### 4.7 Jackknife Confidence Intervals

For n ≥ 6 observations, `calculateJackknifeCI()` [engine.ts, L344–381] computes a leave-one-out jackknife:

1. Compute full smoothed estimate $\hat{\theta}$ on all n observations.
2. For each $i \in \{1, \ldots, n\}$, compute $\hat{\theta}_{(i)}$ by running exponential smoothing on the dataset with observation $i$ omitted.
3. Compute jackknife mean: $\bar{\theta}_{(\cdot)} = \frac{1}{n}\sum_{i=1}^{n} \hat{\theta}_{(i)}$
4. Compute jackknife variance: $\hat{\sigma}^2_J = \frac{n-1}{n} \sum_{i=1}^{n} (\hat{\theta}_{(i)} - \bar{\theta}_{(\cdot)})^2$
5. 95% CI: $\hat{\theta} \pm 1.96 \sqrt{\hat{\sigma}^2_J}$

**Limitation:** The jackknife assumes that the estimator is approximately smooth in each observation. For exponential smoothing with a skip gate and adaptive α, the estimator is piecewise-smooth—removing an observation can change which observations are flagged as anomalies, creating discontinuities. The jackknife CI may therefore be overconfident or underconfident depending on the data [inference]. No simulation study has been conducted to assess coverage [unverified].

## 5. Implementation Details

### 5.1 Technology Stack

| Component | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.4 |
| UI | React | 19.0.0 |
| Database | Neon PostgreSQL (serverless) | — |
| ORM | Drizzle ORM | 0.45.2 |
| Auth | Auth.js (NextAuth v5) | 5.0.0-beta.31 |
| AI | Vercel AI SDK | 6.0.174 |
| LLM | x-ai/grok-4.3 (via HackClub proxy) | — |
| Memory | Supermemory v4 API | — |
| Styling | Tailwind CSS | 4.0.0 |
| Language | TypeScript | 5.0+ |
| License | MIT | — |

### 5.2 Database Schema

Eight tables are defined in [schema.ts]:

| Table | Key Columns | Notes |
|---|---|---|
| `users` | id, email, passwordHash, conditions (jsonb), plan | conditions = array of condition strings |
| `cycles` | id, userId, mStart, mEnd, ovulationDate, cycleLength, periodLength, follicularLength, lutealLength, isAnomaly, notes (jsonb) | Derived columns recomputed on every cycle write |
| `prediction_params` | id, userId, paramName, smoothedValue, variance, sampleCount | One row per (userId, metric); unique on (userId, paramName) |
| `ai_traces` | id, userId, model, inputTokens, outputTokens, costUsd, latencyMs, feature | Every AI response logged |
| `chat_sessions` | id, userId, title, createdAt, updatedAt | — |
| `chat_messages` | id, sessionId, userId, role, parts (jsonb), textContent | parts = UIMessage parts array |
| `chat_summaries` | id, sessionId, userId, summary, messageCount | Auto-generated after 30+ messages |
| `uploaded_images` | id, userId, imageData (base64), mediaType, expiresAt | 7-day retention |

The `cycles.notes` column is jsonb storing symptom/note entries per cycle. Period length uses inclusive day count: `diffInDays(mStart, mEnd) + 1` [cycle-tools.ts, L465–467].

### 5.3 Cycle Analytics Pipeline

`refreshCycleAnalytics()` [cycle-tools.ts, L421–575] is the central data pipeline, invoked after every cycle write:

1. Fetch all cycles for the user, ordered by mStart ascending.
2. First pass: compute derived columns (cycleLength, periodLength, follicularLength, lutealLength) and apply threshold-based anomaly detection.
3. Second pass: mark statistical outliers beyond 2.5σ from the mean cycle length (requires ≥3 cycles).
4. Persist changes to DB (isAnomaly flag + derived columns).
5. Call `refreshPredictionParam()` for each metric (cycle_length, period_length, follicular, luteal), which runs exponential smoothing + prior blending and upserts the result to prediction_params.

**Limitation:** The anomaly detection in refreshCycleAnalytics uses simple mean±σ (not the exponential smoother's running variance), creating an inconsistency with the prediction engine's own skip gate [cycle-tools.ts, L528–541 vs engine.ts, L273–296]. The two anomaly detectors may flag different observations [unverified impact].

### 5.4 AI Chat Interface

The chat route [route.ts] implements a conversational interface with 10 AI tools:

| Tool | Purpose |
|---|---|
| `logPeriodStart` | Log period start date |
| `logPeriodEnd` | Log period end date |
| `logOvulation` | Log ovulation date |
| `addNoteSymptom` | Add free-text note/symptom to a cycle |
| `fetchRecentCycles` | Fetch recent cycles (returns OpenUI table) |
| `computePredictions` | Compute next period/ovulation predictions (returns OpenUI card) |
| `fetchStats` | Cycle statistics and averages (returns OpenUI card) |
| `exportData` | Return export link for user's cycle data |
| `rememberFact` | Store personal fact in Supermemory |
| `searchWeb` | Search web via HackClub Search API |

**Context assembly** for each message [route.ts, L109–115, L234–254]:

- Recent 20 messages from current session
- Latest summary (auto-generated at 30+ messages, delta 12+ since last summary)
- Keyword snippets: extract up to 6 keywords from the latest user message, retrieve up to 6 matching historical messages via ILIKE
- Supermemory recall: top 5 personal facts relevant to the query

**Model configuration** [models.ts]: All plan tiers (free, premium, premium+) use the same model (`x-ai/grok-4.3`) with the same `maxSteps(10)`. The only difference is the persona prompt appended to the system prompt. Cost: $1.25/M input tokens, $2.50/M output tokens, logged to ai_traces after every response [route.ts, L813–823].

**Date handling** in cycle tools supports natural language input via `normalizeDateInput()` [cycle-tools.ts, L184–261]: "today", "yesterday", "May 3", "1/15/2025", ISO dates, and more. All timezone-aware via Intl.DateTimeFormat.

### 5.5 Structured Response Rendering

The AI assistant can produce structured responses in OpenUI DSL (a domain-specific language where responses start with `root = Card(...)`). Detection is performed by `looksLikeOpenUiLang()`, which checks if the text starts with `root =` [openui.ts, L1–4]. This gates rendering of prediction cards, cycle tables, and statistical summaries as rich UI components rather than plain text.

### 5.6 Authentication

Auth.js v5 with Credentials provider only (email + password), JWT strategy (7-day maxAge), bcryptjs password hashing [auth.ts]. User existence is verified on every JWT refresh callback, forcing re-authentication if the user has been deleted [auth.ts, L44–49].

### 5.7 Rate Limiting

In-memory sliding-window counter, per-process only [rate-limit.ts]. A 5-minute cleanup interval prevents memory leaks. **Critical limitation:** In serverless deployments with multiple instances, rate limits apply per-instance, not globally. An attacker can bypass limits by distributing requests across instances.

### 5.8 Data Import

The import route [import/route.ts] supports five formats:

1. **Luna JSON** — native export format
2. **Period Calendar** — "My Calendar" app (Google Play), tab-separated
3. **Clue CSV** — Clue app export
4. **Flo CSV/TXT** — Flo Health export
5. **Apple Health XML** — Apple Health period records

Format is auto-detected. After import, `refreshCycleAnalytics()` is called to compute derived columns and update predictions.

### 5.9 Data Export

The export route [export/route.ts] returns user's cycles as JSON with `format: "luna"`, `version: 1`. Exported fields: mStart, mEnd, ovulationDate, cycleLength, periodLength, notes.

### 5.10 Dashboard

The dashboard [dashboard/page.tsx] is server-rendered with `dynamic = "force-dynamic"`. It uses `predictNextCycle()` for condition-aware predictions and constructs:

- Next period date from last cycle start + predicted cycle length
- Next ovulation date from next period − predicted luteal length (not a hardcoded 14-day offset)
- Ovulation predictions suppressed for hormonal BC users
- Calendar with phase color-coding from actual cycle data + predicted phases for future dates

**Bug fixes applied:** The dashboard previously used `avgCycleLength - 14` for ovulation instead of the luteal phase prediction, ignored user conditions entirely, and had a naive phase forward-fill that could overlap with actual data. All three were fixed [changelog.ts, v0.7.0 entry].

## 6. Experiments and Evaluation

**No experiments have been conducted.** The Luna repository contains:

- No test files (no `*.test.*` files exist)
- No test framework configuration (no Jest, Vitest, or similar in dependencies)
- No benchmark datasets
- No evaluation scripts
- No synthetic or real-world cycle data for validation
- No A/B testing framework
- No prediction accuracy measurement of any kind

The system has been manually tested through the developer's interaction with the running application, but no structured evaluation has been performed. The following specific claims are **unverified**:

- That adaptive exponential smoothing produces more accurate predictions than simple rolling averages for any population
- That condition-specific priors improve cold-start prediction accuracy
- That the jackknife CI provides valid 95% coverage
- That the skip gate correctly distinguishes missed logs from genuine long cycles
- That the 2.5σ outlier threshold is appropriate for any condition
- That the n≥6 blending cutoff is optimal
- That the "highest variance wins" prior resolution strategy is superior to alternatives
- That the system produces clinically useful predictions for any condition

## 7. Results

In the absence of quantitative evaluation, we describe what the system produces and identify what is unverified.

### 7.1 System Outputs

For a user with zero observations and condition "pcos", the system produces:

- Predicted cycle length: 51 days, 95% CI: [21.6, 80.4] days (μ ± 1.96 × 15)
- Predicted period length: 7 days, 95% CI: [3.1, 10.9] days
- Anomaly threshold: 120 days
- AI assistant notes: "highly variable, often anovulatory cycles"

For a user with 6+ observations, the system produces:

- A smoothed point estimate from exponential smoothing
- A jackknife 95% CI
- Condition-aware anomaly flags persisted to the database

For a user on hormonal BC:

- Cycle length prior: 28 ± 1 days
- No follicular/luteal phase predictions
- Ovulation suppressed in dashboard and AI responses
- Anomaly threshold: 35 days

### 7.2 What Remains Unverified

- **Accuracy:** No MAE, RMSE, or CRPS has been computed on any dataset.
- **Calibration:** No calibration plot or Brier score exists. The 95% CI may be overconfident or underconfident.
- **Skip gate performance:** No analysis of false positive rate (flagging genuine long cycles as missed logs) or false negative rate (accepting missed logs as genuine cycles).
- **Prior quality:** The PCOS prior (51 ± 15d) is from a small trial [3]. The MOS2 cohort observed a range of 21–111 days, suggesting the distribution may be bimodal or heavily right-skewed rather than Gaussian. The thyroid and irregular priors have no published quantitative basis at all—they are constructed from directional clinical knowledge [engine.ts, L113–129, L149–164].
- **Jackknife coverage:** No simulation study has assessed whether the jackknife CI achieves nominal 95% coverage given the non-smooth estimator.
- **Real-world usage:** The application has no known users beyond the developer. No data on user retention, prediction satisfaction, or clinical outcomes exists.

## 8. Limitations

### 8.1 Algorithmic Limitations

1. **Gaussian assumption.** The inverse-variance blending and parametric CI assume approximately Gaussian distributions. Menstrual cycle lengths—especially for PCOS and perimenopause—are typically right-skewed [14]. The 1.96σ CI will be asymmetric in reality but is presented symmetrically.

2. **Single-point prior.** The perimenopause prior uses a fixed mean of 45 days, but Holman [11] shows that cycle length varies dramatically over the perimenopausal transition (from ~30d at −4yr to ~80d at −1yr). The prior does not model this temporal evolution.

3. **Condition interaction.** The "highest variance wins" rule for multi-condition users is a heuristic with no empirical support. A user with both endometriosis (short cycles, low variance) and thyroid disorders (long cycles, high variance) receives only the thyroid prior, losing the endometriosis signal entirely.

4. **Anomaly detection inconsistency.** `refreshCycleAnalytics()` uses simple z-scores from sample mean/variance for its second-pass anomaly detection [cycle-tools.ts, L528–541], while the prediction engine uses running variance from exponential smoothing. These two mechanisms can flag different observations.

5. **No missing-data model.** Unlike Clue [4], Luna does not explicitly model the distinction between a missed log and a genuinely long cycle. The skip gate threshold is a hard cutoff, not a probabilistic model of logging behavior.

6. **No phase transition model.** The prediction engine treats cycle length, period length, follicular length, and luteal length as independent metrics, each smoothed separately. In reality, these are coupled: a long follicular phase necessarily shortens the time from ovulation to next period (if cycle length is fixed), and vice versa. The engine does not enforce this constraint.

7. **Jackknife assumptions.** The leave-one-out jackknife assumes the estimator is smooth in each observation. The skip gate and adaptive α introduce discontinuities, potentially invalidating jackknife variance estimates.

### 8.2 Engineering Limitations

1. **No tests.** Zero automated tests exist. Any regression in the prediction engine would be undetected.

2. **Rate limiting is per-process.** In serverless deployments, the in-memory rate limiter [rate-limit.ts] does not share state across instances, allowing rate limit bypass.

3. **No data migration versioning.** Schema changes are applied via `drizzle-kit migrate` with no rollback strategy documented.

4. **Image storage in database.** Uploaded images are stored as base64 in PostgreSQL [schema.ts, uploadedImages], which is inefficient for large volumes and may impact database performance.

5. **Context window constraints.** The chat context assembly (20 recent messages + summary + 6 keyword snippets + 5 Supermemory results) has not been benchmarked for token consumption. For long conversations, the summary alone could consume significant context window space.

6. **Cold-start dependency on self-reported conditions.** The system's predictions depend entirely on the user correctly identifying and reporting their health conditions. Misreporting (e.g., a PCOS user selecting "irregular" instead) produces suboptimal priors.

### 8.3 Evidence Limitations

1. **PCOS prior from small trial.** The Nutrients 2026 trial [3] has small N. The MOS2 cohort provides range data but not a full distribution.

2. **Thyroid and irregular priors have no quantitative basis.** These are constructed from clinical direction ("hypo → longer, hyper → shorter") with interpolated parameters [engine.ts, L113–129, L149–164].

3. **PCOD distinction is not evidence-based.** The PCOD prior is interpolated as a milder PCOS phenotype based on South Asian clinical tradition, not published data [engine.ts, L91–94].

4. **General population prior from a single meta-analysis.** While Najmabadi et al. [1] pooled three cohorts, the representativeness of 581 eumenorrheic women for the global population is debatable.

## 9. Discussion

### 9.1 Comparison with State of the Art

Luna's condition-aware exponential smoothing sits between the simplistic approaches of generic trackers (rolling averages) and the sophisticated probabilistic models of Clue (generalized Poisson) and Natural Cycles (BBT-driven Bayesian inference). Its distinguishing feature is the explicit modeling of condition-specific priors and anomaly thresholds—a dimension that, to our knowledge, no published commercial system addresses publicly.

However, this advantage is theoretical. Without validation, it remains unclear whether condition-specific priors actually improve prediction accuracy in practice. It is plausible that for users with enough observations (n ≥ 6, where the prior fades out entirely), the condition-specific cold-start advantage is irrelevant. The primary benefit may be in anomaly detection: correctly treating a 90-day PCOS cycle as normal rather than a missed log.

### 9.2 The Validation Gap

The most significant limitation of this work is the absence of any empirical evaluation. This is not merely an oversight—the system was developed over 3 days (May 4–6, 2026) as a solo project [changelog.ts], and the priority was functional completeness over statistical rigor. However, the validation gap is not just about accuracy numbers; it affects every design decision:

- Is 2.5σ the right outlier threshold? We do not know.
- Is n≥6 the right blending cutoff? We do not know.
- Does the jackknife CI achieve 95% coverage? We do not know.
- Does the "highest variance wins" rule produce good predictions for multi-condition users? We do not know.

A proper evaluation would require: (a) a labeled dataset of menstrual cycles with ground-truth condition labels, (b) a defined evaluation protocol (e.g., leave-one-cycle-out prediction), (c) comparison against baselines (rolling average, fixed prior, condition-agnostic exponential smoothing), and (d) calibration analysis of confidence intervals. None of this exists.

### 9.3 Ethical Considerations

Luna provides cycle predictions that may influence user behavior (e.g., timing of pregnancy attempts, contraceptive decisions). The application explicitly disclaims medical advice in its AI responses, but the presentation of confidence intervals and specific date predictions may still be interpreted as authoritative. This risk is heightened for the PCOS and perimenopause populations, where predictions are most uncertain and users may be most anxious for guidance.

The use of self-reported conditions—rather than clinical diagnosis—means that the condition-aware predictions may be based on incorrect priors. A user who self-identifies as having PCOS but actually has thyroid dysfunction would receive predictions optimized for the wrong distribution.

### 9.4 What Luna Gets Right

Despite the validation gap, several design choices are defensible on theoretical grounds:

1. **Condition-aware anomaly thresholds.** Treating a 90-day cycle as a missed log for a PCOS user is clearly wrong; the condition-aware threshold directly addresses this.

2. **Inverse-variance blending.** For cold-start users with few observations, incorporating population priors via inverse-variance weighting is statistically principled (it is the optimal linear combination under Gaussian assumptions).

3. **Soft-clamping rather than hard rejection.** Replacing outlier observations with the smoothed value (hard rejection) would discard directional information. The soft-clamp preserves the direction while limiting magnitude.

4. **Separation of concerns.** Cycle data is stored in the database (not in LLM memory), predictions are computed deterministically (not by the LLM), and the LLM is used only for natural language understanding and response generation. This avoids the hallucination and reproducibility problems of LLM-based prediction.

5. **Transparency about uncertainty.** The AI assistant is instructed to acknowledge low confidence for anovulatory conditions and to avoid predicting ovulation for hormonal BC users [route.ts, buildConditionContext()].

## 10. Conclusion

Luna presents a condition-aware approach to menstrual cycle prediction using adaptive exponential smoothing with population priors. The system adjusts its smoothing parameters, anomaly thresholds, and prior blending based on seven health conditions (plus a general-population default), addressing a gap in existing consumer trackers that apply condition-agnostic models.

The algorithm is fully specified and inspectable. Its design choices are defensible on theoretical grounds: inverse-variance blending for cold start, adaptive smoothing rates for non-stationary data, soft-clamping for outlier handling, and condition-aware anomaly thresholds. However, none of these choices have been empirically validated. The system has no automated tests, no benchmark results, no calibration analysis, and no real-world usage data.

The primary contribution of this work is not a validated prediction system but a concrete, open-source specification of how condition-aware menstrual cycle prediction could work. The gap between this specification and a validated system remains substantial. We hope that documenting the algorithm and its limitations transparently will facilitate future evaluation and improvement.

## References

[1] Najmabadi et al. Pooled analysis of 3 prospective cohorts: 581 eumenorrheic women, 3,324 cycles. Cycle length mean 30.3d (SD 6.7), period 6.2d (SD 1.5), follicular 18.5d (SD 6.5), luteal 11.7d (SD 2.8). Cited in Luna source code [engine.ts, L30–38]. Source: Perplexity Deep Research [17]; cross-referenced with ChatGPT [15] and Gemini [16] deep research.

[2] Bull, J.R., et al. Real-world menstrual cycle characteristics of more than 600,000 menstrual cycles. *NPJ Digital Medicine*, 2:83, 2019.

[3] Nutrients 2026 hypocaloric-diet trial. Mean cycle length 51±15d in PCOS vs 30±2d in controls. MOS2 community cohort: range 21–111 days. Cited in Luna source code [engine.ts, L63–78]. Sources: Perplexity Deep Research [17] (primary), cross-referenced with ChatGPT [15] (~40d estimate from criteria) and Gemini [16] (41d from AWHS).

[4] Li, K., et al. Characterizing the physiological and symptom variation of menstrual cycles using a mobile app. *NPJ Digital Medicine*, 3:79, 2020. (Clue methodology.)

[5] Berglund Scherwitzl, E., et al. Perfect-use and typical-use Pearl Index of a contraceptive mobile app. *Contraception*, 96(6):420–425, 2017. (Natural Cycles.)

[6] Flo Health. ML-based cycle prediction. No peer-reviewed algorithmic disclosure as of 2026.

[7] drip — open-source fertility awareness app. https://github.com/drip-app. Rule-based, symptothermal method.

[8] Fukaya, A., et al. State-space modeling of basal body temperature for menstrual cycle phase estimation. *BioMedical Engineering OnLine*, 16:44, 2017.

[9] Guo, Y., et al. A hidden semi-Markov model for menstrual cycle phase duration modeling. *Biometrics*, 76(3):838–849, 2020.

[10] Hyndman, R.J., et al. *Forecasting: Principles and Practice*. 3rd edition, OTexts, 2021.

[11] Holman, D.J. The re-analysis of the Treloar/Tremin dataset: age at menopause and cycle length changes. Perimenopause cycle lengths: −4yr: 30.48d, −3yr: 35.02d, −2yr: 45.15d, −1yr: 80.22d. Cited in Luna source code [engine.ts, L166–182].

[12] Parazzini, F., et al. Short cycles and endometriosis: meta-analysis of 11 case-control studies. Short cycles ≤27d OR 1.22. Cited in Luna source code [engine.ts, L97–110].

[13] RCTs of monophasic 21/7 and 24/4 combined oral contraceptives. Withdrawal bleed 4.4–5.2d (SD 1.5–2.2). Cited in Luna source code [engine.ts, L131–146].

[14] Harlow, S.D., et al. STRAW+ 10 Collaborative Group. Executive summary of the Stages of Reproductive Aging Workshop + 10. *Menopause*, 19(4):387–395, 2012.

[15] ChatGPT Deep Research. "Menstrual Cycle Statistics by Condition." Internal research document (`research/chatgpt-deep-research.md`). Provides mean±SD tables for PCOS, PCOD, endometriosis, thyroid, hormonal BC, irregular cycles, and perimenopause. Most values marked "Low" evidence quality. PCOS cycle length estimated ~40d from diagnostic criteria rather than cohort data. PCOD treated as identical to PCOS. Perimenopause mid-transition ~45d (SD ~20d).

[16] Gemini Deep Research. "Clinical Population Priors and Algorithmic Framework for Adaptive Menstrual Cycle Prediction." Internal research document (`research/gemini-deep-research.md`). Discusses departure from 28-day baseline, condition-aware modeling, and adaptive α parameter tuning. Provides PCOS mean 41d (SD 13.7) from large digital cohort, PCOD mean 72.5d (SD 25) from Indian regional cohort, endometriosis mean 28.3d (SD 3.8). Suggests α inversely proportional to condition SD.

[17] Perplexity Deep Research. Condition-specific priors with quantitative tables and explicit evidence quality ratings. Internal research document (`research/perplexit-deep-research.md`). Najmabadi et al. pooled cohort data for general population. Perimenopause from Holman 2006 (Treloar/Tremin re-analysis) with year-by-year means. PCOS from Nutrients 2026 trial (51±15d) and MOS2 cohort (range 21–111d). Endometriosis: OR data only, no distributional data. Thyroid: no published mean±SD. Highest quality of the three internal research documents.

## Appendix A: Smoothing Constants and Thresholds

| Constant | Value | Source |
|---|---|---|
| ALPHA_MIN | 0.1 | Domain heuristic [engine.ts, L222] |
| ALPHA_MAX | 0.5 | Domain heuristic [engine.ts, L223] |
| KAPPA | 5.0 | MAD scale factor [engine.ts, L224] |
| DEFAULT_SKIP_THRESHOLD | 45 | General-population maximum [engine.ts, L225] |
| OUTLIER_SIGMA | 2.5 | Soft-clamp width [engine.ts, L226] |
| Cold-start α | 0.3 | Default for empty residuals [engine.ts, L231] |
| Prior fade-out | n ≥ 6 | Heuristic cutoff [engine.ts, L243] |
| Variance floor | 4.0 (σ ≥ 2d) | Prevent tight convergence [engine.ts, L288] |
| MAD window | 5 observations | Balance responsiveness/smoothness [engine.ts, L321] |

## Appendix B: Condition Prior Parameters (Full)

| Condition | Cycle μ | Cycle σ² | Period μ | Period σ² | Follicular μ | Follicular σ² | Luteal μ | Luteal σ² | maxCL | Anov |
|---|---|---|---|---|---|---|---|---|---|---|
| none | 30.3 | 44.89 | 6.2 | 2.25 | 18.5 | 42.25 | 12.0 | 7.84 | 45 | No |
| pcos | 51 | 225 | 7 | 4 | 26 | 100 | 13 | 4 | 120 | Yes |
| pcod | 45 | 169 | 6 | 4 | 24 | 81 | 13 | 4 | 120 | Yes |
| endometriosis | 27 | 16 | 7.5 | 4 | 14 | 9 | 12 | 4 | 45 | No |
| thyroid | 35 | 225 | 6 | 4 | 20 | 100 | 12 | 9 | 90 | Yes |
| hormonal_bc | 28 | 1 | 4.5 | 2.25 | — | — | — | — | 35 | Yes |
| irregular | 30 | 225 | 5.5 | 4 | 18 | 100 | 12 | 9 | 90 | Yes |
| perimenopause | 45 | 400 | 6 | 4 | 31 | 225 | 13 | 9 | 120 | Yes |

*Table B1: Full condition prior parameters as defined in [engine.ts, L52–184]. "—" indicates null (not applicable). maxCL = maxCycleLength. Anov = anovulatoryCommon.*

## Appendix C: Implementation Gaps Found and Fixed

Seven implementation bugs were identified and fixed during development:

1. **Dashboard hardcoded ovulation offset.** Ovulation was computed as `avgCycleLength - 14` rather than using the predicted luteal phase length. Fix: `addDays(nextPeriodDate, -Math.round(lutealLength || 14))` [dashboard/page.tsx].

2. **Dashboard ignored user conditions.** Predictions used general-population parameters regardless of the user's condition profile. Fix: conditions are now fetched and passed to `predictNextCycle()` [dashboard/page.tsx].

3. **isAnomaly flag never persisted.** The anomaly detection computed the flag but did not write it to the database. Fix: anomaly flag is now included in the updates map and persisted [cycle-tools.ts, L504–510, L541–547].

4. **predictNextCycle n≥6 path object mutation.** The blended object was mutated in-place, causing confusing behavior when the same object was referenced elsewhere. Fix: return fresh objects from each path [engine.ts, L424–428].

5. **Import route missing refreshCycleAnalytics call.** After bulk-inserting imported cycles, derived columns and predictions were not recomputed. Fix: `refreshCycleAnalytics()` called after import [import/route.ts].

6. **Anomaly residuals deflating MAD.** Gated anomaly observations contributed near-zero residuals to the MAD computation, artificially lowering α and making the smoother unresponsive to genuine regime changes. Fix: only push residuals from non-anomaly observations [engine.ts, L331–338].

7. **Dashboard calendar phase forward-fill overlap.** Naive phase forward-fill from predicted phases could overlap with actual cycle data, producing contradictory calendar markers. Fix: predicted phases are only rendered for future dates beyond the last actual data point [dashboard/page.tsx].

## Appendix D: Version History

The changelog [changelog.ts] documents 18 versions spanning May 4–6, 2026 (58 git commits):

| Version | Date | Type | Description |
|---|---|---|---|
| 0.0.1 | 2026-05-04 | chore | Project initialization |
| 0.1.0 | 2026-05-04 | feat | Landing page with GSAP animations |
| 0.1.1 | 2026-05-04 | feat | Authentication: registration & login |
| 0.1.2 | 2026-05-05 | feat | Dashboard with cycle prediction & calendar |
| 0.2.0 | 2026-05-05 | feat | Chat session management |
| 0.2.1 | 2026-05-05 | docs | Design & product documentation |
| 0.2.2 | 2026-05-05 | feat | Auth session management & sign-out |
| 0.3.0 | 2026-05-05 | feat | Prediction engine & Tailwind setup |
| 0.3.1 | 2026-05-05 | feat | Agent-based NLP tools & OpenUI rendering |
| 0.4.0 | 2026-05-05 | feat | AI chat with context-aware tools & session memory |
| 0.4.1 | 2026-05-05 | fix | AI SDK v6 migration, Supermemory v4 & web search |
| 0.5.0 | 2026-05-05 | feat | Chat rewrite with AI Elements + OpenUI + shadcn |
| 0.5.1 | 2026-05-05 | fix | Chat layout dynamic viewport height |
| 0.5.2 | 2026-05-05 | fix | Chat scroll anchoring, next.config & docs |
| 0.5.3 | 2026-05-05 | chore | Git LFS for large media files |
| 0.6.0 | 2026-05-05 | feat | Onboarding, manual logging, password reset |
| 0.6.1 | 2026-05-05 | fix | Landing page auth redirect for signed-in users |
| 0.6.2 | 2026-05-05 | fix | Period length off-by-one, dashboard count & favicon |
| 0.7.0 | 2026-05-06 | feat | Condition-aware prediction engine & Luna responses |

*Note: package.json reports version 0.6.2; the 0.7.0 changelog entry exists but the package version was not updated.*
