import { prisma } from "@emplobo/db";

/**
 * Fire-and-forget audit write for AI usage (Section 4 — AiUsageLog).
 * Redis is the source of truth for rate-limit enforcement; this table
 * exists only to power the admin dashboard's "AI usage" view.
 *
 * Never throw into the request path: a logging failure must not break
 * the AI feature that just succeeded.
 */
export type AiUsageKind = "training" | "chat" | "guide_gen";

export async function logAiUsage(params: {
  orgId: string;
  userId: string;
  kind: AiUsageKind;
  tokensIn: number;
  tokensOut: number;
}): Promise<void> {
  try {
    await prisma.aiUsageLog.create({
      data: {
        orgId: params.orgId,
        userId: params.userId,
        kind: params.kind,
        tokensIn: Math.max(0, Math.round(params.tokensIn || 0)),
        tokensOut: Math.max(0, Math.round(params.tokensOut || 0)),
      },
    });
  } catch (err) {
    console.warn("[ai-usage] failed to log usage", err);
  }
}
