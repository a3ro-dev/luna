## Plan: NLP Chat Tools and OpenUI Summaries

Implement comprehensive NLP-driven tools in /chat for cycle logging, prediction, stats, and export, with OpenUI Lang used only for structured summaries and stats/prediction responses. The agent will orchestrate multi-step tool calls to fetch or mutate DB state, run predictions, and render concise structured summaries when relevant.

**Steps**
1. Define a tool contract for the chat agent covering: log period start/end, log ovulation, add note/symptom, fetch recent cycles, compute predictions, fetch stats, export data. Include explicit inputs (dates, timezone, notes) and outputs (IDs, computed dates). *Depends on step 2*
2. Implement tool handlers in [src/app/api/chat/route.ts](src/app/api/chat/route.ts):
   - Parse user intent with tools (Vercel AI SDK tools) and allow multi-tool orchestration.
   - Read/write to `cycles`, `predictionParams`, and `chat_messages` as needed.
   - Call prediction engine when required.
3. Add DB queries for:
   - Create/update `cycles` rows from NLP logging.
   - Derive `cycleLength`, `periodLength` updates as needed.
   - Read recent cycles and aggregate stats.
4. Implement OpenUI summary rendering rules:
   - Only wrap responses in OpenUI when the agent returns a summary/stat/prediction.
   - Plain text for conversational replies.
   - Add a lightweight OpenUI wrapper (Card/StatGroup/Table) when appropriate.
5. Update client rendering in [src/app/(app)/chat/page.tsx](src/app/(app)/chat/page.tsx):
   - Detect OpenUI markup and render via Renderer.
   - Keep plain text fallback for normal chat.
6. Add minimal validation + error handling:
   - Missing/ambiguous dates → ask follow-up.
   - Conflicting logs → clarify before write.
   - Enforce timezone handling and date normalization.
7. Add tests or manual verification plan for key flows.

**Relevant files**
- src/app/api/chat/route.ts — tool definitions, orchestration, OpenUI summary injection
- src/lib/db/schema.ts — tables for cycles, predictionParams
- src/lib/prediction/engine.ts — prediction computation
- src/app/(app)/chat/page.tsx — OpenUI detection + rendering fallback
- src/app/api/data/export/route.ts — data export usage (if exposed to tools)

**Verification**
1. Chat: “period started May 3, ended May 7” → cycles row created and summary returned.
2. Chat: “when is my next period” → prediction computed and OpenUI summary rendered.
3. Chat: “show last 3 cycles” → table summary rendered.
4. Chat: “export my data” → export response returned or link shown.
5. Plain chat: “how are you” → plain text response without OpenUI.

**Decisions**
- Use OpenUI only for stats/prediction-style responses; normal chat remains plain text.
- Allow multi-tool orchestration with no hard limit.

**Cool Features**
1. Date parsing strategy: native JS parsing with user timezone normalization (no extra library).
2. Log symptoms in free-text notes.
3. UX improvements: add gentle confirmations after logging, show a compact summary card for the logged entry, and prompt for missing dates.
