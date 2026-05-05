# Luna

A soft, supportive menstrual cycle companion. Log your cycle, receive gentle predictions, and chat about symptoms and feelings — without clinical tone.

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 15 (App Router) |
| UI | Tailwind v4, AI Elements, OpenUI, shadcn |
| Auth | Auth.js v5 (Credentials — email + password) |
| Database | Neon PostgreSQL + Drizzle ORM |
| AI | Vercel AI SDK v6 + HackClub AI proxy (`x-ai/grok-4.3`) |
| Memory | Supermemory v4 API (per-user persistent facts) |
| Search | HackClub Search API |

## Getting Started

```bash
pnpm install
cp .env.example .env   # fill in keys
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Purpose |
|---|---|
| `NEON_DATABASE_URL` | Neon PostgreSQL connection string |
| `AUTH_SECRET` | Auth.js secret key |
| `HACKCLUB_AI_API_KEY` | HackClub AI proxy key |
| `HACKCLUB_WEB_SEARCH_API_KEY` | HackClub Search API key |
| `SUPERMEMORY_API_KEY` | Supermemory v4 API key |

## Database

```bash
pnpm drizzle-kit generate   # generate migration
pnpm drizzle-kit migrate    # apply migration
```

7 tables: `users`, `cycles`, `prediction_params`, `ai_traces`, `chat_sessions`, `chat_messages`, `chat_summaries`.

## Project Structure

```
src/
├── app/
│   ├── (app)/chat/          # Chat page
│   └── api/
│       ├── auth/             # Auth.js handlers
│       ├── chat/             # Chat streaming API + tools
│       └── chat/sessions/    # Session CRUD + rename + messages
├── auth.ts                  # Auth.js config
├── components/
│   ├── ai-elements/         # Conversation, Message, PromptInput, etc.
│   └── ui/                  # shadcn components
└── lib/
    ├── chat/
    │   ├── prompt.ts        # System prompt + OpenUI DSL spec
    │   └── openui.ts        # OpenUI detection (root = ...)
    ├── cycle-tools.ts       # Cycle logging, predictions, stats
    └── db/
        └── schema.ts        # Drizzle schema
```

## Troubleshooting

- **404 on static chunks**: Delete `.next` and `node_modules/.cache`, restart dev server
- **`@opentelemetry/api` crash**: Ensure `next.config.ts` has `serverExternalPackages: ['@opentelemetry/api']`
- **Invalid config warning**: Remove `experimental.turbopack` — not valid in Next.js 15.0.0
