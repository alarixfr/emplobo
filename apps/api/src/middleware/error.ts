import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@emplobo/db";

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

  const message =
    process.env.NODE_ENV === "development" && err instanceof Error
      ? err.message
      : "internal server error";
  res.status(500).json({ error: message });
}
