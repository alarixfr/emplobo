import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { Env } from "../env.js";

/**
 * Shared rate limiter (Section 8 checklist). Prefers Upstash sliding windows
 * so enforcement survives restarts and works across replicas; falls back to
 * an in-memory sliding window in dev or on Redis outage (fail-open per
 * request, never hard-block a feature on cache infra failure).
 */

export interface RateLimitResult {
  ok: boolean;
  retryAfter?: number; // seconds, present when !ok
}

/**
 * A rate limiter that can give a slot back. Used where consuming quota only
 * makes sense if the work actually succeeds (e.g. guide generation — an AI
 * failure must not silently burn one of the role's 3/hour generation slots).
 * `acquire` consumes one slot (or rejects with retryAfter); `release` returns
 * one slot, never going below zero.
 */
export interface RefundableRateLimiter {
  acquire(key: string): Promise<RateLimitResult>;
  release(key: string): Promise<void>;
}

interface LimiterConfig {
  limit: number;
  windowSeconds: number;
  prefix: string;
}

export type RateLimiter = (key: string) => Promise<RateLimitResult>;

const memoryState = new Map<string, number[]>();
const warnedNoUpstash = new Set<string>();

function hasUpstash(env: Env): boolean {
  const url = env.UPSTASH_REDIS_REST_URL?.trim();
  const token = env.UPSTASH_REDIS_REST_TOKEN?.trim();
  return Boolean(url && token && !url.includes("xxx") && !token.includes("xxx"));
}

function memoryLimit(key: string, config: LimiterConfig): RateLimitResult {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const start = now - windowMs;
  const mapKey = `${config.prefix}:${key}`;
  const kept = (memoryState.get(mapKey) ?? []).filter((ts) => ts >= start);

  if (kept.length >= config.limit) {
    const oldest = kept[0] ?? now;
    memoryState.set(mapKey, kept);
    return {
      ok: false,
      retryAfter: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
    };
  }

  kept.push(now);
  memoryState.set(mapKey, kept);

  // Opportunistic sweep — keys for expired windows must not accumulate
  // across the process lifetime.
  if (memoryState.size > 5000) {
    for (const [k, v] of memoryState) {
      const latest = v[v.length - 1];
      if (latest === undefined || latest < start) memoryState.delete(k);
    }
  }

  return { ok: true };
}

export function createRateLimiter(env: Env, config: LimiterConfig): RateLimiter {
  if (hasUpstash(env)) {
    const redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL!.trim(),
      token: env.UPSTASH_REDIS_REST_TOKEN!.trim(),
    });
    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(config.limit, `${config.windowSeconds} s`),
      prefix: config.prefix,
      analytics: true,
    });

    return async (key) => {
      try {
        const result = await limiter.limit(key);
        if (result.success) return { ok: true };
        return {
          ok: false,
          retryAfter: Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
        };
      } catch (err) {
        console.warn(`[rate-limit] upstash failed for ${config.prefix}, using memory fallback`, err);
        return memoryLimit(key, config);
      }
    };
  }

  if (env.NODE_ENV === "production" && !warnedNoUpstash.has(config.prefix)) {
    warnedNoUpstash.add(config.prefix);
    console.warn(
      `[rate-limit] Upstash not configured — ${config.prefix} is enforcing in-memory only (resets on restart, not shared across replicas).`,
    );
  }

  return (key) => Promise.resolve(memoryLimit(key, config));
}

/**
 * Refundable fixed-window counter limiter (see RefundableRateLimiter). Uses a
 * plain atomic INCR with a window-start marker key so a released slot is a
 * clean DECR — Upstash's sliding-window can't be reversed, which is exactly
 * what a "don't charge me for a failed generation" cooldown needs.
 */
export function createRefundableRateLimiter(
  env: Env,
  config: LimiterConfig,
): RefundableRateLimiter {
  const windowMs = config.windowSeconds * 1000;

  if (hasUpstash(env)) {
    const redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL!.trim(),
      token: env.UPSTASH_REDIS_REST_TOKEN!.trim(),
    });

    return {
      acquire: async (key) => {
        const countKey = `${config.prefix}:${key}:count`;
        const startKey = `${config.prefix}:${key}:start`;
        const now = Date.now();

        const startRaw = await redis.get<string>(startKey);
        const start = startRaw ? Number(startRaw) : null;

        // The hour window has fully elapsed — swap in a fresh bucket so the
        // quota genuinely resets (and an old near-full bucket can't block the
        // new hour because refunds happened later in the previous one).
        if (start !== null && now - start >= windowMs) {
          await redis.set(startKey, String(now), { ex: config.windowSeconds });
          await redis.set(countKey, "1", { ex: config.windowSeconds });
          return { ok: true };
        }

        const count = await redis.incr(countKey);
        if (count === 1) {
          await redis.set(startKey, String(now), { ex: config.windowSeconds });
          await redis.expire(countKey, config.windowSeconds);
        }

        if (count <= config.limit) return { ok: true };

        const resetAt = start ?? now;
        return {
          ok: false,
          retryAfter: Math.max(1, Math.ceil((resetAt + windowMs - now) / 1000)),
        };
      },
      release: async (key) => {
        // Give the slot back without letting the counter go negative, and
        // leave the window TTL intact.
        try {
          await redis.eval(
            `local c = tonumber(redis.call('GET', KEYS[1]) or '0')
             if c > 0 then redis.call('DECR', KEYS[1]) end
             return c`,
            [`${config.prefix}:${key}:count`],
            [],
          );
        } catch (err) {
          console.warn(`[rate-limit] guide-gen release failed for ${key}`, err);
        }
      },
    };
  }

  // In-memory fallback mirrors the same acquire/release semantics.
  const memoryBuckets = new Map<string, { start: number; count: number }>();
  const bucketFor = (key: string) => {
    const mapKey = `${config.prefix}:${key}`;
    const now = Date.now();
    const bucket = memoryBuckets.get(mapKey);
    if (!bucket || now - bucket.start >= windowMs) {
      const fresh = { start: now, count: 0 };
      memoryBuckets.set(mapKey, fresh);
      return fresh;
    }
    return bucket;
  };

  return {
    acquire: async (key) => {
      const bucket = bucketFor(key);
      bucket.count += 1;
      if (bucket.count <= config.limit) return { ok: true };
      return {
        ok: false,
        retryAfter: Math.max(1, Math.ceil((bucket.start + windowMs - Date.now()) / 1000)),
      };
    },
    release: async (key) => {
      const bucket = memoryBuckets.get(`${config.prefix}:${key}`);
      if (bucket && bucket.count > 0) bucket.count -= 1;
    },
  };
}
