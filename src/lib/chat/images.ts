import { db } from "@/lib/db";
import { uploadedImages } from "@/lib/db/schema";
import { lt } from "drizzle-orm";

const IMAGE_RETENTION_DAYS = 7;

/**
 * Store an uploaded image in the database.
 * Returns the stored record ID.
 * Images are automatically expired after 7 days.
 */
export async function storeImage({
  userId,
  messageId,
  imageData,
  mediaType,
  filename,
}: {
  userId: string;
  messageId?: string;
  imageData: string;
  mediaType: string;
  filename?: string;
}): Promise<string> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + IMAGE_RETENTION_DAYS);

  const [row] = await db
    .insert(uploadedImages)
    .values({
      userId,
      messageId: messageId || null,
      imageData,
      mediaType,
      filename: filename || null,
      expiresAt,
    })
    .returning({ id: uploadedImages.id });

  return row.id;
}

/**
 * Delete all expired images from the database.
 * Called on a schedule (e.g. via API route or cron).
 * Returns the number of deleted rows.
 */
export async function cleanupExpiredImages(): Promise<number> {
  const now = new Date();
  const deleted = await db
    .delete(uploadedImages)
    .where(lt(uploadedImages.expiresAt, now))
    .returning({ id: uploadedImages.id });

  return deleted.length;
}

/**
 * Retrieve a stored image by ID (for forwarding to the model).
 * Only returns images that haven't expired.
 */
export async function getImage(
  imageId: string,
): Promise<{ imageData: string; mediaType: string } | null> {
  const now = new Date();
  const row = await db.query.uploadedImages.findFirst({
    where: (img, { and, eq, gt }) =>
      and(eq(img.id, imageId), gt(img.expiresAt, now)),
    columns: { imageData: true, mediaType: true },
  });

  return row ?? null;
}
