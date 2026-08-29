import { prisma } from "@emplobo/db";
import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import type { AuthContext } from "../types.js";

type AuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => void | Promise<void>;

function requireAuthContext(req: Request): AuthContext {
  if (!req.auth) {
    throw new Error("requireAuth must run before my handlers");
  }
  return req.auth;
}

const submitQuizSchema = z
  .object({
    answers: z.array(z.number().int().min(0).max(3)).min(1).max(50),
  })
  .strict();

export function createMyRouter(requireAuth: AuthMiddleware): Router {
  const router = Router();

  router.use(requireAuth);

  // GET /api/my/modules
  router.get("/modules", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = requireAuthContext(req);

      const modules = await prisma.employeeModule.findMany({
        where: {
          orgId: auth.orgId,
          userId: auth.userId,
        },
        orderBy: { assignedAt: "desc" },
        select: {
          id: true,
          assignedAt: true,
          role: {
            select: {
              id: true,
              name: true,
              description: true,
              status: true,
              guide: {
                select: {
                  id: true,
                  title: true,
                  version: true,
                  publishedAt: true,
                },
              },
            },
          },
        },
      });

      const roleIds = modules.map((m) => m.role.id);

      // Progress for the Learning Center cards (completion % + best score).
      const [chapters, quizzes] = await Promise.all([
        prisma.chapter.findMany({
          where: { orgId: auth.orgId, guide: { roleId: { in: roleIds } } },
          select: { id: true, guide: { select: { roleId: true } } },
        }),
        prisma.quiz.findMany({
          where: { orgId: auth.orgId, chapter: { guide: { roleId: { in: roleIds } } } },
          select: { id: true, chapterId: true },
        }),
      ]);

      const chapterIds = chapters.map((c) => c.id);
      const quizIds = quizzes.map((q) => q.id);

      const [progressRows, attempts] = await Promise.all([
        chapterIds.length > 0
          ? prisma.chapterProgress.findMany({
              where: {
                orgId: auth.orgId,
                userId: auth.userId,
                chapterId: { in: chapterIds },
              },
              select: { chapterId: true, completedAt: true },
            })
          : Promise.resolve([]),
        quizIds.length > 0
          ? prisma.quizAttempt.findMany({
              where: {
                orgId: auth.orgId,
                userId: auth.userId,
                quizId: { in: quizIds },
              },
              select: { quizId: true, score: true },
            })
          : Promise.resolve([]),
      ]);

      const chapterRole = new Map(chapters.map((c) => [c.id, c.guide.roleId]));
      const totalByRole = new Map<string, number>();
      for (const c of chapters) {
        totalByRole.set(c.guide.roleId, (totalByRole.get(c.guide.roleId) ?? 0) + 1);
      }

      const completedByRole = new Map<string, number>();
      for (const p of progressRows) {
        if (!p.completedAt) continue;
        const roleId = chapterRole.get(p.chapterId);
        if (!roleId) continue;
        completedByRole.set(roleId, (completedByRole.get(roleId) ?? 0) + 1);
      }

      const quizChapterRole = new Map<string, string | undefined>(
        quizzes.map((q) => [q.id, chapterRole.get(q.chapterId)]),
      );
      const bestByRole = new Map<string, number[]>();
      for (const a of attempts) {
        const roleId = quizChapterRole.get(a.quizId);
        if (!roleId) continue;
        const list = bestByRole.get(roleId) ?? [];
        list.push(a.score);
        bestByRole.set(roleId, list);
      }

      const payload = modules.map((m) => {
        const total = totalByRole.get(m.role.id) ?? 0;
        const completed = completedByRole.get(m.role.id) ?? 0;
        const scores = bestByRole.get(m.role.id) ?? [];
        return {
          ...m,
          progress: {
            totalChapters: total,
            completedChapters: completed,
            completionPct:
              total > 0 ? Math.round((completed / total) * 100) : 0,
            avgBestScore:
              scores.length > 0
                ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
                : null,
          },
        };
      });

      res.json({ modules: payload });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/my/modules/:roleId/chapters
  router.get(
    "/modules/:roleId/chapters",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const auth = requireAuthContext(req);
        const roleId = z.string().cuid().safeParse(req.params.roleId);
        if (!roleId.success) {
          res.status(400).json({ error: "invalid role id" });
          return;
        }

        const assignment = await prisma.employeeModule.findFirst({
          where: {
            orgId: auth.orgId,
            userId: auth.userId,
            roleId: roleId.data,
          },
          select: { id: true },
        });

        if (!assignment) {
          res.status(404).json({ error: "module not found" });
          return;
        }

        const guide = await prisma.guide.findFirst({
          where: {
            roleId: roleId.data,
            orgId: auth.orgId,
          },
          select: {
            id: true,
            title: true,
            version: true,
            publishedAt: true,
            chapters: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                order: true,
                title: true,
                content: true,
                progress: {
                  where: { userId: auth.userId, orgId: auth.orgId },
                  select: {
                    completedAt: true,
                  },
                },
                quiz: {
                  select: {
                    id: true,
                    questions: {
                      orderBy: { id: "asc" },
                      select: {
                        id: true,
                        question: true,
                        options: true,
                        // NEVER select correctIndex here
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

        const quizIds = guide.chapters
          .map((chapter) => chapter.quiz?.id)
          .filter((id): id is string => Boolean(id));

        const userAttempts =
          quizIds.length > 0
            ? await prisma.quizAttempt.findMany({
                where: {
                  quizId: { in: quizIds },
                  userId: auth.userId,
                  orgId: auth.orgId,
                },
                orderBy: { createdAt: "desc" },
                select: {
                  id: true,
                  quizId: true,
                  score: true,
                  createdAt: true,
                },
              })
            : [];

        const attemptsByQuizId = new Map<
          string,
          { id: string; quizId: string; score: number; createdAt: Date }[]
        >();
        for (const attempt of userAttempts) {
          const list = attemptsByQuizId.get(attempt.quizId) ?? [];
          list.push(attempt);
          attemptsByQuizId.set(attempt.quizId, list);
        }

        const chapters = guide.chapters.map((chapter) => {
          let quizPayload = null;
          if (chapter.quiz) {
            const attempts = attemptsByQuizId.get(chapter.quiz.id) ?? [];
            const bestScore =
              attempts.length > 0
                ? Math.max(...attempts.map((a) => a.score))
                : null;

            quizPayload = {
              id: chapter.quiz.id,
              questions: chapter.quiz.questions.map((q) => ({
                id: q.id,
                question: q.question,
                options: Array.isArray(q.options) ? (q.options as string[]) : [],
              })),
              attempts: attempts.map((a) => ({
                id: a.id,
                score: a.score,
                createdAt: a.createdAt.toISOString(),
              })),
              bestScore,
            };
          }

          return {
            id: chapter.id,
            order: chapter.order,
            title: chapter.title,
            content: chapter.content,
            completedAt: chapter.progress[0]?.completedAt ?? null,
            quiz: quizPayload,
          };
        });

        res.json({
          guide: {
            id: guide.id,
            title: guide.title,
            version: guide.version,
            publishedAt: guide.publishedAt,
          },
          chapters,
        });
      } catch (err) {
        next(err);
      }
    },
  );

  // POST /api/my/chapters/:id/complete
  router.post(
    "/chapters/:id/complete",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const auth = requireAuthContext(req);
        const chapterId = z.string().cuid().safeParse(req.params.id);
        if (!chapterId.success) {
          res.status(400).json({ error: "invalid chapter id" });
          return;
        }

        const chapter = await prisma.chapter.findFirst({
          where: {
            id: chapterId.data,
            orgId: auth.orgId,
          },
          select: {
            id: true,
            guide: {
              select: {
                roleId: true,
              },
            },
          },
        });

        if (!chapter) {
          res.status(404).json({ error: "chapter not found" });
          return;
        }

        const assignment = await prisma.employeeModule.findFirst({
          where: {
            orgId: auth.orgId,
            userId: auth.userId,
            roleId: chapter.guide.roleId,
          },
          select: { id: true },
        });

        if (!assignment) {
          res.status(403).json({ error: "not assigned to this module" });
          return;
        }

        const now = new Date();
        const progress = await prisma.chapterProgress.upsert({
          where: {
            userId_chapterId: {
              userId: auth.userId,
              chapterId: chapter.id,
            },
          },
          create: {
            orgId: auth.orgId,
            userId: auth.userId,
            chapterId: chapter.id,
            completedAt: now,
          },
          update: {
            completedAt: now,
          },
          select: {
            id: true,
            chapterId: true,
            completedAt: true,
          },
        });

        res.status(201).json({ progress });
      } catch (err) {
        next(err);
      }
    },
  );

  // POST /api/my/chapters/:id/quiz/submit
  router.post(
    "/chapters/:id/quiz/submit",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const auth = requireAuthContext(req);
        const chapterId = z.string().cuid().safeParse(req.params.id);
        if (!chapterId.success) {
          res.status(400).json({ error: "invalid chapter id" });
          return;
        }

        const body = submitQuizSchema.safeParse(req.body);
        if (!body.success) {
          res.status(400).json({ error: "invalid body", details: body.error.flatten() });
          return;
        }

        const chapter = await prisma.chapter.findFirst({
          where: {
            id: chapterId.data,
            orgId: auth.orgId,
          },
          select: {
            id: true,
            guide: {
              select: {
                roleId: true,
              },
            },
            quiz: {
              select: {
                id: true,
                questions: {
                  orderBy: { id: "asc" },
                  select: {
                    id: true,
                    question: true,
                    options: true,
                    correctIndex: true,
                  },
                },
              },
            },
          },
        });

        if (!chapter) {
          res.status(404).json({ error: "chapter not found" });
          return;
        }

        const assignment = await prisma.employeeModule.findFirst({
          where: {
            orgId: auth.orgId,
            userId: auth.userId,
            roleId: chapter.guide.roleId,
          },
          select: { id: true },
        });

        if (!assignment) {
          res.status(403).json({ error: "not assigned to this module" });
          return;
        }

        if (!chapter.quiz || chapter.quiz.questions.length === 0) {
          res.status(404).json({ error: "quiz not found for this chapter" });
          return;
        }

        const questions = chapter.quiz.questions;
        if (body.data.answers.length !== questions.length) {
          res.status(400).json({
            error: `answers count (${body.data.answers.length}) must match questions count (${questions.length})`,
          });
          return;
        }

        const previousAttemptsCount = await prisma.quizAttempt.count({
          where: {
            quizId: chapter.quiz.id,
            userId: auth.userId,
            orgId: auth.orgId,
          },
        });
        const attemptNumber = previousAttemptsCount + 1;

        let correctCount = 0;
        questions.forEach((q, index) => {
          const selectedIndex = body.data.answers[index];
          if (selectedIndex === q.correctIndex) {
            correctCount++;
          }
        });

        const score = Math.round((correctCount / questions.length) * 100);
        const passed = score >= 70;
        const shouldRevealAnswers = score === 100 || attemptNumber >= 3;

        const results = questions.map((q, index) => {
          const selectedIndex = body.data.answers[index] ?? 0;
          const isCorrect = selectedIndex === q.correctIndex;
          return {
            questionId: q.id,
            isCorrect,
            selectedIndex,
            ...(shouldRevealAnswers ? { correctIndex: q.correctIndex } : {}),
          };
        });

        const attempt = await prisma.quizAttempt.create({
          data: {
            orgId: auth.orgId,
            userId: auth.userId,
            quizId: chapter.quiz.id,
            score,
            answers: body.data.answers,
          },
          select: {
            id: true,
            score: true,
            createdAt: true,
          },
        });

        if (passed) {
          await prisma.chapterProgress.upsert({
            where: {
              userId_chapterId: {
                userId: auth.userId,
                chapterId: chapter.id,
              },
            },
            create: {
              orgId: auth.orgId,
              userId: auth.userId,
              chapterId: chapter.id,
              completedAt: new Date(),
            },
            update: {
              completedAt: new Date(),
            },
          });
        }

        res.status(201).json({
          attempt: {
            id: attempt.id,
            score: attempt.score,
            createdAt: attempt.createdAt.toISOString(),
            attemptNumber,
          },
          passed,
          score,
          correctCount,
          totalQuestions: questions.length,
          results,
          chapterCompleted: passed,
        });
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
