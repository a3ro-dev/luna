import { auth } from "@/auth"
import { loadSessionMessages } from "@/lib/chat/store"

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

  const messages = await loadSessionMessages(userId, id)
  if (!messages) {
    return new Response("Not found", { status: 404 })
  }
  return Response.json(messages)
}
