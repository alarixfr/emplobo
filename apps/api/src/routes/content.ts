import { prisma, type Prisma } from "@emplobo/db";
import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import type { Env } from "../env.js";
import type { AuthContext } from "../types.js";
import { createCache } from "../lib/cache.js";

type AuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => void | Promise<void>;

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

const MAX_CHAPTERS = 60;
const MAX_CHAPTER_CONTENT = 200_000;
const MAX_QUESTIONS = 25;

const questionSchema = z
  .object({
    id: z.string().cuid().nullable().optional(),
    question: z.string().trim().min(1).max(1000),
    options: z.array(z.string().trim().min(1).max(300)).length(4),
    correctIndex: z.number().int().min(0).max(3),
  })
  .strict();

const quizSchema = z
  .object({
    id: z.string().cuid().nullable().optional(),
    questions: z.array(questionSchema).min(1).max(MAX_QUESTIONS),
  })
  .strict();

const chapterSchema = z
  .object({
    id: z.string().cuid().nullable().optional(),
    title: z.string().trim().min(1).max(200),
    content: z.string().trim().min(1).max(MAX_CHAPTER_CONTENT),
    quiz: quizSchema.nullable().optional(),
  })
  .strict();

const saveGuideSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    chapters: z.array(chapterSchema).min(1).max(MAX_CHAPTERS),
  })
  .strict();

type SaveGuideInput = z.infer<typeof saveGuideSchema>;

const quizWithQuestionsSelect = {
  id: true,
  questions: {
    orderBy: [{ order: "asc" }, { id: "asc" }],
    select: {
      id: true,
      order: true,
      question: true,
      options: true,
      correctIndex: true,
    },
  },
} satisfies Prisma.QuizSelect;

const guideEditorSelect = {
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
        select: quizWithQuestionsSelect,
      },
    },
  },
} satisfies Prisma.GuideSelect;

function requireAuthContext(req: Request): AuthContext {
  if (!req.auth) {
    throw new Error("requireAdmin must run before content handlers");
  }
  return req.auth;
}

function toEditorChapter(chapter: {
  id: string;
  order: number;
  title: string;
  content: string;
  quiz: {
    id: string;
    questions: Array<{
      id: string;
      order: number;
      question: string;
      options: unknown;
      correctIndex: number;
    }>;
  } | null;
}) {
  return {
    id: chapter.id,
    order: chapter.order,
    title: chapter.title,
    content: chapter.content,
    quiz: chapter.quiz
      ? {
          id: chapter.quiz.id,
          questions: chapter.quiz.questions.map((question) => ({
            id: question.id,
            order: question.order,
            question: question.question,
            options: Array.isArray(question.options)
              ? (question.options as string[])
              : [],
            correctIndex: question.correctIndex,
          })),
        }
      : null,
  };
}

function guideEditorPayload(role: { id: string; name: string; status: string; completenessScore: number }, guide: {
  id: string;
  title: string;
  version: number;
  publishedAt: Date | null;
  updatedAt: Date;
  chapters: Array<{
    id: string;
    order: number;
    title: string;
    content: string;
    quiz: {
      id: string;
      questions: Array<{
        id: string;
        order: number;
        question: string;
        options: unknown;
        correctIndex: number;
      }>;
    } | null;
  }>;
}) {
  return {
    role: {
      id: role.id,
      name: role.name,
      status: role.status,
      completenessScore: role.completenessScore,
    },
    guide: {
      id: guide.id,
      title: guide.title,
      version: guide.version,
      publishedAt: guide.publishedAt,
      updatedAt: guide.updatedAt,
      chapters: guide.chapters.map(toEditorChapter),
    },
  };
}

export function createContentRouter(requireAdmin: AuthMiddleware, env: Env): Router {
  const router = Router();
  const cache = createCache(env);

  router.use(requireAdmin);

  // GET /api/content — every published role with its guide (Content hub list)
  router.get("/", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = requireAuthContext(req);
      const roles = await prisma.trainingRole.findMany({
        where: { orgId: auth.orgId, isActive: true, status: "PUBLISHED" },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          completenessScore: true,
          trainingMessageCount: true,
          updatedAt: true,
          guide: {
            select: {
              id: true,
              title: true,
              version: true,
              publishedAt: true,
              updatedAt: true,
              _count: { select: { chapters: true } },
            },
          },
        },
      });

      const roleIds = roles.filter((role) => role.guide).map((role) => role.id);
      const quizRows =
        roleIds.length > 0
          ? await prisma.quiz.findMany({
              where: {
                orgId: auth.orgId,
                chapter: { guide: { roleId: { in: roleIds } } },
              },
              select: {
                id: true,
                _count: { select: { questions: true } },
                chapter: { select: { guide: { select: { roleId: true } } } },
              },
            })
          : [];

      const questionsByRole = new Map<string, number>();
      for (const quiz of quizRows) {
        const roleId = quiz.chapter.guide.roleId;
        questionsByRole.set(
          roleId,
          (questionsByRole.get(roleId) ?? 0) + quiz._count.questions,
        );
      }

      res.json({
        roles: roles.map((role) => ({
          id: role.id,
          name: role.name,
          description: role.description,
          completenessScore: role.completenessScore,
          trainingMessageCount: role.trainingMessageCount,
          updatedAt: role.updatedAt,
          guide: role.guide
            ? {
                id: role.guide.id,
                title: role.guide.title,
                version: role.guide.version,
                publishedAt: role.guide.publishedAt,
                updatedAt: role.guide.updatedAt,
                chapterCount: role.guide._count.chapters,
                questionCount: questionsByRole.get(role.id) ?? 0,
              }
            : null,
        })),
      });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/content/:roleId — full editable guide (admin only; includes keys)
  router.get("/:roleId", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = requireAuthContext(req);
      const roleId = z.string().cuid().safeParse(req.params.roleId);
      if (!roleId.success) {
        res.status(400).json({ error: "invalid role id" });
        return;
      }

      const role = await prisma.trainingRole.findFirst({
        where: { id: roleId.data, orgId: auth.orgId, isActive: true },
        select: {
          id: true,
          name: true,
          status: true,
          completenessScore: true,
        },
      });
      if (!role) {
        res.status(404).json({ error: "role not found" });
        return;
      }

      const guide = await prisma.guide.findFirst({
        where: { roleId: role.id, orgId: auth.orgId },
        select: guideEditorSelect,
      });
      if (!guide) {
        res.status(404).json({
          error: "Belum ada guide untuk role ini. Generate guide dari Training Room terlebih dahulu.",
        });
        return;
      }

      res.json(guideEditorPayload(role, guide));
    } catch (err) {
      next(err);
    }
  });

  // POST /api/content/:roleId — full-guide save (atomic, tenant-scoped)
  router.post("/:roleId", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = requireAuthContext(req);
      const roleId = z.string().cuid().safeParse(req.params.roleId);
      if (!roleId.success) {
        res.status(400).json({ error: "invalid role id" });
        return;
      }

      const parsed = saveGuideSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: "Konten guide tidak valid.",
          details: parsed.error.flatten(),
        });
        return;
      }

      const role = await prisma.trainingRole.findFirst({
        where: { id: roleId.data, orgId: auth.orgId, isActive: true },
        select: {
          id: true,
          name: true,
          status: true,
          completenessScore: true,
        },
      });
      if (!role) {
        res.status(404).json({ error: "role not found" });
        return;
      }

      await persistGuideEdit({
        orgId: auth.orgId,
        roleId: role.id,
        body: parsed.data,
      });

      await cache.invalidateGuide(role.id);

      const guide = await prisma.guide.findFirst({
        where: { roleId: role.id, orgId: auth.orgId },
        select: guideEditorSelect,
      });
      if (!guide) {
        res.status(500).json({ error: "failed to reload saved guide" });
        return;
      }

      res.json(guideEditorPayload(role, guide));
    } catch (err) {
      if (err instanceof HttpError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  return router;
}

async function persistGuideEdit(params: {
  orgId: string;
  roleId: string;
  body: SaveGuideInput;
}) {
  const { orgId, roleId, body } = params;

  await prisma.$transaction(async (db) => {
    const guide = await db.guide.findFirst({
      where: { roleId, orgId },
      select: {
        id: true,
        chapters: {
          orderBy: { order: "asc" },
          select: { id: true, quiz: { select: { id: true } } },
        },
      },
    });
    if (!guide) {
      throw new HttpError(404, "Guide belum ada. Generate guide terlebih dahulu.");
    }

    const existingChapters = new Map(guide.chapters.map((c) => [c.id, c.quiz?.id ?? null]));
    const submittedChapterIds = body.chapters
      .map((chapter) => chapter.id)
      .filter((id): id is string => Boolean(id));

    if (new Set(submittedChapterIds).size !== submittedChapterIds.length) {
      throw new HttpError(400, "Terdapat chapter duplikat pada payload.");
    }
    for (const chapterId of submittedChapterIds) {
      if (!existingChapters.has(chapterId)) {
        throw new HttpError(400, "Salah satu chapter tidak dikenali pada role ini.");
      }
    }

    // Chapters removed by the editor are deleted (cascades quiz + progress).
    const removedChapterIds = guide.chapters
      .filter((chapter) => !body.chapters.some((c) => c.id === chapter.id))
      .map((chapter) => chapter.id);
    if (removedChapterIds.length > 0) {
      await db.chapter.deleteMany({
        where: { id: { in: removedChapterIds }, orgId },
      });
    }

    for (const [index, chapterInput] of body.chapters.entries()) {
      const order = index + 1;
      let chapterId: string;

      if (chapterInput.id) {
        chapterId = chapterInput.id;
        await db.chapter.update({
          where: { id: chapterId },
          data: { order, title: chapterInput.title, content: chapterInput.content },
        });
      } else {
        const created = await db.chapter.create({
          data: {
            guideId: guide.id,
            orgId,
            order,
            title: chapterInput.title,
            content: chapterInput.content,
          },
          select: { id: true },
        });
        chapterId = created.id;
      }

      const previousQuizId = chapterInput.id ? existingChapters.get(chapterInput.id) ?? null : null;

      if (!chapterInput.quiz) {
        if (previousQuizId) {
          await db.quiz.delete({ where: { id: previousQuizId } });
        }
        continue;
      }

      let quizId: string;
      if (chapterInput.id && chapterInput.quiz.id) {
        if (chapterInput.quiz.id !== previousQuizId) {
          throw new HttpError(400, "Quiz id tidak cocok dengan chapter.");
        }
        quizId = chapterInput.quiz.id;
      } else {
        // A quiz is being created fresh, or an existing quiz was not
        // referenced by id — replace the old one to keep the payload as truth.
        if (previousQuizId) {
          await db.quiz.delete({ where: { id: previousQuizId } });
        }
        const created = await db.quiz.create({
          data: { chapterId, orgId },
          select: { id: true },
        });
        quizId = created.id;
      }

      const existingQuestions = await db.quizQuestion.findMany({
        where: { quizId, orgId },
        select: { id: true },
      });
      const existingQuestionIds = new Set(existingQuestions.map((q) => q.id));
      const submittedQuestionIds = chapterInput.quiz.questions
        .map((q) => q.id)
        .filter((id): id is string => Boolean(id));

      if (new Set(submittedQuestionIds).size !== submittedQuestionIds.length) {
        throw new HttpError(400, "Terdapat soal duplikat pada kuis.");
      }
      for (const questionId of submittedQuestionIds) {
        if (!existingQuestionIds.has(questionId)) {
          throw new HttpError(400, "Salah satu soal tidak dikenali pada kuis ini.");
        }
      }

      const questionsToDelete = existingQuestions
        .filter((question) => !submittedQuestionIds.includes(question.id))
        .map((question) => question.id);
      if (questionsToDelete.length > 0) {
        await db.quizQuestion.deleteMany({
          where: { id: { in: questionsToDelete }, quizId, orgId },
        });
      }

      for (const [qIndex, questionInput] of chapterInput.quiz.questions.entries()) {
        const qOrder = qIndex + 1;
        const data = {
          order: qOrder,
          question: questionInput.question,
          options: questionInput.options,
          correctIndex: questionInput.correctIndex,
        };
        if (questionInput.id) {
          await db.quizQuestion.update({ where: { id: questionInput.id }, data });
        } else {
          await db.quizQuestion.create({ data: { quizId, orgId, ...data } });
        }
      }
    }

    await db.guide.update({
      where: { id: guide.id },
      data: { version: { increment: 1 }, updatedAt: new Date() },
    });
  });
}
