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
- Chat: `x-ai/grok-4.3` via HackClub AI proxy — fast, strong instruction following
- Rename: `~anthropic/claude-haiku-latest` via HackClub AI proxy — cheap, good for short titles

**Vercel AI SDK v6:**
- Uses `streamText()` with `convertToModelMessages()` for UIMessage → model message conversion
- `stopWhen: stepCountIs(8)` — allows up to 8 tool-calling rounds
- `result.toUIMessageStreamResponse()` streams back as UI Message stream for the `useChat` hook
- Usage fields: `usage.inputTokens` / `usage.outputTokens` (not `promptTokens`/`completionTokens`)

**10 AI Tools:**
| Tool | Purpose |
|---|---|
| `logPeriodStart` | Log period start date |
| `logPeriodEnd` | Log period end date |
| `logOvulation` | Log ovulation date |
| `addNoteSymptom` | Add free-text note or symptom to a cycle |
| `fetchRecentCycles` | Fetch recent cycles (returns OpenUI table) |
| `computePredictions` | Next period/ovulation predictions (returns OpenUI card) |
| `fetchStats` | Cycle statistics and averages (returns OpenUI card) |
| `exportData` | Return export link for user's cycle data |
| `rememberFact` | Store personal fact in Supermemory (not cycle data) |
| `searchWeb` | Search the web via HackClub Search API |

**System prompt:** `baseOpenUiPrompt` from `src/lib/chat/prompt.ts` — defines Luna's persona, tool routing table, `rememberFact` guidelines, and full OpenUI Lang DSL specification.

**Dynamic context (4 layers):**
1. Recent 20 messages from DB
2. Latest session summary (auto-generated after 30+ messages, delta 12+)
3. Keyword snippets (6 keywords from last message → 6 matching older messages)
4. Supermemory recall (top 5 memories via `POST /v4/search`)

**Supermemory v4 integration:**
- Recall: `POST https://api.supermemory.ai/v4/search` with `{ q, containerTag: userId, limit: 5, searchMode: "memories" }`
- Store: `POST https://api.supermemory.ai/v4/memories` with `{ containerTag: userId, memories: [{ content, isStatic }] }`
- Only stores personal profile facts (health conditions, life context, preferences) — NOT cycle data or chat messages
- `containerTag` = `userId` for per-user isolation

**Web search:**
- `searchWeb` tool calls `GET https://search.hackclub.com/res/v1/web/search?q=...&count=5`
- Auth: `Authorization: Bearer ${HACKCLUB_WEB_SEARCH_API_KEY}`
- Returns formatted markdown links with descriptions

**Image handling:**
- Accept up to 4 images per message via `FileUIPart` (type: "file", mediaType, url, filename)
- Images sent as data URLs via the UIMessage parts system

**Streaming:**
```typescript
// app/api/chat/route.ts
export async function POST(req: Request) {
  const { messages, sessionId, timezone } = await req.json();
  // ... auth, session resolution, context gathering ...

  const result = await streamText({
    model: hackClubAI.chat("x-ai/grok-4.3"),
    system: systemPrompt,
    messages: await convertToModelMessages(recentMessages),
    tools: createChatTools({ userId, timeZone }),
    stopWhen: stepCountIs(8),
    onFinish: async ({ usage, text, steps }) => {
      // Persist assistant message, bump session, maybe summarize, log trace
    },
  });

  return result.toUIMessageStreamResponse();
}
```

### 2.6 Usage Tracing

Every AI call is logged to the `ai_traces` table in the `onFinish` callback:

| Field | Source |
|---|---|
| `model` | `"x-ai/grok-4.3"` (hardcoded) |
| `inputTokens` | `usage.inputTokens ?? 0` |
| `outputTokens` | `usage.outputTokens ?? 0` |
| `costUsd` | Rough: `(input × 0.0001 + output × 0.0002) / 1000` |
| `latencyMs` | Wall-clock: `Date.now() - startTime` |
| `feature` | `"chat"` (hardcoded) |
| `hasImages` | `true` if any user message has a `file`-type part |
| `hadWebSearch` | `true` if any step used the `searchWeb` tool |

### 2.7 Route Structure

```
src/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx
│   │   └── chat/page.tsx                   ← AI companion (primary interface)
│   └── api/
│       ├── auth/[...nextauth]/route.ts     ← Auth.js handlers
│       ├── auth/register/route.ts          ← User registration
│       ├── chat/route.ts                   ← Streaming AI endpoint + 10 tools
│       └── chat/sessions/
│           ├── route.ts                    ← GET/POST sessions
│           └── [id]/
│               ├── route.ts                ← DELETE session
│               ├── messages/route.ts       ← GET session messages
│               └── rename/route.ts         ← POST AI-generate title
├── auth.ts                                 ← Auth.js config
├── components/
│   ├── ai-elements/                        ← Conversation, Message, PromptInput, etc.
│   └── ui/                                 ← shadcn components
└── lib/
    ├── chat/
    │   ├── prompt.ts                       ← System prompt + OpenUI DSL spec
    │   └── openui.ts                       ← OpenUI detection (root = ...)
    ├── cycle-tools.ts                      ← Cycle logging, predictions, stats
    └── db/
        ├── schema.ts                       ← Drizzle schema (7 tables)
        └── index.ts                        ← Drizzle client
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

### 2.9 OpenUI Integration

OpenUI Lang is actively used for structured AI responses. The system prompt includes a full OpenUI DSL specification (~200 lines) covering:

- **Components:** `Card`, `TextContent`, `MarkDownRenderer`, `Callout`, `Table`/`Col`, charts (`BarChart`, `LineChart`, etc.), `Form`/`FormControl`, `Button`, `ListBlock`, `FollowUpBlock`, `SectionBlock`, `Tabs`, `Accordion`, `Steps`, `Carousel`, `TagBlock`
- **Actions:** `Action([@ToAssistant("msg")])`, `@OpenUrl("url")`
- **Streaming:** `root = Card(...)` must be first line for optimal streaming

**Gating:** `looksLikeOpenUiLang()` (from `src/lib/chat/openui.ts`) checks if assistant text starts with `root =` to decide between structured OpenUI rendering vs plain text.

**When OpenUI is used:**
- `fetchRecentCycles` → Table with start/end/cycle/period columns
- `computePredictions` → Card with next period date, ovulation date, confidence, follow-ups
- `fetchStats` → Card with averages, cycle count, follow-ups

**When plain text is used:**
- Confirmations ("got it, logged your period start! 💕")
- Clarifications ("i need a clear start date")
- General conversation responses

### 2.10 Environment Variables

```bash
# Auth
AUTH_SECRET=

# Database
NEON_DATABASE_URL=                   # Neon postgres connection string

# AI
HACKCLUB_AI_API_KEY=                  # HackClub AI proxy key
HACKCLUB_WEB_SEARCH_API_KEY=          # HackClub Search API key

# Memory
SUPERMEMORY_API_KEY=                  # Supermemory v4 API key
```

---

## Part 3: Open Questions Before Sprint 1

1. **Calendar view:** Is the monthly calendar with phase color coding v1 scope or v2?
2. **Onboarding:** If a user has existing Luna (Discord) data, do you want a CSV import flow?
3. **Notifications:** Vercel Cron for period reminders — v1 or v2?
4. **Stats dashboard:** Dedicated `/stats` page vs in-chat stats only?

