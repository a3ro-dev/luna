# Luna

AI-native menstrual cycle companion with persistent memory and adaptive predictions.

log your cycle in natural language and get predictions grounded in your data—without clinical coldness. Luna uses adaptive exponential smoothing with population priors to learn your body's rhythm, and an AI chat companion that remembers your context across sessions.

---

## Features

- **Natural Language Logging** — "my period started today" or "log period start Jan 28"
- **Adaptive Predictions** — ACOG population priors for cold starts, shifting to exponential smoothing with 2.5σ soft outlier clamping
- **Persistent Memory** — AI remembers personal context across sessions via Supermemory v4 API
- **Structured UI** — dynamic OpenUI DSL rendering for predictions, cycle stats, and calendar cards
- **Web Search** — real-time web retrieval via Hack Club Search API when requested
- **Data Mobility** — import/export from Period Calendar, Clue, Flo, Apple Health, or JSON

---

## Stack

- **Framework**: Next.js 15 (App Router)
- **UI & Components**: Tailwind CSS v4, Framer Motion, AI Elements, OpenUI, shadcn/ui
- **Auth**: Auth.js v5 (email + password JWT strategy)
- **Database & ORM**: Neon PostgreSQL + Drizzle ORM (8 tables)
- **AI Infrastructure**: Vercel AI SDK v6 + Hack Club AI proxy
- **Memory & Search**: Supermemory v4 API + Hack Club Search API

---

## Local Setup

```bash
git clone https://github.com/a3ro-dev/luna.git
cd luna
pnpm install
cp .env.example .env
pnpm dev
```

open `http://localhost:3000`.

### Database Migrations

```bash
pnpm drizzle-kit generate   # generate migration
pnpm drizzle-kit migrate    # apply schema to Neon DB
```

---

## Prediction Engine

Luna uses adaptive exponential smoothing with population priors (ACOG dataset). 

- **Cold Starts**: cycles $\le 5$ blend user data with population averages.
- **Learning Rate**: adjusts dynamically based on residual mean absolute deviation (MAD).
- **Anomaly Detection**: cycles over 45 days are flagged as missed logs and excluded from prediction updates.
- **Outlier Clamp**: values past $2.5\sigma$ are pulled back toward the mean.
- **Uncertainty**: confidence bounds are calculated via jackknife resampling once 6+ cycles are logged.

---

## License & Credits

MIT License — built by [Akshat Singh Kushwaha](https://a3ro.dev).
