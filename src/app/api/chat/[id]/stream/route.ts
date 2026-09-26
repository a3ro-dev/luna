import { UI_MESSAGE_STREAM_HEADERS } from "ai";
import { auth } from "@/auth";
import { isUuid } from "@/lib/chat/store";
import { resumeStream } from "@/lib/chat/streams";

export const maxDuration = 60;

/** useChat({ resume: true }) reconnects here: the session's live reply, or 204 when there is none. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = (await auth())?.user?.id;
  if (!userId) return new Response("Unauthorized", { status: 401 });

  // 204 rather than 400 for a bad id: an error here would surface in useChat as a failed chat
  const stream = isUuid(id) ? await resumeStream(userId, id) : null;
  if (!stream) return new Response(null, { status: 204 });
  return new Response(stream.pipeThrough(new TextEncoderStream()), { headers: UI_MESSAGE_STREAM_HEADERS });
}
