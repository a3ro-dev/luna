import { convertToModelMessages, streamText, type UIMessage } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { db } from "@/lib/db"
import { aiTraces, chatMessages, chatSessions, chatSummaries } from "@/lib/db/schema"
import { auth } from "@/auth"
import { and, desc, eq, ilike, or } from "drizzle-orm"

// HackClub AI provider
const hackClubAI = createOpenAI({
  baseURL: "https://ai.hackclub.com/proxy/v1",
  apiKey: process.env.HACKCLUB_AI_API_KEY,
})

// Supermemory fetch helpers
async function getSupermemoryContext(userId: string): Promise<string> {
  try {
    const res = await fetch("https://api.supermemory.ai/v1/context", {
      headers: {
        Authorization: `Bearer ${process.env.SUPERMEMORY_API_KEY}`,
      },
      body: JSON.stringify({ userId }),
      method: "POST",
    });
    if (!res.ok) return "";
    const data = await res.json();
    return data.context || "";
  } catch (e) {
    return "";
  }
}

async function writeSupermemoryFact(userId: string, fact: string) {
  try {
    await fetch("https://api.supermemory.ai/v1/memory", {
      headers: {
        Authorization: `Bearer ${process.env.SUPERMEMORY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, content: fact }),
      method: "POST",
    });
  } catch (e) {
    console.error("Supermemory write failed", e);
  }
}

const RECENT_MESSAGE_LIMIT = 20
const SUMMARY_TRIGGER_COUNT = 30
const SUMMARY_MIN_DELTA = 12

const getTextFromParts = (parts: UIMessage["parts"]): string => {
  if (!Array.isArray(parts)) return ""
  return parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("")
}

const getOrCreateSession = async (userId: string) => {
  const existing = await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.userId, userId))
    .orderBy(desc(chatSessions.updatedAt))
    .limit(1)

  if (existing.length > 0) return existing[0]

  const created = await db
    .insert(chatSessions)
    .values({ userId })
    .returning()

  return created[0]
}

const getSessionById = async (sessionId: string, userId: string) => {
  const rows = await db
    .select()
    .from(chatSessions)
    .where(and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, userId)))
    .limit(1)

  return rows[0]
}

const getRecentMessages = async (sessionId: string) => {
  const rows = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(desc(chatMessages.createdAt))
    .limit(RECENT_MESSAGE_LIMIT)

  return rows
    .slice()
    .reverse()
    .map((row) => ({
      id: row.id,
      role: row.role as UIMessage["role"],
      parts: Array.isArray(row.parts) ? (row.parts as UIMessage["parts"]) : [],
    }))
}

const getLatestSummary = async (sessionId: string) => {
  const rows = await db
    .select()
    .from(chatSummaries)
    .where(eq(chatSummaries.sessionId, sessionId))
    .orderBy(desc(chatSummaries.createdAt))
    .limit(1)

  return rows[0]
}

const extractKeywords = (text: string) => {
  const stopwords = new Set([
    "the",
    "and",
    "with",
    "this",
    "that",
    "have",
    "about",
    "your",
    "from",
    "what",
    "when",
    "where",
    "like",
    "just",
    "feel",
    "feels",
    "been",
    "were",
    "want",
    "need",
    "been",
    "im",
    "i'm",
    "you",
    "are",
    "for",
    "but",
  ])

  return Array.from(
    new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((word) => word.length > 3 && !stopwords.has(word))
    )
  ).slice(0, 6)
}

const getContextSnippets = async (sessionId: string, queryText: string) => {
  const keywords = extractKeywords(queryText)
  if (keywords.length === 0) return []

  const conditions = keywords.map((keyword) =>
    ilike(chatMessages.textContent, `%${keyword}%`)
  )

  const rows = await db
    .select()
    .from(chatMessages)
    .where(and(eq(chatMessages.sessionId, sessionId), or(...conditions)))
    .orderBy(desc(chatMessages.createdAt))
    .limit(6)

  return rows
    .slice()
    .reverse()
    .map((row) => `${row.role}: ${row.textContent ?? ""}`)
    .filter((line) => line.trim().length > 0)
}

const maybeSummarizeSession = async (
  sessionId: string,
  userId: string,
  modelName: string
) => {
  const summaryRow = await getLatestSummary(sessionId)

  const messageCountRows = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(desc(chatMessages.createdAt))

  const messageCount = messageCountRows.length
  const lastSummaryCount = summaryRow?.messageCount ?? 0

  if (messageCount < SUMMARY_TRIGGER_COUNT) return
  if (messageCount - lastSummaryCount < SUMMARY_MIN_DELTA) return

  const recentForSummary = messageCountRows
    .slice()
    .reverse()
    .map((row) => ({
      id: row.id,
      role: row.role as UIMessage["role"],
      parts: Array.isArray(row.parts) ? (row.parts as UIMessage["parts"]) : [],
    }))

  const summaryPrompt =
    "Summarize the conversation so far for future context. Focus on user preferences, symptoms, cycle events, goals, and any explicit requests. Keep it concise and factual."

  const summaryResult = await streamText({
    model: hackClubAI(modelName),
    system: summaryPrompt,
    messages: await convertToModelMessages(recentForSummary),
  })

  const summaryText = await summaryResult.text
  if (summaryText.trim().length === 0) return

  await db.insert(chatSummaries).values({
    sessionId,
    userId,
    summary: summaryText.trim(),
    messageCount,
  })
}

export async function POST(req: Request) {
  const authSession = await auth()
  const userId = authSession?.user?.id

  if (!userId) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { messages, webSearchEnabled, sessionId: requestSessionId } = await req.json()
  const userMessages = (Array.isArray(messages) ? messages : []) as UIMessage[]

  const resolvedSession = requestSessionId
    ? await getSessionById(requestSessionId, userId)
    : undefined
  const chatSession = resolvedSession ?? (await getOrCreateSession(userId))
  const sessionId = chatSession.id

  const lastIncoming = userMessages[userMessages.length - 1]
  if (lastIncoming && lastIncoming.role === "user") {
    await db.insert(chatMessages).values({
      sessionId,
      userId,
      role: "user",
      parts: lastIncoming.parts ?? [],
      textContent: getTextFromParts(lastIncoming.parts ?? []),
    })

    await db
      .update(chatSessions)
      .set({ updatedAt: new Date() })
      .where(eq(chatSessions.id, sessionId))
  }

  const memoryContext = await getSupermemoryContext(userId)
  const recentMessages = await getRecentMessages(sessionId)
  const latestSummary = await getLatestSummary(sessionId)
  const lastUserText = getTextFromParts(lastIncoming?.parts ?? [])
  const contextSnippets = await getContextSnippets(sessionId, lastUserText)

  const summaryContext = latestSummary?.summary
    ? `Conversation Summary:\n${latestSummary.summary}\n\n`
    : ""
  const snippetContext = contextSnippets.length > 0
    ? `Relevant Context Snippets:\n${contextSnippets.join("\n")}\n\n`
    : ""

  const systemPrompt = `You are Luna, a warm, caring, and bubbly health companion. You text like a bestie—super enthusiastic, mostly lowercase, using lots of cute emojis (like ✨, 🎀, 💕, 🥺) and a conversational, sweet texting style! You track menstrual cycles and provide supportive conversation. You are NOT a doctor; remind the user of this gently and sweetly if they ask for clinical advice.

${summaryContext}${snippetContext}User Context & Memory:
${memoryContext}

CRITICAL: You must use OpenUI Lang like CRAZY. Whenever you display any data, a summary, a log, or an insight, wrap it in OpenUI Lang components. Use <Card>, <Chart>, <Table>, <Progress>, <StatGroup>, <Badge> and construct rich layouts using <Row> and <Column>. Do not output raw markdown data if you can structure it as a beautiful UI component.

Be soft, warm, and highly visual.`

  const startTime = Date.now()
  const modelName = "x-ai/grok-4.3"

  const result = await streamText({
    model: hackClubAI.chat(modelName),
    system: systemPrompt,
    messages: await convertToModelMessages(recentMessages),
    // Note: passing web_search plugin conceptually (may require provider-specific config in real environment)
    ...(webSearchEnabled ? {
      providerOptions: {
        openai: {
          plugins: [{ id: "web_search" }]
        }
      }
    } : {}),
    onFinish: async ({ usage, text }) => {
      const latencyMs = Date.now() - startTime

      // Simple heuristic: write key facts back if the AI gives a helpful answer about user state
      // Real implementation might use a tool call or secondary LLM pass to extract facts.
      if (text.length > 50) {
         // Background task to extract and write fact (simulated here)
        const lastUserText = getTextFromParts(lastIncoming?.parts ?? [])
         writeSupermemoryFact(userId, `User said: ${lastUserText}. Luna replied: ${text.substring(0, 50)}...`);
      }

      await db.insert(chatMessages).values({
        sessionId,
        userId,
        role: "assistant",
        parts: [{ type: "text", text }],
        textContent: text,
      })

      await db
        .update(chatSessions)
        .set({ updatedAt: new Date() })
        .where(eq(chatSessions.id, sessionId))

      await maybeSummarizeSession(sessionId, userId, modelName)

      // HackClub API cost approximation (very rough) or actual cost if available
      const costUsd = (usage.promptTokens * 0.0001 + usage.completionTokens * 0.0002) / 1000

      // Track AI usage
      await db.insert(aiTraces).values({
        userId,
        model: modelName,
        inputTokens: usage.promptTokens,
        outputTokens: usage.completionTokens,
        costUsd,
        latencyMs,
        feature: "chat",
        hasImages: userMessages.some(m => Array.isArray(m.parts) && m.parts.some(p => p.type === "file")),
        hadWebSearch: !!webSearchEnabled,
      })
    },
  })

  return result.toUIMessageStreamResponse()
}
