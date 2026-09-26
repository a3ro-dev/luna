import { consumeStream, type UIMessage } from "ai";
import { after } from "next/server";
import { setTimeout as sleep } from "node:timers/promises";
import { createClient } from "redis";
import { createResumableStreamContext, type ResumableStreamContext } from "resumable-stream";
import { isUuid } from "@/lib/chat/store";
import { logError } from "@/lib/utils";

/**
 * Chat reply lifecycle (server only). A reply is generated to the end whether
 * or not the browser stays connected; with Redis it can be resumed from another
 * request (GET /api/chat/[id]/stream) and stopped from one (POST /api/chat/[id]/stop).
 * Without Redis (or while it is down) replies still finish and save, Stop works
 * on the same instance only, and there is nothing to resume.
 */

// ---------- request parsing (pure) ----------

export type ChatTrigger = "submit-message" | "regenerate-message";
export interface ChatRequest {
  sessionId: string;
  message: UIMessage;
  trigger: ChatTrigger;
  timeZone: string | undefined;
}

/**
 * Body: { id: session uuid, message: the last user message, trigger, timezone }.
 * null = 400. Only text and file parts are kept; a non-uuid message id (an old
 * cached client) gets a fresh one.
 */
export function parseChatRequest(body: unknown): ChatRequest | null {
  if (!body || typeof body !== "object") return null;
  const { id, message, trigger, timezone } = body as Record<string, unknown>;
  if (!isUuid(id) || !message || typeof message !== "object") return null;
  const { id: messageId, role, parts } = message as Partial<UIMessage>;
  if (role !== "user" || !Array.isArray(parts)) return null;
  const kept = parts.filter((p) => p?.type === "text" || p?.type === "file");
  if (kept.length === 0) return null;
  return {
    sessionId: id,
    message: { id: isUuid(messageId) ? messageId : crypto.randomUUID(), role: "user", parts: kept },
    trigger: trigger === "regenerate-message" ? "regenerate-message" : "submit-message",
    timeZone: typeof timezone === "string" ? timezone : undefined,
  };
}

// ---------- Redis (optional) ----------

const REDIS_URL = process.env.REDIS_URL || process.env.KV_URL;
const CONNECT_TIMEOUT_MS = 2500;
const RETRY_AFTER_FAILURE_MS = 30_000;
const ACTIVE_TTL_S = 10 * 60;
const STOP_POLL_MS = 600;
const MAX_RUN_MS = 5 * 60_000; // safety cap on the stop poll; replies end well before this
const RESUMABLE_SETUP_MS = 3000;

// Commands wait for a reconnect (e.g. after a frozen instance thaws) but never longer than 2 s.
// RESP2: what resumable-stream is built against, and every Redis host speaks it.
const makeClient = (url: string) =>
  createClient({ url, RESP: 2, commandOptions: { timeout: 2000 } }).on("error", (e) => logError("chat-redis", e));
type RedisClient = ReturnType<typeof makeClient>;
interface Redis {
  pub: RedisClient;
  ctx: ResumableStreamContext;
}

const activeKey = (sessionId: string) => `luna:chat:active:${sessionId}`;
const stopKey = (streamId: string) => `luna:chat:stop:${streamId}`;

const timeout = (ms: number) =>
  new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`timed out after ${ms} ms`)), ms));

async function connect(url: string): Promise<Redis> {
  // pub/sub needs its own connection
  const pub = makeClient(url);
  const sub = makeClient(url);
  try {
    await Promise.race([Promise.all([pub.connect(), sub.connect()]), timeout(CONNECT_TIMEOUT_MS)]);
  } catch (e) {
    for (const c of [pub, sub]) if (c.isOpen) c.destroy(); // stops the reconnect loop
    throw e;
  }
  return {
    pub,
    ctx: createResumableStreamContext({ keyPrefix: "luna:chat", waitUntil: after, publisher: pub, subscriber: sub }),
  };
}

let redis: Promise<Redis | null> | undefined;
let retryAt = 0;

/** Shared connection per instance; null when not configured or unreachable (then retried after 30 s). */
function getRedis(): Promise<Redis | null> {
  if (!REDIS_URL || Date.now() < retryAt) return Promise.resolve(null);
  redis ??= connect(REDIS_URL).catch((e) => {
    logError("chat-redis", e);
    redis = undefined;
    retryAt = Date.now() + RETRY_AFTER_FAILURE_MS;
    return null;
  });
  return redis;
}

type Active = { streamId: string; userId: string };

async function readActive(r: Redis, sessionId: string): Promise<Active | null> {
  const raw = await r.pub.get(activeKey(sessionId));
  return typeof raw === "string" ? (JSON.parse(raw) as Active) : null;
}

// ---------- reply lifecycle ----------

/**
 * Replies generating on this instance, by session: the no-Redis Stop path and the same-instance fast path.
 * On globalThis because route bundles may each get their own copy of this module.
 */
const g = globalThis as typeof globalThis & { lunaChatRuns?: Map<string, Active & { controller: AbortController }> };
const local = (g.lunaChatRuns ??= new Map());

export interface StreamRun {
  streamId: string;
  /** Aborted by Stop. Pass to streamText; nothing else aborts a reply. */
  signal: AbortSignal;
  /** Call once the reply is saved (or the request failed). */
  end(): void;
}

/** Registers a reply for a session the user owns (check ownership first). */
export function beginStream(userId: string, sessionId: string): StreamRun {
  const entry = { userId, streamId: crypto.randomUUID(), controller: new AbortController() };
  const { streamId, controller } = entry;
  let ended = false;
  local.set(sessionId, entry);

  void (async () => {
    const r = await getRedis();
    if (!r || ended) return;
    await r.pub.set(activeKey(sessionId), JSON.stringify({ streamId, userId }), { EX: ACTIVE_TTL_S });
    // ponytail: polls one key per live reply (~1 GET / 600 ms); pub/sub if Redis load ever matters
    const deadline = Date.now() + MAX_RUN_MS;
    while (!ended && !controller.signal.aborted && Date.now() < deadline) {
      await sleep(STOP_POLL_MS);
      if (!ended && (await r.pub.get(stopKey(streamId)).catch(() => null))) controller.abort();
    }
  })().catch((e) => logError("chat-stream:register", e));

  return {
    streamId,
    signal: controller.signal,
    end() {
      ended = true;
      if (local.get(sessionId) === entry) local.delete(sessionId);
    },
  };
}

/**
 * Use as consumeSseStream: reads the reply to its end even after the browser
 * leaves (so onFinish always runs and saves it), through Redis when available
 * so other requests can resume it.
 */
export function persistStream(run: StreamRun, stream: ReadableStream<string>) {
  let claimed = false;
  const claim = () => !claimed && (claimed = true);
  const empty = () => new ReadableStream<string>({ start: (c) => c.close() });

  after(
    (async () => {
      const r = await getRedis().catch(() => null);
      if (r) {
        // resumable-stream reads the stream itself once set up. If Redis is slow or fails, read it here
        // instead; a late setup then gets an empty stream. ponytail: a setup that fails after its own
        // waitUntil keeps the instance alive until maxDuration; rare, bounded.
        const resumable = r.ctx
          .createNewResumableStream(run.streamId, () => (claim() ? stream : empty()))
          .catch((e) => logError("chat-stream:resumable", e));
        await Promise.race([resumable, sleep(RESUMABLE_SETUP_MS)]);
      }
      if (claim()) await consumeStream({ stream });
    })(),
  );
}

/** The live reply of a session as SSE text, or null when there is none (or it is not this user's). */
export async function resumeStream(userId: string, sessionId: string): Promise<ReadableStream<string> | null> {
  try {
    const r = await getRedis();
    if (!r) return null;
    const active = await readActive(r, sessionId);
    if (active?.userId !== userId) return null;
    // undefined: not started yet; null: already finished (the saved message has it)
    return (await r.ctx.resumeExistingStream(active.streamId)) ?? null;
  } catch (e) {
    logError("chat-stream:resume", e);
    return null;
  }
}

/** Stops the session's live reply wherever it runs; the partial reply is saved. */
export async function requestStop(userId: string, sessionId: string): Promise<void> {
  const mine = local.get(sessionId);
  if (mine?.userId === userId) mine.controller.abort();
  try {
    const r = await getRedis();
    const active = r && (await readActive(r, sessionId));
    if (r && active?.userId === userId) await r.pub.set(stopKey(active.streamId), "1", { EX: ACTIVE_TTL_S });
  } catch (e) {
    logError("chat-stream:stop", e);
  }
}
