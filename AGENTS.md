<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Luna Agent Guide

## Project Basics
- Framework: Next.js 15 (App Router)
- Database: Neon Postgres + Drizzle ORM
- Auth: Auth.js (NextAuth v5)
- AI: Vercel AI SDK + HackClub AI proxy
- UI: Tailwind v4 + custom components (OpenUI removed)

## Important Conventions
- Chat API expects `UIMessage` parts (text/file). Avoid `content`-only payloads.
- Use `convertToModelMessages` before calling `streamText`.
- Use Chat Completions for HackClub proxy: `hackClubAI.chat(modelId)`.

## Key Files
- Chat API: `src/app/api/chat/route.ts`
- Chat UI: `src/app/(app)/chat/page.tsx`
- DB schema: `src/lib/db/schema.ts`
- Chat sessions API: `src/app/api/chat/sessions/*`

## DB Migrations
- Generate: `pnpm drizzle-kit generate`
- Apply: `pnpm drizzle-kit migrate`

## Chat Session Features
- Sessions stored in `chat_sessions`
- Messages stored in `chat_messages`
- Summaries stored in `chat_summaries`
- Dynamic context pulls: recent messages + summary + keyword snippets

## Response Style
- Prefer plain text responses in the UI (OpenUI is disabled).
- Keep copy warm, supportive, and concise; avoid medical advice.
