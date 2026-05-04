import { auth } from "@/auth"
import { db } from "@/lib/db"
import { chatMessages, chatSessions } from "@/lib/db/schema"
import { and, asc, eq } from "drizzle-orm"

export async function GET(
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

  const rows = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, id))
    .orderBy(asc(chatMessages.createdAt))

  const messages = rows.map((row) => ({
    id: row.id,
    role: row.role,
    parts: Array.isArray(row.parts) ? row.parts : [],
  }))

  return Response.json(messages)
}
