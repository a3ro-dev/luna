import { db } from "@/lib/db";
import { chatMessages, uploadedImages } from "@/lib/db/schema";
import { and, eq, gt, inArray, lt, sql } from "drizzle-orm";
import type { UIMessage } from "ai";

export const IMAGE_RETENTION_DAYS = 7;
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/** Chat history stores this reference instead of the image bytes. */
const IMAGE_REF = "luna-image:";
/** The client loads stored images from here (src/app/api/chat/sessions/images/[imageId]). */
const IMAGE_URL = "/api/chat/sessions/images/";
const EXPIRED_NOTE = `(photo removed after ${IMAGE_RETENTION_DAYS} days)`;

type Parts = UIMessage["parts"];
type FilePart = { type: "file"; mediaType?: string; url?: string; filename?: string };

const isImagePart = (part: Parts[number]): part is Parts[number] & FilePart =>
  part.type === "file" && Boolean((part as FilePart).mediaType?.startsWith("image/"));

/** An inline image moved out of a message, ready for uploaded_images. */
export type NewImage = { id: string; image_data: string; media_type: string; filename: string | null };

/**
 * Pure part of externalizing: swap inline image data for references and return
 * the images to store. Oversized or unsupported images are dropped.
 */
export function prepareImageParts(parts: Parts, newId: () => string = () => crypto.randomUUID()): { parts: Parts; images: NewImage[] } {
  const out: Parts = [];
  const images: NewImage[] = [];
  for (const part of parts) {
    // An already-stored image sent back by the client (e.g. Retry after a reload)
    if (isImagePart(part) && part.url?.startsWith(IMAGE_URL)) {
      out.push({ ...part, url: `${IMAGE_REF}${part.url.slice(IMAGE_URL.length)}` } as Parts[number]);
      continue;
    }
    if (!isImagePart(part) || !part.url?.startsWith("data:")) {
      out.push(part);
      continue;
    }
    // base64 is ~37% larger than raw bytes
    if (part.url.length > MAX_IMAGE_SIZE_BYTES * 1.37 || !ALLOWED_MEDIA_TYPES.includes(part.mediaType!)) {
      continue;
    }
    const id = newId();
    images.push({ id, image_data: part.url, media_type: part.mediaType!, filename: part.filename ?? null });
    out.push({ ...part, url: `${IMAGE_REF}${id}` } as Parts[number]);
  }
  return { parts: out, images };
}

/**
 * One statement that stores a message's images unless that message is already
 * saved (a retry re-sends the same message id), so retries do not duplicate them.
 * Run it in the same db.batch, before the message insert.
 */
export function insertImagesForMessage(userId: string, messageId: string, images: NewImage[]) {
  return db.execute(sql`
    insert into ${uploadedImages} (id, user_id, message_id, image_data, media_type, filename, expires_at)
    select i.id, ${userId}, ${messageId}::uuid, i.image_data, i.media_type, i.filename,
      now() + make_interval(days => ${IMAGE_RETENTION_DAYS}::int)
    from jsonb_to_recordset(${JSON.stringify(images)}::jsonb) as i(id uuid, image_data text, media_type text, filename text)
    where not exists (select 1 from ${chatMessages} where id = ${messageId}::uuid)`);
}

/** @deprecated use saveUserMessage (src/lib/chat/store.ts); kept until the chat route stops importing it. */
export async function externalizeImageParts(userId: string, parts: Parts): Promise<Parts> {
  const prepared = prepareImageParts(parts);
  if (prepared.images.length > 0) {
    const expiresAt = new Date(Date.now() + IMAGE_RETENTION_DAYS * 86_400_000);
    await db.insert(uploadedImages).values(
      prepared.images.map((i) => ({ id: i.id, userId, imageData: i.image_data, mediaType: i.media_type, filename: i.filename, expiresAt })),
    );
  }
  return prepared.parts;
}

/**
 * Swap image references back for their data (for the model) or, with asUrl,
 * for a URL the client loads (keeps responses small); expired images become a short note.
 */
export async function resolveImageParts<M extends { parts: Parts }>(
  userId: string,
  messages: M[],
  asUrl = false,
): Promise<M[]> {
  const ids = messages.flatMap((m) =>
    m.parts.flatMap((p) => (isImagePart(p) && p.url?.startsWith(IMAGE_REF) ? [p.url.slice(IMAGE_REF.length)] : [])),
  );
  if (ids.length === 0) return messages;

  const live = and(inArray(uploadedImages.id, ids), eq(uploadedImages.userId, userId), gt(uploadedImages.expiresAt, new Date()));
  const data = new Map(
    asUrl
      ? (await db.select({ id: uploadedImages.id }).from(uploadedImages).where(live)).map((r) => [r.id, `${IMAGE_URL}${r.id}`] as const)
      : (await db.select({ id: uploadedImages.id, imageData: uploadedImages.imageData }).from(uploadedImages).where(live)).map(
          (r) => [r.id, r.imageData] as const,
        ),
  );

  return messages.map((m) => ({
    ...m,
    parts: m.parts.map((p) => {
      if (!isImagePart(p) || !p.url?.startsWith(IMAGE_REF)) return p;
      const url = data.get(p.url.slice(IMAGE_REF.length));
      return url ? { ...p, url } : { type: "text" as const, text: EXPIRED_NOTE };
    }),
  }));
}

/**
 * Delete all expired images from the database, and strip any image data that
 * older chat messages stored inline. Called on a schedule (e.g. via cron).
 * Returns the number of deleted image rows.
 */
export async function cleanupExpiredImages(): Promise<number> {
  const now = new Date();
  const deleted = await db
    .delete(uploadedImages)
    .where(lt(uploadedImages.expiresAt, now))
    .returning({ id: uploadedImages.id });

  const cutoff = new Date(now.getTime() - IMAGE_RETENTION_DAYS * 86_400_000);
  // ponytail: bounded batches per run; the daily cron finishes any backlog
  for (let batch = 0; batch < 10; batch++) {
    const rows = await db
      .select({ id: chatMessages.id, parts: chatMessages.parts })
      .from(chatMessages)
      .where(
        and(
          lt(chatMessages.createdAt, cutoff),
          // Same test as the rewrite below, so every selected row changes and the loop moves on
          sql`jsonb_path_exists(${chatMessages.parts}, '$[*] ? (@.type == "file" && @.mediaType starts with "image/" && @.url starts with "data:")')`,
        ),
      )
      .limit(100);
    if (rows.length === 0) break;
    const [first, ...rest] = rows.map((row) => {
      const parts = (Array.isArray(row.parts) ? (row.parts as Parts) : []).map((p) =>
        isImagePart(p) && p.url?.startsWith("data:") ? { type: "text" as const, text: EXPIRED_NOTE } : p,
      );
      return db.update(chatMessages).set({ parts }).where(eq(chatMessages.id, row.id));
    });
    await db.batch([first, ...rest]); // one round trip for the whole batch
  }

  return deleted.length;
}
