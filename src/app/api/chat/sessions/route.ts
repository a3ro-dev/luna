import { auth } from "@/auth"
import { db } from "@/lib/db"
import { chatSessions } from "@/lib/db/schema"
import { listSessions, toSessionSummary } from "@/lib/chat/store"

export async function GET() {
  const session = await auth()
  const userId = session?.user?.id

  if (!userId) {
    return new Response("Unauthorized", { status: 401 })
  }

  return Response.json(await listSessions(userId))
}

/** Kept for older clients; current clients create a session with its first message (POST /api/chat). */
export async function POST(req: Request) {
  const session = await auth()
  const userId = session?.user?.id

  if (!userId) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { title } = await req.json().catch(() => ({ title: null }))
  const safeTitle = typeof title === "string" && title.trim().length > 0 ? title.trim() : null

  const [created] = await db
    .insert(chatSessions)
    .values({ userId, title: safeTitle })
    .returning({ id: chatSessions.id, title: chatSessions.title, createdAt: chatSessions.createdAt, updatedAt: chatSessions.updatedAt })

  return Response.json(toSessionSummary(created))
}
