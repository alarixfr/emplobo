import { createClerkClient } from "@clerk/backend";
import type { NextFunction, Request, Response } from "express";
import type { Env } from "../env.js";
import type { AuthContext } from "../types.js";

function getBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

function toFetchRequest(req: Request, webOrigin: string): globalThis.Request {
  // Reconstruct a Fetch API Request so @clerk/backend can authenticate it.
  const url = new URL(req.originalUrl || req.url, webOrigin);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) headers.append(key, v);
    } else {
      headers.set(key, value);
    }
  }
  return new globalThis.Request(url, {
    method: req.method,
    headers,
  });
}

function isLocalDevOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
  } catch {
    return false;
  }
}

function buildAuthorizedParties(req: Request, env: Env): string[] {
  const parties = new Set<string>([
    env.WEB_APP_ORIGIN,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ]);

  if (env.NODE_ENV !== "production") {
    // Server-side requests from Next.js (RSC) often have no Origin/Referer.
    // Include a bounded local dev port range so tokens minted on fallback ports
    // (3001, 3002, 3003, …) are still accepted in development.
    for (let port = 3000; port <= 3010; port += 1) {
      parties.add(`http://localhost:${port}`);
      parties.add(`http://127.0.0.1:${port}`);
    }

    const requestOrigin = req.headers.origin;
    if (typeof requestOrigin === "string" && isLocalDevOrigin(requestOrigin)) {
      parties.add(requestOrigin);
    }

    const referer = req.headers.referer;
    if (typeof referer === "string") {
      try {
        const refererOrigin = new URL(referer).origin;
        if (isLocalDevOrigin(refererOrigin)) {
          parties.add(refererOrigin);
        }
      } catch {
        // Ignore malformed referer.
      }
    }
  }

  return Array.from(parties);
}

function extractAuthContext(value: unknown): AuthContext | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const obj = value as Record<string, unknown>;
  const userId = obj.userId;
  if (typeof userId !== "string" || userId.length === 0) {
    return null;
  }

  return {
    userId,
    orgId: typeof obj.orgId === "string" ? obj.orgId : "",
    orgRole: typeof obj.orgRole === "string" ? obj.orgRole : "",
  };
}

export function createAuthMiddleware(env: Env) {
  const clerk = createClerkClient({
    secretKey: env.CLERK_SECRET_KEY,
    publishableKey: env.CLERK_PUBLISHABLE_KEY,
  });

  async function resolveAuth(req: Request): Promise<AuthContext | null> {
    // Prefer Authorization bearer (apps/web will attach the session token).
    // Fall back to cookie-based sessions if present.
    const bearer = getBearerToken(req);
    if (!bearer && !req.headers.cookie) {
      return null;
    }

    const authorizedParties = buildAuthorizedParties(req, env);
    const fetchReq = toFetchRequest(req, env.WEB_APP_ORIGIN);
    const state = await clerk.authenticateRequest(fetchReq, {
      secretKey: env.CLERK_SECRET_KEY,
      publishableKey: env.CLERK_PUBLISHABLE_KEY,
      authorizedParties,
      // `auth().getToken()` from Next.js/Clerk can yield different verified
      // token types depending on runtime/config. Accept any Clerk token here,
      // then enforce org + role at app level below.
      acceptsToken: "any",
    });

    if (!state.isSignedIn) {
      return null;
    }

    return extractAuthContext(state.toAuth());
  }

  async function requireAuth(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const auth = await resolveAuth(req);
      if (!auth) {
        res.status(401).json({ error: "unauthorized" });
        return;
      }
      if (!auth.orgId) {
        res.status(400).json({ error: "no active organization" });
        return;
      }
      req.auth = auth;
      next();
    } catch (err) {
      next(err);
    }
  }

  async function requireAdmin(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const auth = await resolveAuth(req);
      if (!auth) {
        res.status(401).json({ error: "unauthorized" });
        return;
      }
      if (!auth.orgId) {
        res.status(400).json({ error: "no active organization" });
        return;
      }
      if (auth.orgRole !== "org:admin") {
        res.status(403).json({ error: "forbidden" });
        return;
      }
      req.auth = auth;
      next();
    } catch (err) {
      next(err);
    }
  }

  return { requireAuth, requireAdmin, clerk };
}
