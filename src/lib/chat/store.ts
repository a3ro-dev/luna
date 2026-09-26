import type { UIMessage } from "ai";
import { and, asc, desc, eq, exists, gt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { chatMessages, chatSessions, users } from "@/lib/db/schema";
import { insertImagesForMessage, prepareImageParts, resolveImageParts } from "@/lib/chat/images";

/**
 * Chat persistence (server only). Each function is one database round trip;
 * multi-statement writes go through db.batch (one HTTP call, one transaction).
 */

export interface ChatSessionSummary {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

type Parts = UIMessage["parts"];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: unknown): value is string => typeof value === "string" && UUID.test(value);

/** Joined text of a message's text parts (stored as chat_messages.text_content). */
export const textOf = (parts: unknown): string =>
  Array.isArray(parts)
    ? parts
        .filter((p) => p?.type === "text" && typeof p.text === "string")
        .map((p) => p.text as string)
        .join("")
    : "";

export const toUIMessage = (row: { id: string; role: string; parts: unknown }): UIMessage => ({
  id: row.id,
  role: row.role as UIMessage["role"],
  parts: Array.isArray(row.parts) ? (row.parts as Parts) : [],
});

export const toSessionSummary = (row: {
  id: string;
  title: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}): ChatSessionSummary => ({
  id: row.id,
  title: row.title,
  createdAt: (row.createdAt ?? new Date(0)).toISOString(),
  updatedAt: (row.updatedAt ?? row.createdAt ?? new Date(0)).toISOString(),
});

const summaryColumns = {
  id: chatSessions.id,
  title: chatSessions.title,
  createdAt: chatSessions.createdAt,
  updatedAt: chatSessions.updatedAt,
};

const bumpSession = (userId: string, sessionId: string) =>
  db
    .update(chatSessions)
    .set({ updatedAt: sql`now()` })
    .where(and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, userId)));

/** Sessions that have at least one message, newest activity first. */
export async function listSessions(userId: string): Promise<ChatSessionSummary[]> {
  const rows = await db
    .select(summaryColumns)
    .from(chatSessions)
    .where(
      and(
        eq(chatSessions.userId, userId),
        exists(db.select({ one: sql`1` }).from(chatMessages).where(eq(chatMessages.sessionId, chatSessions.id))),
      ),
    )
    .orderBy(desc(chatSessions.updatedAt));
  return rows.map(toSessionSummary);
}

/**
 * All messages of one of the user's sessions, oldest first, images as URLs.
 * null when the session does not exist or is not the user's.
 * One query (ownership + messages); a second only when the chat has images.
 */
export async function loadSessionMessages(userId: string, sessionId: string): Promise<UIMessage[] | null> {
  if (!isUuid(sessionId)) return null;
  const rows = await db
    .select({ id: chatMessages.id, role: chatMessages.role, parts: chatMessages.parts })
    .from(chatSessions)
    .leftJoin(chatMessages, eq(chatMessages.sessionId, chatSessions.id))
    .where(and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, userId)))
    .orderBy(asc(chatMessages.createdAt));
  if (rows.length === 0) return null;
  const messages = rows.flatMap((r) => (r.id && r.role ? [toUIMessage({ id: r.id, role: r.role, parts: r.parts })] : []));
  // Images go out as URLs, not inline data, to stay under the platform response cap
  return resolveImageParts(userId, messages, true);
}

/** Model context: the newest `limit` messages, oldest first, image references unresolved. */
export async function loadRecentMessages(sessionId: string, limit: number): Promise<UIMessage[]> {
  const rows = await db
    .select({ id: chatMessages.id, role: chatMessages.role, parts: chatMessages.parts })
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit);
  return rows.reverse().map(toUIMessage);
}

/** Creates the session row on first use. "forbidden" when the id belongs to another user. */
export async function ensureSession(userId: string, sessionId: string): Promise<"created" | "exists" | "forbidden"> {
  if (!isUuid(sessionId)) return "forbidden";
  // The outer SELECT runs on the pre-insert snapshot: `owner` is the existing row's owner, if any.
  const { rows } = await db.execute<{ inserted: string | null; owner: string | null }>(sql`
    with ins as (
      insert into ${chatSessions} (id, user_id) values (${sessionId}, ${userId})
      on conflict (id) do nothing
      returning user_id
    )
    select (select user_id from ins) as inserted,
           (select user_id from ${chatSessions} where id = ${sessionId}) as owner`);
  const row = rows[0];
  if (row?.inserted) return "created";
  if (row?.owner) return row.owner === userId ? "exists" : "forbidden";
  // Lost a race with a concurrent insert of the same id: its row was not in our snapshot
  const [again] = await db
    .select({ userId: chatSessions.userId })
    .from(chatSessions)
    .where(eq(chatSessions.id, sessionId));
  return again?.userId === userId ? "exists" : "forbidden";
}

/**
 * Saves a user turn once per message id (a retry is a no-op), moving inline
 * images to uploaded_images. Returns the message as stored.
 */
export async function saveUserMessage(userId: string, sessionId: string, message: UIMessage): Promise<UIMessage> {
  const { parts, images } = prepareImageParts(Array.isArray(message.parts) ? message.parts : []);
  const insertMessage = db
    .insert(chatMessages)
    .values({ id: message.id, sessionId, userId, role: "user", parts, textContent: textOf(parts) })
    .onConflictDoNothing({ target: chatMessages.id });
  const readBack = db
    .select({ parts: chatMessages.parts })
    .from(chatMessages)
    .where(and(eq(chatMessages.id, message.id), eq(chatMessages.sessionId, sessionId), eq(chatMessages.userId, userId)));
  const results = images.length
    ? await db.batch([insertImagesForMessage(userId, message.id, images), insertMessage, bumpSession(userId, sessionId), readBack])
    : await db.batch([insertMessage, bumpSession(userId, sessionId), readBack]);
  const stored = results[results.length - 1] as { parts: unknown }[];
  if (stored.length === 0) throw new Error("chat message id already used elsewhere");
  return toUIMessage({ id: message.id, role: "user", parts: stored[0].parts });
}

/** Upserts an assistant message by id (the streamed id), e.g. partial then final. */
export async function saveAssistantMessage(userId: string, sessionId: string, message: UIMessage): Promise<void> {
  const parts = message.parts;
  const textContent = textOf(parts);
  await db.batch([
    db
      .insert(chatMessages)
      .values({ id: message.id, sessionId, userId, role: "assistant", parts, textContent })
      .onConflictDoUpdate({
        target: chatMessages.id,
        set: { parts, textContent },
        // never overwrite a row of another session
        setWhere: and(eq(chatMessages.sessionId, sessionId), eq(chatMessages.userId, userId)),
      }),
    bumpSession(userId, sessionId),
  ]);
}

/** Regenerate: drop everything in the session saved after that user message. No-op for an unknown id. */
export async function dropRepliesAfter(sessionId: string, userMessageId: string): Promise<void> {
  if (!isUuid(userMessageId)) return;
  await db
    .delete(chatMessages)
    .where(
      and(
        eq(chatMessages.sessionId, sessionId),
        // NULL (unknown id) compares false, so nothing is deleted
        gt(
          chatMessages.createdAt,
          sql`(select created_at from ${chatMessages} where id = ${userMessageId} and session_id = ${sessionId})`,
        ),
      ),
    );
}

/** One statement; messages and summaries go with it (ON DELETE CASCADE). */
export async function deleteSession(userId: string, sessionId: string): Promise<boolean> {
  if (!isUuid(sessionId)) return false;
  const deleted = await db
    .delete(chatSessions)
    .where(and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, userId)))
    .returning({ id: chatSessions.id });
  return deleted.length > 0;
}

export async function getChatUser(userId: string): Promise<{ plan: string | null; timezone: string | null } | null> {
  const [row] = await db
    .select({ plan: users.plan, timezone: users.timezone })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row ?? null;
}
