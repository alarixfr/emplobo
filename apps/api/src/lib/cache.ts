import { Redis } from "@upstash/redis";
import type { Env } from "../env.js";

/**
 * Section 6 — Upstash-backed read cache for org-shared, admin-authored
 * content only. Never cache per-user data here (chat sessions, quiz
 * attempts, progress) — that category is excluded by design to avoid
 * cross-user leaks via careless keys.
 */

const GUIDE_TTL_SECONDS = 10 * 60; // 10 min
const ROLE_STATUS_TTL_SECONDS = 30;

function getRedis(env: Env): Redis | null {
  const url = env.UPSTASH_REDIS_REST_URL?.trim();
  const token = env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token || url.includes("xxx") || token.includes("xxx")) {
    return null;
  }
  return new Redis({ url, token });
}

export function createCache(env: Env) {
  const redis = getRedis(env);

  return {
    /** Returns null on any cache miss or Redis failure (fail-open). */
    async getJson<T>(key: string): Promise<T | null> {
      if (!redis) return null;
      try {
        const raw = await redis.get<string>(key);
        if (!raw) return null;
        return JSON.parse(raw) as T;
      } catch (err) {
        console.warn(`[cache] get failed for ${key}`, err);
        return null;
      }
    },

    async setJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
      if (!redis) return;
      try {
        await redis.set(key, JSON.stringify(value), { ex: ttlSeconds });
      } catch (err) {
        console.warn(`[cache] set failed for ${key}`, err);
      }
    },

    async del(...keys: string[]): Promise<void> {
      if (!redis || keys.length === 0) return;
      try {
        await redis.del(...keys);
      } catch (err) {
        console.warn("[cache] del failed", err);
      }
    },

    guideKey(roleId: string): string {
      return `guide:${roleId}`;
    },

    async getGuide<T>(roleId: string): Promise<T | null> {
      return this.getJson<T>(this.guideKey(roleId));
    },

    async setGuide<T>(roleId: string, value: T): Promise<void> {
      await this.setJson(this.guideKey(roleId), value, GUIDE_TTL_SECONDS);
    },

    async invalidateGuide(roleId: string): Promise<void> {
      await this.del(this.guideKey(roleId));
    },

    async getRoleStatus<T>(roleId: string): Promise<T | null> {
      return this.getJson<T>(`role-status:${roleId}`);
    },

    async setRoleStatus<T>(roleId: string, value: T): Promise<void> {
      await this.setJson(`role-status:${roleId}`, value, ROLE_STATUS_TTL_SECONDS);
    },
  };
}

export type Cache = ReturnType<typeof createCache>;
