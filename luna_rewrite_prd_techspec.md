# Luna Rewrite — PRD & Technical Specification

**Version:** 1.0  
**Date:** 2026-05-04  
**Stack:** Next.js · Neon PostgreSQL · Auth.js · HackClub AI API · Supermemory · Vercel  
**Aesthetic:** Girly, minimal, soft, beautiful  

---

## Part 1: Product Requirements Document (PRD)

### 1.1 Problem Statement

Luna (Discord bot, v1) proved that cycle tracking + AI conversation is a wanted UX. The Discord interface is limiting — it constrains visual design, auth, session memory, and multi-modal input. The rewrite moves to a web app with a proper prediction engine, persistent memory per user, and a truly beautiful interface that feels like it was designed for the person using it.

### 1.2 Goals

- Deliver accurate next-period and ovulation predictions using the improved adaptive smoothing algorithm with skip detection and population priors
- Provide a persistent AI companion that remembers the user across sessions (via Supermemory)
- Support natural language logging, image input (e.g., photos of test strips, symptoms, handwritten notes), and web search
- Track API usage transparently using HackClub AI stats endpoint for cost efficiency
- Be beautiful — not "productivity app beautiful", but soft, warm, feminine-minimal beautiful

### 1.3 Non-Goals (v1)

- No multi-user sharing or partner access
- No wearable/sensor integrations
- No clinical-grade outputs or medical advice framing
- No mobile app (PWA is acceptable as stretch goal)

### 1.4 Users

Single user type: a person tracking their own menstrual cycle. Auth is per-account. Data is strictly private.

### 1.5 Core Features

#### F1 — Cycle Logging
- Log period start, period end, ovulation date
- Via slash command in chat (natural language) or a dedicated log UI
- Image input accepted: user can upload a photo (OPK strip, handwritten journal, symptom screenshot) — max 4 images per message, 10 per chat context window

#### F2 — Predictions
- Next period start date with confidence interval
- Ovulation date with confidence interval
- Adaptive α exponential smoother + population prior cold-start + skip/anomaly gate
- Displayed as a soft calendar view and a text summary

#### F3 — AI Companion (Chat)
- Powered by HackClub AI API (OpenAI-compatible, OpenRouter proxy)
- Recommended model: `meta-llama/llama-4-maverick` or `google/gemini-2.0-flash-001` (fast, cheap, multimodal)
- Persistent memory via Supermemory: the agent remembers symptoms, preferences, past conversations, logged notes
- Web search enabled for questions like "what does mid-cycle spotting mean?" using HackClub AI web search
- Streaming responses via SSE

#### F4 — Calendar View
- Monthly calendar with phase color coding (menstrual / follicular / ovulatory / luteal)
- Predicted days shown in a lighter, dashed style distinct from confirmed days
- Click a day to add a note or log an event

#### F5 — Stats Dashboard
- Average cycle length, average period length, variability trend
- Simple sparkline charts (shadcn + recharts)
- Soft, card-based layout

#### F6 — Usage Tracing (Internal)
- Every AI call logs: model, input tokens, output tokens, cost estimate, latency
- Pulled from HackClub AI `/api/stats` endpoint
- Shown to the user as a minimal "usage this month" pill in settings
- Used internally for efficiency monitoring — identify expensive prompts, slow models

#### F7 — Auth
- Auth.js (NextAuth v5)
- Providers: Google OAuth + email magic link
- Session stored in Neon PostgreSQL via Auth.js adapter

### 1.6 Design Principles

- **Soft palette:** blush pinks, warm creams, dusty mauves, sage — never harsh white or electric accent
- **Typography:** delicate but readable — `Instrument Serif` for display, `DM Sans` for body
- **Motion:** gentle fades, soft spring transitions — no hard snaps
- **Density:** spacious. Breathing room everywhere. Data never crowded.
- **Components:** shadcn/ui base, customised with the soft palette. No out-of-the-box shadcn defaults.

---

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
|---|---|---|
| Framework | Next.js 15 (App Router) | SSR + API routes in one, Vercel-native |
| UI | shadcn/ui + Tailwind v4 | Composable, unstyled base — full palette control |
| Auth | Auth.js v5 (NextAuth) | Google + magic link, built-in Neon adapter |
| Database | Neon PostgreSQL | Serverless, branching, free tier generous |
| ORM | Drizzle ORM | Type-safe, lightweight, pairs well with Neon |
| AI API | HackClub AI (OpenRouter proxy) | Free/cheap, OpenAI-compatible SDK |
| Memory | Supermemory API | Per-user persistent memory, semantic search |
| Hosting | Vercel | Zero-config Next.js deploy |
| Agent UI | OpenUI lang (stretch) | Dynamic UI component generation from LLM |

### 2.3 Database Schema (Drizzle)

```typescript
// schema.ts

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
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
const SKIP_THRESHOLD = 45;   // days — cycles longer than this are likely missed logs
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

// Skip/anomaly gate — soft-clamp extreme values before updating smoother
function skipGate(
  value: number,
  smoothed: number,
  variance: number,
  threshold: number
): { value: number; isAnomaly: boolean } {
  if (value > SKIP_THRESHOLD) {
    return { value: smoothed, isAnomaly: true }; // likely missed log — ignore for smoother
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

// Core smoother — returns new smoothed value and variance
function exponentialSmooth(
  observations: number[], // oldest → newest
  alpha: number
): { smoothed: number; variance: number } {
  if (observations.length === 0) return { smoothed: 0, variance: 0 };
  let smoothed = observations[0];
  const residuals: number[] = [];
  for (let i = 1; i < observations.length; i++) {
    const forecast = smoothed;
    smoothed = alpha * observations[i] + (1 - alpha) * smoothed;
    residuals.push(observations[i] - forecast);
  }
  const variance = residuals.length > 0
    ? residuals.reduce((a, b) => a + b * b, 0) / residuals.length
    : 0;
  return { smoothed, variance };
}

export interface Prediction {
  nextPeriodStart: Date;
  ovulationDate: Date;
  ciDays: number;           // ±days at 80% confidence
  isColstart: boolean;      // true if < 4 cycles (prior-dominated)
}

export function predict(
  cycles: { mStart: Date; cycleLength?: number; follicularLength?: number }[],
  params: Record<string, { smoothedValue: number; variance: number; sampleCount: number }>
): Prediction {
  const n = cycles.length;
  const lastStart = cycles[cycles.length - 1]?.mStart ?? new Date();

  // Pull smoothed cycle length
  const clParam = params["cycle_length"];
  const clBlended = blendWithPrior(
    clParam?.smoothedValue ?? POPULATION_PRIOR.cycleLength.mean,
    clParam?.variance ?? POPULATION_PRIOR.cycleLength.variance,
    clParam?.sampleCount ?? 0,
    "cycleLength"
  );

  const flParam = params["follicular_length"];
  const flBlended = blendWithPrior(
    flParam?.smoothedValue ?? POPULATION_PRIOR.follicularLength.mean,
    flParam?.variance ?? POPULATION_PRIOR.follicularLength.variance,
    flParam?.sampleCount ?? 0,
    "follicularLength"
  );

  // Confidence interval: jackknife for n>=6, else prior-derived
  const ciDays = n >= 6
    ? Math.round(1.28 * Math.sqrt(clBlended.variance)) // 80% CI
    : Math.round(1.28 * Math.sqrt(POPULATION_PRIOR.cycleLength.variance));

  const nextPeriodStart = new Date(lastStart);
  nextPeriodStart.setDate(nextPeriodStart.getDate() + Math.round(clBlended.mean));

  const ovulationDate = new Date(lastStart);
  ovulationDate.setDate(ovulationDate.getDate() + Math.round(flBlended.mean));

  return {
    nextPeriodStart,
    ovulationDate,
    ciDays: Math.max(1, ciDays),
    isColstart: n < 4,
  };
}
```

### 2.5 AI Chat Architecture

**Model selection:**
- Default: `meta-llama/llama-4-maverick` — fast, multimodal, good instruction following
- Fallback: `google/gemini-2.0-flash-001`
- Web search: pass `plugins: [{ id: "web_search" }]` in request body per HackClub docs

**System prompt strategy:**
```
You are Luna — a warm, caring health companion specialising in menstrual cycle tracking.
You are NOT a doctor. You help users understand their cycle, log events, and feel supported.
You have access to the user's cycle history and memory context (injected below).
You can search the web for general health information.
You accept images (max 4 per message): OPK strips, handwritten notes, symptom logs.
When the user implies a logging action, return a structured JSON tool call alongside your response.
```

**Supermemory integration:**
- On each chat message: query Supermemory with the message text → retrieve top-k relevant memories
- Inject memories into system prompt as `[MEMORY CONTEXT]` block
- After each assistant response: write key facts extracted to Supermemory (`POST /api/memory`)
- `containerTag` = `user.id` for strict per-user isolation

**Image handling:**
- Accept up to 4 images per message (base64 or URL)
- Track running image count per chat context — hard stop at 10 per context window
- Images sent as `content: [{ type: "image_url", ... }]` per OpenAI vision format

**Streaming:**
```typescript
// app/api/chat/route.ts
export async function POST(req: Request) {
  const { messages, images } = await req.json();
  const memories = await supermemory.search(messages.at(-1).content, userId);
  const systemPrompt = buildSystemPrompt(memories, userCycleContext);

  const response = await fetch("https://ai.hackclub.com/proxy/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.HACKCLUB_API_KEY}` },
    body: JSON.stringify({
      model: "meta-llama/llama-4-maverick",
      stream: true,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      plugins: webSearchEnabled ? [{ id: "web_search" }] : [],
    }),
  });

  // Pipe SSE stream directly to client + capture usage for tracing
  return new Response(response.body, {
    headers: { "Content-Type": "text/event-stream" },
  });
}
```

### 2.6 Usage Tracing

HackClub AI `/api/stats` returns aggregate token/cost data. Strategy:

1. Capture `usage` from each streaming response's final `[DONE]` chunk
2. Write to `ai_traces` table with model, feature tag, latency, cost estimate
3. Query `ai_traces` for per-user monthly rollup → show in Settings as a minimal pill:  
   `"This month: 42 conversations · ~$0.04"`
4. Server-side: alert if any single call exceeds 8k tokens (prompt engineering regression signal)

### 2.7 Route Structure

```
app/
├── (auth)/
│   ├── login/page.tsx
│   └── onboarding/page.tsx          ← first-time cycle history setup
├── (app)/
│   ├── layout.tsx                   ← sidebar nav, session guard
│   ├── dashboard/page.tsx           ← calendar + prediction cards
│   ├── chat/page.tsx                ← AI companion
│   ├── log/page.tsx                 ← manual logging UI
│   ├── stats/page.tsx               ← cycle statistics
│   └── settings/page.tsx            ← prefs + usage trace
├── api/
│   ├── auth/[...nextauth]/route.ts
│   ├── chat/route.ts                ← streaming AI endpoint
│   ├── log/route.ts                 ← cycle event logging
│   ├── predict/route.ts             ← prediction engine
│   ├── calendar/route.ts            ← calendar assembly
│   └── stats/route.ts               ← usage tracing rollup
└── lib/
    ├── prediction/engine.ts         ← algorithm (above)
    ├── db/schema.ts                 ← drizzle schema
    ├── memory/supermemory.ts        ← memory client
    └── ai/hackclub.ts               ← AI client wrapper + tracer
```

### 2.8 Design Tokens (Soft Palette)

```css
:root {
  /* Surfaces */
  --color-bg:              #fdf8f6;   /* warm off-white */
  --color-surface:         #fef3f0;   /* blush tint */
  --color-surface-2:       #fff9f8;
  --color-surface-offset:  #f5e8e4;   /* deeper blush */

  /* Text */
  --color-text:            #3d2c2c;   /* warm dark brown */
  --color-text-muted:      #9c7b7b;   /* dusty mauve */
  --color-text-faint:      #c4a8a8;

  /* Accent */
  --color-primary:         #c06b7a;   /* rose pink */
  --color-primary-hover:   #a85567;
  --color-primary-soft:    #f2d4da;   /* for badges, tags */

  /* Phase colours (calendar) */
  --phase-menstrual:       #e8a0a0;   /* soft red */
  --phase-follicular:      #a8c8a0;   /* sage green */
  --phase-ovulatory:       #f0c87a;   /* warm gold */
  --phase-luteal:          #b0a0d0;   /* lavender */
  --phase-predicted:       40% opacity version of each phase colour;

  /* Typography */
  --font-display: 'Instrument Serif', Georgia, serif;
  --font-body:    'DM Sans', 'Inter', sans-serif;
}
```

### 2.9 OpenUI Integration (Stretch Goal)

OpenUI lang allows the AI to generate UI components on the fly. Use it for:
- Dynamic symptom logging forms ("I want to log my mood and bloating today")
- Agent-generated summary cards after a chat session
- Keep it sandboxed in the chat view — never in the calendar or prediction views

Implementation: render OpenUI output in an isolated `<iframe>` or sandboxed `div` inside the chat message bubble. Never trust OpenUI output with DOM access outside its container.

### 2.10 Environment Variables

```bash
# Auth
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=

# Database
DATABASE_URL=                   # Neon postgres connection string

# AI
HACKCLUB_API_KEY=

# Memory
SUPERMEMORY_API_KEY=

# App
NEXT_PUBLIC_APP_URL=
```

---

## Part 3: Open Questions Before Sprint 1

1. **Model choice:** `llama-4-maverick` vs `gemini-2.0-flash` — do you want to benchmark both at the start, or pick one and commit?
2. **Onboarding:** If a user has existing Luna (Discord) data, do you want a CSV import flow?
3. **OpenUI:** Is this v1 scope or explicitly v2?
4. **Notifications:** Vercel Cron for period reminders — v1 or v2?
5. **Image limit UI:** 4/message + 10/context — surface this as a subtle counter in the chat input, or silent enforcement only?

