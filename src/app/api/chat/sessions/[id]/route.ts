import { auth } from "@/auth"
import { deleteSession, isUuid } from "@/lib/chat/store"

/** Idempotent: 204 whether or not the session existed (a never-saved new chat has no row). */
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
  if (!isUuid(id)) {
    return new Response("Invalid session id", { status: 400 })
  }

  await deleteSession(userId, id)
  return new Response(null, { status: 204 })
}
