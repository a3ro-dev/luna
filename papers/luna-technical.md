# Luna: Condition-aware menstrual cycle prediction via adaptive exponential smoothing with population priors

**Akshat Singh Kushwaha**

akshatsingh14372@outlook.com · a3ro.dev

---

## Abstract

I present Luna, a web-based menstrual cycle tracking and prediction application that uses adaptive exponential smoothing with condition-specific population priors. Unlike conventional trackers that apply a fixed 28-day default or simple rolling averages, Luna adjusts its smoothing parameters, anomaly thresholds, prior blending, and uncertainty estimates based on the user's self-reported health conditions (PCOS, endometriosis, thyroid disorders, hormonal contraception, perimenopause, among others). The prediction engine computes point estimates and confidence intervals through three regimes: a pure-prior cold start for zero observations, inverse-variance blending for 1-5 observations, and jackknife confidence intervals from exponential smoothing for 6+ observations. Anomaly detection uses a two-stage skip gate: a condition-aware maximum-cycle-length threshold followed by a 2.5σ outlier soft-clamp. The system has not been validated on real-world data. There is no automated test suite and no published accuracy metrics. This paper describes the algorithm and architecture with full transparency about what remains unverified.

## 1. Introduction

Menstrual cycle tracking is a widespread practice, with dozens of mobile applications serving hundreds of millions of users. Despite this scale, most trackers employ simple predictive strategies--rolling averages of the last *N* cycles, fixed 28-day defaults, or undisclosed proprietary models--that fail to account for the substantial heterogeneity in cycle patterns across different health conditions [1][2]. A user with polycystic ovary syndrome (PCOS), whose cycle length may range from 21 to 111 days [3], receives the same predictive framework as a user with regular 28-day cycles.

This paper describes Luna (v0.7.0), an open-source menstrual cycle tracker that takes a different approach: condition-aware adaptive exponential smoothing. The system adjusts its core parameters--smoothing rate, anomaly thresholds, population priors, uncertainty estimates--based on the user's self-reported health conditions. The algorithm is fully deterministic and inspectable: all parameters and decision boundaries are specified in a single source file ([engine.ts, L1-442](../src/lib/prediction/engine.ts#L1-L442)).

Luna is a functional web application built on Next.js 16.2.4 with a conversational AI interface. It has not undergone clinical validation, has no automated test suite, and has no published accuracy benchmarks. I present the system as-is, documenting what it does and the evidence behind its design choices, with full transparency about what remains unverified.

## 2. Background and related work

### 2.1 Commercial cycle trackers

**Clue** is the most methodologically sophisticated published commercial system. It uses probabilistic forecasting with population-informed priors and generalized Poisson models, explicitly modeling the distinction between missing logs and true long cycles [4]. Clue reports MAE, CRPS, Brier score, and calibration metrics. No public PCOS-specific model has been disclosed.

**Natural Cycles** is the only FDA-cleared contraceptive app, validated on >22,000 women and >224,000 cycles using basal body temperature (BBT)-driven fertility awareness with statistical inference [5]. It uses the Pearl Index for contraceptive effectiveness and expands unsafe days when uncertain. It is the most clinically rigorous tracker but does not publicly disclose a PCOS engine.

**Flo Health** uses ML-based personalization with neural-network forecasting [6]. Its algorithm is proprietary and has no peer-reviewed disclosure. Flo widens the fertile window under irregularity, but no open calibration benchmarks exist.

**drip** is an open-source symptothermal/rule-based fertility awareness app [7]. It uses deterministic rules rather than probabilistic forecasting, has no population priors, no uncertainty estimation, and no PCOS handling.

**Generic GitHub trackers** typically use arithmetic mean or rolling average of the last *N* cycles, fixed 28-day defaults, no condition awareness, no uncertainty quantification, and assume stationary cycle length.

### 2.2 Academic methods

Fukaya et al. proposed a state-space BBT model using Bayesian filtering for menstrual cycle phase estimation [8]. Hidden semi-Markov models (HSMMs) have been explored for phase-based duration modeling [9]. These approaches offer richer probabilistic frameworks but nobody has adopted them in consumer applications--likely because they're harder to implement and need more data than most users have.

Adaptive exponential smoothing--the method Luna uses--has a long history in time-series forecasting [10] but is surprisingly underexplored for menstrual cycle prediction. That's odd, because the domain is a natural fit: small sample sizes, non-stationary distributions, and a need for graceful handling of outliers and missing data.

### 2.3 Condition-specific cycle data

Table 1 summarizes the published evidence for cycle parameters across conditions.

| Condition | Cycle Length (mean±SD) | Source | N |
|---|---|---|---|
| General population | 30.3 ± 6.7 d | Najmabadi et al. [1] | 581 women, 3,324 cycles |
| PCOS | 51 ± 15 d | Nutrients 2026 trial [3] | Small N (trial cohort) |
| PCOS range | 21-111 d | MOS2 community cohort [3] | Community sample |
| Perimenopause (-4yr) | ~30 d | Holman 2006 [11] | Treloar/Tremin re-analysis |
| Perimenopause (-2yr) | ~45 d | Holman 2006 [11] | Treloar/Tremin re-analysis |
| Perimenopause (-1yr) | ~80 d | Holman 2006 [11] | Treloar/Tremin re-analysis |
| Endometriosis | ≤27d over-represented (OR 1.22) | Meta-analysis, 11 studies [12] | Case-control |
| Hormonal BC (monophasic) | 28 d (regimen-driven) | RCTs of 21/7, 24/4 pills [13] | RCT cohorts |
| Thyroid (hypo/hyper) | No published mean±SD | Directional data only | — |
| Irregular (idiopathic) | No published mean±SD | — | — |

*Table 1: Published evidence for condition-specific cycle parameters. Thyroid and idiopathic irregular conditions lack quantitative priors in the literature.*

## 3. Problem statement

Conventional menstrual cycle trackers suffer from interrelated shortcomings:

1. Fixed population priors (typically μ=28, σ≈2-4 days) produce misleading predictions for users whose cycle distributions differ substantially from the general population--most notably users with PCOS, perimenopause, or thyroid disorders.

2. Without condition-aware thresholds, a 60-day cycle is flagged as a "missed log" for a general-population user but may be entirely normal for a PCOS user. Misclassifying a genuine long cycle as a data gap corrupts the smoothing state.

3. Simple rolling averages provide no confidence intervals, leaving users unable to assess prediction reliability. This matters most during cold start (few observations) and for high-variance conditions.

Luna addresses these by making the prediction engine condition-aware at every layer: priors, smoothing, anomaly detection, and uncertainty estimation.

## 4. Methodology and system design

### 4.1 Population priors

The general population prior derives from Najmabadi et al. [1], who pooled three prospective cohorts of 581 eumenorrheic women across 3,324 cycles ([engine.ts, L33-38](../src/lib/prediction/engine.ts#L33-L38)):

| Parameter | Mean | Variance | σ |
|---|---|---|---|
| cycleLength | 30.3 | 44.89 | 6.7 d |
| periodLength | 6.2 | 2.25 | 1.5 d |
| follicularLength | 18.5 | 42.25 | 6.5 d |
| lutealLength | 11.7 | 7.84 | 2.8 d |

Ten condition-specific priors extend this baseline: `none`, `pcos`, `pcod`, `endometriosis`, `thyroid`, `hormonal_bc`, `irregular`, `perimenopause`, `perimenopause_early`, `perimenopause_late` ([engine.ts, L52-230](../src/lib/prediction/engine.ts#L52-L230)). Each specifies cycle length, period length, follicular length, and luteal length (mean and variance), a maximum cycle length threshold, whether anovulation is common, and a human-readable note for the AI assistant.

Condition priors:

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
| perimenopause_early | 30 | 8 | 60 | No |
| perimenopause_late | 80 | 30 | 180 | Yes |

*The `perimenopause` key is a backward-compatibility alias. New users select `perimenopause_early` or `perimenopause_late` directly, corresponding to ~-4yr to -2yr and ~-2yr to -1yr before the final menstrual period respectively (Holman 2006) ([engine.ts, L195-230](../src/lib/prediction/engine.ts#L195-L230)).*

*PCOD is treated as a milder phenotype of PCOS following South Asian clinical tradition, with interpolated parameters (slightly shorter mean, slightly lower variance). No separate quantitative data distinguishes PCOD from PCOS in peer-reviewed literature ([engine.ts, L81-95](../src/lib/prediction/engine.ts#L81-L95); see note at [L91-94](../src/lib/prediction/engine.ts#L91-L94)).*

*Hormonal BC sets follicularLength and lutealLength to null, as ovulation is suppressed and these phases do not exist ([engine.ts, L137-138](../src/lib/prediction/engine.ts#L137-L138)).*

### 4.2 Prior resolution

When a user has multiple conditions, `resolveEffectivePrior()` ([engine.ts, L332-358](../src/lib/prediction/engine.ts#L332-L358)) computes an effective prior using inverse-variance weighted mixture blending:

1. If `hormonal_bc` is present, use the hormonal BC prior (cycle mechanics are fundamentally altered).

2. Otherwise, compute an inverse-variance weighted mixture of all active condition priors for each metric independently:
   - `blended_mean = Σ(w_i * μ_i) / Σ(w_i)`, where `w_i = 1/σ²_i`
   - `blended_variance = 1 / Σ(w_i) + Σ(w_i * (μ_i - blended_mean)²) / Σ(w_i)` (accounts for between-condition spread)

3. `maxCycleLength` = MAX across all active conditions (widest safe gate).
4. `anovulatoryCommon` = OR across all active conditions.

NOTE: The mixture assumes approximate Gaussianity and may underestimate tails for heavily right-skewed conditions like PCOS.

5. Empty conditions or `"none"` fall back to the general population prior.

The previous approach used a "highest variance wins" heuristic, which discarded lower-variance conditions entirely. The inverse-variance mixture is more principled: it weights each condition by `1/σ²`, so tighter estimates contribute more to the blended mean, while the between-condition spread term ensures the blended variance reflects the full uncertainty. A user with both endometriosis and thyroid disorders now receives a blended mean between the two condition means, with variance that accounts for both within-condition uncertainty and the spread between the two condition means.

### 4.3 Adaptive exponential smoothing

The core smoother `exponentialSmooth()` ([engine.ts, L299-341](../src/lib/prediction/engine.ts#L299-L341)) iterates observations from oldest to newest:

**Initialization:**

$$\hat{x}_0 = x_0, \quad \sigma^2_0 = 0$$

**For each subsequent observation** $x_i$:

1. **Skip gate** (§4.4): apply anomaly detection to obtain gated value $\tilde{x}_i$.

2. Compute adaptive α from the last 5 residuals' mean absolute deviation (MAD):

$$\alpha = \alpha_{\min} + (\alpha_{\max} - \alpha_{\min}) \cdot \frac{\text{MAD}}{\text{MAD} + \kappa}$$

where $\alpha_{\min} = 0.1$, $\alpha_{\max} = 0.5$, $\kappa = 5.0$ ([engine.ts, L222-224](../src/lib/prediction/engine.ts#L222-L224)). For empty residuals, α defaults to 0.3 ([engine.ts, L231](../src/lib/prediction/engine.ts#L231)).

3. Update variance and smoothed value:

$$\sigma^2_i = (1 - \alpha)(\sigma^2_{i-1} + \alpha \cdot d_i^2)$$

$$\hat{x}_i = \hat{x}_{i-1} + \alpha \cdot d_i$$

where $d_i = \tilde{x}_i - \hat{x}_{i-1}$.

4. Only non-anomaly observations contribute residuals to the MAD computation. Anomaly-gated observations produce $d_i \approx 0$, which would artificially deflate MAD and lock α low, making the smoother unresponsive to genuine regime changes ([engine.ts, L331-338](../src/lib/prediction/engine.ts#L331-L338)).

Adaptive α lets the smoother respond quickly when recent observations are highly variable (large MAD → α approaches 0.5) and stabilize when observations are consistent (small MAD → α approaches 0.1). The MAD window of 5 observations balances responsiveness and smoothness. I chose exponential smoothing over richer probabilistic models because it's simple, interpretable, and works well with small samples. Bayesian approaches might perform better with enough data, but they'd be harder to debug--and debugging is already a challenge given the lack of automated tests.

### 4.4 Skip gate and anomaly detection

The skip gate `skipGate()` ([engine.ts, L273-296](../src/lib/prediction/engine.ts#L273-L296)) applies a two-stage test:

**Stage 1 -- Maximum cycle length threshold:**

$$\text{if } x_i > T_{\text{max}}(\text{conditions}): \quad \tilde{x}_i = \hat{x}_{i-1}, \quad \text{isAnomaly} = \text{true}$$

where $T_{\text{max}}$ is the condition-specific `maxCycleLength` (e.g., 120 for PCOS, 45 for general population) ([engine.ts, L279-282](../src/lib/prediction/engine.ts#L279-L282)).

**Stage 2 -- Outlier soft-clamp:**

$$\text{if } |d_i| > 2.5 \cdot \sigma: \quad \tilde{x}_i = \hat{x}_{i-1} + \text{sign}(d_i) \cdot 2.5 \cdot \sigma, \quad \text{isAnomaly} = \text{true}$$

where σ is floored at 2.0 days ($\sigma^2 \geq 4.0$) to prevent tight convergence from flagging normal variation ([engine.ts, L288](../src/lib/prediction/engine.ts#L288)).

The soft-clamp preserves the direction of the outlier while limiting its influence, rather than discarding it entirely. I prefer this over hard rejection because it retains directional information. The σ floor prevents the pathological case where a long series of identical observations drives variance to zero, causing the next normal fluctuation to be flagged as anomalous.

The 2.5σ threshold is a domain-specific heuristic, not derived from any theoretical framework. I picked it because it's a common outlier boundary in practice, but I have no sensitivity analysis to back it up [unverified].

### 4.5 Prior blending

`blendWithPrior()` ([engine.ts, L236-270](../src/lib/prediction/engine.ts#L236-L270)) handles the cold-start and warm-start regimes:

- For n ≥ 6 observations, return user data unchanged (prior fades out completely).

- For n < 6 observations, use inverse-variance blending with the condition-specific prior:

$$w_{\text{prior}} = \frac{1}{\sigma^2_{\text{prior}}}, \quad w_{\text{user}} = \begin{cases} \frac{1}{\max(\sigma^2_{\text{user}}, 0.01)} & \text{if } n > 0 \\ 0 & \text{if } n = 0 \end{cases}$$

$$\mu_{\text{blended}} = \frac{w_{\text{prior}} \cdot \mu_{\text{prior}} + w_{\text{user}} \cdot \mu_{\text{user}}}{w_{\text{prior}} + w_{\text{user}}}$$

$$\sigma^2_{\text{blended}} = \frac{1}{w_{\text{prior}} + w_{\text{user}}}$$

The condition-specific prior is used if available; otherwise the general population prior is the fallback ([engine.ts, L246-261](../src/lib/prediction/engine.ts#L246-L261)).

The cutoff at n=6 is a heuristic. Six observations felt like enough to start trusting the user's own data over the prior, but I have no statistical argument for this specific number. The inverse-variance blending is theoretically sound for Gaussian distributions, but menstrual cycle lengths are not Gaussian--especially for conditions like PCOS where distributions are right-skewed with heavy tails [unverified].

### 4.6 Prediction output

`predictNextCycle()` ([engine.ts, L384-442](../src/lib/prediction/engine.ts#L384-L442)) produces a point estimate and 95% confidence interval through three regimes:

| Regime | Condition | Point Estimate | 95% CI |
|---|---|---|---|
| Cold start | n = 0 | Condition-prior mean | μ ± 1.96σ (prior) |
| Warm start | 1 ≤ n ≤ 5 | Blended mean (§4.5) | μ_blended ± 1.96σ_blended |
| Mature | n ≥ 6 | Smoothed value (§4.3) | Jackknife CI (§4.7) |

### 4.7 Jackknife confidence intervals

For n ≥ 6 observations, `calculateJackknifeCI()` ([engine.ts, L344-381](../src/lib/prediction/engine.ts#L344-381)) computes a leave-one-out jackknife:

1. Compute full smoothed estimate $\hat{\theta}$ on all n observations.

2. For each $i \in \{1, \ldots, n\}$, compute $\hat{\theta}_{(i)}$ by running exponential smoothing on the dataset with observation $i$ omitted.

3. Compute jackknife mean: $\bar{\theta}_{(\cdot)} = \frac{1}{n}\sum_{i=1}^{n} \hat{\theta}_{(i)}$

4. Compute jackknife variance: $\hat{\sigma}^2_J = \frac{n-1}{n} \sum_{i=1}^{n} (\hat{\theta}_{(i)} - \bar{\theta}_{(\cdot)})^2$

5. 95% CI: $\hat{\theta} \pm 1.96 \sqrt{\hat{\sigma}^2_J}$

The jackknife assumes that the estimator is approximately smooth in each observation. For exponential smoothing with a skip gate and adaptive α, the estimator is piecewise-smooth--removing an observation can change which observations get flagged as anomalies, creating discontinuities. The jackknife CI may therefore be overconfident or underconfident depending on the data [inference]. No simulation study has assessed coverage [unverified].

## 5. Implementation details

### 5.1 Technology stack

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

### 5.2 Database schema

Eight tables are defined in [schema.ts](../src/lib/db/schema.ts):

| Table | Columns | Notes |
|---|---|---|
| `users` | id, email, passwordHash, conditions (jsonb), plan | conditions = array of condition strings |
| `cycles` | id, userId, mStart, mEnd, ovulationDate, cycleLength, periodLength, follicularLength, lutealLength, isAnomaly, notes (jsonb) | Derived columns recomputed on every cycle write |
| `prediction_params` | id, userId, paramName, smoothedValue, variance, sampleCount | One row per (userId, metric); unique on (userId, paramName) |
| `ai_traces` | id, userId, model, inputTokens, outputTokens, costUsd, latencyMs, feature | Every AI response logged |
| `chat_sessions` | id, userId, title, createdAt, updatedAt | — |
| `chat_messages` | id, sessionId, userId, role, parts (jsonb), textContent | parts = UIMessage parts array |
| `chat_summaries` | id, sessionId, userId, summary, messageCount | Auto-generated after 30+ messages |
| `uploaded_images` | id, userId, imageData (base64), mediaType, expiresAt | 7-day retention |

The `cycles.notes` column is jsonb storing symptom/note entries per cycle. Period length uses inclusive day count: `diffInDays(mStart, mEnd) + 1` ([cycle-tools.ts, L465-467](../src/lib/cycle-tools.ts#L465-L467)).

### 5.3 Cycle analytics pipeline

`refreshCycleAnalytics()` ([cycle-tools.ts, L421-575](../src/lib/cycle-tools.ts#L421-L575)) is the central data pipeline, invoked after every cycle write:

1. Fetch all cycles for the user, ordered by mStart ascending.

2. First pass: compute derived columns (cycleLength, periodLength, follicularLength, lutealLength). Anomaly flags are not set in this pass.

3. Second pass: run the prediction engine's `skipGate()` over cycles in chronological order, mirroring the `exponentialSmooth` update logic so the running smoothed value and variance stay in sync. The `isAnomaly` flag is set solely by `skipGate()` ([cycle-tools.ts, L513-582](../src/lib/cycle-tools.ts#L513-L582)).

4. Persist changes to DB (isAnomaly flag + derived columns).

5. Call `refreshPredictionParam()` for each metric (cycle_length, period_length, follicular, luteal), which runs exponential smoothing + prior blending and upserts the result to prediction_params.

The anomaly detection in `refreshCycleAnalytics` now delegates entirely to the prediction engine's `skipGate()`, ensuring the DB `isAnomaly` flags match exactly what the prediction engine used when computing smoothed values. Previously, there was a separate z-score-based anomaly detector that could flag different observations, creating inconsistent state.

### 5.4 AI chat interface

The chat route ([route.ts](../src/app/api/chat/route.ts)) implements a conversational interface with 10 AI tools:

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

Context assembly for each message ([route.ts, L109-115](../src/app/api/chat/route.ts#L109-L115) and [L234-254](../src/app/api/chat/route.ts#L234-L254)):

- Recent 20 messages from current session

- Latest summary (auto-generated at 30+ messages, delta 12+ since last summary)

- Keyword snippets: extract up to 6 keywords from the latest user message, retrieve up to 6 matching historical messages via ILIKE

- Supermemory recall: top 5 personal facts relevant to the query

Model configuration ([models.ts](../src/lib/chat/models.ts)): All plan tiers (free, premium, premium+) use the same model (`x-ai/grok-4.3`) with the same `maxSteps(10)`. The only difference is the persona prompt appended to the system prompt. Cost: $1.25/M input tokens, $2.50/M output tokens, logged to ai_traces after every response ([route.ts, L813-823](../src/app/api/chat/route.ts#L813-L823)).

Date handling in cycle tools supports natural language input via `normalizeDateInput()` ([cycle-tools.ts, L184-261](../src/lib/cycle-tools.ts#L184-L261)): "today", "yesterday", "May 3", "1/15/2025", ISO dates, and more. All timezone-aware via Intl.DateTimeFormat.

### 5.5 Structured response rendering

The AI assistant can produce structured responses in OpenUI DSL (a domain-specific language where responses start with `root = Card(...)`). Detection uses `looksLikeOpenUiLang()`, which checks if the text starts with `root =` ([openui.ts, L1-4](../src/lib/chat/openui.ts#L1-L4)). This gates rendering of prediction cards, cycle tables, and statistical summaries as rich UI components rather than plain text.

### 5.6 Authentication

Auth.js v5 with Credentials provider only (email + password), JWT strategy (7-day maxAge), bcryptjs password hashing ([auth.ts](../src/auth.ts)). User existence is verified on every JWT refresh callback, forcing re-authentication if the user has been deleted ([auth.ts, L44-49](../src/auth.ts#L44-L49)).

### 5.7 Rate limiting

In-memory sliding-window counter, per-process only ([rate-limit.ts](../src/lib/rate-limit.ts)). A 5-minute cleanup interval prevents memory leaks. In serverless deployments with multiple instances, rate limits apply per-instance, not globally. An attacker can bypass limits by distributing requests across instances.

### 5.8 Data import

The import route ([import/route.ts](../src/app/api/data/import/route.ts)) supports five formats:

1. Luna JSON -- native export format

2. Period Calendar -- "My Calendar" app (Google Play), tab-separated

3. Clue CSV -- Clue app export

4. Flo CSV/TXT -- Flo Health export

5. Apple Health XML -- Apple Health period records

Format is auto-detected. After import, `refreshCycleAnalytics()` is called to compute derived columns and update predictions.

### 5.9 Data export

The export route ([export/route.ts](../src/app/api/data/export/route.ts)) returns user's cycles as JSON with `format: "luna"`, `version: 1`. Exported fields: mStart, mEnd, ovulationDate, cycleLength, periodLength, notes.

### 5.10 Dashboard

The dashboard ([dashboard/page.tsx](../src/app/(app)/dashboard/page.tsx)) is server-rendered with `dynamic = "force-dynamic"`. It uses `predictNextCycle()` for condition-aware predictions and constructs:

- Next period date from last cycle start + predicted cycle length

- Next ovulation date from next period - predicted luteal length (not a hardcoded 14-day offset)

- Ovulation predictions suppressed for hormonal BC users

- Calendar with phase color-coding from actual cycle data + predicted phases for future dates

The dashboard previously used `avgCycleLength - 14` for ovulation instead of the luteal phase prediction, ignored user conditions entirely, and had a naive phase forward-fill that could overlap with actual data. All three were fixed ([changelog.ts](../src/lib/changelog.ts), v0.7.0 entry).

### 5.11 Third-party infrastructure and data handling

Luna depends on three external services, each of which receives and processes user data. This section documents what each service receives, how it handles that data, and what the privacy implications are.

#### Neon (database)

All structured user data -- cycle records, prediction parameters, chat messages, AI traces, user accounts -- is stored in PostgreSQL hosted by Neon ([db/index.ts](../src/lib/db/index.ts)). Luna uses the Neon serverless HTTP driver (`@neondatabase/serverless`) with `fetchOptions: { cache: 'no-store' }` to prevent Vercel from caching query results.

Neon runs on AWS (8 regions across 4 continents). Each project is locked to a single region at creation time. Neon holds SOC 2 Type II, ISO/IEC 27001:2022, and ISO/IEC 27701:2019 certifications. Data is encrypted at rest with AES-256 and in transit with TLS 1.2+. Key management uses AWS KMS. They explicitly state they do not sell personal data. The core storage engine is open source under Apache 2.0 ([github.com/neondatabase/neon](https://github.com/neondatabase/neon), ~22k stars).

Two things to watch. First, Neon was acquired by Databricks in May 2025. Privacy policy and terms of use links now redirect to `databricks.com/legal/`, meaning user data is governed under Databricks' broader legal framework. The implications of cross-entity data access within Databricks have not been assessed. Second, HIPAA compliance is only available on the Scale plan (~$700/month typical), which Luna does not use. Luna's Neon database is therefore not HIPAA-compliant, even though it stores health-adjacent data (cycle records, health conditions).

#### Supermemory (AI memory)

Luna uses Supermemory's v4 API for persistent personal facts that persist across chat sessions. Two endpoints are used:

- `POST https://api.supermemory.ai/v4/search` -- semantic recall of stored facts, scoped per user via `containerTag: userId`, limited to top 5 results ([route.ts, L54-66](../src/app/api/chat/route.ts#L54-L66))
- `POST https://api.supermemory.ai/v4/memories` -- storing new facts, with `isStatic` flag for permanent vs. evolving facts ([route.ts, L87-95](../src/app/api/chat/route.ts#L87-L95))

Luna stores only personal profile facts (health conditions, preferences, recurring patterns) in Supermemory. Cycle data stays in the Neon database. Chat messages stay in the Neon database. The `containerTag` parameter isolates each user's memories from other users'.

Supermemory runs on Timescale (database) and Cloudflare (compute/CDN). They claim SOC 2, HIPAA, and GDPR compliance, but no public audit reports, DPAs, or BAAs are available for verification. Their privacy policy discloses that content may be sent to OpenAI and Google Gemini when AI features are used, though it is unclear whether this applies to the core embedding/search pipeline or only to optional AI-powered extraction. Encryption at rest is not explicitly documented in their public privacy policy. The privacy contact is the founder's personal email. The core engine is open source under MIT ([github.com/supermemoryai/supermemory](https://github.com/supermemoryai/supermemory), ~22k stars).

#### HackClub (AI proxy and web search)

Luna routes all LLM calls and web searches through HackClub's infrastructure:

- **AI proxy** (`https://ai.hackclub.com/proxy/v1`) -- chat completions via `x-ai/grok-4.3`, session rename via `~anthropic/claude-haiku-latest` ([route.ts, L42-45](../src/app/api/chat/route.ts#L42-L45))
- **Search API** (`https://search.hackclub.com/res/v1/web/search`) -- web search via Brave Search ([route.ts, L509-516](../src/app/api/chat/route.ts#L509-L516))

HackClub is a US 501(c)(3) nonprofit (EIN: 81-2908499) that provides free AI and search services to its community. The AI proxy forwards prompts to OpenRouter, which routes them to the actual model providers. The search API forwards queries to Brave Search.

The critical privacy concern: HackClub's AI proxy logs every prompt and every response in full (`request` and `response` jsonb fields in a `request_logs` table), linked to user ID, Slack ID, and IP address. The search API logs full query parameters and all request headers (not sanitized to a safe list, unlike the AI proxy). There is no documented retention period, no automatic deletion, and no service-specific privacy notice. The general HackClub privacy policy does not address prompt/response logging or upstream data processing by OpenRouter/Brave.

This means every message a Luna user sends to the AI assistant -- which may contain health information, symptom descriptions, cycle details -- is stored in HackClub's database indefinitely, linked to identity. The data also passes through OpenRouter (and their sub-providers like xAI, Anthropic), each of which has their own data handling policies.

All HackClub code is open source ([github.com/hackclub/ai](https://github.com/hackclub/ai), [github.com/hackclub/search](https://github.com/hackclub/search)), so the logging behavior is verifiable. But it is not optional.

#### Data flow summary

| Data type | Stored in | Also processed by | Logging concerns |
|---|---|---|---|
| Cycle records, predictions | Neon (AWS) | -- | SOC 2/ISO audited; no HIPAA on Luna's plan |
| Chat messages | Neon (AWS) | HackClub AI proxy → OpenRouter → xAI/Anthropic | Full prompt+response logged by HackClub; upstream provider policies apply |
| Personal facts ("remember I have PCOS") | Supermemory (Timescale/Cloudflare) | Possibly OpenAI/Gemini for AI features | No at-rest encryption documented; no public audit reports |
| Web search queries | -- | HackClub Search → Brave | Full query+headers logged by HackClub; Brave's privacy policy applies |
| User auth credentials | Neon (AWS) | -- | bcryptjs hashed; never sent to other services |

The fundamental tension: Luna is an open-source app that stores health-adjacent data, but it relies on infrastructure operated by parties who either (a) do not provide HIPAA-level guarantees on Luna's current plan (Neon), (b) are early-stage without public audit reports (Supermemory), or (c) log all AI interactions indefinitely without a service-specific privacy policy (HackClub). Self-hosting with replacement infrastructure is the only path to full data control.

## 6. Experiments and evaluation

**No experiments have been conducted.** The Luna repository contains:

- No test files (no `*.test.*` files exist)

- No test framework configuration (no Jest, Vitest, or similar in dependencies)

- No benchmark datasets

- No evaluation scripts

- No synthetic or real-world cycle data for validation

- No A/B testing framework

- No prediction accuracy measurement of any kind

The system has been manually tested through my own interaction with the running application, but no structured evaluation has been performed. The following specific claims are **unverified**:

- That adaptive exponential smoothing produces more accurate predictions than simple rolling averages for any population

- That condition-specific priors improve cold-start prediction accuracy

- That the jackknife CI provides valid 95% coverage

- That the skip gate correctly distinguishes missed logs from genuine long cycles

- That the 2.5σ outlier threshold is appropriate for any condition

- That the n≥6 blending cutoff is optimal

- That the "highest variance wins" prior resolution strategy is superior to alternatives

- That the system produces clinically useful predictions for any condition

## 7. Results

In the absence of quantitative evaluation, I describe what the system produces and identify what is unverified.

### 7.1 System outputs

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

### 7.2 What remains unverified

Accuracy: No MAE, RMSE, or CRPS has been computed on any dataset.

Calibration: No calibration plot or Brier score exists. The 95% CI may be overconfident or underconfident.

Skip gate performance: No analysis of false positive rate (flagging genuine long cycles as missed logs) or false negative rate (accepting missed logs as genuine cycles).

Prior quality: The PCOS prior (51 ± 15d) is from a small trial [3]. The MOS2 cohort observed a range of 21-111 days, suggesting the distribution may be bimodal or heavily right-skewed rather than Gaussian. The thyroid and irregular priors have no published quantitative basis at all--they are constructed from directional clinical knowledge ([engine.ts, L113-129](../src/lib/prediction/engine.ts#L113-L129) and [L149-164](../src/lib/prediction/engine.ts#L149-L164)).

Jackknife coverage: No simulation study has assessed whether the jackknife CI achieves nominal 95% coverage given the non-smooth estimator.

Real-world usage: The application has no known users beyond the developer. No data on user retention, prediction satisfaction, or clinical outcomes exists.

## 8. Limitations

### 8.1 Algorithmic limitations

1. The inverse-variance blending and parametric CI assume approximately Gaussian distributions. Menstrual cycle lengths--especially for PCOS and perimenopause--are typically right-skewed [14]. The 1.96σ CI will be asymmetric in reality but is presented symmetrically.

2. The perimenopause sub-priors (`perimenopause_early` μ=30d and `perimenopause_late` μ=80d) better capture the temporal evolution described by Holman [11], but the user must self-select which stage they are in. Users who select incorrectly get a poor prior. The legacy `perimenopause` fallback (μ=45d) still lacks this temporal structure.

3. The inverse-variance mixture for multi-condition users assumes approximate Gaussianity and may underestimate tails for heavily right-skewed conditions like PCOS, where the true distribution has a long right tail. Users with bimodal condition combinations (e.g. endometriosis + thyroid) receive a blended mean between the two modes, which may not match either well.

4. Unlike Clue [4], Luna does not explicitly model the distinction between a missed log and a genuinely long cycle. The skip gate threshold is a hard cutoff, not a probabilistic model of logging behavior. I acknowledge this is a weaker approach.

6. The prediction engine treats cycle length, period length, follicular length, and luteal length as independent metrics, each smoothed separately. In reality, these are coupled: a long follicular phase necessarily shortens the time from ovulation to next period (if cycle length is fixed), and vice versa. The engine does not enforce this constraint.

7. The leave-one-out jackknife assumes the estimator is smooth in each observation. The skip gate and adaptive α introduce discontinuities, potentially invalidating jackknife variance estimates.

### 8.2 Engineering limitations

1. Zero automated tests exist. Any regression in the prediction engine would go undetected.

2. In serverless deployments, the in-memory rate limiter ([rate-limit.ts](../src/lib/rate-limit.ts)) does not share state across instances, allowing rate limit bypass.

3. Schema changes are applied via `drizzle-kit migrate` with no rollback strategy documented.

4. Uploaded images are stored as base64 in PostgreSQL ([schema.ts](../src/lib/db/schema.ts), uploadedImages table), which is inefficient for large volumes and may impact database performance.

5. The chat context assembly (20 recent messages + summary + 6 keyword snippets + 5 Supermemory results) has not been benchmarked for token consumption. For long conversations, the summary alone could consume significant context window space.

6. The system's predictions depend entirely on the user correctly identifying and reporting their health conditions. Misreporting (e.g., a PCOS user selecting "irregular" instead) produces suboptimal priors.

7. Health-adjacent data is stored on infrastructure that does not provide HIPAA-level guarantees. Neon's HIPAA compliance requires the Scale plan. Supermemory claims HIPAA compliance but provides no public BAA. HackClub logs all AI prompts and responses indefinitely without a service-specific privacy policy. For a menstrual cycle tracker that handles health conditions and symptom descriptions, this is a meaningful gap between the sensitivity of the data and the protections around it (see §5.11).

### 8.3 Evidence limitations

1. The Nutrients 2026 trial [3] has small N. The MOS2 cohort provides range data but not a full distribution.

2. Thyroid and irregular priors have no quantitative basis. They are constructed from clinical direction ("hypo → longer, hyper → shorter") with interpolated parameters ([engine.ts, L113-129](../src/lib/prediction/engine.ts#L113-L129) and [L149-164](../src/lib/prediction/engine.ts#L149-L164)).

3. The PCOD prior is interpolated as a milder PCOS phenotype based on South Asian clinical tradition, not published data ([engine.ts, L91-94](../src/lib/prediction/engine.ts#L91-L94)).

4. While Najmabadi et al. [1] pooled three cohorts, the representativeness of 581 eumenorrheic women for the global population is debatable.

## 9. Discussion

### 9.1 Comparison with state of the art

Luna's condition-aware exponential smoothing sits between the simplistic approaches of generic trackers (rolling averages) and the sophisticated probabilistic models of Clue (generalized Poisson) and Natural Cycles (BBT-driven Bayesian inference). What distinguishes it is the explicit modeling of condition-specific priors and anomaly thresholds--a dimension that, to my knowledge, no published commercial system addresses publicly.

But this advantage is theoretical. Without validation, it remains unclear whether condition-specific priors actually improve prediction accuracy in practice. It is plausible that for users with enough observations (n ≥ 6, where the prior fades out entirely), the condition-specific cold-start advantage is irrelevant. The primary benefit may be in anomaly detection: correctly treating a 90-day PCOS cycle as normal rather than a missed log.

### 9.2 The validation gap

The biggest limitation of this work is the absence of any empirical evaluation. The system was developed over 3 days (May 4-6, 2026) as a solo project ([changelog.ts](../src/lib/changelog.ts)), and the priority was functional completeness over statistical rigor. But the validation gap goes beyond accuracy numbers; it affects every design decision:

- Is 2.5σ the right outlier threshold? I don't know.

- Is n≥6 the right blending cutoff? I don't know.

- Does the jackknife CI achieve 95% coverage? I don't know.

- Does the "highest variance wins" rule produce good predictions for multi-condition users? I don't know.

A proper evaluation would require: (a) a labeled dataset of menstrual cycles with ground-truth condition labels, (b) a defined evaluation protocol (e.g., leave-one-cycle-out prediction), (c) comparison against baselines (rolling average, fixed prior, condition-agnostic exponential smoothing), and (d) calibration analysis of confidence intervals. None of this exists.

### 9.3 Ethical considerations

Luna provides cycle predictions that may influence user behavior (e.g., timing of pregnancy attempts, contraceptive decisions). The application explicitly disclaims medical advice in its AI responses, but the presentation of confidence intervals and specific date predictions may still be interpreted as authoritative. This risk is heightened for the PCOS and perimenopause populations, where predictions are most uncertain and users may be most anxious for guidance.

The use of self-reported conditions--rather than clinical diagnosis--means that the condition-aware predictions may be based on incorrect priors. A user who self-identifies as having PCOS but actually has thyroid dysfunction would receive predictions optimized for the wrong distribution.

### 9.4 What Luna gets right

Despite the validation gap, several design choices are defensible on theoretical grounds:

1. Treating a 90-day cycle as a missed log for a PCOS user is clearly wrong; the condition-aware threshold directly addresses this.

2. For cold-start users with few observations, incorporating population priors via inverse-variance weighting is statistically principled (it is the optimal linear combination under Gaussian assumptions).

3. Replacing outlier observations with the smoothed value (hard rejection) would discard directional information. The soft-clamp preserves the direction while limiting magnitude.

4. Cycle data is stored in the database (not in LLM memory), predictions are computed deterministically (not by the LLM), and the LLM is used only for natural language understanding and response generation. This avoids the hallucination and reproducibility problems of LLM-based prediction.

5. The AI assistant acknowledges low confidence for anovulatory conditions and avoids predicting ovulation for hormonal BC users ([route.ts](../src/app/api/chat/route.ts), `buildConditionContext()`).

## 10. Conclusion

Luna takes a condition-aware approach to menstrual cycle prediction using adaptive exponential smoothing with population priors. The system adjusts its prediction parameters--smoothing behavior, anomaly thresholds, prior blending, uncertainty estimates--based on seven health conditions (plus a general-population default), addressing a gap in existing consumer trackers that apply condition-agnostic models.

The algorithm is fully specified and inspectable. Its design choices are defensible on theoretical grounds: inverse-variance blending for cold start, adaptive smoothing rates for non-stationary data, soft-clamping for outlier handling, and condition-aware anomaly thresholds. But none of these choices have been empirically validated. The system has no automated tests, no benchmark results, no calibration analysis, and no real-world usage data.

The contribution of this work is not a validated prediction system. It is a concrete, open-source specification of how condition-aware menstrual cycle prediction could work. The gap between this specification and a validated system remains substantial. I am documenting the algorithm and its limitations transparently so that future work can evaluate and improve on these ideas rather than starting from scratch.

## References

[1] Najmabadi et al. Pooled analysis of 3 prospective cohorts: 581 eumenorrheic women, 3,324 cycles. Cycle length mean 30.3d (SD 6.7), period 6.2d (SD 1.5), follicular 18.5d (SD 6.5), luteal 11.7d (SD 2.8). Cited in Luna source code ([engine.ts, L30-38](../src/lib/prediction/engine.ts#L30-L38)). Source: Perplexity Deep Research [17]; cross-referenced with ChatGPT [15] and Gemini [16] deep research.

[2] Bull, J.R., et al. Real-world menstrual cycle characteristics of more than 600,000 menstrual cycles. *NPJ Digital Medicine*, 2:83, 2019.

[3] Nutrients 2026 hypocaloric-diet trial. Mean cycle length 51±15d in PCOS vs 30±2d in controls. MOS2 community cohort: range 21-111 days. Cited in Luna source code ([engine.ts, L63-78](../src/lib/prediction/engine.ts#L63-L78)). Sources: Perplexity Deep Research [17] (primary), cross-referenced with ChatGPT [15] (~40d estimate from criteria) and Gemini [16] (41d from AWHS).

[4] Li, K., et al. Characterizing the physiological and symptom variation of menstrual cycles using a mobile app. *NPJ Digital Medicine*, 3:79, 2020. (Clue methodology.)

[5] Berglund Scherwitzl, E., et al. Perfect-use and typical-use Pearl Index of a contraceptive mobile app. *Contraception*, 96(6):420-425, 2017. (Natural Cycles.)

[6] Flo Health. ML-based cycle prediction. No peer-reviewed algorithmic disclosure as of 2026.

[7] drip -- open-source fertility awareness app. https://github.com/drip-app. Rule-based, symptothermal method.

[8] Fukaya, A., et al. State-space modeling of basal body temperature for menstrual cycle phase estimation. *BioMedical Engineering OnLine*, 16:44, 2017.

[9] Guo, Y., et al. A hidden semi-Markov model for menstrual cycle phase duration modeling. *Biometrics*, 76(3):838-849, 2020.

[10] Hyndman, R.J., et al. *Forecasting: Principles and Practice*. 3rd edition, OTexts, 2021.

[11] Holman, D.J. The re-analysis of the Treloar/Tremin dataset: age at menopause and cycle length changes. Perimenopause cycle lengths: -4yr: 30.48d, -3yr: 35.02d, -2yr: 45.15d, -1yr: 80.22d. Cited in Luna source code ([engine.ts, L166-182](../src/lib/prediction/engine.ts#L166-L182)).

[12] Parazzini, F., et al. Short cycles and endometriosis: meta-analysis of 11 case-control studies. Short cycles ≤27d OR 1.22. Cited in Luna source code ([engine.ts, L97-110](../src/lib/prediction/engine.ts#L97-L110)).

[13] RCTs of monophasic 21/7 and 24/4 combined oral contraceptives. Withdrawal bleed 4.4-5.2d (SD 1.5-2.2). Cited in Luna source code ([engine.ts, L131-146](../src/lib/prediction/engine.ts#L131-L146)).

[14] Harlow, S.D., et al. STRAW+ 10 Collaborative Group. Executive summary of the Stages of Reproductive Aging Workshop + 10. *Menopause*, 19(4):387-395, 2012.

[15] ChatGPT Deep Research. "Menstrual Cycle Statistics by Condition." Internal research document (`research/chatgpt-deep-research.md`). Provides mean±SD tables for PCOS, PCOD, endometriosis, thyroid, hormonal BC, irregular cycles, and perimenopause. Most values marked "Low" evidence quality. PCOS cycle length estimated ~40d from diagnostic criteria rather than cohort data. PCOD treated as identical to PCOS. Perimenopause mid-transition ~45d (SD ~20d).

[16] Gemini Deep Research. "Clinical Population Priors and Algorithmic Framework for Adaptive Menstrual Cycle Prediction." Internal research document (`research/gemini-deep-research.md`). Discusses departure from 28-day baseline, condition-aware modeling, and adaptive α parameter tuning. Provides PCOS mean 41d (SD 13.7) from large digital cohort, PCOD mean 72.5d (SD 25) from Indian regional cohort, endometriosis mean 28.3d (SD 3.8). Suggests α inversely proportional to condition SD.

[17] Perplexity Deep Research. Condition-specific priors with quantitative tables and explicit evidence quality ratings. Internal research document (`research/perplexit-deep-research.md`). Najmabadi et al. pooled cohort data for general population. Perimenopause from Holman 2006 (Treloar/Tremin re-analysis) with year-by-year means. PCOS from Nutrients 2026 trial (51±15d) and MOS2 cohort (range 21-111d). Endometriosis: OR data only, no distributional data. Thyroid: no published mean±SD. Highest quality of the three internal research documents.

## Appendix A: Smoothing constants and thresholds

| Constant | Value | Source |
|---|---|---|
| ALPHA_MIN | 0.1 | Domain heuristic ([engine.ts, L222](../src/lib/prediction/engine.ts#L222)) |
| ALPHA_MAX | 0.5 | Domain heuristic ([engine.ts, L223](../src/lib/prediction/engine.ts#L223)) |
| KAPPA | 5.0 | MAD scale factor ([engine.ts, L224](../src/lib/prediction/engine.ts#L224)) |
| DEFAULT_SKIP_THRESHOLD | 45 | General-population maximum ([engine.ts, L225](../src/lib/prediction/engine.ts#L225)) |
| OUTLIER_SIGMA | 2.5 | Soft-clamp width ([engine.ts, L226](../src/lib/prediction/engine.ts#L226)) |
| Cold-start α | 0.3 | Default for empty residuals ([engine.ts, L231](../src/lib/prediction/engine.ts#L231)) |
| Prior fade-out | n ≥ 6 | Heuristic cutoff ([engine.ts, L243](../src/lib/prediction/engine.ts#L243)) |
| Variance floor | 4.0 (σ ≥ 2d) | Prevent tight convergence ([engine.ts, L288](../src/lib/prediction/engine.ts#L288)) |
| MAD window | 5 observations | Balance responsiveness/smoothness ([engine.ts, L321](../src/lib/prediction/engine.ts#L321)) |

## Appendix B: Condition prior parameters (full)

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

*Table B1: Full condition prior parameters as defined in [engine.ts, L52-184](../src/lib/prediction/engine.ts#L52-L184). "--" indicates null (not applicable). maxCL = maxCycleLength. Anov = anovulatoryCommon.*

## Appendix C: Implementation gaps found and fixed

Seven implementation bugs were identified and fixed during development:

1. Ovulation was computed as `avgCycleLength - 14` rather than using the predicted luteal phase length. Fix: `addDays(nextPeriodDate, -Math.round(lutealLength || 14))` ([dashboard/page.tsx](../src/app/(app)/dashboard/page.tsx)).

2. Predictions used general-population parameters regardless of the user's condition profile. Fix: conditions are now fetched and passed to `predictNextCycle()` ([dashboard/page.tsx](../src/app/(app)/dashboard/page.tsx)).

3. The anomaly detection computed the isAnomaly flag but did not write it to the database. Fix: anomaly flag is now included in the updates map and persisted ([cycle-tools.ts, L504-510](../src/lib/cycle-tools.ts#L504-L510) and [L541-547](../src/lib/cycle-tools.ts#L541-L547)).

4. The blended object was mutated in-place in the `predictNextCycle` n≥6 path, causing confusing behavior when the same object was referenced elsewhere. Fix: return fresh objects from each path ([engine.ts, L424-428](../src/lib/prediction/engine.ts#L424-L428)).

5. After bulk-inserting imported cycles, derived columns and predictions were not recomputed. Fix: `refreshCycleAnalytics()` called after import ([import/route.ts](../src/app/api/data/import/route.ts)).

6. Gated anomaly observations contributed near-zero residuals to the MAD computation, artificially lowering α and making the smoother unresponsive to genuine regime changes. Fix: only push residuals from non-anomaly observations ([engine.ts, L331-338](../src/lib/prediction/engine.ts#L331-L338)).

7. Naive phase forward-fill from predicted phases could overlap with actual cycle data, producing contradictory calendar markers. Fix: predicted phases are only rendered for future dates beyond the last actual data point ([dashboard/page.tsx](../src/app/(app)/dashboard/page.tsx)).

## Appendix D: Version history

The changelog ([changelog.ts](../src/lib/changelog.ts)) documents 18 versions spanning May 4-6, 2026 (58 git commits):

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
