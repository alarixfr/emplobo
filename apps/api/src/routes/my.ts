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

      res.json({ modules });
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
              },
            },
          },
        });

        if (!guide) {
          res.status(404).json({ error: "guide not found" });
          return;
        }

        const chapters = guide.chapters.map((chapter) => ({
          id: chapter.id,
          order: chapter.order,
          title: chapter.title,
          content: chapter.content,
          completedAt: chapter.progress[0]?.completedAt ?? null,
        }));

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

  return router;
}
