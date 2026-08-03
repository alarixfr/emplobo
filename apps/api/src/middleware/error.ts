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
  const message =
    process.env.NODE_ENV === "development" && err instanceof Error
      ? err.message
      : "internal server error";
  res.status(500).json({ error: message });
}
