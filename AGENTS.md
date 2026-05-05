<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

design-motion-principles ~\.agents\skills\design-motion-principles
  Agents: Antigravity, Codex, Cursor, Gemini CLI, GitHub Copilot +1 more
find-skills ~\.agents\skills\find-skills
  Agents: Antigravity, Codex, Cursor, Gemini CLI, GitHub Copilot +1 more
impeccable ~\.agents\skills\impeccable
  Agents: Antigravity, Codex, Cursor, Gemini CLI, GitHub Copilot +1 more

# Luna Agent Guide

## Project Basics
- Framework: Next.js 15.0.0 (App Router)
- Database: Neon Postgres + Drizzle ORM
- Auth: Auth.js (NextAuth v5) — Credentials provider only (email + password), JWT strategy
- AI: Vercel AI SDK v6 + HackClub AI proxy (`x-ai/grok-4.3` for chat, `~anthropic/claude-haiku-latest` for rename)
- Memory: Supermemory v4 API (per-user persistent facts)
- Web Search: HackClub Search API (`GET https://search.hackclub.com/res/v1/web/search`)
- UI: Tailwind v4 + AI Elements + OpenUI + shadcn components

## Important Conventions
- Chat API expects `UIMessage` parts (text/file). Avoid `content`-only payloads.
- Use `convertToModelMessages` before calling `streamText`.
- Use Chat Completions for HackClub proxy: `hackClubAI.chat(modelId)`.
- AI SDK v6: `maxSteps` → `stopWhen: stepCountIs(n)`, `usage.promptTokens` → `usage.inputTokens`.
- Supermemory uses v4 API: `POST /v4/search` + `POST /v4/memories` (not v1 endpoints).
- Web search uses HackClub Search API: `GET https://search.hackclub.com/res/v1/web/search` (not OpenAI plugins).
- Drizzle chained `.where().where()` is invalid — use `and(eq(...), eq(...))`.
- OpenUI rendering: `looksLikeOpenUiLang()` checks if text starts with `root =` to gate structured rendering.

## Key Files
- Chat API: `src/app/api/chat/route.ts`
- Chat UI: `src/app/(app)/chat/page.tsx`
- Conversation component: `src/components/ai-elements/conversation.tsx`
- Cycle tools: `src/lib/cycle-tools.ts`
- System prompt: `src/lib/chat/prompt.ts`
- OpenUI detector: `src/lib/chat/openui.ts`
- DB schema: `src/lib/db/schema.ts`
- Chat sessions API: `src/app/api/chat/sessions/*`
- Auth config: `src/auth.ts`
- Next.js config: `next.config.ts`

## Chat Scroll Anchoring
- Custom scroll implementation (not `use-stick-to-bottom` library)
- `Conversation` component is the scroll container (`overflow-y-auto`)
- Layout: root `h-dvh overflow-hidden` → main column `flex-col min-h-0` → Conversation `flex-1 min-h-0`
- `ResizeObserver` on `ConversationContent` auto-scrolls when `stickToBottom` is true
- Scroll event listener toggles `stickToBottom`: on when near bottom, off when user scrolls up
- `ConversationScrollButton` appears when not at bottom, calls `scrollTo({ behavior: 'smooth' })`

## Next.js Config
- `serverExternalPackages: ['@opentelemetry/api']` — prevents vendor chunk `MODULE_NOT_FOUND` crash
- No `experimental.turbopack` (invalid key in Next.js 15.0.0)
- If `.next` cache corrupts: delete `.next` and `node_modules/.cache`, restart dev server

## AI Tools (10 total)
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

## Chat Session Features
- Sessions stored in `chat_sessions`
- Messages stored in `chat_messages` (parts as jsonb, not plain content)
- Summaries stored in `chat_summaries` (auto-generated after 30+ messages, delta 12+)
- Dynamic context: recent 20 messages + summary + keyword snippets (6 keywords, 6 messages) + Supermemory recall (5 results)
- Auto-rename: after first AI response, generates title via `~anthropic/claude-haiku-latest`
- API endpoints: `GET/POST /api/chat/sessions`, `DELETE /api/chat/sessions/:id`, `GET /api/chat/sessions/:id/messages`, `POST /api/chat/sessions/:id/rename`

## Database Schema (7 tables)
- `users` — id, email (unique), passwordHash, name, image, timezone, weekStart
- `cycles` — id, userId, mStart, mEnd, ovulationDate, cycleLength, periodLength, follicularLength, lutealLength, isAnomaly, notes (jsonb)
- `prediction_params` — id, userId, paramName (unique with userId), smoothedValue, variance, sampleCount
- `ai_traces` — id, userId, model, inputTokens, outputTokens, costUsd, latencyMs, feature, hasImages, hadWebSearch
- `chat_sessions` — id, userId, title, createdAt, updatedAt
- `chat_messages` — id, sessionId, userId, role, parts (jsonb), textContent
- `chat_summaries` — id, sessionId, userId, summary, messageCount

## DB Migrations
- Generate: `pnpm drizzle-kit generate`
- Apply: `pnpm drizzle-kit migrate`

## Prediction Engine
- Adaptive exponential smoothing with population priors (ACOG data)
- Parameters: cycle_length, period_length, follicular, luteal
- Skip/anomaly gate: cycles > 45 days flagged as missed logs
- Outlier soft-clamp at 2.5σ
- Cold start: blends with population prior until 6+ observations
- `refreshCycleAnalytics()` recomputes all derived columns + prediction params on every cycle write

## Response Style
- Plain text responses in the UI by default
- OpenUI rendering for structured content (predictions, stats, cycle tables) via `looksLikeOpenUiLang()`
- OpenUI responses start with `root = Card(...)` DSL
- Confirmation/clarification messages are always plain text (not OpenUI)
- Keep copy warm, supportive, and concise; avoid medical advice
