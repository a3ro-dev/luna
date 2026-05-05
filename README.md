# Luna

**A soft, supportive menstrual cycle companion.**

Log your cycle, receive gentle predictions, and chat about symptoms and feelings — without clinical tone. Luna uses adaptive exponential smoothing with population priors to learn your body's rhythm over time, and an AI companion that remembers your details and answers questions in plain language.

---

## ✨ Features

- **Natural language cycle logging** — "My period started today" or "Log period start Jan 28"
- **Adaptive predictions** — Cycle and ovulation predictions that improve with each log, using ACOG population priors for cold starts
- **AI companion chat** — Ask questions, get cycle insights, log symptoms conversationally
- **Calendar view** — Monthly calendar with phase color-coding (period, follicular, ovulation, luteal)
- **Stats dashboard** — Average cycle/period length, consistency score, recent cycle history
- **Data import/export** — Import from Period Calendar, Clue, Flo, Apple Health, or Luna's own format
- **Persistent memory** — AI remembers personal facts across sessions via Supermemory
- **Web search** — AI can search the web for health information when needed

## 🛠 Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 15 (App Router) |
| UI | Tailwind v4, Framer Motion, AI Elements, OpenUI, shadcn |
| Auth | Auth.js v5 — email + password (JWT strategy) |
| Database | Neon PostgreSQL + Drizzle ORM |
| AI | Vercel AI SDK v6 + HackClub AI proxy |
| Memory | Supermemory v4 API |
| Search | HackClub Search API |
| Email | Resend |

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm 9+
- A Neon PostgreSQL database
- API keys (see below)

### Installation

```bash
git clone https://github.com/a3ro-dev/luna.git
cd luna
pnpm install
cp .env.example .env   # fill in your keys
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

Create a `.env` file from `.env.example` and fill in:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `AUTH_SECRET` | Auth.js secret key (`openssl rand -base64 32`) |
| `RESEND_API_KEY` | Resend API key for transactional emails |
| `HACKCLUB_AI_API_KEY` | HackClub AI proxy key |
| `HACKCLUB_WEB_SEARCH_API_KEY` | HackClub Search API key |
| `SUPERMEMORY_API_KEY` | Supermemory v4 API key |

### Database

```bash
pnpm drizzle-kit generate   # generate migration from schema changes
pnpm drizzle-kit migrate    # apply migrations
```

8 tables: `users`, `cycles`, `prediction_params`, `ai_traces`, `chat_sessions`, `chat_messages`, `chat_summaries`, `uploaded_images`.

## 📁 Project Structure

```
src/
├── app/
│   ├── (app)/
│   │   ├── chat/            # AI chat interface
│   │   ├── dashboard/       # Cycle dashboard + calendar
│   │   ├── settings/        # User preferences
│   │   └── onboarding/      # First-run setup
│   ├── (public)/
│   │   ├── login/           # Sign in
│   │   └── signup/          # Register
│   ├── api/
│   │   ├── auth/            # Auth.js handlers
│   │   ├── chat/            # Chat streaming API + sessions + rename
│   │   ├── data/            # Import/export
│   │   └── user/            # Profile CRUD
│   └── page.tsx             # Landing page
├── auth.ts                  # Auth.js config
├── components/
│   ├── ai-elements/         # Conversation, Message, PromptInput, Tool, etc.
│   └── ui/                  # shadcn components
└── lib/
    ├── chat/
    │   ├── prompt.ts        # System prompt + OpenUI DSL spec
    │   └── openui.ts        # OpenUI detection
    ├── cycle-tools.ts       # 10 AI tools: logging, predictions, stats
    ├── db/
    │   └── schema.ts        # Drizzle schema (8 tables)
    ├── email/               # Resend email templates
    ├── prediction/
    │   └── engine.ts        # Adaptive exponential smoothing engine
    └── theme/
        └── accent.ts        # Plan-based accent colors
```

## 🧠 Prediction Engine

Luna uses adaptive exponential smoothing with population priors from ACOG data:

- **Cold start** (≤5 cycles): Blends user data with population averages
- **Adaptive alpha**: Learning rate adjusts based on recent residual MAD
- **Skip gate**: Cycles >45 days are flagged as missed logs, not used for smoothing
- **Outlier soft-clamp**: Values beyond 2.5σ are pulled toward the mean
- **Jackknife CI**: Confidence intervals via jackknife resampling (6+ observations)

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines. PRs welcome!

## 📄 License

This project is licensed under the MIT License — see [LICENSE](./LICENSE).

## 🙏 Credits

Built by [Akshat Singh Kushwaha](https://a3ro.dev) ([akshatsingh14372@outlook.com](mailto:akshatsingh14372@outlook.com)).

Powered by [HackClub AI](https://ai.hackclub.com), [Neon](https://neon.tech), [Resend](https://resend.com), and [Vercel](https://vercel.com).
