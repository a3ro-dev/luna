# Luna Project -- working research notes

> Generated from repository inspection of v0.7.0 (commit 23a0e8e)
> Working notes, not a final document. Gaps and uncertainties called out directly.

---

## 1. Repository analysis methodology

### What I inspected

1. Read all 442 lines of the prediction engine ([engine.ts, L1-442](../src/lib/prediction/engine.ts#L1-L442)) -- functions, constants, priors, everything.

2. Read the outline and main functions of cycle tools ([cycle-tools.ts, L1-1084](../src/lib/cycle-tools.ts#L1-L1084)): `refreshCycleAnalytics`, `refreshPredictionParam`, `buildPredictionPayload`, `buildAveragesFromParams`, all tool entry functions.

3. Read the full chat API ([route.ts, L1-800](../src/app/api/chat/route.ts#L1-L800)): context assembly logic, tool definitions, streaming setup, AI tracing, summarization, image handling.

4. All supporting files:
   - [schema.ts, L1-164](../src/lib/db/schema.ts#L1-L164) -- 8 tables, custom `pgDate` type
   - [prompt.ts, L1-333](../src/lib/chat/prompt.ts#L1-L333) -- OpenUI system prompt
   - [models.ts, L1-76](../src/lib/chat/models.ts#L1-L76) -- plan-tier persona configs
   - [openui.ts, L1-4](../src/lib/chat/openui.ts#L1-L4) -- single regex check
   - [images.ts, L1-73](../src/lib/chat/images.ts#L1-L73) -- 7-day TTL image storage
   - [email/index.ts, L1-526](../src/lib/email/index.ts#L1-L526) -- 5 email templates
   - [schemas/auth.ts, L1-44](../src/lib/schemas/auth.ts#L1-L44) -- Zod validation
   - [accent.ts, L1-42](../src/lib/theme/accent.ts#L1-L42) -- 3 accent palettes
   - [rate-limit.ts, L1-66](../src/lib/rate-limit.ts#L1-L66) -- in-memory sliding window
   - [utils.ts, L1-20](../src/lib/utils.ts#L1-L20) -- cn + logError
   - [changelog.ts, L1-162](../src/lib/changelog.ts#L1-L162) -- 18 version entries
   - [auth.ts, L1-76](../src/auth.ts#L1-L76) -- Auth.js v5 config
   - [middleware.ts, L1-68](../src/middleware.ts#L1-L68) -- auth + rate limiting
   - [next.config.ts, L1-36](../next.config.ts#L1-L36) -- security headers, CSP
   - [package.json, L1-89](../package.json#L1-L89) -- dependencies

5. API routes:
   - [import/route.ts, L1-459](../src/app/api/data/import/route.ts#L1-L459) -- 5-format import
   - [export/route.ts, L1-31](../src/app/api/data/export/route.ts#L1-L31) -- JSON export
   - [profile/route.ts, L1-219](../src/app/api/user/profile/route.ts#L1-L219) -- profile CRUD
   - [onboarding/route.ts, L1-122](../src/app/api/user/onboarding/route.ts#L1-L122) -- onboarding flow

6. Dashboard page ([dashboard/page.tsx, L1-334](../src/app/(app)/dashboard/page.tsx#L1-L334)) -- read the first 60 lines (server component, prediction logic).

7. All three research documents in `/research/`:
   - `chatgpt-deep-research.md` -- condition stats, mostly Low evidence
   - `gemini-deep-research.md` -- clinical priors + algorithmic framework
   - `perplexit-deep-research.md` -- detailed priors with evidence ratings

8. Git history: full `git log --oneline` (40+ commits), development timeline.

### How I inspected

- Read files directly. For large files (>200 lines), started with the outline then read specific line ranges.
- Verified line counts with `wc -l` on all main files.
- Cross-referenced `CONDITION_PRIORS` values in [engine.ts](../src/lib/prediction/engine.ts) against the three research documents.
- Traced commit messages to changelog entries to check consistency.
- Did NOT run the application, execute tests (there are none), or query the database.

### What I did NOT inspect

- Client components (DashboardClient, Conversation, etc.) -- only read server component entry points.
- CSS/styling files.
- Drizzle migration files.
- Public assets (images, videos).
- Vercel/deployment config beyond `vercel.json` and [next.config.ts](../next.config.ts).

---

## 2. Bugs found and fixed

From git history and changelog entries:

### Bug 1: period length off-by-one

`297f119` (v0.6.2). Period length was `mEnd - mStart` (exclusive count), so Jan 28-31 came out as 3 days. Fixed to inclusive count -- now 4 days. All historical period data before this fix is off by 1 day, and `predictionParams` smoothed values are affected too. No migration to correct existing data.

### Bug 2: dashboard cycles count

`297f119` / `9f8cc56`. Dashboard showed only 6 cycles instead of the actual total -- probably a `LIMIT 6` on the count query, or caching from an early limited query. Fixed to show the correct count. UI display only; prediction engine was unaffected.

### Bug 3: Neon date timezone bug

`9f8cc56`, `be5575d`. The Neon serverless HTTP driver returns PostgreSQL `date` columns as JavaScript `Date` objects, parsed as local midnight (no Z suffix). The same date value shifts depending on server timezone. If the server is UTC and the user is IST (UTC+5:30), `2026-01-28` becomes `2026-01-27T18:30:00` and displays as January 27. Fixed with a custom `pgDate` Drizzle type ([schema.ts](../src/lib/db/schema.ts)) that converts `Date` objects back to `YYYY-MM-DD` strings at the ORM boundary using `getFullYear()`, `getMonth()`, `getDate()` (which respect local time). The original date string is now preserved regardless of server timezone.

This one is serious -- date corruption cascades into cycle length, period length, and predictions. Cycles logged through the buggy path may have incorrect `mStart`, `mEnd`, or `ovulationDate` values in the database. No migration was found.

### Bug 4: Vercel fetch cache on Neon driver

`885f204`. Vercel's edge runtime caches `fetch()` responses by default. The Neon serverless driver uses `fetch()` internally, so database query results could be cached and return stale data -- dashboard showing old predictions, chat operating on outdated cycle data, AI tools returning stale results. Fixed by adding `fetchOptions: { cache: 'no-store' }` to the Neon client config.

### Bug 5: Grok-4.3 token pricing

`e43f9d9`. The changelog says pricing was corrected to "$0.25/M input, $0.50/M output tokens." But the code in [route.ts, L690](../src/app/api/chat/route.ts#L690) calculates `(usage.inputTokens ?? 0) * (1.25 / 1_000_000) + (usage.outputTokens ?? 0) * (2.5 / 1_000_000)` -- that's a 5x multiplier over the changelog's stated price. Either the changelog is wrong, the code is wrong, or there's an undocumented markup. AI cost tracking in `ai_traces.costUsd` is wrong if the pricing doesn't match actual HackClub proxy billing. Needs verification.

### Bug 6: chat mobile rendering and tool payloads

`e94b6a6`. Raw tool result payloads (JSON objects with `responseMode`, `kind`, `cycles`, etc.) were showing up in the mobile chat UI. This cluttered the display and exposed internal data structures. Fixed -- tool payloads are now collapsed, showing only the AI's natural language response. UI only; no data integrity impact.

### Bug 7: landing page auth redirect

v0.6.1 changelog. `/start` and landing page CTAs always redirected to `/signup` even for signed-in users. Fixed -- signed-in users now see "Dashboard" / "Open Luna" CTAs and get auto-redirected to `/dashboard`. UX issue only.

---

## 3. Algorithm audit findings

### What works well

1. The condition-aware skip gate. The two-stage approach (max-cycle-length threshold → 2.5σ soft clamp) prevents the common failure mode where long PCOS/perimenopause cycles get discarded as "missed logs." The condition-specific `maxCycleLength` values (45d for regular, 120d for PCOS, 90d for thyroid/irregular, 35d for hormonal BC) are well-motivated.

2. Inverse-variance prior blending. For users with <6 observations, blending user data with population priors using inverse-variance weighting is the correct Bayesian approach. `blendWithPrior()` handles the cold-start case and fades out the prior at n≥6.

3. Adaptive alpha. Using the MAD of recent residuals to adjust α is clever -- high variability → lower α (more smoothing), low variability → higher α (more responsive). The range [0.1, 0.5] with KAPPA=5.0 seems reasonable, though there's no theoretical justification for these specific constants.

4. Jackknife CI for n≥6. Delete-one jackknife to estimate confidence intervals is robust and doesn't assume normality. Good choice for small-sample, potentially skewed data.

5. Hormonal BC handling. Setting `follicularLength: null` and `lutealLength: null` for hormonal BC, and suppressing ovulation predictions, is clinically correct. The system prompt explicitly tells the AI not to predict ovulation or follicular/luteal phases for these users.

6. Condition resolution. `resolveEffectivePrior()` picks the condition with the highest cycle-length variance when multiple conditions are present. Hormonal BC always wins. Sensible heuristic -- most disruptive condition dominates.

7. Residual-only MAD tracking. Anomaly-gated observations don't push residuals, which prevents the MAD from being artificially deflated by clamped values. Subtle but important.

### What's questionable

1. Variance floor of 4.0 in skipGate. At [engine.ts, L288](../src/lib/prediction/engine.ts#L288): `const sigma = Math.sqrt(Math.max(variance, 4.0))`. This floors variance at 4.0 (σ≥2d) to prevent tight convergence from flagging normal variation. But it means the anomaly gate never tightens below σ=2d, even for hormonal BC users where true σ should be ~1d. For hormonal BC, a cycle 5 days off (2.5×2 = 5d) passes the anomaly gate when it should arguably be flagged. The floor keeps the gate from being appropriately tight for regular users.

2. Initial variance = 0. At [engine.ts, L303](../src/lib/prediction/engine.ts#L303): `let variance = 0`. The smoother starts with zero variance. The first observation becomes the initial smoothed value, and the first residual is computed from observation 2. The first few cycles contribute with an artificially low variance estimate, which could cause the 2.5σ gate to trigger prematurely on observation 2 or 3 if it differs from observation 1.

3. PCOD prior is fabricated. The `pcod` prior (45d, σ=13) is interpolated between PCOS (51d) and general population (30.3d) with no published evidence. Gemini cites a single Indian regional cohort with 72.5d mean, which would make 45d far too low. ChatGPT treats PCOD as identical to PCOS. Perplexity says there's no separate data. The implementation chose a middle ground with no empirical basis.

4. Perimenopause is a single blended prior. Mean=45d (σ=20d) blends early transition (~30d) and late transition (~80d). Gemini explicitly recommends splitting these into separate STRAW-staged priors with different anomaly gates (59d for early, 365d for late). A single prior at 45d underestimates late transition and overestimates early transition. The engine has no mechanism to detect transition stage from user data.

5. No double exponential smoothing (trend component). The engine uses simple exponential smoothing, which assumes no trend. For PCOD users who may be normalizing (cycles shortening from 90d to 35d over several months due to treatment), Gemini explicitly recommends a trend component (Holt's linear method). The current engine will lag behind a normalizing trend because α is bounded at 0.5 max.

6. Exponential smoothing variance estimate. The variance update at [engine.ts, L325](../src/lib/prediction/engine.ts#L325) (`variance = (1 - alpha) * (variance + alpha * diff * diff)`) is an approximation. It doesn't correctly estimate the variance of the smoothed value -- it's more like a discounted sum of squared errors. The jackknife CI partially compensates at n≥6, but for n<6, the CI from `blendWithPrior` depends on this approximate variance.

7. `resolveEffectivePrior` picks highest-variance condition. When a user has multiple conditions (e.g., endometriosis + thyroid), the engine picks the one with the highest cycle-length variance. But endometriosis (short cycles, low variance) + thyroid (long/irregular cycles, high variance) would pick thyroid, completely ignoring the endometriosis contribution. A weighted blend or a max-of-extremes approach (shortest cycle mean from endo, highest variance from thyroid) might work better.

8. Alpha range [0.1, 0.5] may be too narrow. For hormonal BC users where σ≈1d, the engine should use a very high α (≈0.8-0.95) to lock onto the regimen. But `computeAdaptiveAlpha` maps low MAD → low α (0.1), which is the opposite of what's needed. Gemini recommends α proportional to regularity (high for BC, low for irregular). The current implementation has α inversely proportional to recent variability, which is correct for conditions with high variability but wrong for conditions with low variability.

   Wait -- re-reading the code: `computeAdaptiveAlpha` returns `ALPHA_MIN + (ALPHA_MAX - ALPHA_MIN) * (mad / (mad + KAPPA))`. High MAD → α approaches 0.5. Low MAD → α approaches 0.1. So:
   - Regular cycles (low MAD) → low α → slower adaptation (undesirable for BC)
   - Irregular cycles (high MAD) → high α → faster adaptation (undesirable for PCOS/irregular)

   This appears to be backwards. Gemini recommends α inversely proportional to condition SD (high α for BC, low α for PCOS). But the code makes α proportional to recent residual MAD, which is correlated with condition SD. Irregular conditions get higher α, causing the smoother to overreact to individual long cycles.

   That said, this might be intentional: when residuals are high, the algorithm needs to adapt faster because the user's pattern is changing. The KAPPA=5.0 and range [0.1, 0.5] limit the damage. But the theoretical justification is weak, and it contradicts the research documents.

9. No age covariate. The Perplexity research notes that PCOS cycle length and irregularity decrease with age, converging toward non-PCOS patterns by ~40. The engine has no age input. The user's `dateOfBirth` exists in the schema but is never passed to the prediction engine.

10. No PCOS/thyroid subtype discrimination. The thyroid prior blends hypo and hyper into a single 35d mean, but these conditions push in opposite directions (hypo→long, hyper→short). Gemini recommends letting users specify "underactive" vs "overactive." The current implementation doesn't distinguish.

---

## 4. Evidence chain analysis

### Which claims trace to which sources

#### Strong chains (high confidence)

| Claim in code | Source | Chain |
|---|---|---|
| General population cycle length = 30.3 ± 6.7 | Najmabadi et al., pooled 3 cohorts, N=581 | Perplexity → `POPULATION_PRIOR` → [engine.ts](../src/lib/prediction/engine.ts). Direct numeric transfer. |
| General population period length = 6.2 ± 1.5 | Najmabadi et al. | Same chain. |
| General population follicular phase = 18.5 ± 6.5 | Najmabadi et al. | Same chain. |
| Hormonal BC cycle = 28 ± 1 | Regimen design (21/7, 24/4 pills) | All three research docs → [engine.ts](../src/lib/prediction/engine.ts). Pharmacological fact. |
| Hormonal BC bleed = 4.5 ± 1.5 | RCTs of monophasic pills | Perplexity → midpoint of 4.4-5.2d range → [engine.ts](../src/lib/prediction/engine.ts). |
| Perimenopause -4yr = ~30d, -1yr = ~80d | Holman 2006 (Treloar/Tremin) | Perplexity → [engine.ts](../src/lib/prediction/engine.ts) (blended to single 45d prior). |

#### Weak chains (low confidence)

| Claim in code | Source | Chain | Where it breaks |
|---|---|---|---|
| PCOS cycle = 51 ± 15 | Nutrients 2026 trial, N=10 | Perplexity → [engine.ts](../src/lib/prediction/engine.ts) | N=10 is very small. Single trial, not a meta-analysis. May not be representative. |
| PCOS max cycle = 120 | MOS2 cohort (observed 111) + 9d buffer | Perplexity → [engine.ts](../src/lib/prediction/engine.ts) | The +9d buffer is arbitrary. MOS2 is a community sample, not necessarily representative. |
| PCOD cycle = 45 ± 13 | No source. Interpolated between PCOS (51) and general (30.3) | [engine.ts](../src/lib/prediction/engine.ts) only | No published PCOD-specific data exists. The interpolation weights are undocumented. Gemini cites 72.5d from an Indian cohort, which would make 45d far too low. |
| Endometriosis cycle = 27 ± 4 | OR data: ≤27d OR 1.22 for endo | Perplexity → [engine.ts](../src/lib/prediction/engine.ts) | OR is not a distribution. An odds ratio of 1.22 for short cycles tells us short cycles are over-represented, but it doesn't provide a mean or SD. The mean of 27d and SD of 4d are estimates, not measurements. |
| Thyroid cycle = 35 ± 15 | Directional data only (hypo→long, hyper→short) | ChatGPT/Gemini → [engine.ts](../src/lib/prediction/engine.ts) | No published mean±SD for thyroid conditions. The 35d mean and 15d SD are fabricated estimates. The blended mean averages hypo and hyper, which push in opposite directions. |
| Irregular cycle = 30 ± 15 | General population mean + inflated SD | [engine.ts](../src/lib/prediction/engine.ts) only | No PCOS/thyroid-excluded distributions exist. The "irregular" catch-all is too heterogeneous for a meaningful prior. 30d is just the general population mean; 15d SD is an inflation factor. |
| Perimenopause (single prior) = 45 ± 20 | Holman 2006 blended across -4yr to -1yr | Perplexity → [engine.ts](../src/lib/prediction/engine.ts) | Blending early (30d) and late (80d) transition loses critical information. A user in early transition gets an overestimated mean; a user in late transition gets an underestimated mean. |

#### Where the chain breaks completely

1. PCOD → No data. The chain starts and ends at "interpolation." No external source to validate against.

2. Thyroid → No distributional data. The chain goes: clinical observation (hypo→long, hyper→short) → arbitrary mean of 35d and SD of 15d. No study provides these numbers.

3. Irregular → Catch-all with no definition. "Irregular" has no diagnostic criteria beyond "not PCOS/thyroid/etc." It's a negative definition, which makes any prior inherently speculative.

4. Luteal phase across all conditions → Assumed near-normal. The chain goes: biological constraint (corpus luteum lifespan 11-17d) → assume 12-14d for all conditions. Reasonable but untested. Luteal phase defects in thyroid and PCOS are documented but not quantified in distributional terms.

5. Endometriosis phase lengths → Reverse-engineered from cycle length. Short cycles (OR 1.22) → assumed mean 27d → split into follicular 14d + luteal 12d. The phase decomposition has no direct evidence; it's inferred from the assumed total cycle length minus assumed luteal length.

---

## 5. Open questions

### Questions that couldn't be resolved from repository inspection

1. Is the Grok-4.3 pricing in code correct? The changelog (v0.7.0) says pricing was corrected to "$0.25/M input, $0.50/M output." But the code calculates `(usage.inputTokens ?? 0) * (1.25 / 1_000_000) + (usage.outputTokens ?? 0) * (2.5 / 1_000_000)`, which is 5x the changelog's stated price. Either the changelog is wrong, the code is wrong, or there's an undocumented markup. Requires checking actual HackClub AI billing.

2. What happened to the existing data from the Neon date bug? The `pgDate` custom type was added in commit `be5575d`. But cycles logged before that fix may have incorrect date values in the database. Is there a migration to fix corrupted dates? No migration was found in the repository.

3. Is the α direction correct? `computeAdaptiveAlpha` gives higher α for higher MAD (more irregular → faster adaptation). Gemini recommends the opposite (more irregular → lower α to dampen noise). The current approach could cause the smoother to overreact to individual outlier cycles in PCOS/irregular users. Requires validation on real data, which doesn't exist yet.

4. How does the engine perform at n=1 to n=5? `blendWithPrior` handles this regime, but there are no unit tests or integration tests. The jackknife CI requires n≥6. For n=1-5, the CI comes from the blended variance, which depends on the approximate variance estimate from exponential smoothing. Untested.

5. What happens when a user's condition changes? A user might start on hormonal BC, then stop. Or start treatment for PCOS and normalize. The engine reads conditions from the `users.conditions` array on every cycle write, but `predictionParams` stores smoothed values computed under the old condition. There's no mechanism to reset or adjust params when conditions change. Potential data integrity issue.

6. Does the in-memory rate limiter work in serverless? The code itself acknowledges this: "In a serverless environment with multiple instances, limits apply per-instance." If Luna runs on Vercel with multiple serverless functions, each instance has its own rate limit state. An attacker could bypass limits by hitting different instances. Architectural limitation, not a bug.

7. Is the luteal phase adjustment from 11.7 to 12.0 documented? Najmabadi data gives luteal mean as 11.7d, but `POPULATION_PRIOR.lutealLength.mean` is 12.0. Perplexity also cites an alternative of 12.4d from an app-based cohort. The 12.0 value appears to be a round-up, but no comment explains the choice. Minor but undocumented.

8. What's the evidence for the specific KAPPA, ALPHA_MIN, ALPHA_MAX, OUTLIER_SIGMA values? These constants (5.0, 0.1, 0.5, 2.5) have no citations or justification in comments. They look like tuning parameters chosen by the developer. Requires sensitivity analysis on real data.

9. Does `refreshCycleAnalytics` handle edge cases correctly? The function recomputes derived columns (cycleLength, periodLength, follicularLength, lutealLength, isAnomaly) for all cycles and recomputes prediction params. But what happens when:
   - A cycle has `mEnd` but no `ovulationDate`? (follicular/luteal can't be computed)
   - A cycle has `ovulationDate` but no `mEnd`? (period length unknown)
   - Only one cycle exists? (no previous cycle for cycle length)
   The code handles some of these (the outline shows conditional logic), but the exact behavior wasn't fully traced.

10. How accurate is date parsing in `normalizeDateInput`? The function handles ISO dates, "January 28" style, "Jan 28" style, and MM/DD/YYYY. But what about:
    - "28th of January" → likely fails
    - "1/28/2026" → ambiguous (MM/DD vs DD/MM depending on locale)
    - "2026-01-28T12:00:00Z" → ISO with time component → likely parsed by the first regex
    The NLP layer (Grok-4.3) normalizes dates to YYYY-MM-DD before calling tools, so many edge cases are handled upstream. But the tool functions still accept free-form input as a fallback.

11. Are the Supermemory v4 API calls correct? The code uses `POST https://api.supermemory.ai/v4/search` and `POST https://api.supermemory.ai/v4/memories`. There's no versioned SDK -- just raw `fetch()` calls. If Supermemory changes their API, these will silently break. No error handling beyond try/catch returning empty string.

12. What's the actual model behind `x-ai/grok-4.3`? The HackClub AI proxy maps model IDs to underlying models. The code assumes this maps to a capable chat model, but there's no documentation of what Grok-4.3 actually is, its context window, or its capabilities. Dependent on third-party proxy behavior.

### Methodological questions for future work

1. Validation framework needed. The engine has zero tests. No synthetic data validation, no backtesting against known cycle patterns, no comparison to other methods (rolling average, Clue's Poisson model, etc.).

2. Sensitivity analysis on priors. How much do predictions change when PCOS prior moves from 51d to 41d (Gemini estimate) or 40d (ChatGPT estimate)? A 10d difference in prior mean could shift cold-start predictions considerably.

3. Condition change detection. The engine should detect when a user's observed cycles are consistently inconsistent with their condition prior (e.g., a "PCOS" user with regular 28-day cycles) and either suggest a condition update or adaptively reduce the prior's influence.

4. Stratified perimenopause model. The STRAW staging system provides clear markers (≥7d cycle-to-cycle change for early transition, ≥60d amenorrhea for late transition). These could be detected from logged data and used to switch priors automatically.

5. Hypo/hyper thyroid discrimination. The current blended thyroid prior is a poor compromise. A simple UI toggle would allow dramatically better priors.

6. Extended/continuous hormonal BC regimens. The current prior assumes 28-day cycles, but extended regimens (84/7, continuous) are increasingly common. The engine should detect regimen type from cycle patterns or explicit user input.

---

## Appendix: file inventory

| File | Lines | Role |
|---|---|---|
| [engine.ts, L1-442](../src/lib/prediction/engine.ts#L1-L442) | 442 | Core prediction engine |
| [cycle-tools.ts, L1-1084](../src/lib/cycle-tools.ts#L1-L1084) | 1084 | AI tools + cycle management |
| [route.ts, L1-800](../src/app/api/chat/route.ts#L1-L800) | 800 | Chat API + streaming |
| [prompt.ts, L1-333](../src/lib/chat/prompt.ts#L1-L333) | 333 | System prompt |
| [import/route.ts, L1-459](../src/app/api/data/import/route.ts#L1-L459) | 459 | Multi-format import |
| [email/index.ts, L1-526](../src/lib/email/index.ts#L1-L526) | 526 | Email templates |
| [dashboard/page.tsx, L1-334](../src/app/(app)/dashboard/page.tsx#L1-L334) | 334 | Dashboard server component |
| [profile/route.ts, L1-219](../src/app/api/user/profile/route.ts#L1-L219) | 219 | Profile CRUD |
| [schema.ts, L1-164](../src/lib/db/schema.ts#L1-L164) | 164 | Database schema (8 tables) |
| [changelog.ts, L1-162](../src/lib/changelog.ts#L1-L162) | 162 | Version history |
| [onboarding/route.ts, L1-122](../src/app/api/user/onboarding/route.ts#L1-L122) | 122 | Onboarding flow |
| [models.ts, L1-76](../src/lib/chat/models.ts#L1-L76) | 76 | Plan-tier config |
| [auth.ts, L1-76](../src/auth.ts#L1-L76) | 76 | Auth.js config |
| [images.ts, L1-73](../src/lib/chat/images.ts#L1-L73) | 73 | Image storage |
| [rate-limit.ts, L1-66](../src/lib/rate-limit.ts#L1-L66) | 66 | Rate limiter |
| [middleware.ts, L1-68](../src/middleware.ts#L1-L68) | 68 | Auth middleware |
| [schemas/auth.ts, L1-44](../src/lib/schemas/auth.ts#L1-L44) | 44 | Zod schemas |
| [accent.ts, L1-42](../src/lib/theme/accent.ts#L1-L42) | 42 | Accent colors |
| [next.config.ts, L1-36](../next.config.ts#L1-L36) | 36 | Next.js config |
| [export/route.ts, L1-31](../src/app/api/data/export/route.ts#L1-L31) | 31 | JSON export |
| [utils.ts, L1-20](../src/lib/utils.ts#L1-L20) | 20 | Utilities |
| [openui.ts, L1-4](../src/lib/chat/openui.ts#L1-L4) | 4 | OpenUI detection |
| [package.json, L1-89](../package.json#L1-L89) | 89 | Dependencies |
| Total | 5307 | |
