<p align="center">
  <img src="public/banner.png" alt="Luna — AI-Native Menstrual Cycle Companion & Rhythm Engine" width="100%" />
</p>

<p align="center">
  <strong>AI-native menstrual cycle companion with persistent memory and adaptive rhythm predictions.</strong>
</p>

<p align="center">
  <a href="#quick-start"><img src="https://img.shields.io/badge/Stack-Next.js%2015%20%7C%20React%2019-00e5ff?style=for-the-badge&logoColor=black" alt="Stack"></a>
  <a href="#prediction-engine-math--guardrails"><img src="https://img.shields.io/badge/Algorithm-Adaptive%20Smoothing%20%2B%20ACOG-ff007f?style=for-the-badge" alt="Algorithm"></a>
  <a href="#core-features"><img src="https://img.shields.io/badge/Memory-Supermemory%20v4-00d2d3?style=for-the-badge" alt="Memory"></a>
  <a href="#tech-stack"><img src="https://img.shields.io/badge/Database-Drizzle%20%2B%20Neon%20Postgres-16e0bd?style=for-the-badge" alt="Database"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-ffc837?style=for-the-badge" alt="License"></a>
</p>

---

## 🪟 The Premise

most period trackers feel like cold clinical spreadsheets or pink-washed dashboards that gate your own biological predictions behind paywalls. i built Luna to make cycle tracking feel like talking to someone who actually pays attention, without treating your body like a database schema.

Luna is an AI-native menstrual cycle companion and rhythm engine. instead of tapping through tedious forms, you log cycles and symptoms in plain conversation ("my period started today", "bad cramps after caffeine"). behind the chat, 10 dedicated AI tools handle logging, history retrieval, and stats generation in real time.

the prediction engine combines a broad population starting point with each person's usable history in an explainable posterior-predictive model. it reports an 80% likely window for the next cycle, stays deliberately wide with sparse or variable data, and withholds calendar ovulation estimates when they would be misleading. it pairs this with persistent cross-session memory via Supermemory v4 and dynamic OpenUI structured components for cycle cards and calendar phases.

we made an explicit choice on tiering: free users get the exact same Grok 4.3 model and full prediction capabilities as paid tiers. the difference is purely how Luna listens and holds space, not whether your health data is gated.

---

## ⚡ At a glance

| Area | What Luna does |
|---|---|
| **Cycle Logging** | 10 AI tools invoking structured database actions directly from natural language chat |
| **Prediction Engine** | Versioned posterior-predictive forecasts with explicit likely windows and provenance |
| **Context Memory** | Persistent cross-session facts and emotional context recall via Supermemory v4 |
| **Dynamic UI** | Generative OpenUI component rendering for predictions, cycle stats, and calendar phase maps |
| **Persona Tiers** | Persona-only differentiation across plans (free users keep 100% of intelligence & models) |
| **Data Mobility** | Complete import/export support for Apple Health, Clue, Flo, Period Calendar, and raw JSON |

---

## 🕹️ Architecture & Data Flow

```
                  ┌───────────────────────┐
                  │   Natural Language    │
                  │   User Input / Chat   │
                  └──────────┬────────────┘
                             │
                             ▼
              ┌─────────────────────────────┐
              │  Vercel AI SDK + Grok 4.3   │
              │  Tool Calling & Context Gate│
              └──────────────┬──────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ 10 Native Tools │ │ Supermemory v4  │ │ Hack Club Web   │
│ Log, Stats, Cal │ │ Context Memory  │ │ Real-Time Search│
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             ▼
              ┌─────────────────────────────┐
              │  Adaptive Smoothing Engine  │
              │  ACOG Priors + 2.5σ Clamp   │
              └──────────────┬──────────────┘
                             │
         ┌───────────────────┴───────────────────┐
         ▼                                       ▼
┌─────────────────────────────┐ ┌─────────────────────────────┐
│    Neon PostgreSQL (8 tbl)  │ │   Generative OpenUI Cards   │
│    Drizzle ORM Persistence  │ │   Calendar, Phases & Stats  │
└─────────────────────────────┘ └─────────────────────────────┘
```

---

## 🌸 Core Features

- **Natural Language Cycle Logging** — Just say *"my period started today"* or *"had dull cramps after coffee"*; Luna parses dates, intervals, and symptoms automatically.
- **Adaptive Time-Series Predictions** — Statistical forecasts for period start, ovulation window, follicular, and luteal phases that adapt as your logged history grows.
- **Persistent AI Memory** — Luna retains conversational nuances, habits, and user context across sessions using Supermemory v4 semantic recall.
- **Generative UI Elements** — Seamlessly embeds interactive prediction cards, phase timelines, and cycle health summaries into the chat using OpenUI DSL.
- **Zero-Paywall Health Intelligence** — All forecasting and analysis features are unlocked for every user; tiering only alters the companion's conversational persona.
- **Private & Mobile-Ready** — Zero ad-tracking, client JWT auth, automatic timezone adjustment, and complete data export/import capabilities.

---

## ⚙️ Prediction Engine (Math & Guardrails)

Luna does not use brittle static 28-day math. The prediction engine adapts continuously:

$$\hat{y}_{t+1} = \alpha_t y_t + (1 - \alpha_t) \hat{y}_t$$

1. **Cold Start Prior Blending**: For users with $\le 5$ logged cycles, predictions blend individual history with American College of Obstetricians and Gynecologists (ACOG) population distributions.
2. **Dynamic MAD Tuning**: The smoothing factor $\alpha_t$ adjusts dynamically based on the residual Mean Absolute Deviation (MAD) of past cycles.
3. **Anomaly Isolation**: Cycles extending beyond 45 days are identified as missed logs or anomalies and quarantined from skewing the active prediction baseline.
4. **Soft Outlier Clamping**: Extreme deviations exceeding $2.5\sigma$ are softly clamped back toward the user's running historical median.
5. **Jackknife Uncertainty Bounds**: Confidence intervals are computed via jackknife resampling once 6+ cycles are recorded.

---

## 💎 Persona-Only Tiering

Everyone gets the same capable model (Grok 4.3) and identical prediction math. The difference is purely how Luna speaks:

| Plan | Price | Personality & Register |
|---|---|---|
| **Luna** | Free | Practical, direct, and concise. Answers clearly and logs fast. |
| **Luna Premium** | \$5 / mo | Warm, caring, attentive. Recalls small details and follows up gently. |
| **Luna Premium+** | \$12 / mo | Intuitive, deeply present companion. Holds space and listens closely. |

---

## 🚀 Local Setup

```bash
# Clone the repository
git clone https://github.com/a3ro-dev/luna.git
cd luna

# Install dependencies (strictly pnpm)
pnpm install

# Configure environment variables
cp .env.example .env

# Run database migrations
pnpm drizzle-kit generate
pnpm drizzle-kit migrate

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🔌 Tech Stack

| Layer | Technology | Role |
|---|---|---|
| **Framework** | Next.js 15 (App Router, Server Actions) | Full-stack application runtime |
| **Language** | TypeScript 5 (Strict Mode) | End-to-end type safety |
| **Styling** | Tailwind CSS v4 + Framer Motion | Modern styling and fluid micro-interactions |
| **UI Components** | Radix UI, shadcn/ui, OpenUI DSL | Accessible components & generative UI cards |
| **Database** | Neon PostgreSQL + Drizzle ORM | Serverless relational persistence (8 tables) |
| **AI Runtime** | Vercel AI SDK v6 + Grok 4.3 | Model orchestration & tool-calling agent |
| **Memory** | Supermemory v4 API | Long-term cross-session vector context |
| **Authentication** | Auth.js v5 (NextAuth) | JWT session auth with secure credential flow |

---

## 📄 License & Credits

MIT License — built by [Akshat Singh Kushwaha](https://a3ro.dev).
