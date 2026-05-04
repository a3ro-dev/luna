import { streamText, tool, CoreMessage } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { db } from "@/lib/db"
import { aiTraces } from "@/lib/db/schema"
import { auth } from "@/auth"

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

export async function POST(req: Request) {
  const session = await auth()
  const userId = session?.user?.id

  if (!userId) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { messages, webSearchEnabled } = await req.json()
  const userMessages = messages as CoreMessage[]

  const memoryContext = await getSupermemoryContext(userId)

  const systemPrompt = `You are Luna, a warm, caring, minimal, and beautiful health companion. You track menstrual cycles and provide supportive conversation. You are NOT a doctor; remind the user of this gently if they ask for clinical advice.
  
User Context & Memory:
${memoryContext}

CRITICAL: You must use OpenUI Lang like CRAZY. Whenever you display any data, a summary, a log, or an insight, wrap it in OpenUI Lang components. Use <Card>, <Chart>, <Table>, <Progress>, <StatGroup>, <Badge> and construct rich layouts using <Row> and <Column>. Do not output raw markdown data if you can structure it as a beautiful UI component.

Be soft, warm, and highly visual.`

  const startTime = Date.now()
  const modelName = "xai/grok-4.3"

  const result = await streamText({
    model: hackClubAI(modelName),
    system: systemPrompt,
    messages: userMessages,
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
         const lastUserMsg = userMessages[userMessages.length - 1].content;
         writeSupermemoryFact(userId, `User said: ${lastUserMsg}. Luna replied: ${text.substring(0, 50)}...`);
      }

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
        hasImages: userMessages.some(m => Array.isArray(m.content) && m.content.some(c => c.type === 'image')),
        hadWebSearch: !!webSearchEnabled,
      })
    },
  })

  return result.toDataStreamResponse()
}
