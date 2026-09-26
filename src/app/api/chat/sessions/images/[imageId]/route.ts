import { auth } from "@/auth"
import { db } from "@/lib/db"
import { uploadedImages } from "@/lib/db/schema"
import { and, eq, gt } from "drizzle-orm"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Serves one of the user's stored chat images until it expires (see src/lib/chat/images.ts). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ imageId: string }> }
) {
  const { imageId } = await params
  const session = await auth()
  const userId = session?.user?.id

  if (!userId) {
    return new Response("Unauthorized", { status: 401 })
  }
  if (!UUID.test(imageId)) {
    return new Response("Not found", { status: 404 })
  }

  const [row] = await db
    .select({ imageData: uploadedImages.imageData, mediaType: uploadedImages.mediaType })
    .from(uploadedImages)
    .where(
      and(
        eq(uploadedImages.id, imageId),
        eq(uploadedImages.userId, userId),
        gt(uploadedImages.expiresAt, new Date())
      )
    )
    .limit(1)

  if (!row) {
    return new Response("Not found", { status: 404 })
  }

  // imageData is a base64 data URL; mediaType was restricted to raster images on upload
  const bytes = Buffer.from(row.imageData.slice(row.imageData.indexOf(",") + 1), "base64")
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": row.mediaType,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
