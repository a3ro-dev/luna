# Luna Project — Comprehensive Source Index

> Last updated: 2026-05-06 · Repository version: v0.7.0 (commit 23a0e8e)

---

## Category 1: Source Code References

All paths relative to repository root. Line counts from final commit (23a0e8e).

| File | Description | Lines |
|---|---|---|
| `src/lib/prediction/engine.ts` | Condition-aware adaptive exponential smoothing engine. Contains 7 condition-specific priors, population prior, `resolveEffectivePrior()`, `skipGate()`, `exponentialSmooth()`, `blendWithPrior()`, `calculateJackknifeCI()`, `predictNextCycle()`. | 442 |
| `src/lib/cycle-tools.ts` | 10 AI tools for cycle logging, prediction, stats. Date parsing, timezone resolution, note merging, `refreshCycleAnalytics()`, `refreshPredictionParam()`, `buildPredictionPayload()`, `buildAveragesFromParams()`, all tool entry functions. | 1084 |
| `src/app/api/chat/route.ts` | Chat streaming API with context assembly (recent messages + summary + keyword snippets + Supermemory recall), 10 tool definitions, AI tracing (cost, latency, tokens), session management, auto-summarization, image upload handling. | 800 |
| `src/lib/db/schema.ts` | Drizzle ORM schema for 8 tables: `users`, `cycles`, `predictionParams`, `aiTraces`, `chatSessions`, `chatMessages`, `chatSummaries`, `uploadedImages`. Custom `pgDate` type for Neon Date-object bug. | 164 |
| `src/lib/chat/prompt.ts` | Base system prompt with OpenUI DSL specification, condition-aware prediction context, persona integration. | 333 |
| `src/lib/chat/models.ts` | Plan-tier model configuration. Same model (`x-ai/grok-4.3`) for all tiers; differences are persona prompts (free=practical, premium=warm, premium+=empathetic). | 76 |
| `src/lib/chat/openui.ts` | OpenUI language detection via `looksLikeOpenUiLang()` — checks if text starts with `root =`. | 4 |
| `src/lib/chat/images.ts` | Image storage with 7-day TTL. `storeImage()`, `cleanupExpiredImages()`, `getImage()` with expiry check. | 73 |
| `src/lib/email/index.ts` | Resend email templates: welcome, login notification (with IP geolocation + user-agent parsing), password reset, OTP, subscription request. HTML shell with inline styles. | 526 |
| `src/lib/schemas/auth.ts` | Zod validation schemas for registration, password reset, profile update, and onboarding. Password max 128 chars (bcrypt DoS prevention). | 44 |
| `src/lib/theme/accent.ts` | Plan-based accent colors: free=#FFB5C0 (pink), premium=#B8A9E8 (purple), premium+=#E8C547 (gold). | 42 |
| `src/lib/rate-limit.ts` | In-memory sliding-window rate limiter. Auto-cleanup every 5 minutes. Per-process only (not cross-instance in serverless). | 66 |
| `src/lib/utils.ts` | `cn()` (clsx + tailwind-merge) and `logError()` (full object in dev, message-only in prod). | 20 |
| `src/lib/changelog.ts` | Version history from 0.0.1 (2026-05-04, project init) through 0.7.0 (2026-05-06, condition-aware engine). | 162 |
| `src/auth.ts` | Auth.js v5 config with credentials provider (email + password), JWT strategy, DrizzleAdapter, user-existence check on every token refresh. | 76 |
| `src/middleware.ts` | Auth middleware with route protection, rate limiting on login (5 req/60s per IP), public/cron/api route exemptions. | 68 |
| `src/app/(app)/dashboard/page.tsx` | Server-rendered dashboard with condition-aware predictions. Fetches user conditions, computes predictions via `predictNextCycle()`, renders calendar with phase color-coding. | 334 |
| `src/app/api/data/import/route.ts` | Multi-format cycle data import: Luna JSON, Period Calendar, Clue CSV, Flo CSV/TXT, Apple Health XML. Timezone-safe date parsing. | 459 |
| `src/app/api/data/export/route.ts` | JSON cycle data export (all user cycles, ascending by mStart). | 31 |
| `src/app/api/cron/cleanup-images/route.ts` | Cron job for expired image cleanup. Bearer token auth via CRON_SECRET. | 37 |
| `src/app/api/user/profile/route.ts` | Profile CRUD with DOB edit limits (max 2 edits after initial set), email uniqueness check, password change with current-password verification. | 219 |
| `src/app/api/user/onboarding/route.ts` | Onboarding flow: DOB, timezone, conditions, push notifications. DOB first-set doesn't count as edit. | 122 |
| `next.config.ts` | Security headers (CSP, HSTS, X-Frame-Options: DENY, etc.), `serverExternalPackages: ['@opentelemetry/api']`. | 36 |
| `package.json` | Dependencies and scripts. Key deps: Next.js 16.2.4, AI SDK v6, Auth.js 5.0.0-beta.31, Drizzle 0.45.2, React 19. | 89 |

---

## Category 2: Git History

Key commits from the `main` branch, May 4–6, 2026. Repository: `github.com/a3ro-dev/luna`.

| Hash | Date | Message |
|---|---|---|
| `23a0e8e` | 2026-05-06 | chore: add v0.7.0 changelog entry |
| `468da80` | 2026-05-06 | feat: condition-aware prediction engine and Luna AI responses |
| `e43f9d9` | 2026-05-06 | fix: correct Grok-4.3 pricing to $0.25/M input, $0.50/M output tokens |
| `4c945ef` | 2026-05-06 | Merge pull request #1 from a3ro-dev/luna-rewrite-pub |
| `885f204` | 2026-05-06 | fix: disable Vercel fetch cache on Neon driver (fetchOptions cache: no-store) |
| `be5575d` | 2026-05-06 | fix: pgDate custom type kills the Neon Date-object bug once and for all |
| `e94b6a6` | 2026-05-06 | fix: harden chat mobile rendering and collapse raw tool payloads |
| `9f8cc56` | 2026-05-06 | fix: dashboard cycles count caching, Neon date timezone bugs, import date parsing |
| `297f119` | 2026-05-05 | fix: period length off-by-one, dashboard count, favicon, chat mobile nav |
| `fdcad22` | 2026-05-05 | feat: auth improvements, rate limiting, schemas, middleware, next config cleanup |
| `2800de1` | 2026-05-05 | chore: upgrade Next.js 15.0.0 → 16.2.4, remove deprecated eslint config |
| `8a18915` | 2026-05-05 | feat: dashboard motion redesign, single-model tiers, design docs, polish |
| `9220de9` | 2026-05-05 | feat: onboarding, tiered plans, password reset, email system, image storage, changelog |
| `484b970` | 2026-05-05 | fix: AI SDK v6 migration, Supermemory v4 API, HackClub web search, auto-rename |
| `4c3f753` | 2026-05-05 | feat: implement AI chat interface with context-aware tools and session memory management |
| `59da12e` | 2026-05-05 | feat: implement agent-based NLP chat tools and OpenUI rendering for cycle tracking and predictions |
| `934e96f` | 2026-05-05 | feat: implement cycle prediction and calendar display |
| `c148058` | 2026-05-04 | feat: implement scroll-triggered GSAP animations and canvas-based frame sequencing |
| `0f0d856` | 2026-05-04 | Initial commit from Create Next App |

### Development Timeline Summary

- **Day 1 (May 4):** Project initialization, landing page with GSAP animations, canvas frame sequencing
- **Day 2 (May 5):** Auth system, cycle prediction engine, AI chat with tools, AI SDK v6, Supermemory, onboarding, email, dashboard redesign — ~18 feature commits
- **Day 3 (May 6):** Condition-aware engine (v0.7.0), Neon/Date bug fixes, pricing correction, Vercel cache fix — merge of rewrite-pub branch

---

## Category 3: Internal Research Documents

Located in `/research/` at repository root.

| File | Summary | Evidence Quality Assessment |
|---|---|---|
| `research/chatgpt-deep-research.md` | Menstrual cycle statistics by condition (PCOS, PCOD, endo, thyroid, hormonal BC, irregular, perimenopause). Provides mean±SD tables for each condition. Most values marked "Low" evidence quality. PCOS cycle length estimated ~40d (SD ~15d) from diagnostic criteria, not cohort data. PCOD treated as identical to PCOS. Thyroid hypo vs hyper split with directional data only. Perimenopause mid-transition ~45d (SD ~20d). Hormonal BC withdrawal bleed ~4d (SD ~1d). Irregular catch-all ~30d (SD ~15d). | **Low** for most condition-specific values. Estimates derived from clinical criteria and general knowledge rather than large condition-specific cohorts. Hormonal BC values are more reliable. |
| `research/gemini-deep-research.md` | Clinical population priors and algorithmic framework. Discusses departure from 28-day baseline, condition-aware modeling, adaptive α parameter tuning. Provides detailed pathophysiology for each condition. PCOS: 41d mean (SD 13.7) from "Large Digital Cohort" (likely AWHS). PCOD: 72.5d mean (SD 25) from Indian regional cohort. Endometriosis: 28.3d mean (SD 3.8). Thyroid split into hypo (31d) vs hyper (27d). Perimenopause split into early (26.5d, SD 7) and late (80.1d, SD 55) transition. Suggests α inversely proportional to condition SD. | **Variable.** PCOS/endo/thyroid/irregular values are directional or from small N. PCOD 72.5d is from a single regional cohort — not generalizable. Perimenopause split into early/late is well-sourced (STRAW/SWAN) but phase lengths are extrapolated. |
| `research/perplexit-deep-research.md` | Detailed condition-specific priors with quantitative tables and explicit evidence quality ratings. Najmabadi et al. pooled cohort data for general population. Perimenopause from Holman 2006 (Treloar/Tremin re-analysis) with year-by-year means: -4yr: 30.48d, -3yr: 35.02d, -2yr: 45.15d, -1yr: 80.22d. PCOS from Nutrients 2026 trial (51±15d, N=10 PCOS) and MOS2 cohort (range 21-111d). Endometriosis: OR data only (≤27d OR 1.22), no distributional data. Thyroid: no published mean±SD, directional only. Hormonal BC: RCT data for withdrawal bleeds (4.4-5.2d, SD 1.5-2.2). Irregular: no PCOS-excluded distributions. Explicitly flags where chains break. | **Highest quality of the three.** Clearly distinguishes high/medium/low evidence. Transparent about what's missing. Najmabadi and Holman data are well-sourced. Condition-specific data honestly assessed as mostly low evidence. |

### Cross-Source Comparison: Key Metrics

| Metric | ChatGPT | Gemini | Perplexity | **Implemented** |
|---|---|---|---|---|
| General cycle length | ~28d (assumed) | — | 30.3 ± 6.7d (Najmabadi) | **30.3 (σ=6.7)** |
| PCOS cycle length | ~40 ± 15 | 41 ± 13.7 | 51 ± 15 (Nutrients 2026) | **51 (σ=15)** |
| PCOD cycle length | ~40 ± 15 (same as PCOS) | 72.5 ± 25 | No separate data | **45 (σ=13)** — interpolated |
| Endometriosis cycle length | ~26 ± 3 | 28.3 ± 3.8 | OR data only | **27 (σ=4)** |
| Perimenopause cycle length | ~45 ± 20 | Early: 26.5, Late: 80.1 | -4yr: 30.5, -1yr: 80.2 | **45 (σ=20)** |
| Hormonal BC bleed length | ~4 ± 1 | ~4 ± 1 | 4.5-5.2 ± 1.5-2.2 | **4.5 (σ=1.5)** |

---

## Category 4: External Academic Sources

### 4.1 Directly Cited (with access to original)

- **Najmabadi et al.** Pooled 3 prospective cohorts, 581 eumenorrheic women, 3,324 cycles. Cycle length mean 30.3d (SD 6.7), period 6.2d (SD 1.5), follicular 18.5d (SD 6.5), luteal 11.7d (SD 2.8). Used as the general population prior in `POPULATION_PRIOR`. [As cited in Perplexity research; original paper not directly accessed]

- **Holman 2006** (Treloar/Tremin re-analysis): Perimenopause cycle lengths — -4yr: 30.48d, -3yr: 35.02d, -2yr: 45.15d, -1yr: 80.22d. Published in *Fertility and Sterility*. Used for `CONDITION_PRIORS.perimenopause`. [As cited in Perplexity research]

### 4.2 Indirectly Cited (via research documents, not accessed)

- **Nutrients 2026 hypocaloric-diet trial**: PCOS baseline MCL 51±15d in 10 PCOS vs 30±2 in 18 BMI-matched controls. Used for `CONDITION_PRIORS.pcos.cycleLength`. Small N (10 PCOS subjects). [As cited in Perplexity research]

- **MOS2 PCOS community cohort**: Cycle range 21-111 days in PCOS women. Used to justify `maxCycleLength: 120` for PCOS prior. [As cited in Perplexity research]

- **Meta-analysis of 11 case-control studies**: Endometriosis short cycles ≤27d OR 1.22 (95% CI: 1.05-1.43). Used directionally for endometriosis prior (shorter cycles, heavier bleeding). No distributional data. [As cited in Perplexity research]

- **RCTs of monophasic 21/7 and 24/4 combined pills**: Withdrawal bleed 4.4-5.2d (SD 1.5-2.2). Used for `CONDITION_PRIORS.hormonal_bc.periodLength`. [As cited in Perplexity research]

- **Fukaya et al. (2016)**: "The forecasting of menstruation based on a state-space modeling of basal body temperature time series." arXiv:1606.02536. Bayesian state-space model for BBT-based menstrual forecasting. Not implemented in Luna; cited as related work.

### 4.3 Referenced but Not Directly Used in Implementation

- **SWAN and ReSTAGE studies**: Menopause transition markers, STRAW criteria. Cited in Gemini and Perplexity research for perimenopause staging. Luna uses a single blended perimenopause prior rather than STRAW-staged priors.

- **ACOG/WHO menstrual cycle definitions**: Normal cycle 21-35 days (some sources 24-38), 2-7 day bleed. Cited as baseline definition in all three research documents. Luna's general population prior (30.3d) aligns with these ranges.

- **Apple Women's Health Study (AWHS)**: Large digital cohort. Cited in Gemini research for PCOS mean (41d) and irregular mean (37.04d). Not used directly in Luna's implementation.

### 4.4 Traceability Matrix: Prior → Source

| Prior Value | Source | Chain Strength |
|---|---|---|
| `POPULATION_PRIOR.cycleLength` = 30.3 ± 6.7 | Najmabadi et al. → Perplexity → engine.ts | **Strong** (pooled cohort, N=581) |
| `POPULATION_PRIOR.periodLength` = 6.2 ± 1.5 | Najmabadi et al. → Perplexity → engine.ts | **Strong** |
| `POPULATION_PRIOR.follicularLength` = 18.5 ± 6.5 | Najmabadi et al. → Perplexity → engine.ts | **Strong** |
| `POPULATION_PRIOR.lutealLength` = 12.0 ± 2.8 | Najmabadi et al. (11.7) → adjusted to 12.0 | **Moderate** (slight upward adjustment, reason undocumented) |
| `pcos.cycleLength` = 51 ± 15 | Nutrients 2026 (N=10) → Perplexity → engine.ts | **Weak** (very small N) |
| `pcos.maxCycleLength` = 120 | MOS2 (observed 111) → +9d buffer → engine.ts | **Moderate** (empirical max + buffer) |
| `pcod.cycleLength` = 45 ± 13 | Interpolation (no PCOD-specific data) | **Very weak** (fabricated prior) |
| `endometriosis.cycleLength` = 27 ± 4 | OR data (≤27d OR 1.22) → estimated mean+SD | **Weak** (OR ≠ distribution) |
| `thyroid.cycleLength` = 35 ± 15 | Directional only (no published mean±SD) | **Very weak** (estimated) |
| `hormonal_bc.cycleLength` = 28 ± 1 | Regimen design + RCT bleed data | **Strong** (by design) |
| `hormonal_bc.periodLength` = 4.5 ± 1.5 | RCTs (4.4-5.2d, SD 1.5-2.2) → midpoint | **Strong** |
| `irregular.cycleLength` = 30 ± 15 | General population mean + inflated SD | **Very weak** (no PCOS-excluded distributions) |
| `perimenopause.cycleLength` = 45 ± 20 | Holman 2006 (-4yr to -1yr blend) | **Moderate** (blended across stages, SD estimated) |

---

## Category 5: Commercial Tracker Sources

### Clue (helloclue.com)

- Evidence-based design approach with public methodology discussion.
- **Li et al. / Urteaga et al.** probabilistic forecasting papers. Uses generalized Poisson models, probabilistic predictive distributions, calibration metrics (MAE, CRPS, Brier score).
- Explicitly models distinction between missing logs and true long cycles.
- No public PCOS-specific model disclosed.
- Most methodologically sophisticated published commercial system.

### Natural Cycles

- FDA De Novo review DEN170052. Only FDA-cleared contraceptive app.
- Validated on >22,000 women, >224,000 cycles.
- Uses BBT + statistical inference. Pearl Index effectiveness metrics.
- Expands unsafe days when uncertain.
- Does not publicly disclose a PCOS engine.
- Most clinically rigorous tracker in market.

### Flo Health (flo.health)

- ML-based personalization, neural network forecasting per their accuracy page.
- No peer-reviewed algorithmic disclosure.
- Widens fertile window under irregularity but no open calibration benchmarks.
- Proprietary and opaque.

### drip (github.com/jfr3000/drip)

- Open-source symptothermal tracker.
- Rule-based, deterministic logic (no probabilistic forecasting).
- No population priors, no uncertainty estimation, no PCOS handling.
- Minimal baseline for comparison.

---

## Category 6: Wikipedia / General Reference

- **Wikipedia "Menstrual cycle"**: Median length 28 days, normal range 21-35 days, population average 27-29 days. Luteal phase ~14 days. Only 2/3 of overtly normal cycles are ovulatory. Used as background context only; not directly cited in implementation.

---

## Evidence Quality Summary

Most condition-specific priors are **LOW** evidence quality per the research documents:

| Condition | Cycle Length | Bleeding/Phase | Overall Assessment |
|---|---|---|---|
| PCOS | Medium (small trial + diagnostic criteria + MOS2) | Low (no large PCOS-specific datasets) | **Medium-Low** |
| PCOD | Very Low (no separate data; interpolated from PCOS) | Very Low | **Very Low** |
| Endometriosis | Low (mostly OR data, not distributional) | Low | **Low** |
| Thyroid | Very Low (no published mean±SD, directional only) | Low | **Very Low** |
| Hormonal BC | High (by regimen design + RCTs for bleed length) | High | **High** |
| Irregular | Very Low (heterogeneous catch-all, no PCOS-excluded distributions) | Low | **Very Low** |
| Perimenopause | Medium-High (Tremin/SWAN cohorts for cycle length) | Low (for other metrics) | **Medium** |

### Key Gaps

1. **No PCOD-specific data.** The PCOD prior (45d, σ=13) is an interpolation between PCOS and general population with no published evidence.
2. **No thyroid mean±SD.** The thyroid prior is estimated from directional data only (hypo→longer, hyper→shorter).
3. **Endometriosis OR ≠ distribution.** The OR of 1.22 for short cycles does not provide a mean or SD for cycle length.
4. **Irregular is undefined.** The "irregular" catch-all has no PCOS/thyroid-excluded distributions; it uses general population means with inflated variance.
5. **Perimenopause is a blend.** The single perimenopause prior blends early and late transition, which have fundamentally different distributions (30d vs 80d). STRAW staging would improve this.
6. **Luteal phase is assumed near-normal across all conditions.** This is a biological constraint (corpus luteum lifespan ~11-17 days), but data for condition-specific luteal distributions are essentially absent.
