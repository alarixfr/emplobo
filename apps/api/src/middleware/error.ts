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

  if (err instanceof Prisma.PrismaClientInitializationError) {
    res.status(503).json({ error: "database unavailable" });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    res.status(400).json({ error: "database request failed" });
    return;
  }

  const message =
    process.env.NODE_ENV === "development" && err instanceof Error
      ? err.message
      : "internal server error";
  res.status(500).json({ error: message });
}
