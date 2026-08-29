import { prisma } from "@emplobo/db";
import { Router, type Request, type Response, type NextFunction } from "express";
import type { Env } from "../env.js";
import type { AuthContext } from "../types.js";

/**
 * GET /api/employees (admin only) — Employee Directory behind
 * admin_dashboard_employees_progress. Org-scoped aggregates only: per-user
 * assigned roles, avg completion %, avg best quiz score. No caching —
 * directory views are admin-scoped, not org-shared content.
 */

type AuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => void | Promise<void>;

function requireAuthContext(req: Request): AuthContext {
  if (!req.auth) {
    throw new Error("requireAdmin must run before employees handlers");
  }
  return req.auth;
}

function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 100);
}

function average(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

export function createEmployeesRouter(requireAdmin: AuthMiddleware, _env: Env): Router {
  const router = Router();

  router.use(requireAdmin);

  router.get("/", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = requireAuthContext(req);

      const [users, assignments, chapters, progressRows, quizzes, attempts] =
        await Promise.all([
          prisma.user.findMany({
            where: { orgId: auth.orgId },
            orderBy: { name: "asc" },
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              createdAt: true,
            },
          }),
          prisma.employeeModule.findMany({
            where: { orgId: auth.orgId },
            select: {
              userId: true,
              roleId: true,
              assignedAt: true,
              role: { select: { name: true } },
            },
          }),
          prisma.chapter.findMany({
            where: { orgId: auth.orgId },
            select: { id: true, guide: { select: { roleId: true } } },
          }),
          prisma.chapterProgress.findMany({
            where: { orgId: auth.orgId },
            select: { userId: true, chapterId: true, completedAt: true },
          }),
          prisma.quiz.findMany({
            where: { orgId: auth.orgId },
            select: { id: true, chapterId: true },
          }),
          prisma.quizAttempt.findMany({
            where: { orgId: auth.orgId },
            select: { userId: true, quizId: true, score: true },
          }),
        ]);

      const chapterRole = new Map(chapters.map((c) => [c.id, c.guide.roleId]));
      const totalByRole = new Map<string, number>();
      for (const c of chapters) {
        totalByRole.set(c.guide.roleId, (totalByRole.get(c.guide.roleId) ?? 0) + 1);
      }

      // completed chapters per (role, user)
      const completedByRoleUser = new Map<string, Set<string>>();
      for (const p of progressRows) {
        if (!p.completedAt) continue;
        const roleId = chapterRole.get(p.chapterId);
        if (!roleId) continue;
        const key = `${roleId}:${p.userId}`;
        const set = completedByRoleUser.get(key) ?? new Set<string>();
        set.add(p.chapterId);
        completedByRoleUser.set(key, set);
      }

      // quiz → role mapping
      const quizRole = new Map<string, string>();
      for (const q of quizzes) {
        const roleId = chapterRole.get(q.chapterId);
        if (roleId) quizRole.set(q.id, roleId);
      }

      // best score per (quiz, user)
      const bestScoreByQuizUser = new Map<string, number>();
      for (const a of attempts) {
        const key = `${a.quizId}:${a.userId}`;
        const prev = bestScoreByQuizUser.get(key) ?? -1;
        if (a.score > prev) bestScoreByQuizUser.set(key, a.score);
      }

      const employees = users.map((user) => {
        const userAssignments = assignments.filter((a) => a.userId === user.id);

        const completionByRole = userAssignments.map((a) => {
          const done =
            completedByRoleUser.get(`${a.roleId}:${user.id}`)?.size ?? 0;
          return {
            roleId: a.roleId,
            roleName: a.role.name,
            completionPct: pct(done, totalByRole.get(a.roleId) ?? 0),
          };
        });

        const avgCompletionPct = average(
          completionByRole.map((r) => r.completionPct),
        );

        const roleQuizScores: number[] = [];
        for (const a of userAssignments) {
          for (const [key, score] of bestScoreByQuizUser) {
            const quizId = key.split(":")[0] ?? "";
            if (quizRole.get(quizId) === a.roleId && key.endsWith(`:${user.id}`)) {
              roleQuizScores.push(score);
            }
          }
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          joinedAt: user.createdAt.toISOString(),
          assignments: completionByRole,
          avgCompletionPct: avgCompletionPct ?? 0,
          avgQuizBestScore: average(roleQuizScores),
        };
      });

      res.json({ employees });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
