# Contributing to Luna

Thanks for taking the time to contribute.

Luna is a soft, supportive menstrual cycle companion built with Next.js 15, Neon Postgres, and the Vercel AI SDK. Bug fixes, features, docs, ideas -- all welcome.

## Table of contents

- [Code of conduct](#code-of-conduct)
- [Getting started](#getting-started)
- [Development setup](#development-setup)
- [Project architecture](#project-architecture)
- [Coding standards](#coding-standards)
- [Git workflow](#git-workflow)
- [Pull requests](#pull-requests)
- [Reporting bugs](#reporting-bugs)
- [Feature requests](#feature-requests)
- [Database changes](#database-changes)
- [AI tools](#ai-tools)
- [Email templates](#email-templates)

## Code of conduct

Be kind, respectful, and constructive. This is a health app -- be mindful that discussions may involve sensitive topics. We follow the [Contributor Covenant](https://www.contributor-covenant.org/) code of conduct.

## Getting started

1. Fork the repo
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/luna.git`
3. Install dependencies: `pnpm install`
4. Set up environment: `cp .env.example .env` and fill in keys
5. Run the dev server: `pnpm dev`

## Development setup

### Prerequisites

- Node.js 18+
- pnpm 9+ (`npm i -g pnpm`)
- Neon PostgreSQL database (free tier works)
- API keys for: HackClub AI, Supermemory, Resend (see `.env.example`)

### Environment variables

Copy `.env.example` to `.env` and fill in all required keys. Never commit `.env` files.

### Database

```bash
pnpm drizzle-kit generate   # generate migration from schema changes
pnpm drizzle-kit migrate    # apply migrations
```

The schema lives in `src/lib/db/schema.ts`. If you modify it, always generate and commit the migration.

## Project architecture

```
src/
├── app/                    # Next.js App Router pages & API routes
│   ├── (app)/              # Authenticated pages (chat, dashboard, settings)
│   ├── (public)/           # Public pages (login, signup, landing)
│   └── api/                # API routes (auth, chat, data, user)
├── components/
│   ├── ai-elements/        # Chat UI primitives (Conversation, Message, Tool...)
│   └── ui/                 # shadcn/ui components
└── lib/
    ├── chat/               # System prompt, OpenUI detection
    ├── cycle-tools.ts      # 10 AI tools (logging, predictions, stats)
    ├── db/                 # Drizzle schema, connection
    ├── email/              # Resend email templates
    ├── prediction/         # Adaptive exponential smoothing engine
    └── theme/              # Plan-based accent colors
```

### Conventions that matter

| Convention | Details |
|---|---|
| Chat API | Expects `UIMessage` parts (text/file), not `content`-only payloads |
| AI SDK v6 | `maxSteps` -> `stopWhen: stepCountIs(n)`, `usage.promptTokens` -> `usage.inputTokens` |
| Drizzle | Use `and(eq(...), eq(...))` -- chained `.where().where()` is invalid |
| OpenUI | Gate rendering with `looksLikeOpenUiLang()` (checks if text starts with `root =`) |
| Period length | Always inclusive: `diffInDays(mStart, mEnd) + 1` (Jan 28-31 = 4 days) |
| Auth | Credentials provider only, JWT strategy -- no OAuth |
| Supermemory | Use v4 endpoints (`POST /v4/search`, `POST /v4/memories`) |

## Coding standards

### TypeScript

- Strict mode is enabled -- no `any` types unless absolutely necessary
- Use Zod for runtime validation (already a dependency)
- Prefer `interface` for object types, `type` for unions/intersections

### Styling

- Tailwind v4 -- use utility classes, no custom CSS files unless necessary
- Color palette: `#6D5A60` (mauve text), `#8E7D82` (dusk secondary), `#FFB5C0` (rose accent), `#FFDDE0` (blush border), `#FFF9F9` (cream bg)
- Font: `font-serif` for headings (Instrument Serif), `font-sans` for body (Figtree)
- Border radius: `rounded-full` for pills, `rounded-2xl` or `rounded-3xl` for cards
- Mobile-first: always design for mobile, then scale up with `md:` and `lg:` breakpoints

### Components

- Use shadcn/ui components (`src/components/ui/`) as building blocks
- AI Elements (`src/components/ai-elements/`) are for chat-specific UI
- Keep components small and composable

### Motion

- Framer Motion / Motion One for animations
- Use `useReducedMotion()` hook for accessibility
- Keep animations subtle -- 200-400ms, spring physics, slight transforms

## Git workflow

### Branches

- `main` -- stable, deployed
- `luna-rewrite-pub` -- current development branch
- Feature branches: `feat/your-feature-name`
- Fix branches: `fix/your-fix-name`

### Commits

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add cycle phase notification
fix: period length off-by-one in dashboard
docs: update contributing guide
refactor: extract prediction engine to separate module
chore: update dependencies
```

### Commit messages

- Use present tense ("add feature" not "added feature")
- Be specific -- "fix bug" is too vague; "fix period length showing 3 instead of 4" is good

## Pull requests

1. Create a branch from `luna-rewrite-pub`
2. Make your changes with clear, atomic commits
3. Test locally -- `pnpm dev` and verify your changes work
4. Push to your fork
5. Open a PR against `luna-rewrite-pub`

### PR template

```markdown
## What does this PR do?

Brief description of changes.

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update
- [ ] Refactor

## How to test

Steps to verify the changes.

## Screenshots (if UI changes)

Before/after screenshots.

## Checklist

- [ ] I've read CONTRIBUTING.md
- [ ] My code follows the project's coding standards
- [ ] I've tested my changes locally
- [ ] I've updated relevant documentation
```

## Reporting bugs

Open a [GitHub Issue](https://github.com/a3ro-dev/luna/issues) with:

1. Steps to reproduce -- be specific
2. Expected behavior -- what should happen
3. Actual behavior -- what happens instead
4. Screenshots if applicable
5. Environment -- browser, device, OS
6. Account details only if relevant (e.g., "17 cycles tracked, dashboard shows 6")

## Feature requests

Open a [GitHub Issue](https://github.com/a3ro-dev/luna/issues) with the `enhancement` label:

1. Problem -- what user pain point does this solve?
2. Proposed solution -- how should it work?
3. Alternatives considered -- what else did you think about?

## Database changes

1. Modify `src/lib/db/schema.ts`
2. Run `pnpm drizzle-kit generate` to create a migration
3. Run `pnpm drizzle-kit migrate` to apply locally
4. Commit both the schema change AND the generated migration SQL
5. Document the change in your PR description

Never modify migration SQL files after they've been committed. Create a new migration instead.

## AI tools

Luna has 10 AI tools defined in `src/lib/cycle-tools.ts`:

| Tool | Purpose |
|---|---|
| `logPeriodStart` | Log period start date |
| `logPeriodEnd` | Log period end date |
| `logOvulation` | Log ovulation date |
| `addNoteSymptom` | Add free-text note or symptom |
| `fetchRecentCycles` | Fetch recent cycles (returns OpenUI table) |
| `computePredictions` | Next period/ovulation predictions |
| `fetchStats` | Cycle statistics and averages |
| `exportData` | Export user's cycle data |
| `rememberFact` | Store personal fact in Supermemory |
| `searchWeb` | Search the web via HackClub API |

When adding a new tool:
1. Define it in `src/lib/cycle-tools.ts`
2. Add it to the tool list in `src/app/api/chat/route.ts`
3. Update the system prompt in `src/lib/chat/prompt.ts`
4. Test with the chat interface

## Email templates

Email templates live in `src/lib/email/index.ts`:

- Logo: embedded as base64 data URI (not external URL -- email clients block those)
- Layout: `emailShell()` wraps all emails with the Luna card design
- Testing: use [Resend's email preview](https://resend.com/docs/dashboard/emails) or send to your own address

## Questions?

Reach out to [Akshat Singh Kushwaha](mailto:akshatsingh14372@outlook.com) or open a GitHub Discussion.
