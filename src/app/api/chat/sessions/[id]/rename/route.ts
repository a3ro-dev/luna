import { streamText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { chatMessages, chatSessions } from "@/lib/db/schema"
import { and, desc, eq } from "drizzle-orm"

const hackClubAI = createOpenAI({
  baseURL: "https://ai.hackclub.com/proxy/v1",
  apiKey: process.env.HACKCLUB_AI_API_KEY,
})

const getTextFromParts = (parts: unknown) => {
  if (!Array.isArray(parts)) return ""
  return parts
    .filter((part) => part?.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join(" ")
}

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

  const sessionRow = await db
    .select()
    .from(chatSessions)
    .where(and(eq(chatSessions.id, id), eq(chatSessions.userId, userId)))
    .limit(1)

  if (sessionRow.length === 0) {
    return new Response("Not found", { status: 404 })
  }

  const recent = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, id))
    .orderBy(desc(chatMessages.createdAt))
    .limit(12)

  const context = recent
    .slice()
    .reverse()
    .map((row) => `${row.role}: ${row.textContent ?? getTextFromParts(row.parts)}`)
    .join("\n")

  const prompt = `Generate a short, friendly chat title (max 5 words) based on the conversation. Return only the title, no quotes or punctuation.\n\nConversation:\n${context}`

  const result = await streamText({
    model: hackClubAI.chat("~anthropic/claude-haiku-latest"),
    system: "You create concise chat titles.",
    prompt,
  })

  const title = (await result.text).trim().replace(/[\n\r]+/g, " ")
  if (!title) {
    return new Response("Failed to generate title", { status: 500 })
  }

  const updated = await db
    .update(chatSessions)
    .set({ title, updatedAt: new Date() })
    .where(and(eq(chatSessions.id, id), eq(chatSessions.userId, userId)))
    .returning()

  return Response.json(updated[0])
}
