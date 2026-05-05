# Luna Rewrite -- PRD \& Technical Specification

**Version:** 1.0
**Date:** 2026-05-04
**Stack:** Next.js · Neon PostgreSQL · Auth.js · HackClub AI API · Supermemory · Vercel
**Aesthetic:** Girly, minimal, soft, beautiful

***

## Part 1: Product Requirements Document (PRD)

### 1.1 Problem Statement

Luna (Discord bot, v1) proved that cycle tracking + AI conversation is a wanted UX. The Discord interface is limiting -- it constrains visual design, auth, session memory, and multi-modal input. The rewrite moves to a web app with a proper prediction engine, persistent memory per user, and a truly beautiful interface that feels like it was designed for the person using it.

### 1.2 Goals

- Deliver accurate next-period and ovulation predictions using the improved adaptive smoothing algorithm with skip detection and population priors
- Provide a persistent AI companion that remembers the user across sessions (via Supermemory)
- Support natural language logging, image input (e.g., photos of test strips, symptoms, handwritten notes), and web search
- Track API usage transparently using HackClub AI stats endpoint for cost efficiency
- Be beautiful -- not "productivity app beautiful", but soft, warm, feminine-minimal beautiful


### 1.3 Non-Goals (v1)

- No multi-user sharing or partner access
- No wearable/sensor integrations
- No clinical-grade outputs or medical advice framing
- No mobile app (PWA is acceptable as stretch goal)


### 1.4 Users

Single user type: a person tracking their own menstrual cycle. Auth is per-account. Data is strictly private.

### 1.5 Core Features

#### F1 -- Cycle Logging

- Log period start, period end, ovulation date
- Via slash command in chat (natural language) or a dedicated log UI
- Image input accepted: user can upload a photo (OPK strip, handwritten journal, symptom screenshot) -- max 4 images per message, 10 per chat context window


#### F2 -- Predictions

- Next period start date with confidence interval
- Ovulation date with confidence interval
- Adaptive α exponential smoother + population prior cold-start + skip/anomaly gate
- Displayed as a soft calendar view and a text summary


#### F3 -- AI Companion (Chat)

- Powered by HackClub AI API (OpenAI-compatible, OpenRouter proxy)
- Model: `x-ai/grok-4.3` via HackClub AI proxy (rename uses `~anthropic/claude-haiku-latest`)
- Persistent memory via Supermemory v4: the agent remembers personal facts (health conditions, preferences), NOT cycle data or messages
- Web search enabled for questions like "what does mid-cycle spotting mean?" using HackClub AI web search
- Streaming responses via SSE


#### F4 -- Calendar View

- Monthly calendar with phase color coding (menstrual / follicular / ovulatory / luteal)
- Predicted days shown in a lighter, dashed style distinct from confirmed days
- Click a day to add a note or log an event


#### F5 -- Stats Dashboard

- Average cycle length, average period length, variability trend
- Simple sparkline charts (shadcn + recharts)
- Soft, card-based layout


#### F6 -- Usage Tracing (Internal)

- Every AI call logs: model, input tokens, output tokens, cost estimate, latency
- Stored in `ai_traces` table (not pulled from HackClub `/api/stats`)
- Fields: model, inputTokens, outputTokens, costUsd, latencyMs, feature, hasImages, hadWebSearch
- Cost formula: `(inputTokens × 0.0001 + outputTokens × 0.0002) / 1000` (rough USD)


#### F7 -- Auth

- Auth.js (NextAuth v5)
- Provider: Credentials only (email + password via `bcryptjs`)
- JWT session strategy (required for Credentials provider)
- Session max age: 30 days
- Custom sign-in page: `/login`
- Adapter: DrizzleAdapter (Neon PostgreSQL)


### 1.6 Design Principles

- **Soft palette:** blush pinks, warm creams, dusty mauves, sage -- never harsh white or electric accent
- **Typography:** delicate but readable -- `Instrument Serif` for display, `DM Sans` for body
- **Motion:** gentle fades, soft spring transitions -- no hard snaps
- **Density:** spacious. Breathing room everywhere. Data never crowded.
- **Components:** shadcn/ui base, customised with the soft palette. No out-of-the-box shadcn defaults.

***

## Part 2: Technical Specification

### 2.1 System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Vercel Edge                       │
│                                                          │
│  ┌─────────────────┐     ┌──────────────────────────┐   │
│  │   Next.js App   │     │    Next.js API Routes    │   │
│  │  (App Router)   │────▶│  /api/chat               │   │
│  │                 │     │  /api/log                │   │
│  │  shadcn/ui      │     │  /api/predict            │   │
│  │  Tailwind v4    │     │  /api/calendar           │   │
│  └─────────────────┘     │  /api/stats              │   │
│                           │  /api/auth/[...nextauth] │   │
│                           └──────────┬───────────────┘   │
└──────────────────────────────────────┼───────────────────┘
                                       │
              ┌────────────────────────┼──────────────────┐
              │                        │                   │
              ▼                        ▼                   ▼
   ┌──────────────────┐   ┌────────────────────┐  ┌──────────────┐
   │   Neon Postgres  │   │  HackClub AI API   │  │ Supermemory  │
   │                  │   │  ai.hackclub.com   │  │   Memory     │
   │  - users         │   │                   │  │   API        │
   │  - cycles        │   │  - chat/completions│  │             │
   │  - prediction_   │   │  - web search      │  │  per-user   │
   │    params        │   │  - image input     │  │  context    │
   │  - ai_traces     │   │  - /api/stats      │  │  profiles   │
   │  - sessions      │   └────────────────────┘  └──────────────┘
   └──────────────────┘
```


### 2.2 Tech Stack

| Layer | Choice | Rationale |
| :-- | :-- | :-- |
| Framework | Next.js 15.0.0 (App Router) | SSR + API routes in one, Vercel-native |
| UI | Tailwind v4 + AI Elements + OpenUI + shadcn | Composable, unstyled base -- full palette control + structured AI rendering |
| Auth | Auth.js v5 (NextAuth) — Credentials only | Email + password, JWT strategy, DrizzleAdapter |
| Database | Neon PostgreSQL | Serverless, branching, free tier generous |
| ORM | Drizzle ORM | Type-safe, lightweight, pairs well with Neon |
| AI SDK | Vercel AI SDK v6 | `streamText`, `tool`, `stepCountIs`, `convertToModelMessages` |
| AI API | HackClub AI proxy | `x-ai/grok-4.3` for chat, `~anthropic/claude-haiku-latest` for rename |
| Memory | Supermemory v4 API | Per-user persistent memory, semantic search |
| Search | HackClub Search API | `GET https://search.hackclub.com/res/v1/web/search` |
| Hosting | Vercel | Zero-config Next.js deploy |

### 2.3 Database Schema (Drizzle)

```typescript
// schema.ts

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  name: text("name"),
  image: text("image"),
  timezone: text("timezone").default("UTC"),
  weekStart: integer("week_start").default(1), // 0=Sun, 1=Mon
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const cycles = pgTable("cycles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mStart: date("m_start").notNull(),
  mEnd: date("m_end"),
  ovulationDate: date("ovulation_date"),
  cycleLength: integer("cycle_length"),       // derived: this.mStart - prev.mStart
  periodLength: integer("period_length"),     // derived: mEnd - mStart
  follicularLength: integer("follicular_length"), // derived: ovulation - mEnd
  lutealLength: integer("luteal_length"),     // derived: nextStart - ovulation
  isAnomaly: boolean("is_anomaly").default(false), // flagged by skip gate
  notes: jsonb("notes").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const predictionParams = pgTable("prediction_params", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  paramName: text("param_name").notNull(),    // cycle_length | period_length | follicular | luteal | alpha
  smoothedValue: real("smoothed_value").notNull(),
  variance: real("variance").notNull().default(0),
  sampleCount: integer("sample_count").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (t) => ({
  userParamUnique: unique().on(t.userId, t.paramName),
}));

export const aiTraces = pgTable("ai_traces", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  model: text("model").notNull(),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  costUsd: real("cost_usd"),
  latencyMs: integer("latency_ms"),
  feature: text("feature").notNull(), // "chat" | "predict" | "log_parse" | "web_search"
  hasImages: boolean("has_images").default(false),
  hadWebSearch: boolean("had_web_search").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
```


### 2.4 Prediction Engine (TypeScript Port)

```typescript
// lib/prediction/engine.ts

const POPULATION_PRIOR = {
  cycleLength:      { mean: 28.0, variance: 12.25 }, // σ=3.5d, from ACOG population data
  periodLength:     { mean: 5.0,  variance: 2.25  }, // σ=1.5d
  follicularLength: { mean: 16.0, variance: 9.0   }, // σ=3.0d
  lutealLength:     { mean: 12.0, variance: 4.0   }, // σ=2.0d
};

const ALPHA_MIN = 0.1;
const ALPHA_MAX = 0.5;
const KAPPA = 5.0;           // MAD scale for adaptive alpha
const SKIP_THRESHOLD = 45;   // days -- cycles longer than this are likely missed logs
const OUTLIER_SIGMA = 2.5;   // soft-clamp gate width

// Adaptive alpha based on recent residual MAD
function computeAdaptiveAlpha(residuals: number[]): number {
  if (residuals.length === 0) return 0.3; // cold start default
  const mad = residuals.reduce((a, b) => a + Math.abs(b), 0) / residuals.length;
  return ALPHA_MIN + (ALPHA_MAX - ALPHA_MIN) * (mad / (mad + KAPPA));
}

// Inverse-variance blending with population prior
function blendWithPrior(
  userMean: number,
  userVariance: number,
  n: number,
  metric: keyof typeof POPULATION_PRIOR
): { mean: number; variance: number } {
  if (n >= 6) return { mean: userMean, variance: userVariance }; // prior fades out
  const prior = POPULATION_PRIOR[metric];
  const priorWeight = 1 / prior.variance;
  const userWeight = n > 0 ? 1 / Math.max(userVariance, 0.01) : 0;
  const blendedMean = (priorWeight * prior.mean + userWeight * userMean)
                      / (priorWeight + userWeight);
  const blendedVariance = 1 / (priorWeight + userWeight);
  return { mean: blendedMean, variance: blendedVariance };
}

// Skip/anomaly gate -- soft-clamp extreme values before updating smoother
function skipGate(
  value: number,
  smoothed: number,
  variance: number,
  threshold: number
): { value: number; isAnomaly: boolean } {
  if (value > SKIP_THRESHOLD) {
    return { value: smoothed, isAnomaly: true }; // likely missed log -- ignore for smoother
  }
  const sigma = Math.sqrt(Math.max(variance, 0.01));
  const delta = value - smoothed;
  if (Math.abs(delta) > OUTLIER_SIGMA * sigma) {
    // Soft clamp: pull toward mean
    const clamped = smoothed + Math.sign(delta) * OUTLIER_SIGMA * sigma;
    return { value: clamped, isAnomaly: true };
  }
  return { value, isAnomaly: false };
}

// Core smoother -- returns new smoothed value and variance
function exponentialSmooth(
  observations: number[], // oldest → newest
  alpha: number
): { smoothed: number; variance: number } {
  if (observations.length === 0) return { smoothed: 0, variance: 0 };
  let smoothed = observations[0]```

