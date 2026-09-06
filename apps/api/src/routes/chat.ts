import { prisma, Prisma } from "@emplobo/db";
import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import type { Env } from "../env.js";
import { createRateLimiter } from "../lib/rate-limit.js";
import { logAiUsage } from "../lib/ai-usage.js";
import { formatKnowledgeChunksForPrompt, searchKnowledgeChunks } from "../lib/knowledge.js";
import {
  buildHistoryMessages,
  callAiText,
  sanitizeUserText,
  stripStructuralTags,
  wrapBusinessData,
  type AiCallResult,
} from "../lib/ai.js";
import { buildTutorSystemPrompt } from "../lib/prompts.js";
import type { AuthContext } from "../types.js";

const CHAT_RATE_LIMIT = 15;
const CHAT_RATE_WINDOW_SECONDS = 5 * 60; // 5 minutes
const CHAT_COOLDOWN_MS = 2000; // 2 seconds between messages in session
const MAX_SESSIONS_PER_ROLE = 10;
const CHAT_SESSION_RATE_LIMIT = 10;
const CHAT_SESSION_RATE_WINDOW_SECONDS = 10 * 60; // 10 minutes

const chatCooldownState = new Map<string, number>();

const createSessionSchema = z
  .object({
    roleId: z.string().cuid(),
    title: z.string().trim().min(1).max(200).optional(),
  })
  .strict();

const sendChatMessageSchema = z
  .object({
    content: z.string().trim().min(1).max(3000),
  })
  .strict();

type AuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => void | Promise<void>;

function requireAuthContext(req: Request): AuthContext {
  if (!req.auth) {
    throw new Error("requireAuth must run before chat handlers");
  }
  return req.auth;
}

function enforceChatCooldown(key: string): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now();
  const nextAllowedAt = chatCooldownState.get(key);

  if (nextAllowedAt !== undefined && now < nextAllowedAt) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((nextAllowedAt - now) / 1000)) };
  }

  chatCooldownState.set(key, now + CHAT_COOLDOWN_MS);

  // Opportunistic sweep — the map is keyed by session and must not grow
  // without bound across the process lifetime.
  if (chatCooldownState.size > 5000) {
    for (const [k, ts] of chatCooldownState) {
      if (ts <= now) chatCooldownState.delete(k);
    }
  }

  return { ok: true };
}

type CapTx = Prisma.TransactionClient;

/**
 * Enforce the 10-session-per-role cap inside a single transaction: count
 * existing sessions, evict the oldest if at/over the cap, then create. The
 * eviction and creation share one transaction so a crash can never leave
 * 11 sessions or delete the wrong one (Section 8 checklist).
 */
async function createSessionWithCap(
  tx: CapTx,
  auth: AuthContext,
  roleId: string,
  title: string,
) {
  const existingSessions = await tx.chatSession.findMany({
    where: {
      orgId: auth.orgId,
      userId: auth.userId,
      roleId,
    },
    orderBy: { updatedAt: "asc" },
    select: { id: true },
  });

  if (existingSessions.length >= MAX_SESSIONS_PER_ROLE) {
    const deleteCount = existingSessions.length - (MAX_SESSIONS_PER_ROLE - 1);
    const idsToDelete = existingSessions.slice(0, deleteCount).map((s) => s.id);
    await tx.chatSession.deleteMany({
      where: {
        id: { in: idsToDelete },
        orgId: auth.orgId,
        userId: auth.userId,
      },
    });
  }

  return tx.chatSession.create({
    data: {
      orgId: auth.orgId,
      userId: auth.userId,
      roleId,
      title,
    },
    select: {
      id: true,
      roleId: true,
      title: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export function createChatRouter(requireAuth: AuthMiddleware, env: Env): Router {
  const router = Router();
  const chatLimiter = createRateLimiter(env, {
    limit: CHAT_RATE_LIMIT,
    windowSeconds: CHAT_RATE_WINDOW_SECONDS,
    prefix: "rl:chat-messages",
  });
  const chatSessionLimiter = createRateLimiter(env, {
    limit: CHAT_SESSION_RATE_LIMIT,
    windowSeconds: CHAT_SESSION_RATE_WINDOW_SECONDS,
    prefix: "rl:chat-sessions",
  });

  router.use(requireAuth);

  // POST /api/my/chat/sessions
  router.post("/sessions", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = requireAuthContext(req);
      const body = createSessionSchema.safeParse(req.body);
      if (!body.success) {
        res.status(400).json({ error: "invalid body", details: body.error.flatten() });
        return;
      }

      // Rate limit session creation (Section 8 checklist: chat session creation)
      const rateResult = await chatSessionLimiter(auth.userId);
      if (!rateResult.ok) {
        res.status(429).json({ error: "rate limit exceeded", retryAfter: rateResult.retryAfter });
        return;
      }

      // Check assignment
      const assignment = await prisma.employeeModule.findFirst({
        where: {
          orgId: auth.orgId,
          userId: auth.userId,
          roleId: body.data.roleId,
        },
        select: {
          id: true,
          role: {
            select: {
              name: true,
              status: true,
            },
          },
        },
      });

      if (!assignment) {
        res.status(403).json({ error: "not assigned to this role" });
        return;
      }

      const defaultTitle = body.data.title?.trim() || `Tanya Jawab ${assignment.role.name}`;

      // Enforce 10-session cap atomically in a transaction. Serializable
      // isolation + P2034 retry closes the read-then-write race where two
      // concurrent creations could both observe 9 sessions and exceed the cap.
      const MAX_CAP_ATTEMPTS = 3;
      let session: Awaited<ReturnType<typeof createSessionWithCap>> | null = null;
      for (let attempt = 0; attempt < MAX_CAP_ATTEMPTS; attempt++) {
        try {
          session = await prisma.$transaction(
            (tx) => createSessionWithCap(tx, auth, body.data.roleId, defaultTitle),
            { isolationLevel: "Serializable" },
          );
          break;
        } catch (err) {
          if (
            err instanceof Prisma.PrismaClientKnownRequestError &&
            err.code === "P2034"
          ) {
            if (attempt === MAX_CAP_ATTEMPTS - 1) throw err;
            continue;
          }
          throw err;
        }
      }

      res.status(201).json({ session });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/my/chat/sessions
  router.get("/sessions", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = requireAuthContext(req);
      const roleIdQuery = req.query.roleId;
      const roleId =
        typeof roleIdQuery === "string" && roleIdQuery.trim()
          ? z.string().cuid().safeParse(roleIdQuery)
          : null;
      // A malformed filter must 400, not silently return ALL sessions.
      if (roleId && !roleId.success) {
        res.status(400).json({ error: "invalid roleId query" });
        return;
      }

      const sessions = await prisma.chatSession.findMany({
        where: {
          orgId: auth.orgId,
          userId: auth.userId,
          ...(roleId?.success ? { roleId: roleId.data } : {}),
        },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          roleId: true,
          title: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { messages: true },
          },
        },
      });

      res.json({ sessions });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/my/chat/sessions/:id/messages
  router.get("/sessions/:id/messages", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = requireAuthContext(req);
      const sessionId = z.string().cuid().safeParse(req.params.id);
      if (!sessionId.success) {
        res.status(400).json({ error: "invalid session id" });
        return;
      }

      // Hard check session ownership
      const session = await prisma.chatSession.findFirst({
        where: {
          id: sessionId.data,
          orgId: auth.orgId,
          userId: auth.userId,
        },
        select: {
          id: true,
          roleId: true,
          title: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!session) {
        res.status(404).json({ error: "chat session not found" });
        return;
      }

      const messages = await prisma.chatMessage.findMany({
        where: {
          sessionId: session.id,
          orgId: auth.orgId,
        },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          sender: true,
          content: true,
          createdAt: true,
        },
      });

      res.json({ session, messages });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/my/chat/sessions/:id/messages
  router.post("/sessions/:id/messages", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = requireAuthContext(req);
      const sessionId = z.string().cuid().safeParse(req.params.id);
      if (!sessionId.success) {
        res.status(400).json({ error: "invalid session id" });
        return;
      }

      const body = sendChatMessageSchema.safeParse(req.body);
      if (!body.success) {
        res.status(400).json({ error: "invalid body", details: body.error.flatten() });
        return;
      }

      // 1. Re-verify ownership (anti-IDOR)
      const session = await prisma.chatSession.findFirst({
        where: {
          id: sessionId.data,
          orgId: auth.orgId,
          userId: auth.userId,
        },
        select: {
          id: true,
          roleId: true,
          title: true,
        },
      });

      if (!session) {
        res.status(404).json({ error: "chat session not found" });
        return;
      }

      // 2. Rate limit
      const rateResult = await chatLimiter(auth.userId);
      if (!rateResult.ok) {
        res.status(429).json({ error: "rate limit exceeded", retryAfter: rateResult.retryAfter });
        return;
      }

      // 3. Cooldown (2s per session)
      const cooldownKey = `${auth.orgId}:${session.id}`;
      const cooldownResult = enforceChatCooldown(cooldownKey);
      if (!cooldownResult.ok) {
        res.status(429).json({
          error: "please wait before sending another message",
          retryAfter: cooldownResult.retryAfter,
        });
        return;
      }

      // 4. Fetch Role Guide & Chapters for scoped context
      const role = await prisma.trainingRole.findFirst({
        where: {
          id: session.roleId,
          orgId: auth.orgId,
        },
        select: {
          id: true,
          name: true,
          guide: {
            select: {
              title: true,
              chapters: {
                orderBy: { order: "asc" },
                select: {
                  order: true,
                  title: true,
                  content: true,
                },
              },
            },
          },
        },
      });

      if (!role) {
        res.status(404).json({ error: "role for this session not found" });
        return;
      }

      // 5. Fetch sample of training transcript for supplemental context
      const trainingMessages = await prisma.trainingMessage.findMany({
        where: {
          roleId: role.id,
          orgId: auth.orgId,
        },
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          sender: true,
          content: true,
        },
      });

      const guideText = role.guide
        ? role.guide.chapters
            .map((c) => `### Chapter ${c.order}: ${c.title}\n${c.content}`)
            .join("\n\n")
        : "";

      const trainingSummary = trainingMessages
        .reverse()
        .map((m) => `${m.sender.toUpperCase()}: ${m.content}`)
        .join("\n");

      const knowledgeChunks = await searchKnowledgeChunks({
        orgId: auth.orgId,
        query: `${role.name} ${guideText} ${trainingSummary} ${body.data.content}`,
        limit: 10,
        tokenBudget: 5000,
      });

      // 6. Sliding window of last 10 session messages (needed both for the
      // language directive below and for the conversation history).
      const recentSessionMessages = await prisma.chatMessage.findMany({
        where: {
          sessionId: session.id,
          orgId: auth.orgId,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          sender: true,
          content: true,
        },
      });

      const systemPrompt = buildTutorSystemPrompt(
        role.name,
        guideText,
        trainingSummary,
        formatKnowledgeChunksForPrompt(knowledgeChunks),
        [
          ...recentSessionMessages
            .filter((m) => m.sender === "user")
            .map((m) => m.content),
          body.data.content,
        ],
      );

      const history: { role: "user" | "assistant"; content: string }[] = buildHistoryMessages(
        recentSessionMessages.reverse(),
      );

      // Append current message
      history.push({
        role: "user",
        content: wrapBusinessData(body.data.content),
      });

      // 7. Save user message to DB
      const userMessage = await prisma.chatMessage.create({
        data: {
          sessionId: session.id,
          orgId: auth.orgId,
          sender: "user",
          content: sanitizeUserText(body.data.content),
        },
        select: {
          id: true,
          sender: true,
          content: true,
          createdAt: true,
        },
      });

      // 8. Call AI — on failure, remove the orphaned user message so the
      // conversation never shows a saved question with no reply (the client
      // already rolled the optimistic bubble back).
      let aiReply: AiCallResult;
      try {
        aiReply = await callAiText(env, systemPrompt, history, 1600, {
          timeoutMs: 30_000,
          fallbackReply:
            "Maaf, saat ini AI tutor sedang dalam mode offline. Silakan tanyakan kepada supervisor Anda mengenai prosedur ini.",
        });
        // Never persist a half-sentence tutor reply — the user message below
        // is rolled back and the client surfaces the error so the employee
        // can simply resend.
        if (aiReply.finishReason === "length") {
          throw new Error(
            "AI tutor reply was truncated by the output budget; treat as transient",
          );
        }
      } catch (err) {
        await prisma.chatMessage
          .delete({ where: { id: userMessage.id } })
          .catch(() => undefined);
        throw err;
      }

      // Log AI usage for the admin dashboard (fire-and-forget, never breaks the flow)
      await logAiUsage({
        orgId: auth.orgId,
        userId: auth.userId,
        kind: "chat",
        tokensIn: aiReply.tokensIn,
        tokensOut: aiReply.tokensOut,
      });

      // 9. Save AI message & bump session updatedAt
      const [aiMessage] = await prisma.$transaction([
        prisma.chatMessage.create({
          data: {
            sessionId: session.id,
            orgId: auth.orgId,
            sender: "ai",
            content: stripStructuralTags(aiReply.text),
          },
          select: {
            id: true,
            sender: true,
            content: true,
            createdAt: true,
          },
        }),
        prisma.chatSession.update({
          where: {
            id: session.id,
          },
          data: {
            updatedAt: new Date(),
          },
        }),
      ]);

      res.status(201).json({
        userMessage,
        aiMessage,
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
