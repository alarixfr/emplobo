import { prisma, type Prisma, type RoleStatus } from "@emplobo/db";
import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { createCache, type Cache } from "../lib/cache.js";
import { buildKnowledgeBaseEnvelope, cleanKnowledgeText, searchKnowledgeChunks } from "../lib/knowledge.js";
import {
  buildHistoryMessages,
  callAiText,
  estimateTokens,
  sanitizeUserText,
  stripStructuralMarkers,
  stripStructuralTags,
  wrapBusinessData,
  type AiCallResult,
  type AiMessage,
} from "../lib/ai.js";
import { buildGuideRepairPrompt, buildGuideSystemPrompt, buildScoringPrompt, buildTrainingSystemPrompt } from "../lib/prompts.js";
import { buildChangeSummary, chapterKey, type FlatChapter } from "../lib/guide-changes.js";
import { createRateLimiter, createRefundableRateLimiter } from "../lib/rate-limit.js";
import { logAiUsage } from "../lib/ai-usage.js";
import { syncOrgMembersIfStale } from "../lib/membership.js";
import type { Env } from "../env.js";
import type { AuthContext } from "../types.js";

const createRoleSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    description: z.string().trim().max(500).optional(),
  })
  .strict();

type AuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => void | Promise<void>;

const TRAINING_RATE_WINDOW_SECONDS = 10 * 60; // 10 minutes
const TRAINING_RATE_LIMIT = 20;
const TRAINING_LOCK_STALE_MS = 30 * 60 * 1000;
const TRAINING_CONTEXT_TOKEN_BUDGET = 12000;

// Guide generation is the most expensive single AI call — 3/hour per Role
// (Section 5.3). Protects against accidental double-clicks and cost blowups.
const GUIDE_GEN_RATE_LIMIT = 3;
const GUIDE_GEN_RATE_WINDOW_SECONDS = 60 * 60; // 1 hour

const assignEmployeesSchema = z
  .object({
    // User.id is a Clerk user id (user_…), NOT a Prisma cuid — validating
    // with .cuid() here rejected every legitimate assignment request.
    userIds: z.array(z.string().min(1).max(191)).min(1).max(100),
  })
  .strict();

// Structured guide generation output (Section 5.3). Validated with Zod
// BEFORE anything is written to the DB — malformed model output must never
// half-write a guide.
const guideChapterSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1),
  quiz: z
    .object({
      question: z.string().trim().min(1),
      options: z.array(z.string().trim().min(1)).length(4),
      correctIndex: z.number().int().min(0).max(3),
    })
    .nullable()
    .optional(),
});

const guideGenerationSchema = z.object({
  chapters: z.array(guideChapterSchema).min(1).max(20),
});

type GeneratedChapter = z.infer<typeof guideChapterSchema>;

// ── Guide update lifecycle (regenerate → draft → review → publish) ─────────
// Canonical draft/snapshot chapter shape. Unlike guideGenerationSchema (one
// quiz question per chapter from the AI), this supports the manual content
// editor's multi-question quizzes as well, so both publish paths share it and
// snapshots are interchangeable for rollback.
const draftQuestionSchema = z.object({
  question: z.string().trim().min(1),
  options: z.array(z.string().trim().min(1)).length(4),
  correctIndex: z.number().int().min(0).max(3),
});

const draftChapterSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1),
  quiz: z
    .object({
      questions: z.array(draftQuestionSchema).min(1).max(25),
    })
    .nullable()
    .optional(),
});

const draftContentSchema = z.object({
  chapters: z.array(draftChapterSchema).min(1).max(20),
});

export type DraftQuestion = z.infer<typeof draftQuestionSchema>;
type DraftChapter = z.infer<typeof draftChapterSchema>;

function generatedToDraftChapter(chapter: GeneratedChapter): DraftChapter {
  return {
    title: stripStructuralMarkers(chapter.title) || "Bab",
    content:
      stripStructuralMarkers(chapter.content) ||
      "(Bab ini tidak memiliki konten yang bisa ditampilkan.)",
    quiz: chapter.quiz
      ? {
          questions: [
            {
              question:
                stripStructuralMarkers(chapter.quiz.question) ||
                "Pertanyaan kuis untuk bab ini.",
              options: chapter.quiz.options.map(
                (option, optionIndex) =>
                  stripStructuralMarkers(option) || `Opsi ${optionIndex + 1}`,
              ),
              correctIndex: chapter.quiz.correctIndex,
            },
          ],
        }
      : null,
  };
}

function parseDraftContent(raw: unknown): DraftChapter[] | null {
  const parsed = draftContentSchema.safeParse(raw);
  return parsed.success ? parsed.data.chapters : null;
}

class GuidePublishConflict extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GuidePublishConflict";
  }
}

async function createQuizWithQuestions(
  tx: Prisma.TransactionClient,
  params: { chapterId: string; orgId: string; questions: DraftQuestion[] },
): Promise<void> {
  const quiz = await tx.quiz.create({
    data: { chapterId: params.chapterId, orgId: params.orgId },
    select: { id: true },
  });
  await tx.quizQuestion.createMany({
    data: params.questions.map((question, index) => ({
      quizId: quiz.id,
      orgId: params.orgId,
      order: index + 1,
      question: question.question,
      options: question.options,
      correctIndex: question.correctIndex,
    })),
  });
}

/**
 * Atomic, progress-preserving publish of a GuideDraft:
 *  - consumes the draft row inside the transaction (acts as a lock — the
 *    losing concurrent publish fails cleanly instead of double-writing),
 *  - bumps Guide.version via an optimistic `updateMany` claim (extra guard),
 *  - keeps matching-chapter rows (title match) so ChapterProgress survives; a
 *    chapter whose content changed but title stayed keeps its progress,
 *  - writes an immutable GuideVersion snapshot for history + rollback,
 *  - all-or-nothing: any failure rolls the whole swap back.
 */
async function publishGuideDraftTx(
  tx: Prisma.TransactionClient,
  params: { orgId: string; roleId: string; publishedBy: string },
): Promise<{
  version: number;
  summary: string;
  targetTitle: string;
  hadGuide: boolean;
}> {
  const { orgId, roleId, publishedBy } = params;

  const draft = await tx.guideDraft.findFirst({
    where: { roleId, orgId },
    select: { id: true, title: true, content: true },
  });
  if (!draft) {
    throw new GuidePublishConflict("Tidak ada draf perubahan untuk diterbitkan.");
  }
  // Claim the draft BEFORE any guide writes. Only the transaction that owns
  // the draft proceeds; the other gets "sudah diterbitkan" (rolled back too).
  await tx.guideDraft.deleteMany({ where: { id: draft.id, roleId, orgId } });

  const chapters = parseDraftContent(draft.content);
  if (!chapters) {
    throw new GuidePublishConflict("Draf tidak memiliki konten yang valid.");
  }

  const now = new Date();

  const existingGuide = await tx.guide.findFirst({
    where: { roleId, orgId },
    select: {
      id: true,
      version: true,
      chapters: {
        orderBy: { order: "asc" },
        select: { id: true, title: true, content: true },
      },
    },
  });

  let guideId: string;
  let newVersion: number;

  if (!existingGuide) {
    const created = await tx.guide.create({
      data: { orgId, roleId, title: draft.title, version: 1, publishedAt: now },
      select: { id: true },
    });
    guideId = created.id;
    newVersion = 1;
  } else {
    const claimed = await tx.guide.updateMany({
      where: { id: existingGuide.id, orgId, version: existingGuide.version },
      data: {
        title: draft.title,
        version: { increment: 1 },
        publishedAt: now,
        updatedAt: now,
      },
    });
    if (claimed.count === 0) {
      throw new GuidePublishConflict(
        "Panduan sedang diperbarui oleh permintaan lain. Muat ulang dan coba lagi.",
      );
    }
    guideId = existingGuide.id;
    newVersion = existingGuide.version + 1;
  }

  const existingChapters = existingGuide?.chapters ?? [];
  const matchedIds = new Set<string>();

  for (const [index, chapter] of chapters.entries()) {
    const order = index + 1;
    const key = chapterKey(chapter.title);
    const match = existingChapters.find(
      (existing) => chapterKey(existing.title) === key && !matchedIds.has(existing.id),
    );

    if (match) {
      matchedIds.add(match.id);
      await tx.chapter.update({
        where: { id: match.id },
        data: { order, title: chapter.title, content: chapter.content },
      });
      await tx.quiz.deleteMany({ where: { chapterId: match.id, orgId } });
      if (chapter.quiz) {
        await createQuizWithQuestions(tx, { chapterId: match.id, orgId, questions: chapter.quiz.questions });
      }
    } else {
      const created = await tx.chapter.create({
        data: { guideId, orgId, order, title: chapter.title, content: chapter.content },
        select: { id: true },
      });
      if (chapter.quiz) {
        await createQuizWithQuestions(tx, { chapterId: created.id, orgId, questions: chapter.quiz.questions });
      }
    }
  }

  const removedIds = existingChapters
    .filter((existing) => !matchedIds.has(existing.id))
    .map((existing) => existing.id);
  if (removedIds.length > 0) {
    await tx.chapter.deleteMany({ where: { id: { in: removedIds }, guideId, orgId } });
  }

  const changes = buildChangeSummary(
    existingChapters.map((c) => ({ title: c.title, content: c.content })),
    chapters.map((c) => ({ title: c.title, content: c.content })),
  );
  const summary = existingGuide
    ? changes.text
    : `Panduan diterbitkan pertama kali — ${chapters.length} bab.`;

  await tx.guideVersion.create({
    data: {
      orgId,
      guideId,
      roleId,
      version: newVersion,
      title: draft.title,
      summary,
      content: {
        chapters: chapters.map((chapter) => ({
          title: chapter.title,
          content: chapter.content,
          quiz: chapter.quiz
            ? { questions: chapter.quiz.questions.map((q) => ({ ...q, options: [...q.options] })) }
            : null,
        })),
      },
      publishedBy,
    },
  });

  return { version: newVersion, summary, targetTitle: draft.title, hadGuide: Boolean(existingGuide) };
}

// Guide generation is the most expensive single AI call — 3/hour per Role
// (Section 5.3). Protects against accidental double-clicks and cost blowups.
// Budget keeps chain-of-thought headroom (gpt-oss spends ~500–1500 of it) so
// the JSON guide finishes under the limit instead of truncating mid-chapter.
const GUIDE_GEN_MAX_TOKENS = 8000;

/**
 * Pull a single top-level JSON object out of a model reply. Models wrap JSON
 * in ``` fences and occasionally emit preamble, several objects, or a stray
 * closing brace — the greedy `{[\s\S]*}` regex cuts at the LAST `}` and then
 * fails. This strips fences, then brace-balances from the first `{` while
 * skipping string literals, so the extracted block is the intact outer object.
 */
function extractJsonBlock(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  if (trimmed.startsWith("{")) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = 0; i < trimmed.length; i++) {
      const c = trimmed[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (c === "\\") escaped = true;
        else if (c === '"') inString = false;
        continue;
      }
      if (c === '"') {
        inString = true;
      } else if (c === "{") {
        depth++;
      } else if (c === "}") {
        depth--;
        if (depth === 0) return trimmed.slice(0, i + 1);
      }
    }
    return trimmed;
  }
  return trimmed.match(/\{[\s\S]*\}/)?.[0] ?? trimmed;
}

// Gate for the DRAFT → READY flip (Section 5.2). Single source of truth for
// "when is a role ready to become a guide" so client copy and server logic
// can never disagree.
const READY_THRESHOLD = 70;

function parseScoringJson(raw: string): { score: number; missingAreas: string[] } | null {
  const block = extractJsonBlock(raw);
  // extractJsonBlock only guarantees balanced braces around the block, not
  // valid JSON — a malformed model reply must keep the previous score, never
  // 500 (7.2).
  let json: unknown;
  try {
    json = JSON.parse(block);
  } catch {
    return null;
  }
  const parsed = z
    .object({
      score: z.number().int().min(0).max(100),
      missingAreas: z.array(z.string().trim().min(1)).max(5),
    })
    .safeParse(json);
  if (!parsed.success) {
    return null;
  }
  return parsed.data;
}

function requireAuthContext(req: Request): AuthContext {
  if (!req.auth) {
    throw new Error("requireAdmin must run before roles handlers");
  }
  return req.auth;
}

// ── Completeness evaluation (background, throttled) ───────────────────────
// Scoring no longer blocks the training-message response. It runs after the
// reply is saved, on a cadence that keeps the score AND knowledge gaps in
// sync with the conversation without an evaluation per tiny turn.
const SCORE_MIN_INTERVAL_MS = 45_000; // at most ~1 evaluation per 45s
const lastScoreAt = new Map<string, number>();
// Very long transcripts are trimmed to the most recent messages so the
// scoring call always fits the model's context window.
const SCORING_TRANSCRIPT_TOKEN_BUDGET = 30_000;

/**
 * Re-score a role's training completeness and refresh both the score/status
 * and the Knowledge Gaps cache. Best-effort: never throws, never 500s; on
 * failure the previous score and gaps remain untouched (Section 7.2).
 */
async function evaluateRoleCompleteness(
  env: Env,
  cache: Cache,
  roleId: string,
  orgId: string,
  userId: string,
): Promise<void> {
  const roleRow = await prisma.trainingRole.findFirst({
    where: { id: roleId, orgId },
    select: {
      id: true,
      orgId: true,
      name: true,
      description: true,
      status: true,
      trainingMessageCount: true,
    },
  });
  if (!roleRow) return;

  const transcript = await prisma.trainingMessage.findMany({
    where: { roleId: roleRow.id, orgId: roleRow.orgId },
    orderBy: { createdAt: "desc" },
    select: { sender: true, content: true, tokenEst: true },
  });

  // Keep the most recent messages that fit the budget (oldest trimmed).
  let used = 0;
  const kept: Array<{ sender: string; content: string }> = [];
  for (const msg of transcript) {
    const tokenEst = msg.tokenEst || estimateTokens(msg.content);
    if (used + tokenEst > SCORING_TRANSCRIPT_TOKEN_BUDGET) break;
    used += tokenEst;
    kept.push({ sender: msg.sender, content: msg.content });
  }
  kept.reverse();

  const scoringReply = await callAiText(
    env,
    buildScoringPrompt(roleRow.name, roleRow.description),
    [
      {
        role: "user",
        content: wrapBusinessData(
          kept
            .map((m) => `${m.sender.toUpperCase()}: ${sanitizeUserText(m.content)}`)
            .join("\n"),
        ),
      },
    ],
    1400,
    {
      timeoutMs: 60_000,
      // Empty fallback: in offline dev (no API key) parsing fails and the
      // previous completeness score is kept (Section 7.2).
      fallbackReply: "",
    },
  );

  await logAiUsage({
    orgId: roleRow.orgId,
    userId,
    kind: "training",
    tokensIn: scoringReply.tokensIn,
    tokensOut: scoringReply.tokensOut,
  });

  const parsedScore = parseScoringJson(scoringReply.text);
  if (!parsedScore) return;

  const finalStatus =
    parsedScore.score >= READY_THRESHOLD && roleRow.status === "DRAFT" ? "READY" : roleRow.status;

  // orgId-scoped updateMany (Section 3 — never update a tenant row by id
  // alone), then refresh both caches so the next poll sees the new state
  // immediately instead of within the old 30s role-status TTL window.
  await prisma.trainingRole.updateMany({
    where: { id: roleRow.id, orgId: roleRow.orgId },
    data: {
      completenessScore: parsedScore.score,
      status: finalStatus,
    },
  });

  await cache.setJson(
    `role-gaps:${roleId}`,
    {
      missingAreas: parsedScore.missingAreas,
      updatedAt: new Date().toISOString(),
    },
    30 * 24 * 60 * 60,
  );
  await cache.setRoleStatus(roleId, {
    status: finalStatus,
    completenessScore: parsedScore.score,
    trainingMessageCount: roleRow.trainingMessageCount,
  });
}

// ── Anti-repeat guard (trainer must never ask an already-answered question) ─
const REPEAT_STOPWORDS = new Set([
  "terima", "kasih", "anda", "jangan", "tolong", "silakan", "bantu", "minta",
  "pertanyaan", "penjelasan", "apakah", "bagaimana", "kapan", "dimana",
  "selanjutnya", "berikutnya", "singkat", "jelaskan", "mohon", "ada",
]);

function normalizeTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 4 && !REPEAT_STOPWORDS.has(word));
}

function isDuplicateQuestion(reply: string, priorQuestions: string[]): boolean {
  const tokens = normalizeTokens(reply);
  if (tokens.length < 3) return false;
  const set = new Set(tokens);
  for (const prior of priorQuestions) {
    const priorTokens = normalizeTokens(prior);
    if (priorTokens.length < 3) continue;
    const priorSet = new Set(priorTokens);
    const intersection = [...set].filter((token) => priorSet.has(token)).length;
    // Containment over the smaller token set (not full Jaccard): words unique
    // to the acknowledgment boilerplate drag Jaccard down and let paraphrased
    // repeats slip through. Requiring >= 3 shared content words keeps genuine
    // new topics (which share at most 1–2 vocabulary words) safe from regen.
    const smaller = Math.min(set.size, priorSet.size);
    if (intersection >= 3 && smaller > 0 && intersection / smaller >= 0.5) {
      return true;
    }
  }
  return false;
}

function briefify(text: string, max = 140): string {
  const t = sanitizeUserText(text).replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max).trimEnd()}…`;
}

export function createRolesRouter(requireAdmin: AuthMiddleware, env: Env): Router {
  const router = Router();
  const cache = createCache(env);

  // Redis-backed sliding windows with in-memory fallback (lib/rate-limit.ts)
  const trainingLimiter = createRateLimiter(env, {
    limit: TRAINING_RATE_LIMIT,
    windowSeconds: TRAINING_RATE_WINDOW_SECONDS,
    prefix: "rl:training-messages",
  });
  // Refundable counter for guide generation (Section 5.3): max 3/hour per
  // Role. Unlike the sliding windows above, a slot is only permanently burned
  // when generation actually succeeds — failed generations (invalid guide
  // JSON, provider down after retries) release their slot back, so a user
  // isn't locked out of retrying by a provider hiccup.
  const guideGenLimiter = createRefundableRateLimiter(env, {
    limit: GUIDE_GEN_RATE_LIMIT,
    windowSeconds: GUIDE_GEN_RATE_WINDOW_SECONDS,
    prefix: "rl:guide-gen",
  });
  // Concurrency guard: the sliding-window limiter doesn't stop two
  // simultaneous generations for the same role, whose interleaved
  // transactions could duplicate chapters. One in-flight generation max.
  const guideGenInFlight = new Set<string>();

  // All role routes are admin-only (Section 9).
  router.use(requireAdmin);

  // POST /api/roles — create a DRAFT training role for this org
  router.post("/", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = requireAuthContext(req);
      const parsed = createRoleSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: "invalid body",
          details: parsed.error.flatten(),
        });
        return;
      }

      const { name, description } = parsed.data;
      const role = await prisma.trainingRole.create({
        data: {
          orgId: auth.orgId,
          name,
          description: description || null,
          status: "DRAFT",
        },
      });

      res.status(201).json({ role });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/roles — list active roles for this org
  router.get("/", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = requireAuthContext(req);
      const roles = await prisma.trainingRole.findMany({
        where: { orgId: auth.orgId, isActive: true },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          completenessScore: true,
          trainingMessageCount: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      res.json({ roles });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/roles/:id — single role, tenant-scoped
  router.get(
    "/:id",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const auth = requireAuthContext(req);
        const id = z.string().cuid().safeParse(req.params.id);
        if (!id.success) {
          res.status(400).json({ error: "invalid role id" });
          return;
        }

        const role = await prisma.trainingRole.findFirst({
          where: { id: id.data, orgId: auth.orgId },
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            isActive: true,
            completenessScore: true,
            trainingMessageCount: true,
            activeTrainerId: true,
            activeTrainerAt: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        if (!role) {
          res.status(404).json({ error: "role not found" });
          return;
        }

        // Previously the 30s role-status cache was overlaid here. That is a
        // pure bug: evaluations write the DB FIRST then the cache, and nothing
        // updates the cache without updating the DB, so the DB row is always
        // at least as fresh as the cache — the overlay could only serve stale
        // status/completeness to the training-room poll. Use the fresh row.
        const gaps = await cache.getJson<{
          missingAreas: string[];
          updatedAt: string;
        }>(`role-gaps:${id.data}`);

        // Lightweight guide-draft meta so the role page can immediately show
        // "ada draf perubahan yang belum diterbitkan" (no content here — the
        // full draft is fetched on demand via GET /guide/draft).
        const guideDraft = await prisma.guideDraft.findFirst({
          where: { roleId: role.id, orgId: auth.orgId },
          select: {
            id: true,
            title: true,
            baseVersion: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        res.json({
          role,
          missingAreas: gaps?.missingAreas ?? [],
          guideDraft,
        });
      } catch (err) {
        next(err);
      }
    },
  );

  // PATCH /api/roles/:id — edit role metadata (name / description).
  // Safe to run at any time: the Training Room reads role.name fresh on every
  // message and the Knowledge Library has no FK to a role, so a rename can
  // never corrupt either. Guide titles keep their own value until the next
  // generation/publish — renaming a role does not silently rename live SOPs.
  const editRoleSchema = z
    .object({
      name: z.string().trim().min(1).max(100).optional(),
      description: z.string().trim().max(500).nullable().optional(),
    })
    .strict()
    .superRefine((data, ctx) => {
      if (data.name === undefined && data.description === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "provide name or description",
        });
      }
    });

  router.patch("/:id", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = requireAuthContext(req);
      const id = z.string().cuid().safeParse(req.params.id);
      if (!id.success) {
        res.status(400).json({ error: "invalid role id" });
        return;
      }

      const parsed = editRoleSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "invalid body", details: parsed.error.flatten() });
        return;
      }

      const updated = await prisma.trainingRole.updateMany({
        where: { id: id.data, orgId: auth.orgId, isActive: true },
        data: {
          ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
          ...(parsed.data.description !== undefined
            ? { description: parsed.data.description === "" ? null : parsed.data.description }
            : {}),
        },
      });
      if (updated.count === 0) {
        res.status(404).json({ error: "role not found" });
        return;
      }

      const role = await prisma.trainingRole.findFirst({
        where: { id: id.data, orgId: auth.orgId },
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          completenessScore: true,
          trainingMessageCount: true,
        },
      });

      res.json({ role });
    } catch (err) {
      next(err);
    }
  });

  // DELETE /api/roles/:id — permanently remove the role and EVERYTHING tied
  // to it (training transcript, guide + chapters + quizzes, guide drafts and
  // version history, employee assignments + quiz attempts + chat sessions).
  // Hard-deletes are guarded so they can never corrupt the Training Room:
  //   - a FRESH training lock (this role is being trained right now) → 423
  //   - an in-flight guide generation → 409
  // Knowledge documents are org-wide and share zero FK with a role, so the
  // Knowledge Library is untouched by design. The DB-level ON DELETE CASCADE
  // clears the relation-chained rows inside the same transaction; FK-less
  // orphans (ChatSession.roleId, QuizAttempt.quizId) are cleaned explicitly.
  router.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = requireAuthContext(req);
      const id = z.string().cuid().safeParse(req.params.id);
      if (!id.success) {
        res.status(400).json({ error: "invalid role id" });
        return;
      }

      const role = await prisma.trainingRole.findFirst({
        where: { id: id.data, orgId: auth.orgId, isActive: true },
        select: { id: true, activeTrainerId: true, activeTrainerAt: true },
      });
      if (!role) {
        res.status(404).json({ error: "role not found" });
        return;
      }

      // Block while another admin is actively training this role — deleting
      // under a live lock would strand an open Training Room on 404s.
      const lockFresh =
        role.activeTrainerAt &&
        role.activeTrainerAt.getTime() >= Date.now() - TRAINING_LOCK_STALE_MS;
      if (lockFresh) {
        res.status(423).json({
          error:
            "Training Room role ini sedang dibuka. Tutup Training Room-nya terlebih dahulu, baru hapus role.",
        });
        return;
      }

      const guideGenKey = `${auth.orgId}:${role.id}`;
      if (guideGenInFlight.has(guideGenKey)) {
        res.status(409).json({
          error:
            "Pembuatan panduan sedang berjalan untuk role ini. Tunggu sampai selesai, lalu coba hapus lagi.",
        });
        return;
      }

      await prisma.$transaction(async (tx) => {
        // FK-less orphans first (no DB cascade ever removes them otherwise).
        const chapterIds = await tx.chapter.findMany({
          where: { guide: { roleId: role.id, orgId: auth.orgId } },
          select: { id: true },
        });
        const quizIds =
          chapterIds.length > 0
            ? await tx.quiz.findMany({
                where: { chapterId: { in: chapterIds.map((c) => c.id) } },
                select: { id: true },
              })
            : [];

        if (quizIds.length > 0) {
          await tx.quizAttempt.deleteMany({
            where: { quizId: { in: quizIds.map((q) => q.id) } },
          });
        }
        await tx.chatSession.deleteMany({
          where: { roleId: role.id, orgId: auth.orgId },
        });

        // Deletes the role + every relation-chained row via ON DELETE CASCADE.
        await tx.trainingRole.deleteMany({ where: { id: role.id, orgId: auth.orgId } });
      });

      await cache.invalidateGuide(role.id);
      await cache.del(`role-status:${role.id}`, `role-gaps:${role.id}`);

      res.json({ ok: true, deletedRoleId: role.id });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/roles/:id/training/lock
  router.post(
    "/:id/training/lock",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const auth = requireAuthContext(req);
        const id = z.string().cuid().safeParse(req.params.id);
        if (!id.success) {
          res.status(400).json({ error: "invalid role id" });
          return;
        }

        const now = new Date();
        const staleBefore = new Date(now.getTime() - TRAINING_LOCK_STALE_MS);
        const acquired = await prisma.trainingRole.updateMany({
          where: {
            id: id.data,
            orgId: auth.orgId,
            isActive: true,
            OR: [
              { activeTrainerId: null },
              { activeTrainerAt: { lt: staleBefore } },
              { activeTrainerId: auth.userId },
            ],
          },
          data: {
            activeTrainerId: auth.userId,
            activeTrainerAt: now,
          },
        });

        if (acquired.count === 0) {
          const role = await prisma.trainingRole.findFirst({
            where: { id: id.data, orgId: auth.orgId, isActive: true },
            select: {
              activeTrainerId: true,
              activeTrainerAt: true,
            },
          });
          if (!role) {
            res.status(404).json({ error: "role not found" });
            return;
          }

          let activeTrainerName: string | null = null;
          if (role.activeTrainerId) {
            const trainer = await prisma.user.findFirst({
              where: { id: role.activeTrainerId, orgId: auth.orgId },
              select: { name: true },
            });
            activeTrainerName = trainer?.name ?? null;
          }

          res.status(423).json({
            error: "training room is locked by another admin",
            activeTrainerId: role.activeTrainerId,
            activeTrainerName,
            activeTrainerAt: role.activeTrainerAt,
          });
          return;
        }

        res.json({ locked: true, activeTrainerId: auth.userId, activeTrainerAt: now.toISOString() });
      } catch (err) {
        next(err);
      }
    },
  );

  // PATCH /api/roles/:id/training/heartbeat
  router.patch(
    "/:id/training/heartbeat",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const auth = requireAuthContext(req);
        const id = z.string().cuid().safeParse(req.params.id);
        if (!id.success) {
          res.status(400).json({ error: "invalid role id" });
          return;
        }

        const now = new Date();
        const updated = await prisma.trainingRole.updateMany({
          where: {
            id: id.data,
            orgId: auth.orgId,
            isActive: true,
            activeTrainerId: auth.userId,
          },
          data: {
            activeTrainerAt: now,
          },
        });

        if (updated.count === 0) {
          res.status(423).json({ error: "training lock not held by current admin" });
          return;
        }

        res.json({ ok: true, activeTrainerAt: now.toISOString() });
      } catch (err) {
        next(err);
      }
    },
  );

  // DELETE /api/roles/:id/training/lock — explicit release on room close
  // (Section 5.2: lock auto-releases on explicit close, training completion,
  // or heartbeat silence > 30 min). Only the current lock holder can release.
  router.delete(
    "/:id/training/lock",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const auth = requireAuthContext(req);
        const id = z.string().cuid().safeParse(req.params.id);
        if (!id.success) {
          res.status(400).json({ error: "invalid role id" });
          return;
        }

        const released = await prisma.trainingRole.updateMany({
          where: {
            id: id.data,
            orgId: auth.orgId,
            isActive: true,
            activeTrainerId: auth.userId,
          },
          data: {
            activeTrainerId: null,
            activeTrainerAt: null,
          },
        });

        if (released.count === 0) {
          res.status(423).json({ error: "training lock not held by current admin" });
          return;
        }

        res.json({ ok: true, released: true });
      } catch (err) {
        next(err);
      }
    },
  );

  // GET /api/roles/:id/training/messages
  router.get(
    "/:id/training/messages",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const auth = requireAuthContext(req);
        const id = z.string().cuid().safeParse(req.params.id);
        if (!id.success) {
          res.status(400).json({ error: "invalid role id" });
          return;
        }

        const role = await prisma.trainingRole.findFirst({
          where: { id: id.data, orgId: auth.orgId, isActive: true },
          select: {
            id: true,
            status: true,
            completenessScore: true,
            trainingMessageCount: true,
            activeTrainerId: true,
            activeTrainerAt: true,
          },
        });
        if (!role) {
          res.status(404).json({ error: "role not found" });
          return;
        }

        // Section 6 — role status is polled by the training UI; cache 30s so
        // polling doesn't hammer Postgres while staying near-realtime.
        await cache.setRoleStatus(role.id, {
          status: role.status,
          completenessScore: role.completenessScore,
          trainingMessageCount: role.trainingMessageCount,
        });

        const messages = await prisma.trainingMessage.findMany({
          where: { roleId: id.data, orgId: auth.orgId },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            sender: true,
            content: true,
            createdAt: true,
          },
        });

        res.json({ role, messages });
      } catch (err) {
        next(err);
      }
    },
  );

  // POST /api/roles/:id/training/messages
  router.post(
    "/:id/training/messages",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const auth = requireAuthContext(req);
        const id = z.string().cuid().safeParse(req.params.id);
        if (!id.success) {
          res.status(400).json({ error: "invalid role id" });
          return;
        }

        const body = z
          .object({
            content: z.string().trim().min(1).max(4000),
          })
          .strict()
          .safeParse(req.body);
        if (!body.success) {
          res.status(400).json({ error: "invalid body", details: body.error.flatten() });
          return;
        }

        const limit = await trainingLimiter(auth.userId);
        if (!limit.ok) {
          res.status(429).json({ error: "rate limit exceeded", retryAfter: limit.retryAfter });
          return;
        }

        const role = await prisma.trainingRole.findFirst({
          where: { id: id.data, orgId: auth.orgId, isActive: true },
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            completenessScore: true,
            trainingMessageCount: true,
            activeTrainerId: true,
            activeTrainerAt: true,
          },
        });
        if (!role) {
          res.status(404).json({ error: "role not found" });
          return;
        }

        const lockFresh =
          role.activeTrainerAt &&
          role.activeTrainerAt.getTime() >= Date.now() - TRAINING_LOCK_STALE_MS;
        if (role.activeTrainerId !== auth.userId || !lockFresh) {
          res.status(423).json({ error: "training lock is not held by current admin" });
          return;
        }

        const cleanContent = sanitizeUserText(body.data.content);

        const adminMessage = await prisma.trainingMessage.create({
          data: {
            roleId: role.id,
            orgId: auth.orgId,
            sender: "admin",
            content: cleanContent,
            tokenEst: estimateTokens(cleanContent),
          },
          select: { id: true, sender: true, content: true, createdAt: true },
        });

        const recent = await prisma.trainingMessage.findMany({
          where: { roleId: role.id, orgId: auth.orgId },
          orderBy: { createdAt: "desc" },
          take: 200,
          select: {
            sender: true,
            content: true,
            tokenEst: true,
          },
        });

        let used = 0;
        const selected: Array<{ sender: string; content: string }> = [];
        for (const msg of recent) {
          const tokenEst = msg.tokenEst || estimateTokens(msg.content);
          // Stop (not skip) at the first message that no longer fits — the
          // window must always be the MOST RECENT messages that fit, never a
          // mix of recent and arbitrarily older ones, or the model loses the
          // thread and starts repeating already-answered questions.
          if (used + tokenEst > TRAINING_CONTEXT_TOKEN_BUDGET) {
            break;
          }
          used += tokenEst;
          selected.push({ sender: msg.sender, content: msg.content });
        }
        selected.reverse();

        const knowledgeChunks = await searchKnowledgeChunks({
          orgId: auth.orgId,
          query: `${role.name} ${cleanKnowledgeText(cleanContent)} ${selected
            .slice(-4)
            .map((message) => message.content)
            .join(" ")}`,
          limit: 8,
          tokenBudget: 4500,
        });

        // Anti-repeat context: the trainer explicitly sees what admins already
        // taught and what questions it already asked, so it picks the NEXT gap
        // instead of circling back to a covered topic (a small model forgets
        // otherwise when the window is long).
        const priorAiQuestions = selected
          .filter((m) => m.sender === "ai")
          .map((m) => briefify(m.content, 160))
          .slice(-8);
        const coveredTopics = selected
          .filter((m) => m.sender === "admin")
          .map((m) => briefify(m.content))
          .slice(-10);
        const recentAdminTexts = selected
          .filter((m) => m.sender === "admin")
          .map((m) => m.content);

        const baseSystemPrompt = buildTrainingSystemPrompt(
          role.name,
          buildKnowledgeBaseEnvelope(knowledgeChunks),
          recentAdminTexts,
          priorAiQuestions,
          coveredTopics,
          role.description,
        );
        const baseHistory = buildHistoryMessages(selected);

        // On AI failure, delete the just-saved admin message so the
        // transcript never shows a question without a reply (the client
        // keeps its UI consistent by not appending either message).
        let aiReply: AiCallResult;
        try {
          aiReply = await callAiText(
            env,
            baseSystemPrompt,
            baseHistory,
            1600,
            {
              timeoutMs: 60_000,
              fallbackReply:
                "Terima kasih. Untuk melengkapi SOP role ini, jelaskan langkah kerja utama dari awal sampai selesai secara berurutan.",
            },
          );
          // A reply cut short by the output budget would be persisted as a
          // half-sentence bubble. Treat it like any other transient AI failure:
          // the admin message below gets rolled back and the client retries
          // the turn (it already implements backoff retry on non-ApiError).
          if (aiReply.finishReason === "length") {
            throw new Error(
              "AI reply was truncated by the output budget; retrying the turn",
            );
          }

          // Hard anti-repeat: if the generated question still overlaps an
          // already-asked one, regenerate exactly once with an explicit "do
          // not ask that again" note appended to the conversation.
          if (isDuplicateQuestion(aiReply.text, priorAiQuestions)) {
            const regenHistory: AiMessage[] = [
              ...baseHistory,
              {
                role: "user",
                content: `CATATAN (instruksi sistem untuk koreksi): pertanyaan jawaban terakhirmu baru saja sudah pernah ditanyakan dan dijawab admin. DILARANG menanyakan hal yang sama lagi, baik kata-kata yang sama maupun yang disamarkan. Sampaikan kembali balasan yang singkat lalu ajukan SATU pertanyaan BARU tentang topik yang belum dibahas.`,
              },
            ];
            const retryReply = await callAiText(
              env,
              baseSystemPrompt,
              regenHistory,
              1600,
              {
                timeoutMs: 60_000,
                fallbackReply: aiReply.text,
              },
            );
            if (retryReply.finishReason !== "length" && retryReply.text) {
              aiReply = {
                ...retryReply,
                tokensIn: aiReply.tokensIn + retryReply.tokensIn,
                tokensOut: aiReply.tokensOut + retryReply.tokensOut,
              };
            }
          }
        } catch (err) {
          await prisma.trainingMessage
            .delete({ where: { id: adminMessage.id } })
            .catch(() => undefined);
          throw err;
        }

        await logAiUsage({
          orgId: auth.orgId,
          userId: auth.userId,
          kind: "training",
          tokensIn: aiReply.tokensIn,
          tokensOut: aiReply.tokensOut,
        });

        const aiMessage = await prisma.trainingMessage.create({
          data: {
            roleId: role.id,
            orgId: auth.orgId,
            sender: "ai",
            content: stripStructuralTags(aiReply.text),
            tokenEst: estimateTokens(aiReply.text),
          },
          select: { id: true, sender: true, content: true, createdAt: true },
        });

        const now = new Date();
        const updatedRole = await prisma.trainingRole.update({
          where: { id: role.id },
          data: {
            trainingMessageCount: { increment: 1 },
            activeTrainerAt: now,
          },
          select: {
            status: true,
            completenessScore: true,
            trainingMessageCount: true,
          },
        });

        // Completeness re-scoring runs IN THE BACKGROUND so the response stays
        // snappy. It fires from the 5th admin message onward, when a multiple of
        // 5 lands OR at least 45s have passed since the last evaluation — that
        // keeps the score and Knowledge Gaps synced to the conversation without
        // an expensive evaluation per turn. The `>= 5` gate matters: before the
        // conversation has substance an evaluation would produce a premature,
        // misleading score and gap list (a known source of wrong data).
        // Best-effort: failures are logged and never affect the reply.
        const nowMs = Date.now();
        const lastMs = lastScoreAt.get(role.id) ?? 0;
        const due =
          updatedRole.trainingMessageCount >= 5 &&
          (updatedRole.trainingMessageCount % 5 === 0 ||
            nowMs - lastMs >= SCORE_MIN_INTERVAL_MS);
        lastScoreAt.set(role.id, nowMs);
        if (due) {
          void evaluateRoleCompleteness(
            env,
            cache,
            role.id,
            auth.orgId,
            auth.userId,
          ).catch((err) => {
            console.error(
              `[scoring] role ${role.id}:`,
              err instanceof Error ? err.message : err,
            );
          });
        }

        // Return the freshest gaps we have at this instant; the background
        // evaluation (when it runs) refreshes both gaps and score, which the
        // client picks up via its status poll a moment later.
        let latestGaps: string[] = [];
        try {
          const gapsCache = await cache.getJson<{
            missingAreas: string[];
          }>(`role-gaps:${role.id}`);
          latestGaps = gapsCache?.missingAreas ?? [];
        } catch {
          latestGaps = [];
        }

        res.status(201).json({
          adminMessage,
          aiMessage,
          role: {
            status: updatedRole.status,
            completenessScore: updatedRole.completenessScore,
            trainingMessageCount: updatedRole.trainingMessageCount,
          },
          missingAreas: latestGaps,
        });
      } catch (err) {
        next(err);
      }
    },
  );

  // GET /api/roles/:id/guide
  router.get(
    "/:id/guide",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const auth = requireAuthContext(req);
        const id = z.string().cuid().safeParse(req.params.id);
        if (!id.success) {
          res.status(400).json({ error: "invalid role id" });
          return;
        }

        const role = await prisma.trainingRole.findFirst({
          where: { id: id.data, orgId: auth.orgId, isActive: true },
          select: { id: true },
        });
        if (!role) {
          res.status(404).json({ error: "role not found" });
          return;
        }

        // Section 6 — published guide is org-shared and read-heavy: try cache.
        const cachedGuide = await cache.getGuide<unknown>(role.id);
        if (cachedGuide) {
          res.json({ guide: cachedGuide });
          return;
        }

        const guide = await prisma.guide.findFirst({
          where: { roleId: role.id, orgId: auth.orgId },
          select: {
            id: true,
            title: true,
            version: true,
            publishedAt: true,
            updatedAt: true,
            chapters: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                order: true,
                title: true,
                content: true,
                quiz: {
                  select: {
                    id: true,
                    questions: {
                      orderBy: [{ order: "asc" }, { id: "asc" }],
                      select: {
                        id: true,
                        question: true,
                        options: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });
        if (!guide) {
          res.status(404).json({ error: "guide not found" });
          return;
        }

        await cache.setGuide(role.id, guide);
        res.json({ guide });
      } catch (err) {
        next(err);
      }
    },
  );

  // POST /api/roles/:id/guide/generate — regenerate the guide from the full
  // training transcript. Never writes to the live guide: it produces a
  // reviewable GuideDraft (Section 5.3 upgrade). Publishing is a separate,
  // explicit, atomic step (POST /guide/draft/publish) so a regeneration can
  // never silently clobber the guide employees already read.
  router.post(
    "/:id/guide/generate",
    async (req: Request, res: Response, next: NextFunction) => {
      let guideGenKey: string | null = null;
      let guideQuotaKey: string | null = null;
      let guideQuotaHeld = false;
      try {
        const auth = requireAuthContext(req);
        const id = z.string().cuid().safeParse(req.params.id);
        if (!id.success) {
          res.status(400).json({ error: "invalid role id" });
          return;
        }

        const role = await prisma.trainingRole.findFirst({
          where: { id: id.data, orgId: auth.orgId, isActive: true },
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            completenessScore: true,
          },
        });
        if (!role) {
          res.status(404).json({ error: "role not found" });
          return;
        }

        if (role.status !== "READY" && role.status !== "PUBLISHED") {
          res.status(403).json({
            error:
              "Role belum berstatus READY. Lanjutkan training sampai completeness mencapai ambang kesiapan, lalu coba lagi.",
          });
          return;
        }

        // Concurrency guard first — refusing because a generation is already
        // running must not burn a quota slot.
        const roleKey = `${auth.orgId}:${role.id}`;
        if (guideGenInFlight.has(roleKey)) {
          res.status(409).json({
            error:
              "Pembuatan panduan sedang berjalan untuk role ini. Tunggu sebentar, lalu klik lagi.",
          });
          return;
        }
        guideGenInFlight.add(roleKey);
        guideGenKey = roleKey;

        // Rate limit: max 3 generations/hour per Role (Section 5.3). The slot
        // stays held only when generation succeeds — on failure it is released
        // below so a provider hiccup can't lock the user out of retrying.
        const limit = await guideGenLimiter.acquire(roleKey);
        if (!limit.ok) {
          const retryAfter = limit.retryAfter ?? GUIDE_GEN_RATE_WINDOW_SECONDS;
          res.status(429).json({
            error:
              "Jatah pembuatan panduan role ini habis — maksimal 3 kali per jam per role.",
            retryAfter,
            retryAt: new Date(Date.now() + retryAfter * 1000).toISOString(),
            limit: GUIDE_GEN_RATE_LIMIT,
            windowSeconds: GUIDE_GEN_RATE_WINDOW_SECONDS,
          });
          return;
        }
        guideQuotaHeld = true;
        guideQuotaKey = roleKey;

        // On updates, tell the model what already exists so it keeps coherent
        // chapters (and preserves titles of essentially-unchanged chapters,
        // which keeps employee ChapterProgress after the update is published).
        const existingGuide = await prisma.guide.findFirst({
          where: { roleId: role.id, orgId: auth.orgId },
          select: {
            id: true,
            version: true,
            chapters: {
              orderBy: { order: "asc" },
              select: { title: true, content: true },
            },
          },
        });
        const existingGuideStructure = existingGuide
          ? existingGuide.chapters
              .map((chapter, index) => `${index + 1}. ${chapter.title}`)
              .join("\n")
          : undefined;

        // Build from ALL training messages, not the sliding window
        // (this is a one-shot batch job — generous token budget is fine).
        const fullTranscript = await prisma.trainingMessage.findMany({
          where: { roleId: role.id, orgId: auth.orgId },
          orderBy: { createdAt: "asc" },
          select: { sender: true, content: true },
        });

        const knowledgeChunks = await searchKnowledgeChunks({
          orgId: auth.orgId,
          query: `${role.name} ${fullTranscript
            .map((message) => message.content)
            .join(" ")}`,
          limit: 20,
          tokenBudget: 10_000,
        });

        const transcriptText = fullTranscript.length
          ? fullTranscript
              .map((m) => `${m.sender === "ai" ? "AI" : "ADMIN"}: ${sanitizeUserText(m.content)}`)
              .join("\n")
          : "(Belum ada percakapan training.)";

        const systemPrompt = buildGuideSystemPrompt(
          role.name,
          buildKnowledgeBaseEnvelope(knowledgeChunks),
          fullTranscript
            .filter((m) => m.sender === "admin")
            .map((m) => m.content),
          existingGuideStructure,
          role.description,
        );

        const transcriptMessage: AiMessage = {
          role: "user",
          content: wrapBusinessData(transcriptText),
        };

        // Try up to 2 raw attempts, then one repair pass that sends the model's
        // own (malformed) output back to be fixed into schema-valid JSON. If all
        // fail, fail loudly (Section 5.3) — never half-write a guide.
        let generated: z.infer<typeof guideGenerationSchema> | null = null;
        let lastError = "";
        let lastRaw = "";
        let truncated = false;
        for (let attempt = 0; attempt < 2; attempt++) {
          const result = await callAiText(
            env,
            systemPrompt,
            [transcriptMessage],
            GUIDE_GEN_MAX_TOKENS,
            {
              timeoutMs: 90_000,
              fallbackReply: "",
            },
          );
          lastRaw = result.text;
          if (result.finishReason === "length") truncated = true;

          await logAiUsage({
            orgId: auth.orgId,
            userId: auth.userId,
            kind: "guide_gen",
            tokensIn: result.tokensIn,
            tokensOut: result.tokensOut,
          });

          try {
            const parsed = guideGenerationSchema.safeParse(JSON.parse(extractJsonBlock(result.text)));
            if (parsed.success) {
              generated = parsed.data;
              break;
            }
            lastError = "generated JSON failed schema validation";
          } catch {
            lastError = "generated content was not valid JSON";
          }
        }

        if (!generated) {
          const repairResult = await callAiText(
            env,
            buildGuideRepairPrompt(),
            [
              {
                role: "user",
                content: wrapBusinessData(lastRaw || transcriptText),
              },
            ],
            GUIDE_GEN_MAX_TOKENS,
            {
              timeoutMs: 90_000,
              fallbackReply: "",
            },
          );
          lastRaw = repairResult.text;
          if (repairResult.finishReason === "length") truncated = true;

          await logAiUsage({
            orgId: auth.orgId,
            userId: auth.userId,
            kind: "guide_gen",
            tokensIn: repairResult.tokensIn,
            tokensOut: repairResult.tokensOut,
          });

          try {
            const parsed = guideGenerationSchema.safeParse(
              JSON.parse(extractJsonBlock(repairResult.text)),
            );
            if (parsed.success) {
              generated = parsed.data;
            } else {
              lastError = "repair pass still failed schema validation";
            }
          } catch {
            lastError = "repair pass still produced invalid JSON";
          }
        }

        if (!generated) {
          // Generation failed — give the quota slot back so retrying isn't
          // penalized for a provider/tone glitch.
          if (guideQuotaHeld && guideQuotaKey) {
            await guideGenLimiter.release(guideQuotaKey).catch(() => undefined);
            guideQuotaHeld = false;
          }
          res.status(502).json({
            error: truncated
              ? "AI output terpotong saat membuat guide. Coba lagi, atau lanjutkan training lebih dulu."
              : "AI mengembalikan konten guide yang tidak valid. Coba lagi, atau lanjutkan training lebih dulu.",
            detail: lastError,
          });
          return;
        }

        const draftChapters = generated.chapters.map(generatedToDraftChapter);
        const existingFlat: FlatChapter[] = (existingGuide?.chapters ?? []).map((c) => ({
          title: c.title,
          content: c.content,
        }));
        const changes = buildChangeSummary(
          existingFlat,
          draftChapters.map((c) => ({ title: c.title, content: c.content })),
        );

        const now = new Date();
        const draft = await prisma.guideDraft.upsert({
          where: { roleId: role.id },
          create: {
            orgId: auth.orgId,
            roleId: role.id,
            title: `Panduan ${role.name}`,
            baseVersion: existingGuide?.version ?? 1,
            content: { chapters: draftChapters },
            createdBy: auth.userId,
          },
          update: {
            title: `Panduan ${role.name}`,
            baseVersion: existingGuide?.version ?? 1,
            content: { chapters: draftChapters },
            createdBy: auth.userId,
            updatedAt: now,
          },
          select: { id: true, title: true, baseVersion: true, createdAt: true, updatedAt: true },
        });

        // Nothing is published yet — role stays READY/PUBLISHED until the
        // admin reviews and explicitly publishes the draft.
        res.status(201).json({
          draft: {
            id: draft.id,
            title: draft.title,
            baseVersion: draft.baseVersion,
            targetVersion: (existingGuide?.version ?? 0) + 1,
            createdAt: draft.createdAt,
            updatedAt: draft.updatedAt,
            changes,
            summary: existingGuide
              ? changes.text
              : `Panduan pertama kali dibuat — ${draftChapters.length} bab.`,
            chapters: draftChapters,
          },
          role: { id: role.id, status: role.status },
        });
      } catch (err) {
        // Any unexpected failure inside generation also refunds the slot —
        // a hard error must never silently consume one of the 3/hour quota.
        if (guideQuotaHeld && guideQuotaKey) {
          await guideGenLimiter.release(guideQuotaKey).catch(() => undefined);
          guideQuotaHeld = false;
        }
        next(err);
      } finally {
        if (guideGenKey) {
          guideGenInFlight.delete(guideGenKey);
        }
      }
    },
  );

  // GET /api/roles/:id/guide/draft — review the pending draft (admin only).
  // Change summary is recomputed against the CURRENT live guide so it stays
  // honest even if the guide was edited between generation and review.
  router.get(
    "/:id/guide/draft",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const auth = requireAuthContext(req);
        const id = z.string().cuid().safeParse(req.params.id);
        if (!id.success) {
          res.status(400).json({ error: "invalid role id" });
          return;
        }

        const role = await prisma.trainingRole.findFirst({
          where: { id: id.data, orgId: auth.orgId, isActive: true },
          select: { id: true },
        });
        if (!role) {
          res.status(404).json({ error: "role not found" });
          return;
        }

        const [draft, liveGuide] = await Promise.all([
          prisma.guideDraft.findFirst({
            where: { roleId: role.id, orgId: auth.orgId },
            select: { id: true, title: true, baseVersion: true, content: true, createdAt: true, updatedAt: true },
          }),
          prisma.guide.findFirst({
            where: { roleId: role.id, orgId: auth.orgId },
            select: {
              version: true,
              chapters: { orderBy: { order: "asc" }, select: { title: true, content: true } },
            },
          }),
        ]);

        if (!draft) {
          res.status(404).json({ error: "no guide draft for this role" });
          return;
        }

        const chapters = parseDraftContent(draft.content) ?? [];
        const changes = buildChangeSummary(
          (liveGuide?.chapters ?? []).map((c) => ({ title: c.title, content: c.content })),
          chapters.map((c) => ({ title: c.title, content: c.content })),
        );

        res.json({
          draft: {
            id: draft.id,
            title: draft.title,
            baseVersion: draft.baseVersion,
            targetVersion: (liveGuide?.version ?? 0) + 1,
            createdAt: draft.createdAt,
            updatedAt: draft.updatedAt,
            changes,
            summary: liveGuide
              ? changes.text
              : `Panduan pertama kali dibuat — ${chapters.length} bab.`,
            chapters,
          },
        });
      } catch (err) {
        next(err);
      }
    },
  );

  // POST /api/roles/:id/guide/draft/publish — atomic, progress-preserving,
  // versioned publish of the pending draft. Rate-limited only by the draft's
  // existence (no AI call); concurrent publishes fail cleanly via the
  // transaction-level draft claim.
  router.post(
    "/:id/guide/draft/publish",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const auth = requireAuthContext(req);
        const id = z.string().cuid().safeParse(req.params.id);
        if (!id.success) {
          res.status(400).json({ error: "invalid role id" });
          return;
        }

        const body = z.object({}).strict().safeParse(req.body ?? {});
        if (!body.success) {
          res.status(400).json({ error: "invalid body", details: body.error.flatten() });
          return;
        }

        const role = await prisma.trainingRole.findFirst({
          where: { id: id.data, orgId: auth.orgId, isActive: true },
          select: { id: true },
        });
        if (!role) {
          res.status(404).json({ error: "role not found" });
          return;
        }

        const result = await prisma.$transaction((tx) =>
          publishGuideDraftTx(tx, {
            orgId: auth.orgId,
            roleId: role.id,
            publishedBy: auth.userId,
          }),
        );

        await prisma.trainingRole.update({
          where: { id: role.id },
          data: { status: "PUBLISHED" },
        });

        // Invalidate caches (Section 6): guide + role status
        await cache.invalidateGuide(role.id);
        await cache.del(`role-status:${role.id}`);

        res.json({
          guide: { version: result.version },
          role: { id: role.id, status: "PUBLISHED" },
          summary: result.summary,
        });
      } catch (err) {
        if (err instanceof GuidePublishConflict) {
          res.status(409).json({ error: err.message });
          return;
        }
        next(err);
      }
    },
  );

  // DELETE /api/roles/:id/guide/draft — discard the pending review draft.
  router.delete(
    "/:id/guide/draft",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const auth = requireAuthContext(req);
        const id = z.string().cuid().safeParse(req.params.id);
        if (!id.success) {
          res.status(400).json({ error: "invalid role id" });
          return;
        }

        const role = await prisma.trainingRole.findFirst({
          where: { id: id.data, orgId: auth.orgId, isActive: true },
          select: { id: true },
        });
        if (!role) {
          res.status(404).json({ error: "role not found" });
          return;
        }

        const deleted = await prisma.guideDraft.deleteMany({
          where: { roleId: role.id, orgId: auth.orgId },
        });
        if (deleted.count === 0) {
          res.status(404).json({ error: "no guide draft for this role" });
          return;
        }

        res.json({ ok: true });
      } catch (err) {
        next(err);
      }
    },
  );

  // GET /api/roles/:id/guide/versions — version history + changelog.
  router.get(
    "/:id/guide/versions",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const auth = requireAuthContext(req);
        const id = z.string().cuid().safeParse(req.params.id);
        if (!id.success) {
          res.status(400).json({ error: "invalid role id" });
          return;
        }

        const role = await prisma.trainingRole.findFirst({
          where: { id: id.data, orgId: auth.orgId, isActive: true },
          select: { id: true },
        });
        if (!role) {
          res.status(404).json({ error: "role not found" });
          return;
        }

        const versions = await prisma.guideVersion.findMany({
          where: { roleId: role.id, orgId: auth.orgId },
          orderBy: { version: "desc" },
          select: { id: true, version: true, title: true, summary: true, publishedBy: true, publishedAt: true },
        });

        const publisherIds = [...new Set(versions.map((v) => v.publishedBy))];
        const publishers =
          publisherIds.length > 0
            ? await prisma.user.findMany({
                where: { id: { in: publisherIds }, orgId: auth.orgId },
                select: { id: true, name: true },
              })
            : [];
        const publisherNames = new Map(publishers.map((u) => [u.id, u.name]));

        res.json({
          versions: versions.map((v) => ({
            ...v,
            publishedByName: publisherNames.get(v.publishedBy) ?? null,
          })),
        });
      } catch (err) {
        next(err);
      }
    },
  );

  // POST /api/roles/:id/guide/draft/from-version — reopen an old published
  // version as a new draft (rollback). Publishing it bumps to the next
  // version; nothing historical is overwritten.
  router.post(
    "/:id/guide/draft/from-version",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const auth = requireAuthContext(req);
        const id = z.string().cuid().safeParse(req.params.id);
        if (!id.success) {
          res.status(400).json({ error: "invalid role id" });
          return;
        }

        const body = z
          .object({ version: z.number().int().min(1) })
          .strict()
          .safeParse(req.body);
        if (!body.success) {
          res.status(400).json({ error: "invalid body", details: body.error.flatten() });
          return;
        }

        const role = await prisma.trainingRole.findFirst({
          where: { id: id.data, orgId: auth.orgId, isActive: true },
          select: { id: true },
        });
        if (!role) {
          res.status(404).json({ error: "role not found" });
          return;
        }

        const pendingDraft = await prisma.guideDraft.findFirst({
          where: { roleId: role.id, orgId: auth.orgId },
          select: { id: true },
        });
        if (pendingDraft) {
          res.status(409).json({
            error: "Masih ada draf yang belum diterbitkan. Terbitkan atau batalkan dulu.",
          });
          return;
        }

        const version = await prisma.guideVersion.findFirst({
          where: { roleId: role.id, orgId: auth.orgId, version: body.data.version },
          select: { id: true, title: true, version: true, content: true },
        });
        if (!version) {
          res.status(404).json({ error: "guide version not found" });
          return;
        }

        const chapters = parseDraftContent(version.content);
        if (!chapters) {
          res.status(500).json({ error: "saved guide version could not be reopened" });
          return;
        }

        const draft = await prisma.guideDraft.create({
          data: {
            orgId: auth.orgId,
            roleId: role.id,
            title: version.title,
            baseVersion: version.version,
            content: { chapters },
            createdBy: auth.userId,
          },
          select: { id: true, title: true, baseVersion: true, createdAt: true, updatedAt: true },
        });

        const liveGuide = await prisma.guide.findFirst({
          where: { roleId: role.id, orgId: auth.orgId },
          select: {
            version: true,
            chapters: { orderBy: { order: "asc" }, select: { title: true, content: true } },
          },
        });
        const changes = buildChangeSummary(
          (liveGuide?.chapters ?? []).map((c) => ({ title: c.title, content: c.content })),
          chapters.map((c) => ({ title: c.title, content: c.content })),
        );

        res.status(201).json({
          draft: {
            id: draft.id,
            title: draft.title,
            baseVersion: draft.baseVersion,
            targetVersion: (liveGuide?.version ?? 0) + 1,
            createdAt: draft.createdAt,
            updatedAt: draft.updatedAt,
            changes,
            summary: liveGuide
              ? `Dibuka dari versi v${version.version} untuk dipulihkan (rollback).\n${changes.text}`
              : `Dibuka dari versi v${version.version} (tidak ada panduan aktif).`,
            chapters,
          },
        });
      } catch (err) {
        next(err);
      }
    },
  );

  // GET /api/roles/:id/assignable-users (Section 5.4)
  router.get(
    "/:id/assignable-users",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const auth = requireAuthContext(req);
        const id = z.string().cuid().safeParse(req.params.id);
        if (!id.success) {
          res.status(400).json({ error: "invalid role id" });
          return;
        }

        const role = await prisma.trainingRole.findFirst({
          where: { id: id.data, orgId: auth.orgId, isActive: true },
          select: { id: true, status: true },
        });
        if (!role) {
          res.status(404).json({ error: "role not found" });
          return;
        }

        // On-demand Clerk→User sync so the assignment checklist always lists
        // members (webhook is best-effort; this guarantees a fresh mirror).
        await syncOrgMembersIfStale(env, auth.orgId);

        const [users, assignments] = await Promise.all([
          prisma.user.findMany({
            where: { orgId: auth.orgId, role: "EMPLOYEE" },
            select: { id: true, name: true, email: true },
            orderBy: { name: "asc" },
          }),
          prisma.employeeModule.findMany({
            where: { orgId: auth.orgId, roleId: role.id },
            select: { userId: true, assignedAt: true },
          }),
        ]);

        const assignedByUser = new Map(assignments.map((a) => [a.userId, a.assignedAt]));

        const usersWithState = users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          assignedAt: assignedByUser.get(u.id)?.toISOString() ?? null,
          isAssigned: assignedByUser.has(u.id),
        }));

        res.json({
          role: { id: role.id, status: role.status },
          users: usersWithState,
        });
      } catch (err) {
        next(err);
      }
    },
  );

  // POST /api/roles/:id/assignments (Section 5.4)
  router.post(
    "/:id/assignments",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const auth = requireAuthContext(req);
        const id = z.string().cuid().safeParse(req.params.id);
        if (!id.success) {
          res.status(400).json({ error: "invalid role id" });
          return;
        }

        const body = assignEmployeesSchema.safeParse(req.body);
        if (!body.success) {
          res.status(400).json({ error: "invalid body", details: body.error.flatten() });
          return;
        }

        const role = await prisma.trainingRole.findFirst({
          where: { id: id.data, orgId: auth.orgId, isActive: true },
          select: { id: true, status: true },
        });
        if (!role) {
          res.status(404).json({ error: "role not found" });
          return;
        }

        // Can't assign an unfinished guide (Section 5.4)
        if (role.status !== "PUBLISHED") {
          res.status(400).json({ error: "role must be PUBLISHED before assignment" });
          return;
        }

        // Only org EMPLOYEE users may be assigned; report invalid ids instead
        // of silently dropping them.
        const validUsers = await prisma.user.findMany({
          where: { id: { in: body.data.userIds }, orgId: auth.orgId, role: "EMPLOYEE" },
          select: { id: true },
        });
        const validSet = new Set(validUsers.map((u) => u.id));
        const invalidUserIds = body.data.userIds.filter((uid) => !validSet.has(uid));

        // New assignments start on the guide version currently live —
        // that's the baseline for "ada pembaruan panduan?" for employees.
        const currentGuide = await prisma.guide.findFirst({
          where: { roleId: role.id, orgId: auth.orgId },
          select: { version: true },
        });

        const result = await prisma.employeeModule.createMany({
          data: validUsers.map((u) => ({
            orgId: auth.orgId,
            userId: u.id,
            roleId: role.id,
            assignedBy: auth.userId,
            assignedGuideVersion: currentGuide?.version ?? 1,
          })),
          skipDuplicates: true,
        });

        res.status(201).json({
          createdCount: result.count,
          skippedExisting: validUsers.length - result.count,
          invalidUserIds,
        });
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
