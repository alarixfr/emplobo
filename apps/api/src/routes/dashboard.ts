import { prisma } from "@emplobo/db";
import { Router, type Request, type Response, type NextFunction } from "express";
import { createCache } from "../lib/cache.js";
import { syncOrgMembersIfStale } from "../lib/membership.js";
import type { Env } from "../env.js";
import type { AuthContext } from "../types.js";

/**
 * Section 9 — GET /api/dashboard/summary (admin only).
 * Basic usage dashboard: counts, avg quiz score, per-role completion,
 * and AI usage from AiUsageLog. Cached 60s (Section 6) — read often,
 * written rarely, org-scoped only.
 */

const DASHBOARD_CACHE_TTL_SECONDS = 60;

type AuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => void | Promise<void>;

function requireAuthContext(req: Request): AuthContext {
  if (!req.auth) {
    throw new Error("requireAdmin must run before dashboard handlers");
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

export function createDashboardRouter(requireAdmin: AuthMiddleware, env: Env): Router {
  const router = Router();
  const cache = createCache(env);

  router.use(requireAdmin);

  router.get("/summary", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = requireAuthContext(req);

      // Keep the Karyawan/Employee counts accurate even if the Clerk webhook
      // hasn't been delivered for every member (cooldown-bound, best-effort).
      await syncOrgMembersIfStale(env, auth.orgId);

      const cacheKey = `dashboard-summary:${auth.orgId}`;

      const cached = await cache.getJson<unknown>(cacheKey);
      if (cached) {
        res.json({ summary: cached });
        return;
      }

      // ── Counts ────────────────────────────────────────────────────────────
      const [roleGroups, employeeCount, assignmentCount, quizAttemptCount, aiUsageRows] =
        await Promise.all([
          prisma.trainingRole.groupBy({
            by: ["status"],
            where: { orgId: auth.orgId, isActive: true },
            _count: { _all: true },
          }),
          prisma.user.count({
            where: { orgId: auth.orgId, role: "EMPLOYEE" },
          }),
          prisma.employeeModule.count({
            where: { orgId: auth.orgId },
          }),
          prisma.quizAttempt.count({
            where: { orgId: auth.orgId },
          }),
          prisma.aiUsageLog.groupBy({
            by: ["kind"],
            where: {
              orgId: auth.orgId,
              createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            },
            _sum: { tokensIn: true, tokensOut: true },
            _count: { _all: true },
          }),
        ]);

      const totalRoles = roleGroups.reduce((sum, g) => sum + g._count._all, 0);
      const statusOf = (s: string) =>
        roleGroups.find((g) => g.status === s)?._count._all ?? 0;

      const aiUsage = {
        training: { calls: 0, tokensIn: 0, tokensOut: 0 },
        chat: { calls: 0, tokensIn: 0, tokensOut: 0 },
        guide_gen: { calls: 0, tokensIn: 0, tokensOut: 0 },
      };
      for (const row of aiUsageRows) {
        const bucket = aiUsage[row.kind as keyof typeof aiUsage];
        if (!bucket) continue;
        bucket.calls += row._count._all;
        bucket.tokensIn += row._sum.tokensIn ?? 0;
        bucket.tokensOut += row._sum.tokensOut ?? 0;
      }

      // ── Per-role completion & quiz performance ────────────────────────────
      const [chapters, progressRows, employeesByRole, quizAttempts, quizzes] =
        await Promise.all([
          prisma.chapter.findMany({
            where: { orgId: auth.orgId },
            select: { id: true, guide: { select: { roleId: true } } },
          }),
          prisma.chapterProgress.findMany({
            where: { orgId: auth.orgId },
            select: { userId: true, chapterId: true, completedAt: true },
          }),
          prisma.employeeModule.groupBy({
            by: ["roleId"],
            where: { orgId: auth.orgId },
            _count: { _all: true },
          }),
          prisma.quizAttempt.findMany({
            where: { orgId: auth.orgId },
            select: { quizId: true, userId: true, score: true },
          }),
          prisma.quiz.findMany({
            where: { orgId: auth.orgId },
            select: { id: true, chapterId: true },
          }),
        ]);

      const chapterRole = new Map(chapters.map((c) => [c.id, c.guide.roleId]));
      const chapterCountByRole = new Map<string, number>();
      for (const c of chapters) {
        chapterCountByRole.set(c.guide.roleId, (chapterCountByRole.get(c.guide.roleId) ?? 0) + 1);
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

      const employeesByRoleMap = new Map(employeesByRole.map((e) => [e.roleId, e._count._all]));

      // best score per (quiz, user)
      const bestScoreByQuizUser = new Map<string, number>();
      for (const a of quizAttempts) {
        const key = `${a.quizId}:${a.userId}`;
        const prev = bestScoreByQuizUser.get(key) ?? -1;
        if (a.score > prev) bestScoreByQuizUser.set(key, a.score);
      }

      // quiz → role mapping via chapter
      const quizRole = new Map<string, string>();
      for (const q of quizzes) {
        const roleId = chapterRole.get(q.chapterId);
        if (roleId) quizRole.set(q.id, roleId);
      }

      const bestByRole: Record<string, number[]> = {};
      for (const [key, score] of bestScoreByQuizUser) {
        const quizId = key.split(":")[0] ?? "";
        const roleId = quizRole.get(quizId);
        if (!roleId) continue;
        (bestByRole[roleId] ??= []).push(score);
      }

      // ── Assemble per-role rows for ALL active roles (reference Brain
      // Readiness table shows DRAFT/READY/PUBLISHED roles with the brain's
      // own completenessScore as the primary progress signal) ────────────
      const rolesWithGuides = await prisma.trainingRole.findMany({
        where: { orgId: auth.orgId, isActive: true },
        select: {
          id: true,
          name: true,
          status: true,
          completenessScore: true,
        },
        orderBy: { name: "asc" },
      });

      // unique employees with any completed chapter, grouped by role
      const userKeysByRole = new Map<string, string[]>();
      for (const key of completedByRoleUser.keys()) {
        const [roleId, userId] = key.split(":");
        if (!roleId || !userId) continue;
        const arr = userKeysByRole.get(roleId) ?? [];
        arr.push(userId);
        userKeysByRole.set(roleId, arr);
      }

      const perRole = rolesWithGuides.map((role) => {
        const totalChapters = chapterCountByRole.get(role.id) ?? 0;
        const assigned = employeesByRoleMap.get(role.id) ?? 0;

        // avg completion % across employees who have progress; employees
        // with zero progress count as 0% so completion reflects the whole team
        const userIds = userKeysByRole.get(role.id) ?? [];
        const completionSum = userIds.reduce((acc, userId) => {
          const done = completedByRoleUser.get(`${role.id}:${userId}`)?.size ?? 0;
          return acc + pct(done, totalChapters);
        }, 0);
        const completionPct =
          assigned > 0 ? Math.round(completionSum / assigned) : 0;

        return {
          roleId: role.id,
          roleName: role.name,
          status: role.status,
          completenessScore: role.completenessScore,
          assignedEmployees: assigned,
          totalChapters,
          avgCompletionPct: completionPct,
          avgQuizBestScore: average(bestByRole[role.id] ?? []),
        };
      });

      // ── Recent activity timeline (dashboard right rail) ──────────────────
      const [recentQuiz, recentAssignments, recentGuides] = await Promise.all([
        prisma.quizAttempt.findMany({
          where: { orgId: auth.orgId },
          orderBy: { createdAt: "desc" },
          take: 6,
          select: {
            id: true,
            quizId: true,
            score: true,
            createdAt: true,
            user: { select: { name: true } },
          },
        }),
        prisma.employeeModule.findMany({
          where: { orgId: auth.orgId },
          orderBy: { assignedAt: "desc" },
          take: 4,
          select: {
            id: true,
            assignedAt: true,
            user: { select: { name: true } },
            role: { select: { name: true } },
          },
        }),
        prisma.guide.findMany({
          where: { orgId: auth.orgId, publishedAt: { not: null } },
          orderBy: { publishedAt: "desc" },
          take: 3,
          select: {
            id: true,
            title: true,
            publishedAt: true,
            updatedAt: true,
            role: { select: { name: true } },
          },
        }),
      ]);

      // QuizAttempt has no direct quiz relation — resolve chapter/role names
      // for the attempts above with one scoped batched query.
      const activityQuizIds = [...new Set(recentQuiz.map((a) => a.quizId))];
      const activityQuizzes =
        activityQuizIds.length > 0
          ? await prisma.quiz.findMany({
              where: { orgId: auth.orgId, id: { in: activityQuizIds } },
              select: {
                id: true,
                chapter: {
                  select: {
                    title: true,
                    guide: { select: { role: { select: { name: true } } } },
                  },
                },
              },
            })
          : [];
      const activityQuizById = new Map(activityQuizzes.map((q) => [q.id, q]));

      type ActivityItem = {
        id: string;
        kind: "quiz" | "assignment" | "guide";
        userName: string | null;
        roleName: string | null;
        detail: string;
        createdAt: string;
      };

      const recentActivity: ActivityItem[] = [
        ...recentQuiz.map<ActivityItem>((a) => {
          const chapter = activityQuizById.get(a.quizId)?.chapter;
          return {
            id: a.id,
            kind: "quiz",
            userName: a.user.name,
            roleName: chapter?.guide.role.name ?? null,
            detail: `menyelesaikan kuis "${chapter?.title ?? "-"}" dengan skor ${a.score}`,
            createdAt: a.createdAt.toISOString(),
          };
        }),
        ...recentAssignments.map<ActivityItem>((m) => ({
          id: m.id,
          kind: "assignment",
          userName: m.user.name,
          roleName: m.role.name,
          detail: `ditugaskan ke role ${m.role.name}`,
          createdAt: m.assignedAt.toISOString(),
        })),
        ...recentGuides.map<ActivityItem>((g) => ({
          id: g.id,
          kind: "guide",
          userName: null,
          roleName: g.role.name,
          detail: `guide "${g.title}" dipublikasikan`,
          createdAt: (g.publishedAt ?? g.updatedAt).toISOString(),
        })),
      ]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 8);

      const summary = {
        roles: {
          total: totalRoles,
          draft: statusOf("DRAFT"),
          ready: statusOf("READY"),
          published: statusOf("PUBLISHED"),
        },
        employees: employeeCount,
        assignments: assignmentCount,
        quiz: {
          attempts: quizAttemptCount,
          avgBestScore: average([...bestScoreByQuizUser.values()]),
        },
        aiUsage30d: {
          training: aiUsage.training.calls,
          chat: aiUsage.chat.calls,
          guideGen: aiUsage.guide_gen.calls,
          tokensIn: aiUsage.training.tokensIn + aiUsage.chat.tokensIn + aiUsage.guide_gen.tokensIn,
          tokensOut:
            aiUsage.training.tokensOut + aiUsage.chat.tokensOut + aiUsage.guide_gen.tokensOut,
        },
        perRole,
        recentActivity,
      };

      await cache.setJson(cacheKey, summary, DASHBOARD_CACHE_TTL_SECONDS);
      res.json({ summary });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
