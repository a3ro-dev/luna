import { auth } from "@/auth"
import { db } from "@/lib/db"
import { chatSessions } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()
  const userId = session?.user?.id

  if (!userId) {
    return new Response("Unauthorized", { status: 401 })
  }

  const deleted = await db
    .delete(chatSessions)
    .where(and(eq(chatSessions.id, id), eq(chatSessions.userId, userId)))
    .returning()

  if (deleted.length === 0) {
    return new Response("Not found", { status: 404 })
  }

  return Response.json(deleted[0])
}
