import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@emplobo/db";
import { classifyProviderError, parseRetryAfterSeconds } from "../lib/ai.js";

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ error: "not found" });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error("[api]", err);
  if (res.headersSent) {
    return;
  }

  // Malformed JSON request bodies — body-parser marks these 400, don't 500.
  if (
    err instanceof SyntaxError &&
    "status" in err &&
    (err as { status?: number }).status === 400
  ) {
    res.status(400).json({ error: "malformed JSON body" });
    return;
  }

  if (err instanceof Prisma.PrismaClientInitializationError) {
    res.status(503).json({ error: "database unavailable" });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2024") {
      res.status(503).json({ error: "database connection pool exhausted" });
      return;
    }
    res.status(400).json({ error: "database request failed" });
    return;
  }

  // AI provider rate limit (429) — the Hack Club proxy is a shared free-tier
  // endpoint, so this is a normal event, not a bug. Surface a retryAfter the
  // UI can turn into human "try again in X" copy instead of a raw 500 leak.
  const providerInfo = classifyProviderError(err);
  if (providerInfo.kind === "rate-limit") {
    const headers = err instanceof Error && "headers" in err ? (err as { headers?: Headers }).headers : undefined;
    const retryAfter = providerInfo.retryAfter ?? parseRetryAfterSeconds(headers) ?? 30;
    res.status(429).json({
      error:
        "Penyedia AI sedang ramai (rate limit). Tunggu beberapa saat, lalu coba lagi.",
      retryAfter,
      retryAt: new Date(Date.now() + retryAfter * 1000).toISOString(),
      provider: "rate_limit",
    });
    return;
  }

  const message =
    process.env.NODE_ENV === "development" && err instanceof Error
      ? err.message
      : "internal server error";
  res.status(500).json({ error: message });
}
