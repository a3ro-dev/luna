import { auth } from "@/auth";
import { isUuid } from "@/lib/chat/store";
import { requestStop } from "@/lib/chat/streams";

/** Stop: ends the session's live reply wherever it is generating; the partial reply is saved. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = (await auth())?.user?.id;
  if (!userId) return new Response("Unauthorized", { status: 401 });
  if (!isUuid(id)) return new Response("Invalid session id", { status: 400 });

  await requestStop(userId, id);
  return new Response(null, { status: 204 });
}
