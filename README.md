<p align="center">
  <img src="public/banner.png" alt="Luna" width="100%" />
</p>

<p align="center">A private menstrual-cycle companion for logging dates, reviewing records, and seeing cautious next-period estimates.</p>

## What Luna does

Log a period start, end date, ovulation date, or symptom in chat. Luna saves the record, keeps chat sessions, and shows the same forecast in chat and on the dashboard. It can also import or export cycle data, remember non-cycle preferences, and search the web when a conversation calls for it.

Luna is not a medical device. A forecast is an estimate from recorded dates, not a diagnosis or confirmation of ovulation.

## Forecasts

The current service is `forecast-v2.0.0`. It models logged start-to-start intervals on a log scale, combines usable personal history with a cautious population starting point, and returns a central 80% next-start window. It uses no more than the 12 most recent usable intervals.

Very short intervals and isolated long gaps can be excluded from a calculation because they may be duplicate, spotting, or missed logs. Repeated long gaps can instead be treated as a pattern. With no recorded period start, Luna does not make up a personal next-period date. Calendar ovulation estimates are withheld for profiles where they would be especially unreliable.

The model has implementation and synthetic-backtest coverage, but it has not been clinically validated or calibrated on real users. Read [the technical paper](papers/luna-technical.md), [plain-language notes](papers/luna-nontechnical.md), and [the audit record](papers/research-notes.md) before treating a forecast as more than a planning aid.

## Plans and layouts

Every plan uses the same model, cycle records, chat tools, and account controls. Plans change the composition and voice, not health features.

| Plan | Layout |
|---|---|
| Luna Free | Calendar-first dashboard, focused chat, single-column settings |
| Luna Premium | Guided dashboard navigation, persistent desktop chat rail, settings section navigation |
| Luna Premium+ | Split dashboard, wide-screen cycle context beside chat, two-column settings |

The landing-page subscription form is a request for follow-up. It does not charge a card or activate a plan by itself.

## Architecture

```text
Chat and dashboard
        │
        ▼
Vercel AI SDK v6 + HackClub AI proxy
        │
        ├── 10 cycle and conversation tools
        ├── Supermemory v4
        └── HackClub web search
        │
        ▼
Shared forecast-v2 service
        │
        ▼
Neon Postgres + Drizzle ORM (8 tables)
```

## Local setup

```bash
git clone https://github.com/a3ro-dev/luna.git
cd luna
pnpm install
cp .env.example .env
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). See [.env.example](.env.example) for required services and environment variables.

## Stack

| Layer | Technology |
|---|---|
| App | Next.js 16.2, React 19, TypeScript |
| UI | Tailwind CSS v4, shadcn/ui, AI Elements, OpenUI |
| Data | Neon Postgres, Drizzle ORM |
| AI | Vercel AI SDK v6, HackClub AI proxy, Supermemory v4 |
| Auth and email | Auth.js v5, Resend |

## Contributing and license

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a change. Luna is released under the MIT License.
