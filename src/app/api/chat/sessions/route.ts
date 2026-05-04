import { auth } from "@/auth"
import { db } from "@/lib/db"
import { chatSessions } from "@/lib/db/schema"
import { desc, eq } from "drizzle-orm"

export async function GET() {
  const session = await auth()
  const userId = session?.user?.id

  if (!userId) {
    return new Response("Unauthorized", { status: 401 })
  }

  const rows = await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.userId, userId))
    .orderBy(desc(chatSessions.updatedAt))

  return Response.json(rows)
}

export async function POST(req: Request) {
  const session = await auth()
  const userId = session?.user?.id

  if (!userId) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { title } = await req.json().catch(() => ({ title: null }))
  const safeTitle = typeof title === "string" && title.trim().length > 0 ? title.trim() : null

  const created = await db
    .insert(chatSessions)
    .values({ userId, title: safeTitle })
    .returning()

  return Response.json(created[0])
}
