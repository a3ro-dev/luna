/**
 * Redis-backed rate limiter using Upstash.
 *
 * Uses a sliding window algorithm via Upstash's INCR + EXPIRE pattern.
 * Shared across all serverless instances — safe for Vercel deployments.
 *
 * Falls back to a per-process in-memory store if Redis env vars are not set
 * (e.g. local dev without Redis configured), with a console warning.
 */

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

// ── In-memory fallback (dev only) ────────────────────────────────────────────

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitEntry>();

setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of memoryStore) {
      if (entry.resetAt <= now) {
        memoryStore.delete(key);
      }
    }
  },
  5 * 60 * 1000,
);

function rateLimitMemory(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || entry.resetAt <= now) {
    const resetAt = now + windowMs;
    memoryStore.set(key, { count: 1, resetAt });
    return { success: true, remaining: limit - 1, resetAt };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return {
    success: true,
    remaining: limit - entry.count,
    resetAt: entry.resetAt,
  };
}

// ── Redis-backed implementation (production) ─────────────────────────────────

async function rateLimitRedis(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const redisUrl = process.env.KV_REST_API_URL;
  const redisToken = process.env.KV_REST_API_TOKEN;

  if (!redisUrl || !redisToken) {
    // No Redis configured — fall back to in-memory with a warning
    if (process.env.NODE_ENV !== "test") {
      console.warn(
        "[rate-limit] KV_REST_API_URL / KV_REST_API_TOKEN not set. " +
          "Falling back to in-memory rate limiter — NOT safe for multi-instance deployments.",
      );
    }
    return rateLimitMemory(key, limit, windowMs);
  }

  const windowSec = Math.ceil(windowMs / 1000);
  const redisKey = `rl:${key}`;
  const now = Date.now();
  const resetAt = now + windowMs;

  try {
    // Upstash REST API: pipeline INCR + EXPIRE in one round-trip
    const pipeline = [
      ["INCR", redisKey],
      ["EXPIRE", redisKey, windowSec, "NX"], // only set TTL on first write
    ];

    const res = await fetch(`${redisUrl}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${redisToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pipeline),
    });

    if (!res.ok) {
      // Redis unavailable — fail open (allow request) to avoid blocking users
      console.error("[rate-limit] Redis pipeline failed:", res.status);
      return { success: true, remaining: limit - 1, resetAt };
    }

    const results = (await res.json()) as Array<{ result: number }>;
    const count = results[0]?.result ?? 1;

    if (count > limit) {
      return { success: false, remaining: 0, resetAt };
    }

    return { success: true, remaining: limit - count, resetAt };
  } catch (err) {
    // Network error — fail open
    console.error("[rate-limit] Redis error:", err);
    return { success: true, remaining: limit - 1, resetAt };
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Check if a request is within rate limits.
 * Uses Redis in production, in-memory fallback in dev.
 *
 * @param key     - Unique identifier (e.g. `login:${ip}`, `reset:${email}`)
 * @param limit   - Maximum requests allowed in the window
 * @param windowMs - Time window in milliseconds
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  return rateLimitRedis(key, limit, windowMs);
}
