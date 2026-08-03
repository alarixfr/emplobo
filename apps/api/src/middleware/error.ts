import type { NextFunction, Request, Response } from "express";

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
  res.status(500).json({ error: "internal server error" });
}
