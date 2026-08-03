import compression from "compression";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import type { Env } from "./env.js";
import { createAuthMiddleware } from "./middleware/auth.js";
import { errorHandler, notFound } from "./middleware/error.js";
import { healthRouter } from "./routes/health.js";
import { createRolesRouter } from "./routes/roles.js";
import { createClerkWebhookRouter } from "./routes/webhooks/clerk.js";

export function createApp(env: Env): Express {
  const app = express();
  const { requireAuth, requireAdmin } = createAuthMiddleware(env);

  app.disable("x-powered-by");

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      frameguard: { action: "deny" },
      crossOriginResourcePolicy: { policy: "same-site" },
    }),
  );

  app.use(
    cors({
      origin: env.WEB_APP_ORIGIN,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );

  app.use(compression());

  // Clerk webhooks need the raw body for svix signature verification.
  app.use(
    "/webhooks/clerk",
    express.raw({ type: "application/json" }),
    createClerkWebhookRouter(env),
  );

  app.use(express.json({ limit: "1mb" }));

  // Public
  app.use(healthRouter);

  // Auth probe routes
  app.get("/api/me", requireAuth, (req, res) => {
    res.json({ auth: req.auth });
  });

  app.get("/api/admin/ping", requireAdmin, (req, res) => {
    res.json({ ok: true, auth: req.auth });
  });

  // Section 3 — Admin Role CRUD
  app.use("/api/roles", createRolesRouter(requireAdmin));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
