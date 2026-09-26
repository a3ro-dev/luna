import { generateText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { chatMessages, chatSessions } from "@/lib/db/schema"
import { and, desc, eq } from "drizzle-orm"
import { isUuid, textOf, toSessionSummary } from "@/lib/chat/store"

const hackClubAI = createOpenAI({
  baseURL: "https://ai.hackclub.com/proxy/v1",
  apiKey: process.env.HACKCLUB_AI_API_KEY,
})

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()
  const userId = session?.user?.id

  if (!userId) {
    return new Response("Unauthorized", { status: 401 })
  }
  if (!isUuid(id)) {
    return new Response("Not found", { status: 404 })
  }

  // Ownership and context in one query; no rows = not the user's, or nothing to name yet
  const recent = await db
    .select({ role: chatMessages.role, textContent: chatMessages.textContent, parts: chatMessages.parts })
    .from(chatMessages)
    .innerJoin(chatSessions, eq(chatSessions.id, chatMessages.sessionId))
    .where(and(eq(chatMessages.sessionId, id), eq(chatSessions.userId, userId)))
    .orderBy(desc(chatMessages.createdAt))
    .limit(12)

  if (recent.length === 0) {
    return new Response("Not found", { status: 404 })
  }

  const context = recent
    .reverse()
    .map((row) => `${row.role}: ${row.textContent ?? textOf(row.parts)}`)
    .join("\n")

  const prompt = `Generate a short, friendly chat title (max 5 words) based on the conversation. Return only the title, no quotes or punctuation.\n\nConversation:\n${context}`

  const { text } = await generateText({
    model: hackClubAI.chat("~anthropic/claude-haiku-latest"),
    system: "You create concise chat titles.",
    prompt,
  })

  const title = text.trim().replace(/[\n\r]+/g, " ").slice(0, 80)
  if (!title) {
    return new Response("Failed to generate title", { status: 500 })
  }

  const [updated] = await db
    .update(chatSessions)
    .set({ title, updatedAt: new Date() })
    .where(and(eq(chatSessions.id, id), eq(chatSessions.userId, userId)))
    .returning({ id: chatSessions.id, title: chatSessions.title, createdAt: chatSessions.createdAt, updatedAt: chatSessions.updatedAt })

  if (!updated) {
    return new Response("Not found", { status: 404 })
  }
  return Response.json(toSessionSummary(updated))
}
