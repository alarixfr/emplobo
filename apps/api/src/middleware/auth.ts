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

export function createAuthMiddleware(env: Env) {
  const clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });

  async function resolveAuth(req: Request): Promise<AuthContext | null> {
    // Prefer Authorization bearer (apps/web will attach the session token).
    // Fall back to cookie-based sessions if present.
    const bearer = getBearerToken(req);
    if (!bearer && !req.headers.cookie) {
      return null;
    }

    const authorizedParties = Array.from(
      new Set([
        env.WEB_APP_ORIGIN,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
      ]),
    );
    const fetchReq = toFetchRequest(req, env.WEB_APP_ORIGIN);
    const state = await clerk.authenticateRequest(fetchReq, {
      secretKey: env.CLERK_SECRET_KEY,
      authorizedParties,
      acceptsToken: "session_token",
    });

    if (!state.isSignedIn) {
      return null;
    }

    const auth = state.toAuth();
    if (!auth.userId) {
      return null;
    }

    return {
      userId: auth.userId,
      orgId: auth.orgId ?? "",
      orgRole: auth.orgRole ?? "",
    };
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
