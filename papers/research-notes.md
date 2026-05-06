# Luna Project — Working Research Notes

> Generated from repository inspection of v0.7.0 (commit 23a0e8e)
> These are working notes, not a polished document. Gaps and uncertainties are marked explicitly.

---

## 1. Repository Analysis Methodology

### What I Inspected

1. **Full source of the prediction engine** (`src/lib/prediction/engine.ts`, 442 lines). Read every function, every constant, every prior value.

2. **Full source of cycle tools** (`src/lib/cycle-tools.ts`, 1084 lines). Read outline and key functions: `refreshCycleAnalytics`, `refreshPredictionParam`, `buildPredictionPayload`, `buildAveragesFromParams`, all tool entry functions.

3. **Full source of chat API** (`src/app/api/chat/route.ts`, 800 lines). Read context assembly logic, tool definitions, streaming setup, AI tracing, summarization, image handling.

4. **Full source of all supporting files**:
   - `src/lib/db/schema.ts` (8 tables, custom `pgDate` type)
   - `src/lib/chat/prompt.ts` (333-line OpenUI system prompt)
   - `src/lib/chat/models.ts` (plan-tier persona configs)
   - `src/lib/chat/openui.ts` (single regex check)
   - `src/lib/chat/images.ts` (7-day TTL image storage)
   - `src/lib/email/index.ts` (526 lines, 5 email templates)
   - `src/lib/schemas/auth.ts` (Zod validation)
   - `src/lib/theme/accent.ts` (3 accent palettes)
   - `src/lib/rate-limit.ts` (in-memory sliding window)
   - `src/lib/utils.ts` (cn + logError)
   - `src/lib/changelog.ts` (18 version entries)
   - `src/auth.ts` (Auth.js v5 config)
   - `src/middleware.ts` (auth + rate limiting)
   - `next.config.ts` (security headers, CSP)
   - `package.json` (dependencies)

5. **Full source of API routes**:
   - `src/app/api/data/import/route.ts` (5-format import)
   - `src/app/api/data/export/route.ts` (JSON export)
   - `src/app/api/cron/cleanup-images/route.ts` (cron with Bearer auth)
   - `src/app/api/user/profile/route.ts` (profile CRUD)
   - `src/app/api/user/onboarding/route.ts` (onboarding flow)

6. **Dashboard page** (`src/app/(app)/dashboard/page.tsx`, 334 lines). Read first 60 lines (server component, prediction logic).

7. **All three research documents** in `/research/`:
   - `chatgpt-deep-research.md` (condition stats, mostly Low evidence)
   - `gemini-deep-research.md` (clinical priors + algorithmic framework)
   - `perplexit-deep-research.md` (detailed priors with evidence ratings)

8. **Git history**: Full `git log --oneline` (40+ commits), development timeline.

### How I Inspected

- Read files directly using `read_file` tool. For large files (>200 lines), used outline first then read specific line ranges.
- Verified line counts using `wc -l` on all key files.
- Cross-referenced `CONDITION_PRIORS` values in engine.ts against values in the three research documents.
- Traced commit messages to changelog entries to verify consistency.
- Did NOT run the application, execute tests (there are none), or query the database.

### What I Did NOT Inspect

- Client components (DashboardClient, Conversation, etc.) — only read server component entry points.
- CSS/styling files.
- Drizzle migration files.
- Public assets (images, videos).
- Vercel/deployment config beyond `vercel.json` and `next.config.ts`.

---

## 2. Bugs Found and Fixed

Based on git history, the following bugs were identified and fixed across the development timeline. These are documented in changelog entries and commit messages:

### Bug 1: Period Length Off-by-One

- **Commit:** `297f119` (v0.6.2)
- **Before:** Period length calculated as `mEnd - mStart` using simple date subtraction, giving exclusive count. A period Jan 28–31 computed as 3 days.
- **After:** Changed to inclusive day count. A period Jan 28–31 now correctly computes as 4 days.
- **Impact:** All historical period length data logged before this fix is off by 1 day. The `predictionParams` smoothed values would also be affected.
- **Status:** Fixed in code, but no migration to correct existing data in the database.

### Bug 2: Dashboard Cycles Count

- **Commit:** `297f119` / `9f8cc56`
- **Before:** Dashboard showed only 6 cycles tracked instead of the actual total. Likely caused by a `LIMIT 6` on the count query or caching the count from an early query that was limited.
- **After:** Fixed to show the correct total cycle count.
- **Impact:** UI display only; prediction engine was unaffected.
- **Status:** Fixed.

### Bug 3: Neon Date Timezone Bug

- **Commits:** `9f8cc56`, `be5575d`
- **Before:** The Neon serverless HTTP driver returns PostgreSQL `date` columns as JavaScript `Date` objects. These are parsed as local midnight (no Z suffix), which means the same date value shifts depending on the server's timezone. If the server is in UTC and the user is in IST (UTC+5:30), a date like `2026-01-28` could become `2026-01-27T18:30:00` and display as January 27.
- **After:** Custom `pgDate` Drizzle type that converts `Date` objects back to `YYYY-MM-DD` strings at the ORM boundary using `getFullYear()`, `getMonth()`, `getDate()` (which respect local time), ensuring the original date string is preserved regardless of server timezone.
- **Impact:** Critical. Date corruption would cascade into cycle length calculations, period length calculations, and predictions. Any cycles logged before the fix may have incorrect `mStart`, `mEnd`, or `ovulationDate` values stored.
- **Status:** Fixed in code, but existing data may be corrupted if logged through the buggy path.

### Bug 4: Vercel Fetch Cache on Neon Driver

- **Commit:** `885f204`
- **Before:** Vercel's edge runtime caches `fetch()` responses by default. The Neon serverless driver uses `fetch()` internally, meaning database query results could be cached and return stale data. This would cause the dashboard and predictions to show outdated information.
- **After:** Added `fetchOptions: { cache: 'no-store' }` to the Neon client configuration to disable response caching.
- **Impact:** Stale reads on any database query. Could cause the dashboard to show old predictions, chat to operate on outdated cycle data, and AI tools to return stale results.
- **Status:** Fixed.

### Bug 5: Grok-4.3 Token Pricing

- **Commit:** `e43f9d9`
- **Before:** Pricing was incorrect (exact previous values not documented in commit message, but changelog says "correct Grok-4.3 pricing to .25/M input, .50/M output tokens").
- **After:** Corrected to $0.25 per 1M input tokens, $0.50 per 1M output tokens. However, the code in `route.ts` line ~690 uses `$1.25/M` input and `$2.50/M` output — this appears to be a **5× multiplier** over the changelog's stated price. **This may still be wrong.**
- **Impact:** AI cost tracking (`ai_traces.costUsd`) is incorrect if the pricing in code doesn't match the actual HackClub proxy pricing.
- **Status:** **Potentially still incorrect.** Needs verification against actual HackClub AI billing.

### Bug 6: Chat Mobile Rendering and Tool Payloads

- **Commit:** `e94b6a6`
- **Before:** Raw tool result payloads (JSON objects with `responseMode`, `kind`, `cycles`, etc.) were being rendered in the chat UI on mobile, causing visual clutter and potentially leaking internal data structures.
- **After:** Tool payloads are now collapsed/hidden, showing only the AI's natural language response.
- **Impact:** UI only; no data integrity impact.
- **Status:** Fixed.

### Bug 7: Landing Page Auth Redirect

- **Commit:** v0.6.1 changelog
- **Before:** `/start` and landing page CTAs always redirected to `/signup` even when the user was already signed in.
- **After:** Signed-in users see "Dashboard" / "Open Luna" CTAs and get auto-redirected to `/dashboard`.
- **Impact:** UX issue only.
- **Status:** Fixed.

---

## 3. Algorithm Audit Findings

### What Works Well

1. **Condition-aware skip gate.** The two-stage approach (max-cycle-length threshold → 2.5σ soft clamp) is sound. It prevents the common failure mode where long PCOS/perimenopause cycles are discarded as "missed logs." The condition-specific `maxCycleLength` values (45d for regular, 120d for PCOS, 90d for thyroid/irregular, 35d for hormonal BC) are well-motivated.

2. **Inverse-variance prior blending.** For users with <6 observations, blending user data with population priors using inverse-variance weighting is the correct Bayesian approach. The `blendWithPrior()` function properly handles the cold-start case and fades out the prior at n≥6.

3. **Adaptive alpha.** Using the MAD (mean absolute deviation) of recent residuals to dynamically adjust α is clever. High variability → lower α (more smoothing), low variability → higher α (more responsive). The range [0.1, 0.5] with KAPPA=5.0 seems reasonable, though there's no theoretical justification for these specific constants.

4. **Jackknife CI for n≥6.** Using delete-one jackknife to estimate confidence intervals is robust and doesn't assume normality. This is a good choice for small-sample, potentially skewed data.

5. **Hormonal BC handling.** Setting `follicularLength: null` and `lutealLength: null` for hormonal BC, and suppressing ovulation predictions, is clinically correct. The system prompt explicitly tells the AI not to predict ovulation or follicular/luteal phases for these users.

6. **Condition resolution.** `resolveEffectivePrior()` picks the condition with the highest cycle-length variance when multiple conditions are present. Hormonal BC always wins. This is a sensible heuristic (most disruptive condition dominates).

7. **Residual-only MAD tracking.** Anomaly-gated observations don't push residuals, which prevents the MAD from being artificially deflated by clamped values. This is a subtle but important detail.

### What's Questionable

1. **Variance floor of 4.0 in skipGate.** Line 288: `const sigma = Math.sqrt(Math.max(variance, 4.0))`. This floors the variance at 4.0 (σ≥2d) to prevent tight convergence from flagging normal variation. But this means the anomaly gate never tightens below σ=2d, even for hormonal BC users where the true σ should be ~1d. For hormonal BC, a cycle that's 5 days off (2.5×2 = 5d) would pass the anomaly gate, when it should arguably be flagged. The floor prevents the gate from being appropriately tight for regular users.

2. **Initial variance = 0.** Line 303: `let variance = 0`. The smoother starts with zero variance. The first observation becomes the initial smoothed value, and the first residual is computed from observation 2. This means the first few cycles contribute to the smoother with an artificially low variance estimate, which could cause the 2.5σ gate to trigger prematurely on observation 2 or 3 if it differs from observation 1.

3. **PCOD prior is fabricated.** The `pcod` prior (45d, σ=13) is interpolated between PCOS (51d) and general population (30.3d) with no published evidence. The Gemini research cites a single Indian regional cohort with 72.5d mean, which would make 45d a significant underestimate. The ChatGPT research treats PCOD as identical to PCOS. The Perplexity research says there's no separate data. The implementation chose a middle ground with no empirical basis.

4. **Perimenopause is a single blended prior.** The `perimenopause` prior uses mean=45d (σ=20d), which blends early transition (~30d) and late transition (~80d). The Gemini research explicitly recommends splitting these into separate STRAW-staged priors with different anomaly gates (59d for early, 365d for late). A single prior at 45d underestimates late transition and overestimates early transition. The engine has no mechanism to detect transition stage from user data.

5. **No double exponential smoothing (trend component).** The engine uses simple exponential smoothing, which assumes no trend. For PCOD users who may be normalizing (cycles shortening from 90d to 35d over several months due to treatment), the Gemini research explicitly recommends a trend component (Holt's linear method). The current engine will lag behind a normalizing trend because α is bounded at 0.5 max.

6. **Exponential smoothing variance estimate.** The variance update on line 325 (`variance = (1 - alpha) * (variance + alpha * diff * diff)`) is an approximation. It doesn't correctly estimate the variance of the smoothed value; it's more like a discounted sum of squared errors. The jackknife CI partially compensates for this at n≥6, but for n<6, the CI from `blendWithPrior` depends on this approximate variance.

7. **`resolveEffectivePrior` picks highest-variance condition.** When a user has multiple conditions (e.g., endometriosis + thyroid), the engine picks the one with the highest cycle-length variance. But endometriosis (short cycles, low variance) + thyroid (long/irregular cycles, high variance) would pick thyroid, completely ignoring the endometriosis contribution. A weighted blend or at least a max-of-extremes approach (shortest cycle mean from endo, highest variance from thyroid) might be more appropriate.

8. **Alpha range [0.1, 0.5] may be too narrow.** For hormonal BC users where σ≈1d, the engine should use a very high α (≈0.8-0.95) to lock onto the regimen. But `computeAdaptiveAlpha` maps low MAD → low α (0.1), which is the opposite of what's needed. The Gemini research explicitly recommends α proportional to regularity (high for BC, low for irregular). The current implementation has α inversely proportional to recent variability, which is correct for conditions with high variability but wrong for conditions with low variability.

   **Wait — re-reading the code:** `computeAdaptiveAlpha` returns `ALPHA_MIN + (ALPHA_MAX - ALPHA_MIN) * (mad / (mad + KAPPA))`. High MAD → α approaches 0.5. Low MAD → α approaches 0.1. This means:
   - Regular cycles (low MAD) → low α → slower adaptation (undesirable for BC)
   - Irregular cycles (high MAD) → high α → faster adaptation (undesirable for PCOS/irregular)

   **This appears to be backwards.** The Gemini research recommends α inversely proportional to condition SD (high α for BC, low α for PCOS). But the code makes α proportional to recent residual MAD, which is correlated with condition SD. So irregular conditions get *higher* α, causing the smoother to overreact to individual long cycles.

   **However**, this might be intentional: when residuals are high, the algorithm needs to adapt faster because the user's pattern is changing. The KAPPA=5.0 and range [0.1, 0.5] limit the damage. But the theoretical justification is weak, and it contradicts the research documents' recommendations.

9. **No age covariate.** The Perplexity research notes that PCOS cycle length and irregularity decrease with age, converging toward non-PCOS patterns by ~40. The engine has no age input. The user's `dateOfBirth` exists in the schema but is never passed to the prediction engine.

10. **No PCOS/thyroid subtype discrimination.** The thyroid prior blends hypo and hyper into a single 35d mean, but these conditions push in opposite directions (hypo→long, hyper→short). The Gemini research recommends letting users specify "underactive" vs "overactive." The current implementation doesn't distinguish.

---

## 4. Evidence Chain Analysis

### Which Claims Trace to Which Sources

#### Strong Chains (high confidence)

| Claim in Code | Source | Chain |
|---|---|---|
| General population cycle length = 30.3 ± 6.7 | Najmabadi et al., pooled 3 cohorts, N=581 | Perplexity → `POPULATION_PRIOR` → engine.ts. Direct numeric transfer. |
| General population period length = 6.2 ± 1.5 | Najmabadi et al. | Same chain. |
| General population follicular phase = 18.5 ± 6.5 | Najmabadi et al. | Same chain. |
| Hormonal BC cycle = 28 ± 1 | Regimen design (21/7, 24/4 pills) | All three research docs → engine.ts. Pharmacological fact. |
| Hormonal BC bleed = 4.5 ± 1.5 | RCTs of monophasic pills | Perplexity → midpoint of 4.4-5.2d range → engine.ts. |
| Perimenopause -4yr = ~30d, -1yr = ~80d | Holman 2006 (Treloar/Tremin) | Perplexity → engine.ts (blended to single 45d prior). |

#### Weak Chains (low confidence)

| Claim in Code | Source | Chain | Where It Breaks |
|---|---|---|---|
| PCOS cycle = 51 ± 15 | Nutrients 2026 trial, N=10 | Perplexity → engine.ts | **N=10 is very small.** Single trial, not a meta-analysis. May not be representative. |
| PCOS max cycle = 120 | MOS2 cohort (observed 111) + 9d buffer | Perplexity → engine.ts | The +9d buffer is arbitrary. MOS2 is a community sample, not necessarily representative. |
| PCOD cycle = 45 ± 13 | **No source.** Interpolated between PCOS (51) and general (30.3) | engine.ts only | **No published PCOD-specific data exists.** The interpolation weights are undocumented. Gemini research cites 72.5d from an Indian cohort, which would make 45d a significant underestimate. |
| Endometriosis cycle = 27 ± 4 | OR data: ≤27d OR 1.22 for endo | Perplexity → engine.ts | **OR is not a distribution.** An odds ratio of 1.22 for short cycles tells us short cycles are over-represented, but it doesn't provide a mean or SD. The mean of 27d and SD of 4d are estimates, not measurements. |
| Thyroid cycle = 35 ± 15 | Directional data only (hypo→long, hyper→short) | ChatGPT/Gemini → engine.ts | **No published mean±SD for thyroid conditions.** The 35d mean and 15d SD are fabricated estimates. The blended mean averages hypo and hyper, which push in opposite directions. |
| Irregular cycle = 30 ± 15 | General population mean + inflated SD | engine.ts only | **No PCOS/thyroid-excluded distributions exist.** The "irregular" catch-all is too heterogeneous to have a meaningful prior. 30d is just the general population mean; 15d SD is an inflation factor. |
| Perimenopause (single prior) = 45 ± 20 | Holman 2006 blended across -4yr to -1yr | Perplexity → engine.ts | **Blending early (30d) and late (80d) transition loses critical information.** A user in early transition gets an overestimated mean; a user in late transition gets an underestimated mean. |

#### Where the Chain Breaks Completely

1. **PCOD → No data.** The chain starts and ends at "interpolation." There is no external source to validate against.

2. **Thyroid → No distributional data.** The chain goes: clinical observation (hypo→long, hyper→short) → arbitrary mean of 35d and SD of 15d. No study provides these numbers.

3. **Irregular → Catch-all with no definition.** The "irregular" condition has no diagnostic criteria beyond "not PCOS/thyroid/etc." It's a negative definition, which makes any prior inherently speculative.

4. **Luteal phase across all conditions → Assumed near-normal.** The chain goes: biological constraint (corpus luteum lifespan 11-17d) → assume 12-14d for all conditions. This is reasonable but untested. Luteal phase defects in thyroid and PCOS are documented but not quantified in distributional terms.

5. **Endometriosis phase lengths → Reverse-engineered from cycle length.** The chain goes: short cycles (OR 1.22) → assumed mean 27d → split into follicular 14d + luteal 12d. The phase decomposition has no direct evidence; it's inferred from the assumed total cycle length minus assumed luteal length.

---

## 5. Open Questions

### Questions That Couldn't Be Resolved from Repository Inspection

1. **Is the Grok-4.3 pricing in code correct?** The changelog (v0.7.0) says pricing was corrected to "$0.25/M input, $0.50/M output." But the code calculates `(usage.inputTokens ?? 0) * (1.25 / 1_000_000) + (usage.outputTokens ?? 0) * (2.5 / 1_000_000)`, which is 5× the changelog's stated price. Either the changelog is wrong, the code is wrong, or there's a markup/multiplier that's not documented. **Requires checking actual HackClub AI billing.**

2. **What happened to the existing data from the Neon date bug?** The `pgDate` custom type was added in commit `be5575d`. But cycles logged before that fix may have incorrect date values in the database. Is there a migration to fix corrupted dates? **No migration was found in the repository.**

3. **Is the α direction correct?** The `computeAdaptiveAlpha` function gives higher α for higher MAD (more irregular → faster adaptation). The Gemini research recommends the opposite (more irregular → lower α to dampen noise). The current approach could cause the smoother to overreact to individual outlier cycles in PCOS/irregular users. **Requires validation on real data, which doesn't exist yet.**

4. **How does the engine perform at n=1 to n=5?** The blendWithPrior function handles this regime, but there are no unit tests or integration tests. The jackknife CI requires n≥6. For n=1-5, the CI comes from the blended variance, which depends on the approximate variance estimate from exponential smoothing. **Untested.**

5. **What happens when a user's condition changes?** A user might start on hormonal BC, then stop. Or start treatment for PCOS and normalize. The engine reads conditions from the `users.conditions` array on every cycle write, but the `predictionParams` table stores smoothed values that were computed under the old condition. There's no mechanism to reset or adjust params when conditions change. **Potential data integrity issue.**

6. **Does the in-memory rate limiter work in serverless?** The code itself acknowledges this: "In a serverless environment with multiple instances, limits apply per-instance." If Luna is deployed on Vercel with multiple serverless functions, each instance has its own rate limit state. An attacker could bypass limits by hitting different instances. **Architectural limitation, not a bug.**

7. **Is the luteal phase adjustment from 11.7 to 12.0 documented?** The Najmabadi data gives luteal mean as 11.7d, but `POPULATION_PRIOR.lutealLength.mean` is 12.0. The Perplexity research also cites an alternative of 12.4d from an app-based cohort. The 12.0 value appears to be a round-up, but no comment explains the choice. **Minor but undocumented.**

8. **What's the evidence for the specific KAPPA, ALPHA_MIN, ALPHA_MAX, OUTLIER_SIGMA values?** These constants (5.0, 0.1, 0.5, 2.5 respectively) have no citations or justification in comments. They appear to be tuning parameters chosen by the developer. **Requires sensitivity analysis on real data.**

9. **Does the `refreshCycleAnalytics` function handle edge cases correctly?** The function recomputes derived columns (cycleLength, periodLength, follicularLength, lutealLength, isAnomaly) for all cycles. It also recomputes prediction params. But what happens when:
   - A cycle has `mEnd` but no `ovulationDate`? (follicular/luteal can't be computed)
   - A cycle has `ovulationDate` but no `mEnd`? (period length unknown)
   - Only one cycle exists? (no previous cycle for cycle length)
   - **The code handles some of these** (the outline shows conditional logic), but the exact behavior wasn't fully traced.

10. **How accurate is the date parsing in `normalizeDateInput`?** The function handles ISO dates, "January 28" style, "Jan 28" style, and MM/DD/YYYY. But what about:
    - "28th of January" → likely fails
    - "1/28/2026" → ambiguous (MM/DD vs DD/MM depending on locale)
    - "2026-01-28T12:00:00Z" → ISO with time component → likely parsed by the first regex
    - **The NLP layer (Grok-4.3) is expected to normalize dates to YYYY-MM-DD before calling tools**, so many edge cases are handled upstream. But the tool functions still accept free-form input as a fallback.

11. **Are the Supermemory v4 API calls correct?** The code uses `POST https://api.supermemory.ai/v4/search` and `POST https://api.supermemory.ai/v4/memories`. The AGENTS.md specifies v4 endpoints. But there's no versioned SDK — just raw `fetch()` calls. If Supermemory changes their API, these will silently break. **No error handling beyond try/catch returning empty string.**

12. **What's the actual model behind `x-ai/grok-4.3`?** The HackClub AI proxy maps model IDs to underlying models. The code assumes this maps to a capable chat model, but there's no documentation of what Grok-4.3 actually is, its context window, or its capabilities. **Dependent on third-party proxy behavior.**

### Methodological Questions for Future Work

1. **Validation framework needed.** The engine has zero tests. No synthetic data validation, no backtesting against known cycle patterns, no comparison to other methods (rolling average, Clue's Poisson model, etc.).

2. **Sensitivity analysis on priors.** How much do predictions change when PCOS prior moves from 51d to 41d (the Gemini estimate) or 40d (the ChatGPT estimate)? The 10d difference in prior mean could significantly affect cold-start predictions.

3. **Condition change detection.** The engine should detect when a user's observed cycles are consistently inconsistent with their condition prior (e.g., a "PCOS" user with regular 28-day cycles) and either suggest a condition update or adaptively reduce the prior's influence.

4. **Stratified perimenopause model.** The STRAW staging system provides clear markers (≥7d cycle-to-cycle change for early transition, ≥60d amenorrhea for late transition). These could be detected from logged data and used to switch priors automatically.

5. **Hypo/hyper thyroid discrimination.** The current blended thyroid prior is a poor compromise. A simple UI toggle would allow dramatically better priors.

6. **Extended/continuous hormonal BC regimens.** The current prior assumes 28-day cycles, but extended regimens (84/7, continuous) are increasingly common. The engine should detect regimen type from cycle patterns or explicit user input.

---

## Appendix: File Inventory

| File | Lines | Role |
|---|---|---|
| `src/lib/prediction/engine.ts` | 442 | Core prediction engine |
| `src/lib/cycle-tools.ts` | 1084 | AI tools + cycle management |
| `src/app/api/chat/route.ts` | 800 | Chat API + streaming |
| `src/lib/chat/prompt.ts` | 333 | System prompt |
| `src/app/api/data/import/route.ts` | 459 | Multi-format import |
| `src/lib/email/index.ts` | 526 | Email templates |
| `src/app/(app)/dashboard/page.tsx` | 334 | Dashboard server component |
| `src/app/api/user/profile/route.ts` | 219 | Profile CRUD |
| `src/lib/db/schema.ts` | 164 | Database schema (8 tables) |
| `src/lib/changelog.ts` | 162 | Version history |
| `src/app/api/user/onboarding/route.ts` | 122 | Onboarding flow |
| `src/lib/chat/models.ts` | 76 | Plan-tier config |
| `src/auth.ts` | 76 | Auth.js config |
| `src/lib/chat/images.ts` | 73 | Image storage |
| `src/lib/rate-limit.ts` | 66 | Rate limiter |
| `src/middleware.ts` | 68 | Auth middleware |
| `src/lib/schemas/auth.ts` | 44 | Zod schemas |
| `src/lib/theme/accent.ts` | 42 | Accent colors |
| `src/app/api/cron/cleanup-images/route.ts` | 37 | Image cleanup cron |
| `next.config.ts` | 36 | Next.js config |
| `src/app/api/data/export/route.ts` | 31 | JSON export |
| `src/lib/utils.ts` | 20 | Utilities |
| `src/lib/chat/openui.ts` | 4 | OpenUI detection |
| `package.json` | 89 | Dependencies |
| **Total** | **5307** | |
