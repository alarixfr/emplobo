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
